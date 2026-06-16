import Link from "next/link";
import { redirect } from "next/navigation";

import AwardContractButton from "@/components/award-contract-button";
import { createClient } from "@/lib/supabase/server";

type PageProps = {
params: Promise<{ slug: string }>;
};

type SourcingMethod = "open" | "invited" | "sealed_bid";
type ContractFramework = "project_specific" | "framework";

type RFQ = {
id: string;
slug: string;
title: string | null;
budget: number | string | null;
deadline: string | null;
company_id: string | null;
sourcing_method: SourcingMethod | null;
contract_framework: ContractFramework | null;
};

type Quote = {
id: string;
rfq_id: string;
company_id?: string | null;
amount: number | string | null;
timeline: string | null;
message: string | null;
decision: string | null;
created_at?: string | null;
validity_days?: number | null;
};

type ScoredQuote = Quote & {
amountNumber: number;
rank: number;
priceScore: number;
timelineScore: number;
performanceScore: number;
riskScore: number;
commercialScore: number;
technicalScore: number;
evaluationScore: number;
totalScore: number;
awardProbability: number;
riskLevel: string;
budgetVariance: number;
lowestBidVariance: number;
};

function formatMoney(value: number | string | null | undefined) {
const amount = Number(value);

if (!Number.isFinite(amount)) return "$0";

return `$${amount.toLocaleString()}`;
}

function formatDateTime(value: string | null | undefined) {
if (!value) return "N/A";

const date = new Date(value);

if (Number.isNaN(date.getTime())) return value;

return date.toLocaleString("en-US", {
year: "numeric",
month: "long",
day: "numeric",
hour: "2-digit",
minute: "2-digit",
});
}

function hasDeadlinePassed(deadline: string | null | undefined) {
if (!deadline) return false;

const deadlineDate = new Date(deadline);

if (Number.isNaN(deadlineDate.getTime())) return false;

return new Date().getTime() > deadlineDate.getTime();
}

function shouldEnforceBlindBidding(rfq: RFQ) {
return (
rfq.sourcing_method === "invited" ||
rfq.sourcing_method === "sealed_bid" ||
rfq.contract_framework === "framework"
);
}

function getBlindBiddingMessage(rfq: RFQ) {
if (rfq.sourcing_method === "sealed_bid") {
return "This sealed bid RFQ is under blind bidding control. Commercial submissions remain locked until the official closing deadline.";
}

if (rfq.contract_framework === "framework") {
return "This framework RFQ uses controlled commercial access. Supplier pricing remains hidden until the RFQ deadline has passed.";
}

return "This invited RFQ uses blind bidding controls. Buyer-side users can monitor participation, but commercial pricing remains locked until closing.";
}

function getTimelineMonths(timeline: string | null) {
const value = String(timeline || "").toLowerCase();
const match = value.match(/\d+/);
const number = match ? Number(match[0]) : null;

if (!number) {
if (value.includes("q1")) return 3;
if (value.includes("q2")) return 6;
if (value.includes("q3")) return 9;
if (value.includes("q4")) return 12;
if (value.includes("fast") || value.includes("quick")) return 6;
return 18;
}

if (value.includes("week")) {
return Math.max(1, Math.round(number / 4.345));
}

return number;
}

function getTimelineScore(timeline: string | null) {
const months = getTimelineMonths(timeline);

if (months <= 6) return 100;
if (months <= 9) return 92;
if (months <= 12) return 84;
if (months <= 16) return 74;
if (months <= 20) return 62;
if (months <= 24) return 52;

return 40;
}

function getPerformanceScore(message: string | null) {
const value = String(message || "").toLowerCase();

let score = 55;

const signals = [
"healthcare",
"hospital",
"infection control",
"phased",
"occupied",
"quality assurance",
"project management",
"firestopping",
"commissioning",
"warranty",
"experience",
"certified",
"cor",
"wsib",
];

signals.forEach((signal) => {
if (value.includes(signal)) score += 4;
});

if (value.length > 500) score += 5;
if (value.length > 900) score += 5;

return Math.min(score, 100);
}

