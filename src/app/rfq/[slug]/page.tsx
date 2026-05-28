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
.filter((amount) => !Number.isNaN(amount));

const lowestAmount = amounts.length > 0 ? Math.min(...amounts) : null;
const averageBid =
amounts.length > 0
? Math.round(
amounts.reduce((total, amount) => total + amount, 0) / amounts.length
)
: 0;

const scoredQuotes = quoteList.map((quote) => {
const amount = Number(quote.amount);
const amountNumber = !Number.isNaN(amount) ? amount : 0;

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
<p className="text-xs font-black uppercase tracking-[0.35em] text-orange-500">
Procurement Opportunity
</p>

<div className="mt-4 flex items-start justify-between gap-8">
<div>
<h1 className="text-5xl font-black text-slate-950">
{rfq.title}
</h1>

<p className="mt-4 max-w-3xl text-sm leading-relaxed text-slate-600">
{rfq.description}
</p>
</div>

<span className="rounded-full bg-slate-100 px-4 py-2 text-sm font-black text-slate-700">
{rfq.status || "open"}
</span>
</div>

<div className="mt-8 grid gap-5 md:grid-cols-4">
<InfoCard title="Category" value={rfq.category || "N/A"} />
<InfoCard title="Location" value={rfq.location || "N/A"} />
<InfoCard
title="Budget"
value={`$${Number(rfq.budget || 0).toLocaleString()}`}
/>
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
? `$${recommendedQuote.amountNumber.toLocaleString()}`
: "Pending"
}
detail="Best score based on price and timeline"
/>

<InsightCard
title="Potential Savings"
value={`$${Math.max(potentialSavings, 0).toLocaleString()}`}
detail="Compared to average bid"
/>

<InsightCard
title="Awarded"
value={
awardedQuote
? `$${awardedQuote.amountNumber.toLocaleString()}`
: "Not yet"
}
detail="Current award decision"
/>
</section>

<section className="mt-8 rounded-[32px] border border-black/5 bg-white p-8">
<div className="flex items-center justify-between">
<div>
<p className="text-xs font-black uppercase tracking-[0.3em] text-orange-500">
Quote Intelligence
</p>

<h2 className="mt-3 text-3xl font-black text-slate-950">
Supplier Quote Scoring
</h2>
</div>

<Link
href={`/rfq/${rfq.slug}/compare`}
className="rounded-full bg-slate-950 px-6 py-3 text-sm font-bold text-white"
>
Open Compare View
</Link>
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
const belowAverage =
averageBid > 0 && quote.amountNumber <= averageBid;

return (
<div
key={quote.id}
className="grid grid-cols-6 items-center border-t border-slate-100 px-6 py-5"
>
<div className="text-xl font-black text-slate-950">
${quote.amountNumber.toLocaleString()}
</div>

<div className="text-sm font-semibold text-slate-600">
{quote.timeline || "N/A"}
</div>

<div>
<span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700">
{quote.decision || "pending"}
</span>
</div>

<div>
<p className="text-lg font-black text-slate-950">
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
</div>
</div>
);
})}

{scoredQuotes.length === 0 && (
<div className="px-6 py-10 text-center text-sm font-semibold text-slate-500">
No quotes submitted yet.
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