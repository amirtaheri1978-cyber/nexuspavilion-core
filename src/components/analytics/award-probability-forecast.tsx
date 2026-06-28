import { ExecutivePanel } from "@/components/executive/executive-panel";

type AwardProbabilityForecastItem = {
title: string;
scope: string;
sourcing: string;
quotes: number;
probability: number;
status: string;
};

type AwardProbabilityForecastProps = {
items: AwardProbabilityForecastItem[];
};

export function AwardProbabilityForecast({
items,
}: AwardProbabilityForecastProps) {
return (
<ExecutivePanel padding="lg">
<p className="text-xs font-black uppercase tracking-[0.25em] text-nexus-gold">
Award Probability Forecast
</p>

<h2 className="mt-3 text-3xl font-black text-nexus-white">
RFQ Award Forecast Engine
</h2>

<div className="mt-6 overflow-x-auto rounded-2xl border border-white/10">
<table className="w-full min-w-[860px] text-left">
<thead className="bg-[#07111F] text-white">
<tr>
<th className="px-5 py-4 text-sm">RFQ</th>
<th className="px-5 py-4 text-sm">Scope</th>
<th className="px-5 py-4 text-sm">Sourcing</th>
<th className="px-5 py-4 text-sm">Quotes</th>
<th className="px-5 py-4 text-sm">Probability</th>
<th className="px-5 py-4 text-sm">Status</th>
</tr>
</thead>

<tbody className="bg-[#061426]/70">
{items.map((rfq) => (
<tr key={rfq.title} className="border-t border-white/10">
<td className="px-5 py-4 font-bold text-white">{rfq.title}</td>
<td className="px-5 py-4 text-slate-300">{rfq.scope}</td>
<td className="px-5 py-4 text-slate-300">{rfq.sourcing}</td>
<td className="px-5 py-4 text-slate-300">{rfq.quotes}</td>
<td className="px-5 py-4 font-black text-emerald-300">
{rfq.probability}%
</td>
<td className="px-5 py-4">
<span className="rounded-full border border-white/10 bg-white/10 px-3 py-1 text-sm font-bold text-slate-200">
{rfq.status}
</span>
</td>
</tr>
))}

{items.length === 0 ? (
<tr>
<td
colSpan={6}
className="px-5 py-10 text-center text-sm font-semibold text-slate-500"
>
No RFQ forecast data available.
</td>
</tr>
) : null}
</tbody>
</table>
</div>
</ExecutivePanel>
);
}