function getRiskScore({
amountNumber,
budget,
timeline,
message,
}: {
amountNumber: number;
budget: number;
timeline: string | null;
message: string | null;
}) {
let score = 85;

const months = getTimelineMonths(timeline);
const value = String(message || "").toLowerCase();

if (budget > 0 && amountNumber > budget) score -= 18;
if (budget > 0 && amountNumber < budget * 0.65) score -= 12;
if (months > 24) score -= 15;
if (!value.includes("warranty")) score -= 5;
if (!value.includes("quality")) score -= 5;
if (!value.includes("project management")) score -= 5;

return Math.max(20, Math.min(score, 100));
}

function getRiskLevel(score: number) {
if (score >= 80) return "Low Risk";
if (score >= 60) return "Medium Risk";
return "High Risk";
}

function getRiskClass(risk: string) {
if (risk === "Low Risk") return "bg-green-100 text-green-700";
if (risk === "Medium Risk") return "bg-yellow-100 text-yellow-700";
if (risk === "High Risk") return "bg-red-100 text-red-700";
return "bg-slate-100 text-slate-600";
}

function getDecisionClass(decision: string | null) {
if (decision === "awarded") return "bg-green-100 text-green-700";
if (decision === "rejected") return "bg-red-100 text-red-700";
return "bg-yellow-100 text-yellow-700";
}

function getScoreClass(score: number) {
if (score >= 90) return "text-green-700";
if (score >= 75) return "text-orange-700";
return "text-red-700";
}

function getValidityScore(validityDays: number) {
if (validityDays >= 120) return 100;
if (validityDays >= 90) return 92;
if (validityDays >= 60) return 84;
return 72;
}

function getBudgetDisciplineScore({
amountNumber,
budget,
}: {
amountNumber: number;
budget: number;
}) {
if (budget <= 0 || amountNumber <= 0) return 70;

const variance = Math.abs(amountNumber - budget) / budget;

if (variance <= 0.05) return 100;
if (variance <= 0.1) return 92;
if (variance <= 0.2) return 80;
if (variance <= 0.35) return 62;

return 45;
}

function getCommercialScore({
priceScore,
validityScore,
budgetDisciplineScore,
}: {
priceScore: number;
validityScore: number;
budgetDisciplineScore: number;
}) {
return Math.min(
100,
Math.round(
priceScore * 0.6 + validityScore * 0.2 + budgetDisciplineScore * 0.2
)
);
}

function getTechnicalScore({
timelineScore,
performanceScore,
riskScore,
}: {
timelineScore: number;
performanceScore: number;
riskScore: number;
}) {
return Math.min(
100,
Math.round(timelineScore * 0.45 + performanceScore * 0.35 + riskScore * 0.2)
);
}

function getEvaluationScore({
commercialScore,
technicalScore,
riskScore,
}: {
commercialScore: number;
technicalScore: number;
riskScore: number;
}) {
return Math.min(
100,
Math.round(commercialScore * 0.45 + technicalScore * 0.4 + riskScore * 0.15)
);
}

function getBidSpreadPercent({
lowestAmount,
highestAmount,
}: {
lowestAmount: number | null;
highestAmount: number | null;
}) {
if (!lowestAmount || !highestAmount || lowestAmount <= 0) return 0;

return Math.round(((highestAmount - lowestAmount) / lowestAmount) * 100);
}

function getBudgetPosition({
recommendedAmount,
budget,
}: {
recommendedAmount: number;
budget: number;
}) {
if (budget <= 0 || recommendedAmount <= 0) return "Budget unavailable";

if (recommendedAmount <= budget * 0.9) return "Strong savings position";
if (recommendedAmount <= budget) return "Within budget";
if (recommendedAmount <= budget * 1.1) return "Slightly over budget";
return "Over budget";
}

function getBenchmarkPosition({
recommendedAmount,
averageBid,
}: {
recommendedAmount: number;
averageBid: number;
}) {
if (recommendedAmount <= 0 || averageBid <= 0) return "Benchmark pending";

const ratio = recommendedAmount / averageBid;

if (ratio <= 0.9) return "Top quartile";
if (ratio <= 1) return "Competitive";
if (ratio <= 1.1) return "Above average";
return "High cost position";
}

