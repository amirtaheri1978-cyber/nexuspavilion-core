import Link from "next/link";

import AnalyticsChart from "@/components/analytics-chart";
import { createClient } from "@/lib/supabase/server";

export default async function AnalyticsPage() {
const supabase = await createClient();

const { data: rfqs } = await supabase.from("rfqs").select("*");
const { data: quotes } = await supabase.from("quotes").select("*");
const { data: notifications } = await supabase
.from("notifications")
.select("*")
.order("created_at", { ascending: false })
.limit(5);

const rfqList = rfqs ?? [];
const quoteList = quotes ?? [];

const totalRfqs = rfqList.length;
const activeRfqs = rfqList.filter((rfq) => rfq.status !== "awarded").length;
const awardedContracts = quoteList.filter(
(quote) => quote.decision === "awarded"
).length;
const supplierQuotes = quoteList.length;

const quoteAmounts = quoteList
.map((quote) => Number(quote.amount))
.filter((amount) => !Number.isNaN(amount));

const procurementVolume = quoteAmounts.reduce(
(total, amount) => total + amount,
0
);

const awardedVolume = quoteList
.filter((quote) => quote.decision === "awarded")
.reduce((total, quote) => total + Number(quote.amount || 0), 0);

const averageQuote =
quoteAmounts.length > 0
? Math.round(procurementVolume / quoteAmounts.length)
: 0;

const lowestQuote =
quoteAmounts.length > 0 ? Math.min(...quoteAmounts) : 0;

const potentialSavings =
averageQuote > lowestQuote ? averageQuote - lowestQuote : 0;

const awardRate =
supplierQuotes > 0
? Math.round((awardedContracts / supplierQuotes) * 100)
: 0;

const activityChartData = [
{ name: "RFQs", value: totalRfqs },
{ name: "Active", value: activeRfqs },
{ name: "Quotes", value: supplierQuotes },
{ name: "Awards", value: awardedContracts },
];

const valueChartData = [
{ name: "Volume", value: procurementVolume },
{ name: "Awarded", value: awardedVolume },
{ name: "Avg Quote", value: averageQuote },
{ name: "Savings", value: potentialSavings },
];

return (
<main className="min-h-screen bg-slate-100 px-8 py-10">
<div className="mx-auto max-w-7xl">
<Link
href="/dashboard"
className="text-sm font-semibold text-slate-600 hover:text-slate-950"
>
← Back to Dashboard
</Link>

<section className="mt-8 rounded-3xl border border-slate-200 bg-white p-10">
<p className="text-xs font-black uppercase tracking-[0.35em] text-orange-500">
Executive Command Center
</p>

<h1 className="mt-3 text-5xl font-black text-slate-950">
Procurement Analytics
</h1>

<p className="mt-4 max-w-3xl text-sm text-slate-600">
Monitor RFQs, supplier quotes, awarded contracts, procurement
volume, savings, and platform activity across Nexus Pavilion.
</p>
</section>

<section className="mt-8 grid gap-6 md:grid-cols-2 xl:grid-cols-4">
<MetricCard title="Total RFQs" value={totalRfqs.toString()} />
<MetricCard title="Active RFQs" value={activeRfqs.toString()} />
<MetricCard
title="Awarded Contracts"
value={awardedContracts.toString()}
/>
<MetricCard
title="Supplier Quotes"
value={supplierQuotes.toString()}
/>
</section>

<section className="mt-6 grid gap-6 md:grid-cols-2 xl:grid-cols-4">
<MetricCard
title="Procurement Volume"
value={`$${procurementVolume.toLocaleString()}`}
/>
<MetricCard
title="Awarded Volume"
value={`$${awardedVolume.toLocaleString()}`}
/>
<MetricCard
title="Average Quote"
value={`$${averageQuote.toLocaleString()}`}
/>
<MetricCard title="Award Rate" value={`${awardRate}%`} />
</section>

<section className="mt-8 grid gap-6 lg:grid-cols-2">
<div className="rounded-3xl border border-slate-200 bg-white p-8">
<p className="text-xs font-black uppercase tracking-[0.25em] text-orange-500">
Pipeline Intelligence
</p>

<h2 className="mt-3 text-3xl font-black text-slate-950">
Procurement Activity
</h2>

<div className="mt-6">
<AnalyticsChart data={activityChartData} />
</div>
</div>

<div className="rounded-3xl border border-slate-200 bg-white p-8">
<p className="text-xs font-black uppercase tracking-[0.25em] text-orange-500">
Value Intelligence
</p>

<h2 className="mt-3 text-3xl font-black text-slate-950">
Procurement Value
</h2>

<div className="mt-6">
<AnalyticsChart data={valueChartData} />
</div>
</div>
</section>

<section className="mt-8 grid gap-6 lg:grid-cols-3">
<div className="rounded-3xl border border-slate-200 bg-white p-8">
<p className="text-xs font-black uppercase tracking-[0.25em] text-orange-500">
Savings Tracker
</p>

<h2 className="mt-3 text-4xl font-black text-slate-950">
${potentialSavings.toLocaleString()}
</h2>

<p className="mt-3 text-sm text-slate-600">
Estimated savings based on lowest quote compared to average bid.
</p>
</div>

<div className="rounded-3xl border border-slate-200 bg-white p-8">
<p className="text-xs font-black uppercase tracking-[0.25em] text-orange-500">
Awarded Procurement
</p>

<h2 className="mt-3 text-4xl font-black text-slate-950">
${awardedVolume.toLocaleString()}
</h2>

<p className="mt-3 text-sm text-slate-600">
Total value of quotes that have been awarded.
</p>
</div>

<div className="rounded-3xl border border-slate-200 bg-white p-8">
<p className="text-xs font-black uppercase tracking-[0.25em] text-orange-500">
Recent Activity
</p>

<div className="mt-4 space-y-3">
{notifications && notifications.length > 0 ? (
notifications.map((notification: any) => (
<div
key={notification.id}
className="rounded-2xl bg-slate-100 p-4"
>
<p className="text-sm font-black text-slate-950">
{notification.title}
</p>
<p className="mt-1 text-xs text-slate-600">
{notification.type}
</p>
</div>
))
) : (
<p className="text-sm font-semibold text-slate-500">
No activity yet.
</p>
)}
</div>
</div>
</section>

<section className="mt-8 rounded-3xl border border-slate-200 bg-white p-8">
<p className="text-xs font-black uppercase tracking-[0.25em] text-orange-500">
RFQ Pipeline
</p>

<div className="mt-6 overflow-hidden rounded-2xl border border-slate-200">
<table className="w-full text-left">
<thead className="bg-slate-950 text-white">
<tr>
<th className="px-5 py-4 text-sm">RFQ</th>
<th className="px-5 py-4 text-sm">Category</th>
<th className="px-5 py-4 text-sm">Location</th>
<th className="px-5 py-4 text-sm">Status</th>
</tr>
</thead>

<tbody>
{rfqList.map((rfq: any) => (
<tr key={rfq.id} className="border-t border-slate-100">
<td className="px-5 py-4 font-bold text-slate-950">
{rfq.title}
</td>
<td className="px-5 py-4 text-slate-600">
{rfq.category}
</td>
<td className="px-5 py-4 text-slate-600">
{rfq.location}
</td>
<td className="px-5 py-4">
<span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-bold text-slate-700">
{rfq.status || "open"}
</span>
</td>
</tr>
))}
</tbody>
</table>
</div>
</section>
</div>
</main>
);
}

function MetricCard({ title, value }: { title: string; value: string }) {
return (
<div className="rounded-3xl border border-slate-200 bg-white p-7">
<p className="text-xs font-black uppercase tracking-[0.2em] text-slate-500">
{title}
</p>
<p className="mt-3 text-3xl font-black text-slate-950">{value}</p>
</div>
);
}