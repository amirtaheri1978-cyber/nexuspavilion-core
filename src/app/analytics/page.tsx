import Link from "next/link";

import AnalyticsChart from "@/components/analytics-chart";
import { createClient } from "@/lib/supabase/server";

export default async function AnalyticsPage() {
const supabase = await createClient();

const { data: rfqs } = await supabase.from("rfqs").select("*");
const { data: quotes } = await supabase.from("quotes").select("*");

const totalRfqs = rfqs?.length ?? 0;
const activeRfqs = rfqs?.filter((rfq) => rfq.status !== "awarded").length ?? 0;
const awardedContracts =
rfqs?.filter((rfq) => rfq.status === "awarded").length ?? 0;

const totalQuotes = quotes?.length ?? 0;

const quoteAmounts =
quotes
?.map((quote) => Number(String(quote.amount).replace(/[^0-9.]/g, "")))
.filter((amount) => !Number.isNaN(amount)) ?? [];

const totalQuoteVolume = quoteAmounts.reduce(
(total, amount) => total + amount,
0
);

const averageQuote =
quoteAmounts.length > 0
? Math.round(totalQuoteVolume / quoteAmounts.length)
: 0;

const chartData = [
{ name: "RFQs", value: totalRfqs },
{ name: "Active", value: activeRfqs },
{ name: "Awarded", value: awardedContracts },
{ name: "Quotes", value: totalQuotes },
];

const valueChartData = [
{ name: "Total Volume", value: totalQuoteVolume },
{ name: "Average Quote", value: averageQuote },
];

return (
<main className="min-h-screen bg-slate-100 px-6 py-12">
<div className="mx-auto max-w-7xl">
<Link
href="/dashboard"
className="text-sm font-semibold text-slate-600 hover:text-slate-950"
>
← Back to Dashboard
</Link>

<section className="mt-8 rounded-3xl bg-white p-10 shadow-sm">
<p className="text-sm font-semibold uppercase tracking-[0.3em] text-orange-500">
Procurement Intelligence
</p>

<h1 className="mt-3 text-5xl font-black text-slate-950">
Analytics Dashboard
</h1>

<p className="mt-4 max-w-3xl text-lg text-slate-600">
Track RFQs, supplier participation, awarded contracts, and
procurement value across Nexus Pavilion.
</p>
</section>

<section className="mt-8 grid gap-6 md:grid-cols-2 xl:grid-cols-5">
<MetricCard title="Total RFQs" value={totalRfqs.toString()} />
<MetricCard title="Active RFQs" value={activeRfqs.toString()} />
<MetricCard title="Awarded Contracts" value={awardedContracts.toString()} />
<MetricCard title="Supplier Quotes" value={totalQuotes.toString()} />
<MetricCard title="Avg. Quote" value={`$${averageQuote.toLocaleString()}`} />
</section>

<section className="mt-8 grid gap-6 lg:grid-cols-2">
<div className="rounded-3xl bg-white p-8 shadow-sm">
<p className="text-sm font-semibold uppercase tracking-[0.2em] text-orange-500">
Activity Overview
</p>

<h2 className="mt-3 text-3xl font-black text-slate-950">
Procurement Activity
</h2>

<div className="mt-6">
<AnalyticsChart data={chartData} />
</div>
</div>

<div className="rounded-3xl bg-white p-8 shadow-sm">
<p className="text-sm font-semibold uppercase tracking-[0.2em] text-orange-500">
Value Intelligence
</p>

<h2 className="mt-3 text-3xl font-black text-slate-950">
Quote Value
</h2>

<div className="mt-6">
<AnalyticsChart data={valueChartData} />
</div>
</div>
</section>

<section className="mt-8 grid gap-6 lg:grid-cols-2">
<div className="rounded-3xl bg-white p-8 shadow-sm">
<p className="text-sm font-semibold uppercase tracking-[0.2em] text-orange-500">
Procurement Volume
</p>

<h2 className="mt-3 text-4xl font-black text-slate-950">
${totalQuoteVolume.toLocaleString()}
</h2>

<p className="mt-4 text-slate-600">
Total submitted quote value across all RFQs.
</p>
</div>

<div className="rounded-3xl bg-white p-8 shadow-sm">
<p className="text-sm font-semibold uppercase tracking-[0.2em] text-orange-500">
Award Rate
</p>

<h2 className="mt-3 text-4xl font-black text-slate-950">
{totalRfqs > 0
? `${Math.round((awardedContracts / totalRfqs) * 100)}%`
: "0%"}
</h2>

<p className="mt-4 text-slate-600">
Percentage of RFQs that have reached awarded status.
</p>
</div>
</section>

<section className="mt-8 rounded-3xl bg-white p-8 shadow-sm">
<p className="text-sm font-semibold uppercase tracking-[0.2em] text-orange-500">
Recent RFQ Activity
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
{rfqs?.map((rfq) => (
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
<div className="rounded-3xl bg-white p-7 shadow-sm">
<p className="text-sm font-semibold uppercase text-slate-500">{title}</p>
<p className="mt-3 text-4xl font-black text-slate-950">{value}</p>
</div>
);
}