function getCompetitivenessIndex({
recommendedAmount,
averageBid,
evaluationScore,
}: {
recommendedAmount: number;
averageBid: number;
evaluationScore: number;
}) {
if (recommendedAmount <= 0 || averageBid <= 0) return evaluationScore;

const pricePosition = Math.max(
0,
Math.min(100, Math.round((averageBid / recommendedAmount) * 100))
);

return Math.min(
100,
Math.round(pricePosition * 0.45 + evaluationScore * 0.55)
);
}

export default async function CompareQuotesPage({ params }: PageProps) {
const { slug } = await params;
const supabase = await createClient();

const { data: rfqData } = await supabase
.from("rfqs")
.select("*")
.eq("slug", slug)
.single();

const rfq = rfqData as RFQ | null;

if (!rfq) {
return (
<main className="flex min-h-screen items-center justify-center bg-[#f6f6f3]">
<p className="text-xl font-semibold text-black">RFQ not found</p>
</main>
);
}

const {
data: { user },
} = await supabase.auth.getUser();

if (!user) {
redirect("/login");
}

const { data: profile } = await supabase
.from("profiles")
.select("id, company_id, role")
.eq("id", user.id)
.single();

if (!profile?.company_id || profile.company_id !== rfq.company_id) {
redirect("/rfq");
}

const deadlinePassed = hasDeadlinePassed(rfq.deadline);
const blindBiddingEnabled = shouldEnforceBlindBidding(rfq);
const commercialEvaluationUnlocked = !blindBiddingEnabled || deadlinePassed;

const { data: quotes } = await supabase
.from("quotes")
.select("*")
.eq("rfq_id", rfq.id)
.order("amount", { ascending: true });

const quoteList = (quotes ?? []) as Quote[];
const budget = Number(rfq.budget || 0);

const amounts = commercialEvaluationUnlocked
? quoteList
.map((quote) => Number(quote.amount))
.filter((amount) => Number.isFinite(amount))
: [];

const lowestAmount = amounts.length > 0 ? Math.min(...amounts) : null;
const highestAmount = amounts.length > 0 ? Math.max(...amounts) : null;

const averageBid =
amounts.length > 0
? Math.round(
amounts.reduce((total, amount) => total + amount, 0) / amounts.length
)
: 0;

const scoredQuotesUnranked = commercialEvaluationUnlocked
? quoteList.map((quote) => {
const amount = Number(quote.amount);
const amountNumber = Number.isFinite(amount) ? amount : 0;

const priceScore =
lowestAmount && amountNumber > 0
? Math.min(100, Math.round((lowestAmount / amountNumber) * 100))
: 0;

const timelineScore = getTimelineScore(quote.timeline);
const performanceScore = getPerformanceScore(quote.message);
const riskScore = getRiskScore({
amountNumber,
budget,
timeline: quote.timeline,
message: quote.message,
});

const validityDays = Number(quote.validity_days || 30);
const validityScore = getValidityScore(validityDays);

const budgetDisciplineScore = getBudgetDisciplineScore({
amountNumber,
budget,
});

const commercialScore = getCommercialScore({
priceScore,
validityScore,
budgetDisciplineScore,
});

const technicalScore = getTechnicalScore({
timelineScore,
performanceScore,
riskScore,
});

const evaluationScore = getEvaluationScore({
commercialScore,
technicalScore,
riskScore,
});

const totalScore = evaluationScore;

const awardProbability = Math.min(
99,
Math.max(
35,
totalScore +
(amountNumber === lowestAmount ? 3 : 0) +
(timelineScore >= 84 ? 2 : 0) -
(averageBid > 0 && amountNumber > averageBid ? 4 : 0)
)
);

return {
...quote,
amountNumber,
rank: 0,
priceScore,
timelineScore,
performanceScore,
riskScore,
commercialScore,
technicalScore,
evaluationScore,
totalScore,
awardProbability,
riskLevel: getRiskLevel(riskScore),
budgetVariance: budget > 0 ? amountNumber - budget : 0,
lowestBidVariance:
lowestAmount && amountNumber > 0 ? amountNumber - lowestAmount : 0,
};
})
: [];

const scoredQuotes: ScoredQuote[] = scoredQuotesUnranked
.sort((a, b) => b.totalScore - a.totalScore)
.map((quote, index) => ({
...quote,
rank: index + 1,
}));

const recommendedQuote = scoredQuotes[0] || null;
const awardedQuote = scoredQuotes.find((quote) => quote.decision === "awarded");
const hasAwardedContract = !!awardedQuote;

const potentialSavings =
recommendedQuote && averageBid ? averageBid - recommendedQuote.amountNumber : 0;


const bidSpreadPercent = getBidSpreadPercent({
lowestAmount,
highestAmount,
});

const budgetPosition =
recommendedQuote && commercialEvaluationUnlocked
? getBudgetPosition({
recommendedAmount: recommendedQuote.amountNumber,
budget,
})
: "Locked";

const benchmarkPosition =
recommendedQuote && commercialEvaluationUnlocked
? getBenchmarkPosition({
recommendedAmount: recommendedQuote.amountNumber,
averageBid,
})
: "Locked";

const competitivenessIndex =
recommendedQuote && commercialEvaluationUnlocked
? getCompetitivenessIndex({
recommendedAmount: recommendedQuote.amountNumber,
averageBid,
evaluationScore: recommendedQuote.evaluationScore,
})
: 0;

const confidenceScore = recommendedQuote
? Math.min(
99,
Math.max(
70,
recommendedQuote.totalScore +
(recommendedQuote.amountNumber === lowestAmount ? 3 : 0) +
(recommendedQuote.riskScore >= 80 ? 2 : 0)
)
)
: 0;

const executiveSummary =
commercialEvaluationUnlocked && recommendedQuote
? `${formatMoney(
recommendedQuote.amountNumber
)} is currently the strongest award path with ${confidenceScore}% confidence, ${recommendedQuote.riskLevel.toLowerCase()}, with commercial score of ${recommendedQuote.commercialScore}/100 and technical score of ${recommendedQuote.technicalScore}/100, and final evaluation score of ${recommendedQuote.evaluationScore}/100.`
: commercialEvaluationUnlocked
? "Submit supplier quotes to activate procurement intelligence."
: "Commercial evaluation is locked until the RFQ deadline. Participation is visible, but pricing, ranking, and award controls remain sealed.";

const aiReasons =
commercialEvaluationUnlocked && recommendedQuote
? [
recommendedQuote.amountNumber === lowestAmount
? "Lowest submitted bid"
: "Competitive pricing profile",
`Price score ${recommendedQuote.priceScore}/100`,
`Timeline score ${recommendedQuote.timelineScore}/100`,
`Performance score ${recommendedQuote.performanceScore}/100`,
`Risk score ${recommendedQuote.riskScore}/100`,
potentialSavings > 0
? `${formatMoney(
Math.max(potentialSavings, 0)
)} estimated savings versus average bid`
: "Comparable to average bid",
]
: [];
return (
<main className="min-h-screen bg-[#f6f6f3] px-6 py-16">
<div className="mx-auto max-w-7xl">
<Link href={`/rfq/${rfq.slug}`} className="text-sm font-bold text-black/60">
← Back to RFQ
</Link>

<section className="mt-6 rounded-[36px] border border-black/5 bg-white p-10">
<p className="text-xs font-black uppercase tracking-[0.3em] text-orange-500">
Procurement Intelligence
</p>

<h1 className="mt-3 text-5xl font-black leading-tight text-slate-950">
{rfq.title}
</h1>

<p className="mt-4 max-w-4xl text-sm leading-7 text-slate-600">
Compare supplier quotes using price competitiveness, delivery
timeline, supplier performance signals, risk scoring, award
probability, and executive decision intelligence.
</p>

{blindBiddingEnabled ? (
<div className="mt-6 rounded-3xl border border-orange-200 bg-orange-50 p-6">
<p className="text-xs font-black uppercase tracking-[0.25em] text-orange-600">
Blind Bidding Control
</p>

<p className="mt-3 text-sm font-bold leading-7 text-orange-800">
{getBlindBiddingMessage(rfq)}
</p>

<div className="mt-5 grid gap-4 md:grid-cols-3">
<LockMetric title="RFQ Deadline" value={formatDateTime(rfq.deadline)} />
<LockMetric
title="Submissions"
value={`${quoteList.length} received`}
/>
<LockMetric
title="Commercial Opening"
value={commercialEvaluationUnlocked ? "Unlocked" : "Locked"}
/>
</div>
</div>
) : null}
</section>

<section className="mt-8 grid gap-6 md:grid-cols-4">
<InsightCard
title="Recommended Bid"
value={
commercialEvaluationUnlocked && recommendedQuote
? formatMoney(recommendedQuote.amountNumber)
: commercialEvaluationUnlocked
? "No bids"
: "Locked"
}
detail={
commercialEvaluationUnlocked
? "Best overall AI ranking"
: "Hidden until deadline"
}
/>

<InsightCard
title="Award Probability"
value={
commercialEvaluationUnlocked && recommendedQuote
? `${recommendedQuote.awardProbability}%`
: "Locked"
}
detail={
commercialEvaluationUnlocked
? "Predicted award strength"
: "Available after commercial opening"
}
/>

<InsightCard
title="Risk Level"
value={
commercialEvaluationUnlocked && recommendedQuote
? recommendedQuote.riskLevel
: "Locked"
}
detail={
commercialEvaluationUnlocked
? "Procurement risk signal"
: "Evaluation locked"
}
/>

<InsightCard
title="Potential Savings"
value={
commercialEvaluationUnlocked
? formatMoney(Math.max(potentialSavings, 0))
: "Locked"
}
detail={
commercialEvaluationUnlocked
? "Compared to average bid"
: "Available after deadline"
}
/>
</section>

<section className="mt-8 rounded-[36px] border border-black/5 bg-white p-8 shadow-sm">
<p className="text-xs font-black uppercase tracking-[0.3em] text-orange-500">
Executive Benchmark Engine
</p>

<div className="mt-5 grid gap-8 lg:grid-cols-[1fr_0.9fr]">
<div>
<h2 className="text-4xl font-black leading-tight text-slate-950">
Budget, market, and award benchmark signals.
</h2>

<p className="mt-4 max-w-3xl text-sm font-semibold leading-7 text-slate-600">
Nexus Pavilion benchmarks the recommended award path against submitted
bid distribution, average bid position, approved budget, and final
evaluation score. No synthetic market data is used.
</p>

<div className="mt-6 flex flex-wrap gap-3">
<BenchmarkBadge>{benchmarkPosition}</BenchmarkBadge>
<BenchmarkBadge>{budgetPosition}</BenchmarkBadge>
<BenchmarkBadge>{bidSpreadPercent}% Bid Spread</BenchmarkBadge>
</div>
</div>

<div className="grid gap-4 sm:grid-cols-2">
<BenchmarkMetric
title="Competitiveness"
value={
commercialEvaluationUnlocked && recommendedQuote
? `${competitivenessIndex}/100`
: "Locked"
}
/>

<BenchmarkMetric
title="Average Bid"
value={
commercialEvaluationUnlocked && averageBid
? formatMoney(averageBid)
: "Locked"
}
/>

<BenchmarkMetric
title="Budget Position"
value={commercialEvaluationUnlocked ? budgetPosition : "Locked"}
/>

<BenchmarkMetric
title="Bid Spread"
value={
commercialEvaluationUnlocked ? `${bidSpreadPercent}%` : "Locked"
}
/>
</div>
</div>
</section>

<section className="mt-8 overflow-hidden rounded-[36px] border border-black/5 bg-slate-950 text-white">
<div className="grid gap-8 p-8 lg:grid-cols-[1.2fr_0.8fr]">
<div>
<p className="text-xs font-black uppercase tracking-[0.3em] text-orange-400">
Executive Award Recommendation
</p>

<h2 className="mt-4 text-4xl font-black">
{commercialEvaluationUnlocked && recommendedQuote
? `Recommended Supplier Rank #${recommendedQuote.rank}`
: commercialEvaluationUnlocked
? "Awaiting supplier quotes"
: "Commercial Evaluation Locked"}
</h2>

<p className="mt-4 max-w-3xl text-sm font-semibold leading-7 text-white/65">
{executiveSummary}
</p>

<div className="mt-8 grid gap-4 md:grid-cols-4">
<DarkMetric
title="Confidence"
value={
commercialEvaluationUnlocked && recommendedQuote
? `${confidenceScore}%`
: "Locked"
}
/>

<DarkMetric
title="Evaluation"
value={
commercialEvaluationUnlocked && recommendedQuote
? `${recommendedQuote.evaluationScore}/100`
: "Locked"
}
/>

<DarkMetric
title="Recommended"
value={
commercialEvaluationUnlocked && recommendedQuote
? formatMoney(recommendedQuote.amountNumber)
: "Locked"
}
/>

<DarkMetric
title="Risk"
value={
commercialEvaluationUnlocked && recommendedQuote
? recommendedQuote.riskLevel
: "Locked"
}
/>
</div>
</div>

<div className="rounded-3xl bg-white/10 p-6">
<p className="text-xs font-black uppercase tracking-[0.25em] text-white/40">
Decision Drivers
</p>

<div className="mt-4 space-y-3">
{aiReasons.length > 0 ? (
aiReasons.map((reason) => (
<div
key={reason}
className="rounded-2xl bg-white px-4 py-3 text-sm font-black text-slate-800"
>
✓ {reason}
</div>
))
) : (
<p className="text-sm font-bold leading-6 text-white/60">
{commercialEvaluationUnlocked
? "Supplier quotes are required before Nexus Pavilion can generate an executive award recommendation."
: "Decision drivers remain locked until commercial opening. This preserves blind bidding integrity and prevents premature price visibility."}
</p>
)}
</div>
</div>
</div>
</section>

{!commercialEvaluationUnlocked ? (
<div className="mt-8 overflow-hidden rounded-[28px] border border-black/5 bg-white">
<div className="grid grid-cols-4 bg-black px-6 py-4 text-xs font-black uppercase tracking-[0.15em] text-white">
<div>Submissions</div>
<div>Commercial Data</div>
<div>Evaluation Matrix</div>
<div>Status</div>
</div>

<div className="grid grid-cols-4 items-center border-t border-black/5 px-6 py-8">
<div>
<p className="text-4xl font-black text-black">
{quoteList.length}
</p>

<p className="mt-1 text-xs font-bold text-black/50">
Quotes submitted
</p>
</div>

<div className="text-sm font-black text-black/60">
Pricing locked
</div>

<div className="text-sm font-black text-black/60">
Not opened
</div>

<div>
<span className="rounded-full bg-orange-100 px-4 py-2 text-xs font-black text-orange-700">
Blind Bidding Active
</span>
</div>
</div>
</div>
) : (
<div className="mt-8 overflow-hidden rounded-[28px] border border-black/5 bg-white">
<div className="grid grid-cols-10 bg-black px-6 py-4 text-xs font-black uppercase tracking-[0.15em] text-white">
<div>Rank</div>
<div>Amount</div>
<div>Timeline</div>
<div>Validity</div>
<div>Decision</div>
<div>Evaluation</div>
<div>Probability</div>
<div>Risk</div>
<div>Variance</div>
<div>Action</div>
</div>

{scoredQuotes.map((quote) => {
const isLowest =
lowestAmount !== null && quote.amountNumber === lowestAmount;
const isHighest =
highestAmount !== null &&
highestAmount !== lowestAmount &&
quote.amountNumber === highestAmount;
const isRecommended = recommendedQuote?.id === quote.id;
const isBelowAverage =
averageBid > 0 && quote.amountNumber <= averageBid;

return (
<div
key={quote.id}
className="grid grid-cols-10 items-center border-t border-black/5 px-6 py-6"
>
<div>
<p className="text-2xl font-black text-black">
#{quote.rank}
</p>

{isRecommended ? (
<Badge className="bg-orange-100 text-orange-700">
Recommended
</Badge>
) : null}
</div>

<div className="text-xl font-black text-black">
{formatMoney(quote.amountNumber)}
</div>

<div className="font-medium text-black/70">
{quote.timeline || "N/A"}
</div>

<div className="font-medium text-black/70">
{quote.validity_days ? `${quote.validity_days} days` : "30 days"}
</div>

<div>
<span
className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${getDecisionClass(
quote.decision
)}`}
>
{quote.decision || "pending"}
</span>
</div>

<div>
<div
className={`text-lg font-black ${getScoreClass(
quote.evaluationScore
)}`}
>
{quote.evaluationScore}/100
</div>

<div className="mt-1 text-xs text-black/40">
C {quote.commercialScore} · T {quote.technicalScore} · R{" "}
{quote.riskScore}
</div>
</div>

<div className="text-lg font-black text-slate-950">
{quote.awardProbability}%
</div>

<div>
<span
className={`rounded-full px-3 py-1 text-xs font-black ${getRiskClass(
quote.riskLevel
)}`}
>
{quote.riskLevel}
</span>
</div>

<div>
<p className="text-xs font-bold text-black/50">
Budget: {formatMoney(quote.budgetVariance)}
</p>

<p className="mt-1 text-xs font-bold text-black/50">
Lowest: {formatMoney(quote.lowestBidVariance)}
</p>

<div className="mt-2 space-y-1">
{isLowest ? (
<Badge className="bg-emerald-100 text-emerald-700">
Lowest Bid
</Badge>
) : null}

{isBelowAverage ? (
<Badge className="bg-purple-100 text-purple-700">
Below Average
</Badge>
) : null}

{quote.timelineScore >= 84 ? (
<Badge className="bg-blue-100 text-blue-700">
Strong Timeline
</Badge>
) : null}

{isHighest ? (
<Badge className="bg-red-100 text-red-700">
Highest Bid
</Badge>
) : null}
</div>
</div>

<div>
{quote.decision === "awarded" ? (
<span className="rounded-full bg-green-100 px-4 py-2 text-sm font-bold text-green-700">
Contract Awarded
</span>
) : hasAwardedContract ? (
<span className="rounded-full bg-slate-100 px-4 py-2 text-sm font-bold text-slate-500">
Award Closed
</span>
) : (
<AwardContractButton quoteId={quote.id} />
)}
</div>
</div>
);
})}

{scoredQuotes.length === 0 ? (
<div className="px-6 py-10 text-center text-black/50">
No supplier quotes submitted yet.
</div>
) : null}
</div>
)}
</div>
</main>
);
}

function LockMetric({ title, value }: { title: string; value: string }) {
return (
<div className="rounded-2xl bg-white p-4">
<p className="text-xs font-black uppercase tracking-[0.2em] text-orange-400">
{title}
</p>

<p className="mt-2 text-lg font-black text-slate-950">{value}</p>
</div>
);
}

function Badge({
children,
className,
}: {
children: React.ReactNode;
className: string;
}) {
return (
<span className={`block rounded-full px-3 py-1 text-xs font-bold ${className}`}>
{children}
</span>
);
}

function InsightCard({
title,
value,
detail,
}: {
title: string;
value: string;
detail: string;
}) {
return (
<div className="rounded-3xl border border-black/5 bg-white p-7">
<p className="text-xs font-bold uppercase tracking-[0.2em] text-black/40">
{title}
</p>

<p className="mt-3 text-3xl font-black text-black">{value}</p>

<p className="mt-2 text-sm text-black/50">{detail}</p>
</div>
);
}

function DarkMetric({ title, value }: { title: string; value: string }) {
return (
<div className="rounded-3xl bg-white/10 p-5">
<p className="text-xs font-black uppercase tracking-[0.2em] text-white/40">
{title}
</p>

<p className="mt-2 text-2xl font-black text-white">{value}</p>
</div>
);
}
function BenchmarkBadge({ children }: { children: React.ReactNode }) {
return (
<span className="rounded-full bg-slate-100 px-4 py-2 text-xs font-black uppercase tracking-[0.15em] text-slate-700">
{children}
</span>
);
}

function BenchmarkMetric({
title,
value,
}: {
title: string;
value: string;
}) {
return (
<div className="rounded-3xl bg-slate-50 p-5">
<p className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">
{title}
</p>

<p className="mt-2 text-xl font-black text-slate-950">{value}</p>
</div>
);
}