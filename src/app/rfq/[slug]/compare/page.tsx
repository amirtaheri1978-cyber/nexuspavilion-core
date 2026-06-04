import Link from "next/link";

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

function getTimelineScore(timeline: string | null) {
const value = String(timeline || "").toLowerCase();

if (value.includes("q1")) return 100;
if (value.includes("q2")) return 85;
if (value.includes("q3")) return 70;
if (value.includes("q4")) return 55;
if (value.includes("fast") || value.includes("quick")) return 90;
if (value.includes("week")) return 80;
if (value.includes("month")) return 60;

return 50;
}

function getDecisionClass(decision: string | null) {
if (decision === "awarded") return "bg-green-100 text-green-700";
if (decision === "rejected") return "bg-red-100 text-red-700";
return "bg-yellow-100 text-yellow-700";
}

function formatMoney(value: number | string | null | undefined) {
const amount = Number(value);

if (!Number.isFinite(amount)) return "$0";

return `$${amount.toLocaleString()}`;
}

function getRiskLevel({
amount,
averageBid,
lowestAmount,
highestAmount,
totalScore,
}: {
amount: number;
averageBid: number;
lowestAmount: number | null;
highestAmount: number | null;
totalScore: number;
}) {
if (!averageBid || !lowestAmount || !highestAmount) return "Pending";
if (amount < averageBid * 0.75) return "High Risk";
if (amount === highestAmount && highestAmount !== lowestAmount) return "Medium Risk";
if (totalScore >= 90) return "Low Risk";
if (totalScore >= 80) return "Medium Risk";
return "High Risk";
}

