import Link from "next/link";

import AwardContractButton from "@/components/award-contract-button";
import InviteVendorForm from "@/components/invite-vendor-form";
import { createClient } from "@/lib/supabase/server";

type PageProps = {
params: Promise<{ slug: string }>;
};

type Profile = {
id: string;
email: string | null;
role: string | null;
company_id: string | null;
};

type Quote = {
id: string;
company_id: string | null;
user_id: string | null;
amount: number | string | null;
timeline: string | null;
message: string | null;
decision: string | null;
};

type ScoredQuote = Quote & {
amountNumber: number;
rank: number;
priceScore: number;
timelineScore: number;
riskScore: number;
performanceScore: number;
totalScore: number;
awardConfidence: number;
riskLevel: string;
budgetVariance: number;
lowestBidVariance: number;
};

function formatMoney(value: number | string | null | undefined) {
const amount = Number(value);

if (!Number.isFinite(amount)) {
return "$0";
}

return `$${amount.toLocaleString()}`;
}

function getTimelineMonths(timeline: string | null) {
const value = String(timeline || "").toLowerCase();
const numberMatch = value.match(/\d+/);
const amount = numberMatch ? Number(numberMatch[0]) : null;

if (!amount) {
if (value.includes("q1")) return 3;
if (value.includes("q2")) return 6;
if (value.includes("q3")) return 9;
if (value.includes("q4")) return 12;
if (value.includes("fast") || value.includes("quick")) return 6;
return 18;
}

if (value.includes("week")) {
return Math.max(1, Math.round(amount / 4.345));
}

if (value.includes("month")) {
return amount;
}

return amount;
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

const positiveSignals = [
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

positiveSignals.forEach((signal) => {
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

const timelineMonths = getTimelineMonths(timeline);
const value = String(message || "").toLowerCase();

if (budget > 0 && amountNumber > budget) score -= 18;
if (budget > 0 && amountNumber < budget * 0.65) score -= 12;
if (timelineMonths > 24) score -= 15;
if (!value.includes("warranty")) score -= 5;
if (!value.includes("quality")) score -= 5;
if (!value.includes("project management")) score -= 5;

return Math.max(20, Math.min(score, 100));
}

function getRiskLevel(score: number) {
if (score >= 80) return "Low";
if (score >= 60) return "Medium";
return "High";
}

function getRFQStatusClass(status: string | null) {
if (status === "awarded") return "bg-green-100 text-green-700";
if (status === "closed") return "bg-slate-200 text-slate-600";
return "bg-orange-100 text-orange-700";
}

function getRFQStatusLabel(status: string | null) {
if (status === "awarded") return "Awarded";
if (status === "closed") return "Closed";
return "Open";
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

export default async function RFQDetailPage({ params }: PageProps) {
const { slug } = await params;
const supabase = await createClient();

const {
data: { user },
} = await supabase.auth.getUser();

const { data: profileData } = user
? await supabase
.from("profiles")
.select("id, email, role, company_id")
.eq("id", user.id)
.single()
: { data: null };

const profile = profileData as Profile | null;

const { data: rfq } = await supabase
.from("rfqs")
.select("*")
.eq("slug", slug)
.single();

if (!rfq) {
return (
<main className="flex min-h-screen items-center justify-center bg-[#f6f6f3]">
<p className="text-xl font-bold text-slate-950">RFQ not found</p>
</main>
);
}

const isOwner = Boolean(
profile?.company_id && rfq.company_id === profile.company_id
);

const rfqStatus = String(rfq.status || "open");
const isOpen = !rfq.status || rfqStatus === "open";

const { data: quotes } = isOwner
? await supabase
.from("quotes")
.select("*")
.eq("rfq_id", rfq.id)
.order("amount", { ascending: true })
: profile?.company_id
? await supabase
.from("quotes")
.select("*")
.eq("rfq_id", rfq.id)
.eq("company_id", profile.company_id)
.order("created_at", { ascending: false })
: { data: [] };

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

const budgetVariance = budget > 0 ? amountNumber - budget : 0;
const lowestBidVariance =
lowestAmount && amountNumber > 0 ? amountNumber - lowestAmount : 0;

return {
...quote,
amountNumber,
rank: 0,
priceScore,
timelineScore,
riskScore,
performanceScore,
totalScore,
awardConfidence: Math.min(99, Math.max(35, totalScore)),
riskLevel: getRiskLevel(riskScore),
budgetVariance,
lowestBidVariance,
};
});

const scoredQuotes: ScoredQuote[] = scoredQuotesUnranked
.sort((a, b) => b.totalScore - a.totalScore)
.map((quote, index) => ({
...quote,
rank: index + 1,
}));

const recommendedQuote = isOwner && scoredQuotes.length > 0 ? scoredQuotes[0] : null;

const awardedQuote = scoredQuotes.find(
(quote) => quote.decision === "awarded"
);

const potentialSavings =
recommendedQuote && averageBid ? averageBid - recommendedQuote.amountNumber : 0;

const hasMyQuote = !isOwner && quoteList.length > 0;
const canSubmitQuote = !isOwner && isOpen && !hasMyQuote;

return (
<main className="min-h-screen bg-[#f6f6f3] px-8 py-10">
<div className="mx-auto max-w-7xl">
<Link
href="/rfq"
className="text-sm font-semibold text-slate-500 hover:text-slate-950"
>
← Back to RFQ Marketplace
</Link>

<section className="mt-8 rounded-[32px] border border-black/5 bg-white p-10">
<div className="flex flex-col gap-8 lg:flex-row lg:items-start lg:justify-between">
<div>
<p className="text-xs font-black uppercase tracking-[0.35em] text-orange-500">
Procurement Opportunity
</p>

<h1 className="mt-4 text-5xl font-black text-slate-950">
{rfq.title}
</h1>

<p className="mt-4 max-w-3xl text-sm leading-relaxed text-slate-600">
{rfq.description}
</p>
</div>

<div className="flex flex-col items-start gap-3 lg:items-end">
<span
className={`rounded-full px-4 py-2 text-sm font-black ${getRFQStatusClass(
rfq.status
)}`}
>
{getRFQStatusLabel(rfq.status)}
</span>

{canSubmitQuote ? (
<Link
href={`/rfq/${rfq.slug}/submit`}
className="rounded-full bg-slate-950 px-6 py-3 text-sm font-bold text-white transition hover:bg-slate-800"
>
Submit Quote
</Link>
) : null}

{!isOwner && hasMyQuote ? (
<p className="text-sm font-bold text-slate-500">
Your company has submitted a quote.
</p>
) : null}

{isOwner && rfqStatus === "awarded" && awardedQuote ? (
<p className="text-sm font-bold text-green-700">
Awarded at {formatMoney(awardedQuote.amountNumber)}
</p>
) : null}
</div>
</div>

<div className="mt-8 grid gap-5 md:grid-cols-4">
<InfoCard title="Category" value={rfq.category || "N/A"} />
<InfoCard title="Location" value={rfq.location || "N/A"} />
<InfoCard title="Budget" value={formatMoney(rfq.budget)} />
<InfoCard title="Deadline" value={rfq.deadline || "N/A"} />
</div>
</section>

{isOwner ? (
<section className="mt-8 grid gap-6 md:grid-cols-4">
<InsightCard
title="Quotes"
value={String(scoredQuotes.length)}
detail="Submitted supplier bids"
/>

<InsightCard
title="Recommended"
value={
recommendedQuote
? formatMoney(recommendedQuote.amountNumber)
: "Pending"
}
detail="AI-ranked best overall supplier"
/>

<InsightCard
title="Potential Savings"
value={formatMoney(Math.max(potentialSavings, 0))}
detail="Compared to average bid"
/>

<InsightCard
title="Award Confidence"
value={
recommendedQuote
? `${recommendedQuote.awardConfidence}%`
: "Pending"
}
detail="Composite procurement confidence"
/>
</section>
) : (
<section className="mt-8 grid gap-6 md:grid-cols-3">
<InsightCard
title="Your Quote"
value={
scoredQuotes[0]
? formatMoney(scoredQuotes[0].amountNumber)
: "Not submitted"
}
detail="Visible only to your company"
/>

<InsightCard
title="Timeline"
value={scoredQuotes[0]?.timeline || "Pending"}
detail="Your submitted delivery schedule"
/>

<InsightCard
title="Status"
value={scoredQuotes[0]?.decision || "Open for quote"}
detail="Private supplier submission status"
/>
</section>
)}

{isOwner && recommendedQuote ? (
<section className="mt-8 rounded-[32px] bg-slate-950 p-8 text-white">
<p className="text-xs font-black uppercase tracking-[0.3em] text-orange-400">
AI Supplier Ranking Engine
</p>

<div className="mt-5 grid gap-8 lg:grid-cols-[1fr_0.9fr]">
<div>
<h2 className="text-4xl font-black">
Recommended Winner: Rank #{recommendedQuote.rank}
</h2>

<p className="mt-4 max-w-3xl text-sm leading-7 text-slate-300">
Nexus Pavilion recommends this supplier based on weighted
analysis of price competitiveness, delivery timeline,
proposal strength, and procurement risk.
</p>

<div className="mt-6 flex flex-wrap gap-3">
<DarkBadge>Overall {recommendedQuote.totalScore}/100</DarkBadge>
<DarkBadge>Risk {recommendedQuote.riskLevel}</DarkBadge>
<DarkBadge>
Confidence {recommendedQuote.awardConfidence}%
</DarkBadge>
</div>
</div>

<div className="grid gap-4 sm:grid-cols-2">
<DarkMetric
title="Price Score"
value={`${recommendedQuote.priceScore}/100`}
/>
<DarkMetric
title="Timeline Score"
value={`${recommendedQuote.timelineScore}/100`}
/>
<DarkMetric
title="Performance"
value={`${recommendedQuote.performanceScore}/100`}
/>
<DarkMetric
title="Risk Score"
value={`${recommendedQuote.riskScore}/100`}
/>
</div>
</div>
</section>
) : null}

{isOwner && isOpen ? (
<div className="mt-8">
<InviteVendorForm rfqId={rfq.id} />
</div>
) : null}

<section className="mt-8 rounded-[32px] border border-black/5 bg-white p-8">
<div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
<div>
<p className="text-xs font-black uppercase tracking-[0.3em] text-orange-500">
{isOwner ? "Quote Intelligence" : "Supplier Submission"}
</p>

<h2 className="mt-3 text-3xl font-black text-slate-950">
{isOwner
? "AI Supplier Ranking"
: "Your Company Quote"}
</h2>

{!isOwner ? (
<p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
Supplier pricing is confidential. You can only view your own
submission. Competitor pricing and award controls are visible
only to the RFQ owner.
</p>
) : (
<p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
Ranking uses weighted scoring: 40% price, 25% timeline, 20%
performance signals, and 15% procurement risk.
</p>
)}
</div>

<div className="flex flex-wrap gap-3">
{canSubmitQuote ? (
<Link
href={`/rfq/${rfq.slug}/submit`}
className="rounded-full bg-white px-6 py-3 text-sm font-bold text-slate-950 shadow-sm transition hover:shadow-md"
>
Submit Quote
</Link>
) : null}

{isOwner ? (
<Link
href={`/rfq/${rfq.slug}/compare`}
className="rounded-full bg-slate-950 px-6 py-3 text-sm font-bold text-white transition hover:bg-slate-800"
>
Open Compare View
</Link>
) : null}
</div>
</div>

{isOwner ? (
<div className="mt-6 overflow-hidden rounded-2xl border border-slate-200">
<div className="grid grid-cols-8 bg-slate-950 px-6 py-4 text-xs font-bold uppercase tracking-[0.15em] text-white">
<div>Rank</div>
<div>Amount</div>
<div>Timeline</div>
<div>Decision</div>
<div>AI Score</div>
<div>Risk</div>
<div>Variance</div>
<div>Actions</div>
</div>

{scoredQuotes.map((quote) => {
const isRecommended = recommendedQuote?.id === quote.id;
const isLowest =
lowestAmount !== null && quote.amountNumber === lowestAmount;
const isHighest =
highestAmount !== null &&
highestAmount !== lowestAmount &&
quote.amountNumber === highestAmount;
const belowAverage =
averageBid > 0 && quote.amountNumber <= averageBid;
const canAward = isOpen && quote.decision !== "awarded";

return (
<div
key={quote.id}
className="grid grid-cols-8 items-center border-t border-slate-100 px-6 py-5"
>
<div>
<p className="text-2xl font-black text-slate-950">
#{quote.rank}
</p>
{isRecommended ? <Badge>Recommended</Badge> : null}
</div>

<div className="text-lg font-black text-slate-950">
{formatMoney(quote.amountNumber)}
</div>

<div className="text-sm font-semibold text-slate-600">
{quote.timeline || "N/A"}
</div>

<div>
<span
className={`rounded-full px-3 py-1 text-xs font-bold ${getDecisionClass(
quote.decision
)}`}
>
{quote.decision || "pending"}
</span>
</div>

<div>
<p
className={`text-lg font-black ${getScoreClass(
quote.totalScore
)}`}
>
{quote.totalScore}/100
</p>

<p className="mt-1 text-xs text-slate-400">
P {quote.priceScore} · T {quote.timelineScore} · R{" "}
{quote.riskScore}
</p>
</div>

<div>
<p className="text-sm font-black text-slate-950">
{quote.riskLevel}
</p>
<p className="text-xs text-slate-400">
Confidence {quote.awardConfidence}%
</p>
</div>

<div>
<p className="text-xs font-bold text-slate-500">
Budget: {formatMoney(quote.budgetVariance)}
</p>
<p className="mt-1 text-xs font-bold text-slate-500">
Lowest: {formatMoney(quote.lowestBidVariance)}
</p>
</div>

<div className="space-y-3">
<div className="space-y-2">
{isLowest && <Badge>Lowest Bid</Badge>}
{belowAverage && <Badge>Below Average</Badge>}
{quote.timelineScore >= 84 && (
<Badge>Strong Timeline</Badge>
)}
{isHighest && <Badge>Highest Bid</Badge>}
</div>

{canAward ? (
<AwardContractButton quoteId={quote.id} />
) : null}

{quote.decision === "awarded" ? (
<p className="text-xs font-black text-green-700">
Contract awarded
</p>
) : null}
</div>
</div>
);
})}

{scoredQuotes.length === 0 && (
<EmptyQuoteState
isOpen={isOpen}
rfqSlug={rfq.slug}
canSubmitQuote={false}
/>
)}
</div>
) : (
<div className="mt-6 overflow-hidden rounded-2xl border border-slate-200">
<div className="grid grid-cols-4 bg-slate-950 px-6 py-4 text-sm font-bold text-white">
<div>Your Amount</div>
<div>Timeline</div>
<div>Status</div>
<div>Message</div>
</div>

{scoredQuotes.length > 0 ? (
scoredQuotes.map((quote) => (
<div
key={quote.id}
className="grid grid-cols-4 items-center border-t border-slate-100 px-6 py-5"
>
<div className="text-xl font-black text-slate-950">
{formatMoney(quote.amountNumber)}
</div>

<div className="text-sm font-semibold text-slate-600">
{quote.timeline || "N/A"}
</div>

<div>
<span
className={`rounded-full px-3 py-1 text-xs font-bold ${getDecisionClass(
quote.decision
)}`}
>
{quote.decision || "submitted"}
</span>
</div>

<div className="text-sm text-slate-600">
{quote.message || "No message"}
</div>
</div>
))
) : (
<EmptyQuoteState
isOpen={isOpen}
rfqSlug={rfq.slug}
canSubmitQuote={canSubmitQuote}
/>
)}
</div>
)}
</section>
</div>
</main>
);
}

function EmptyQuoteState({
isOpen,
rfqSlug,
canSubmitQuote,
}: {
isOpen: boolean;
rfqSlug: string;
canSubmitQuote: boolean;
}) {
return (
<div className="px-6 py-12 text-center">
<p className="text-lg font-black text-slate-950">
No quote submitted yet.
</p>

<p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-slate-500">
{isOpen
? "This RFQ is open and ready for supplier pricing."
: "This RFQ is no longer accepting quotes."}
</p>

{canSubmitQuote ? (
<Link
href={`/rfq/${rfqSlug}/submit`}
className="mt-6 inline-flex rounded-full bg-slate-950 px-6 py-3 text-sm font-bold text-white transition hover:bg-slate-800"
>
Submit Quote
</Link>
) : null}
</div>
);
}

function InfoCard({ title, value }: { title: string; value: string }) {
return (
<div className="rounded-3xl bg-slate-50 p-5">
<p className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">
{title}
</p>

<p className="mt-2 text-lg font-black text-slate-950">{value}</p>
</div>
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
<p className="text-xs font-black uppercase tracking-[0.2em] text-slate-500">
{title}
</p>

<p className="mt-3 text-3xl font-black text-slate-950">{value}</p>

<p className="mt-2 text-sm text-slate-600">{detail}</p>
</div>
);
}

function DarkMetric({ title, value }: { title: string; value: string }) {
return (
<div className="rounded-2xl bg-white/10 p-5">
<p className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">
{title}
</p>

<p className="mt-2 text-3xl font-black text-white">{value}</p>
</div>
);
}

function DarkBadge({ children }: { children: React.ReactNode }) {
return (
<span className="rounded-full bg-white/10 px-4 py-2 text-xs font-black uppercase tracking-[0.15em] text-white">
{children}
</span>
);
}

function Badge({ children }: { children: React.ReactNode }) {
return (
<span className="block rounded-full bg-orange-100 px-3 py-1 text-xs font-bold text-orange-700">
{children}
</span>
);
}