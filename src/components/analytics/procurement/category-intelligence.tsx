type CategoryIntelligenceItem = {
category: string;
rfqs: number;
quotes: number;
awards: number;
winRate: number;
spend: number;
opportunityScore: number;
};

type CategoryIntelligenceProps = {
categoryIntelligence: CategoryIntelligenceItem[];
};

export default function CategoryIntelligence({
categoryIntelligence,
}: CategoryIntelligenceProps) {
return (
<section className="mt-8 rounded-3xl border border-slate-200 bg-white p-8">
<p className="text-xs font-black uppercase tracking-[0.25em] text-orange-500">
Category Intelligence
</p>

<h2 className="mt-3 text-3xl font-black text-slate-950">
Top Procurement Categories
</h2>

<div className="mt-8 overflow-x-auto">
<table className="w-full">
<thead>
<tr className="border-b border-slate-200 text-left">
<th className="pb-4 text-xs font-black uppercase tracking-[0.2em] text-slate-400">
Category
</th>

<th className="pb-4 text-xs font-black uppercase tracking-[0.2em] text-slate-400">
RFQs
</th>

<th className="pb-4 text-xs font-black uppercase tracking-[0.2em] text-slate-400">
Quotes
</th>

<th className="pb-4 text-xs font-black uppercase tracking-[0.2em] text-slate-400">
Awards
</th>

<th className="pb-4 text-xs font-black uppercase tracking-[0.2em] text-slate-400">
Win Rate
</th>

<th className="pb-4 text-xs font-black uppercase tracking-[0.2em] text-slate-400">
Spend
</th>

<th className="pb-4 text-xs font-black uppercase tracking-[0.2em] text-slate-400">
Opportunity
</th>
</tr>
</thead>

<tbody>
{categoryIntelligence.map((item) => (
<tr
key={item.category}
className="border-b border-slate-100"
>
<td className="py-4 font-black text-slate-950">
{item.category}
</td>

<td className="py-4 text-slate-700">
{item.rfqs}
</td>

<td className="py-4 text-slate-700">
{item.quotes}
</td>

<td className="py-4 text-slate-700">
{item.awards}
</td>

<td className="py-4 font-bold text-slate-950">
{item.winRate}%
</td>

<td className="py-4 font-bold text-slate-950">
${item.spend.toLocaleString()}
</td>

<td className="py-4">
<span className="rounded-full bg-orange-100 px-3 py-1 text-xs font-black text-orange-700">
{item.opportunityScore}/100
</span>
</td>
</tr>
))}
</tbody>
</table>
</div>
</section>
);
}