function getRiskClass(risk: string) {
if (risk === "Low Risk") return "bg-green-100 text-green-700";
if (risk === "Medium Risk") return "bg-yellow-100 text-yellow-700";
if (risk === "High Risk") return "bg-red-100 text-red-700";
return "bg-slate-100 text-slate-600";
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

const { data: quotes } = await supabase
.from("quotes")
.select("*")
.eq("rfq_id", rfq.id)
.order("amount", { ascending: true });

const quoteList = (quotes ?? []) as Quote[];

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

const scoredQuotes = quoteList.map((quote) => {
const amount = Number(quote.amount);
const amountNumber = Number.isFinite(amount) ? amount : 0;

const priceScore =
lowestAmount && amountNumber > 0
? Math.round((lowestAmount / amountNumber) * 70)
: 0;

const timelineScore = Math.round(getTimelineScore(quote.timeline) * 0.3);
const totalScore = Math.min(priceScore + timelineScore, 100);

const awardProbability = Math.min(
98,
Math.max(
25,
totalScore +
(amountNumber === lowestAmount ? 5 : 0) +
(timelineScore >= 24 ? 3 : 0) -
(averageBid > 0 && amountNumber > averageBid ? 5 : 0)
)
);

const riskLevel = getRiskLevel({
amount: amountNumber,
averageBid,
lowestAmount,
highestAmount,
totalScore,
});

return {
...quote,
amountNumber,
priceScore,
timelineScore,
totalScore,
awardProbability,
riskLevel,
};
});

const recommendedQuote =
scoredQuotes.length > 0
? scoredQuotes.reduce((best, quote) =>
quote.totalScore > best.totalScore ? quote : best
)
: null;

const awardedQuote = scoredQuotes.find(
(quote) => quote.decision === "awarded"
);

const hasAwardedContract = !!awardedQuote;

const potentialSavings =
recommendedQuote && averageBid
? averageBid - recommendedQuote.amountNumber
: 0;

const confidenceScore = recommendedQuote
? Math.min(
98,
Math.max(
75,
recommendedQuote.totalScore +
(recommendedQuote.amountNumber === lowestAmount ? 3 : 0) +
(recommendedQuote.timelineScore >= 24 ? 2 : 0)
)
)
: 0;

const executiveSummary = recommendedQuote
? `${formatMoney(
recommendedQuote.amountNumber
)} is currently the strongest award path with ${confidenceScore}% confidence and ${recommendedQuote.riskLevel.toLowerCase()} profile.`
: "Submit supplier quotes to activate procurement intelligence.";

const aiReasons = recommendedQuote
? [
recommendedQuote.amountNumber === lowestAmount
? "Lowest submitted bid"
: "Competitive pricing profile",
recommendedQuote.timelineScore >= 24
? "Strong delivery timeline"
: "Acceptable delivery timeline",
`${recommendedQuote.awardProbability}% award probability`,
`${recommendedQuote.riskLevel} procurement risk`,
potentialSavings > 0
? `${formatMoney(Math.max(potentialSavings, 0))} estimated savings versus average bid`
: "Comparable to average bid",
]
: [];

return (
<main className="min-h-screen bg-[#f6f6f3] px-6 py-16">
<div className="mx-auto max-w-6xl">
<Link href={`/rfq/${rfq.slug}`} className="text-sm text-black/60">
← Back to RFQ
</Link>

<section className="mt-6 rounded-[32px] border border-black/5 bg-white p-10">
<p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#d97745]">
Procurement Intelligence
</p>

<h1 className="mt-3 text-5xl font-black text-black">{rfq.title}</h1>

<p className="mt-3 text-lg text-black/60">
Compare supplier quotes using pricing, timeline, award probability,
procurement risk, and decision intelligence.
</p>
</section>

<section className="mt-8 grid gap-6 md:grid-cols-4">
<InsightCard
title="Recommended Bid"
value={
recommendedQuote
? formatMoney(recommendedQuote.amountNumber)
: "No bids"
}
detail="Best price, timeline, and risk profile"
/>

<InsightCard
title="Award Probability"
value={
recommendedQuote
? `${recommendedQuote.awardProbability}%`
: "Pending"
}
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

<section className="mt-8 rounded-[32px] border border-black/5 bg-white p-8">
<p className="text-xs font-black uppercase tracking-[0.3em] text-orange-500">
AI Procurement Intelligence
</p>

<div className="mt-4 grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
<div>
<h2 className="text-3xl font-black text-slate-950">
Award Prediction Engine
</h2>

<p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
{executiveSummary}
</p>

<div className="mt-6 grid gap-4 md:grid-cols-3">
<MiniCard
title="Confidence"
value={recommendedQuote ? `${confidenceScore}%` : "Pending"}
/>

<MiniCard
title="Suggested Award"
value={
recommendedQuote
? formatMoney(recommendedQuote.amountNumber)
: "Pending"
}
/>

<MiniCard
title="Risk"
value={recommendedQuote ? recommendedQuote.riskLevel : "Pending"}
/>
</div>
</div>

<div className="rounded-3xl bg-slate-50 p-6">
<p className="text-xs font-black uppercase tracking-[0.25em] text-slate-400">
Recommendation Reasons
</p>

<div className="mt-4 space-y-3">
{aiReasons.length > 0 ? (
aiReasons.map((reason) => (
<div
key={reason}
className="rounded-2xl bg-white px-4 py-3 text-sm font-bold text-slate-700 shadow-sm"
>
✓ {reason}
</div>
))
) : (
<p className="text-sm font-bold text-slate-500">
Submit quotes to activate AI procurement recommendations.
</p>
)}
</div>
</div>
</div>
</section>

<div className="mt-8 overflow-hidden rounded-[28px] border border-black/5 bg-white">
<div className="grid grid-cols-8 bg-black px-6 py-4 text-sm font-semibold text-white">
<div>Amount</div>
<div>Timeline</div>
<div>Decision</div>
<div>Score</div>
<div>Probability</div>
<div>Risk</div>
<div>Message</div>
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
className="grid grid-cols-8 items-center border-t border-black/5 px-6 py-6"
>
<div className="text-2xl font-bold text-black">
{formatMoney(quote.amountNumber)}
</div>

<div className="font-medium text-black/70">
{quote.timeline || "N/A"}
</div>

<div>
<span
className={`inline-flex rounded-full px-3 py-1 text-sm font-semibold ${getDecisionClass(
quote.decision
)}`}
>
{quote.decision || "pending"}
</span>
</div>

<div>
<div className="text-lg font-black text-black">
{quote.totalScore}/100
</div>

<div className="mt-1 text-xs text-black/40">
Price {quote.priceScore} · Time {quote.timelineScore}
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

<div className="space-y-2 text-sm text-black/60">
<p>{quote.message || "No message"}</p>

{isRecommended && (
<Badge className="bg-orange-100 text-orange-700">
Recommended
</Badge>
)}

{isLowest && (
<Badge className="bg-emerald-100 text-emerald-700">
Lowest Bid
</Badge>
)}

{isBelowAverage && (
<Badge className="bg-purple-100 text-purple-700">
Below Average
</Badge>
)}

{quote.timelineScore >= 24 && (
<Badge className="bg-blue-100 text-blue-700">
Strong Timeline
</Badge>
)}

{isHighest && (
<Badge className="bg-red-100 text-red-700">
Highest Bid
</Badge>
)}
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

function MiniCard({ title, value }: { title: string; value: string }) {
return (
<div className="rounded-3xl bg-white p-5 shadow-sm">
<p className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">
{title}
</p>

<p className="mt-2 text-2xl font-black text-slate-950">{value}</p>
</div>
);
}