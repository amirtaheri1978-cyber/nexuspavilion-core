import Link from "next/link";
import { redirect } from "next/navigation";

import AwardContractButton from "@/components/award-contract-button";
import { createClient } from "@/lib/supabase/server";

type PageProps = {
params: Promise<{ slug: string }>;
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
};

type ScoredQuote = Quote & {
amountNumber: number;
rank: number;
priceScore: number;
timelineScore: number;
performanceScore: number;
riskScore: number;
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

export default async function CompareQuotesPage({ params }: PageProps) {
const { slug } = await params;
const supabase = await createClient();

const { data: rfq } = await supabase
.from("rfqs")
.select("*")
.eq("slug", slug)
.single();

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

const { data: quotes } = await supabase
.from("quotes")
.select("*")
.eq("rfq_id", rfq.id)
.order("amount", { ascending: true });

const quoteList = (quotes ?? []) as Quote[];
const budget = Number(rfq.budget || 0);

const amounts = quoteList
.map((quote) => Number(quote.amount))
.filter((amount) => Number.isFinite(amount));

const lowestAmount = amounts.length > 0 ? Math.min(...amounts) : null;
const highestAmount = amounts.length > 0 ? Math.max(...amounts) : null;

const averageBid =
amounts.length > 0
? Math.round(
amounts.reduce((total, amount) => total + amount, 0) / amounts.length
)
: 0;

const scoredQuotesUnranked = quoteList.map((quote) => {
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

const totalScore = Math.min(
100,
Math.round(
priceScore * 0.4 +
timelineScore * 0.25 +
performanceScore * 0.2 +
riskScore * 0.15
)
);

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
totalScore,
awardProbability,
riskLevel: getRiskLevel(riskScore),
budgetVariance: budget > 0 ? amountNumber - budget : 0,
lowestBidVariance:
lowestAmount && amountNumber > 0 ? amountNumber - lowestAmount : 0,
};
});

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

const executiveSummary = recommendedQuote
? `${formatMoney(
recommendedQuote.amountNumber
)} is currently the strongest award path with ${confidenceScore}% confidence, ${recommendedQuote.riskLevel.toLowerCase()}, and an overall AI score of ${recommendedQuote.totalScore}/100.`
: "Submit supplier quotes to activate procurement intelligence.";

const aiReasons = recommendedQuote
? [
recommendedQuote.amountNumber === lowestAmount
? "Lowest submitted bid"
: "Competitive pricing profile",
`Price score ${recommendedQuote.priceScore}/100`,
`Timeline score ${recommendedQuote.timelineScore}/100`,
`Performance score ${recommendedQuote.performanceScore}/100`,
`Risk score ${recommendedQuote.riskScore}/100`,
potentialSavings > 0
? `${formatMoney(Math.max(potentialSavings, 0))} estimated savings versus average bid`
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
</section>

<section className="mt-8 grid gap-6 md:grid-cols-4">
<InsightCard
title="Recommended Bid"
value={recommendedQuote ? formatMoney(recommendedQuote.amountNumber) : "No bids"}
detail="Best overall AI ranking"
/>

<InsightCard
title="Award Probability"
value={recommendedQuote ? `${recommendedQuote.awardProbability}%` : "Pending"}
detail="Predicted award strength"
/>

<InsightCard
title="Risk Level"
value={recommendedQuote ? recommendedQuote.riskLevel : "Pending"}
detail="Procurement risk signal"
/>

<InsightCard
title="Potential Savings"
value={formatMoney(Math.max(potentialSavings, 0))}
detail="Compared to average bid"
/>
</section>

<section className="mt-8 overflow-hidden rounded-[36px] border border-black/5 bg-slate-950 text-white">
<div className="grid gap-8 p-8 lg:grid-cols-[1.2fr_0.8fr]">
<div>
<p className="text-xs font-black uppercase tracking-[0.3em] text-orange-400">
Executive Award Recommendation
</p>

<h2 className="mt-4 text-4xl font-black">
{recommendedQuote
? `Recommended Supplier Rank #${recommendedQuote.rank}`
: "Awaiting supplier quotes"}
</h2>

<p className="mt-4 max-w-3xl text-sm font-semibold leading-7 text-white/65">
{executiveSummary}
</p>

<div className="mt-8 grid gap-4 md:grid-cols-4">
<DarkMetric
title="Confidence"
value={recommendedQuote ? `${confidenceScore}%` : "Pending"}
/>

<DarkMetric
title="AI Score"
value={recommendedQuote ? `${recommendedQuote.totalScore}/100` : "Pending"}
/>

<DarkMetric
title="Recommended"
value={recommendedQuote ? formatMoney(recommendedQuote.amountNumber) : "Pending"}
/>

<DarkMetric
title="Risk"
value={recommendedQuote ? recommendedQuote.riskLevel : "Pending"}
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
Supplier quotes are required before Nexus Pavilion can
generate an executive award recommendation.
</p>
)}
</div>
</div>
</div>
</section>

<div className="mt-8 overflow-hidden rounded-[28px] border border-black/5 bg-white">
<div className="grid grid-cols-9 bg-black px-6 py-4 text-xs font-black uppercase tracking-[0.15em] text-white">
<div>Rank</div>
<div>Amount</div>
<div>Timeline</div>
<div>Decision</div>
<div>AI Score</div>
<div>Probability</div>
<div>Risk</div>
<div>Variance</div>
<div>Action</div>
</div>

{scoredQuotes.map((quote) => {
const isLowest = lowestAmount !== null && quote.amountNumber === lowestAmount;
const isHighest =
highestAmount !== null &&
highestAmount !== lowestAmount &&
quote.amountNumber === highestAmount;
const isRecommended = recommendedQuote?.id === quote.id;
const isBelowAverage = averageBid > 0 && quote.amountNumber <= averageBid;

return (
<div
key={quote.id}
className="grid grid-cols-9 items-center border-t border-black/5 px-6 py-6"
>
<div>
<p className="text-2xl font-black text-black">#{quote.rank}</p>
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
<div className={`text-lg font-black ${getScoreClass(quote.totalScore)}`}>
{quote.totalScore}/100
</div>

<div className="mt-1 text-xs text-black/40">
P {quote.priceScore} · T {quote.timelineScore} · R{" "}
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

{scoredQuotes.length === 0 && (
<div className="px-6 py-10 text-center text-black/50">
No supplier quotes submitted yet.
</div>
)}
</div>
</div>
</main>
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