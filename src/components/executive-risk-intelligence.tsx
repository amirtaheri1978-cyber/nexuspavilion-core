type SupplierRisk = {
name: string | null;
overallRisk: number;
financialRisk: number;
performanceRisk: number;
capacityRisk: number;
dependencyRisk: number;
};

type SupplierRanking = {
name: string | null;
quotes: number;
awards: number;
revenue: number;
winRate: number;
aiScore: number;
tier: string;
recommendation: string;
};

type ExecutiveRiskIntelligenceProps = {
supplierRiskRadar: SupplierRisk[];
supplierRanking: SupplierRanking[];
};

export default function ExecutiveRiskIntelligence({
supplierRiskRadar,
supplierRanking,
}: ExecutiveRiskIntelligenceProps) {
return (
<>
<section className="mt-8 rounded-3xl border border-slate-200 bg-white p-8">
<p className="text-xs font-black uppercase tracking-[0.25em] text-orange-500">
Supplier Risk Radar
</p>

<h2 className="mt-3 text-3xl font-black text-slate-950">
Supplier Risk Intelligence
</h2>

<div className="mt-6 overflow-hidden rounded-2xl border border-slate-200">
<table className="w-full text-left">
<thead className="bg-slate-950 text-white">
<tr>
<th className="px-4 py-4 text-sm">Supplier</th>
<th className="px-4 py-4 text-sm">Overall</th>
<th className="px-4 py-4 text-sm">Financial</th>
<th className="px-4 py-4 text-sm">Performance</th>
<th className="px-4 py-4 text-sm">Capacity</th>
<th className="px-4 py-4 text-sm">Dependency</th>
</tr>
</thead>

<tbody>
{supplierRiskRadar.map((supplier) => (
<tr
key={supplier.name || "unknown-supplier-risk"}
className="border-t border-slate-100"
>
<td className="px-4 py-4 font-bold">
{supplier.name || "Unknown Supplier"}
</td>
<td className="px-4 py-4 font-black">
{supplier.overallRisk}
</td>
<td className="px-4 py-4">{supplier.financialRisk}</td>
<td className="px-4 py-4">{supplier.performanceRisk}</td>
<td className="px-4 py-4">{supplier.capacityRisk}</td>
<td className="px-4 py-4">{supplier.dependencyRisk}</td>
</tr>
))}

{supplierRiskRadar.length === 0 && (
<tr>
<td
colSpan={6}
className="px-5 py-10 text-center text-sm font-semibold text-slate-500"
>
No supplier risk data available.
</td>
</tr>
)}
</tbody>
</table>
</div>
</section>

<section className="mt-8 rounded-3xl border border-slate-200 bg-white p-8">
<p className="text-xs font-black uppercase tracking-[0.25em] text-orange-500">
AI Supplier Ranking Engine
</p>

<h2 className="mt-3 text-3xl font-black text-slate-950">
Supplier Intelligence Ranking
</h2>

<div className="mt-6 overflow-hidden rounded-2xl border border-slate-200">
<table className="w-full text-left">
<thead className="bg-slate-950 text-white">
<tr>
<th className="px-5 py-4 text-sm">Supplier</th>
<th className="px-5 py-4 text-sm">AI Score</th>
<th className="px-5 py-4 text-sm">Tier</th>
<th className="px-5 py-4 text-sm">Win Rate</th>
<th className="px-5 py-4 text-sm">Revenue</th>
<th className="px-5 py-4 text-sm">Recommendation</th>
</tr>
</thead>

<tbody>
{supplierRanking.map((vendor) => (
<tr
key={vendor.name || "unknown-supplier-ranking"}
className="border-t border-slate-100"
>
<td className="px-5 py-4 font-bold text-slate-950">
{vendor.name || "Unknown Supplier"}
</td>

<td className="px-5 py-4 font-black text-emerald-600">
{vendor.aiScore}
</td>

<td className="px-5 py-4">
<span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-bold">
{vendor.tier}
</span>
</td>

<td className="px-5 py-4 text-slate-600">
{vendor.winRate}%
</td>

<td className="px-5 py-4 text-slate-600">
${vendor.revenue.toLocaleString()}
</td>

<td className="px-5 py-4 text-slate-600">
{vendor.recommendation}
</td>
</tr>
))}

{supplierRanking.length === 0 && (
<tr>
<td
colSpan={6}
className="px-5 py-10 text-center text-slate-500"
>
No supplier intelligence available.
</td>
</tr>
)}
</tbody>
</table>
</div>
</section>
</>
);
}