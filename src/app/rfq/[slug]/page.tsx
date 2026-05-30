import Link from "next/link";

import { createClient } from "@/lib/supabase/server";

type PageProps = {
params: Promise<{ slug: string }>;
};

type Quote = {
id: string;
amount: number | string | null;
timeline: string | null;
message: string | null;
decision: string | null;
};

type ScoredQuote = Quote & {
amountNumber: number;
priceScore: number;
timelineScore: number;
totalScore: number;
};

function getTimelineScore(timeline: string | null) {
const value = String(timeline || "").toLowerCase();

if (value.includes("q1")) return 100;
if (value.includes("q2")) return 85;
if (value.includes("q3")) return 70;
if (value.includes("q4")) return 55;
if (value.includes("week")) return 80;
if (value.includes("month")) return 60;
if (value.includes("fast") || value.includes("quick")) return 90;

return 50;
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

function formatMoney(value: number | string | null | undefined) {
const amount = Number(value);

if (!Number.isFinite(amount)) {
return "$0";
}

return `$${amount.toLocaleString()}`;
}

export default async function RFQDetailPage({ params }: PageProps) {
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
<p className="text-xl font-bold text-slate-950">RFQ not found</p>
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

const scoredQuotes: ScoredQuote[] = quoteList.map((quote) => {
const amount = Number(quote.amount);
const amountNumber = Number.isFinite(amount) ? amount : 0;

const priceScore =
lowestAmount && amountNumber > 0
? Math.round((lowestAmount / amountNumber) * 70)
: 0;

const timelineScore = Math.round(getTimelineScore(quote.timeline) * 0.3);
const totalScore = Math.min(priceScore + timelineScore, 100);

return {
...quote,
amountNumber,
priceScore,
timelineScore,
totalScore,
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

const potentialSavings =
recommendedQuote && averageBid
? averageBid - recommendedQuote.amountNumber
: 0;

const rfqStatus = String(rfq.status || "open");
const isOpen = !rfq.status || rfqStatus === "open";
const isAwarded = rfqStatus === "awarded";

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

{isOpen ? (
<Link
href={`/rfq/${rfq.slug}/submit`}
className="rounded-full bg-slate-950 px-6 py-3 text-sm font-bold text-white transition hover:bg-slate-800"
>
Submit Quote
</Link>
) : null}

{isAwarded && awardedQuote ? (
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
detail="Best score based on price and timeline"
/>

<InsightCard
title="Potential Savings"
value={formatMoney(Math.max(potentialSavings, 0))}
detail="Compared to average bid"
/>

<InsightCard
title="Awarded"
value={awardedQuote ? formatMoney(awardedQuote.amountNumber) : "Not yet"}
detail="Current award decision"
/>
</section>

<section className="mt-8 rounded-[32px] border border-black/5 bg-white p-8">
<div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
<div>
<p className="text-xs font-black uppercase tracking-[0.3em] text-orange-500">
Quote Intelligence
</p>

<h2 className="mt-3 text-3xl font-black text-slate-950">
Supplier Quote Scoring
</h2>
</div>

<div className="flex flex-wrap gap-3">
{isOpen ? (
<Link
href={`/rfq/${rfq.slug}/submit`}
className="rounded-full bg-white px-6 py-3 text-sm font-bold text-slate-950 shadow-sm transition hover:shadow-md"
>
Submit Quote
</Link>
) : null}

<Link
href={`/rfq/${rfq.slug}/compare`}
className="rounded-full bg-slate-950 px-6 py-3 text-sm font-bold text-white transition hover:bg-slate-800"
>
Open Compare View
</Link>
</div>
</div>

<div className="mt-6 overflow-hidden rounded-2xl border border-slate-200">
<div className="grid grid-cols-6 bg-slate-950 px-6 py-4 text-sm font-bold text-white">
<div>Amount</div>
<div>Timeline</div>
<div>Decision</div>
<div>Score</div>
<div>Message</div>
<div>Signals</div>
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

return (
<div
key={quote.id}
className="grid grid-cols-6 items-center border-t border-slate-100 px-6 py-5"
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
Price {quote.priceScore} · Time {quote.timelineScore}
</p>
</div>

<div className="text-sm text-slate-600">
{quote.message || "No message"}
</div>

<div className="space-y-2">
{isRecommended && <Badge>Recommended</Badge>}
{isLowest && <Badge>Lowest Bid</Badge>}
{belowAverage && <Badge>Below Average</Badge>}
{quote.timelineScore >= 24 && <Badge>Strong Timeline</Badge>}
{isHighest && <Badge>Highest Bid</Badge>}
</div>
</div>
);
})}

{scoredQuotes.length === 0 && (
<div className="px-6 py-12 text-center">
<p className="text-lg font-black text-slate-950">
No supplier quotes submitted yet.
</p>

<p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-slate-500">
This RFQ is open and ready for supplier pricing. Submit the
first quote to activate quote intelligence, bid comparison, and
award recommendations.
</p>

{isOpen ? (
<Link
href={`/rfq/${rfq.slug}/submit`}
className="mt-6 inline-flex rounded-full bg-slate-950 px-6 py-3 text-sm font-bold text-white transition hover:bg-slate-800"
>
Submit First Quote
</Link>
) : null}
</div>
)}
</div>
</section>
</div>
</main>
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

function Badge({ children }: { children: React.ReactNode }) {
return (
<span className="block rounded-full bg-orange-100 px-3 py-1 text-xs font-bold text-orange-700">
{children}
</span>
);
}