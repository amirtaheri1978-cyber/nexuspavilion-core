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
const topSupplier = supplierRanking[0] || null;

const highRiskSupplierCount = supplierRiskRadar.filter(
(supplier) => supplier.overallRisk >= 70
).length;

const strategicSupplierCount = supplierRanking.filter(
(supplier) => supplier.tier === "Strategic"
).length;

const averageWinRate =
supplierRanking.length > 0
? Math.round(
supplierRanking.reduce((sum, supplier) => sum + supplier.winRate, 0) /
supplierRanking.length
)
: 0;

const supplierNetworkMaturity =
supplierRanking.length >= 10
? "Scaled"
: supplierRanking.length >= 5
? "Developing"
: supplierRanking.length > 0
? "Early"
: "Insufficient Data";
return (
<>
<section className="mt-8 rounded-3xl border border-slate-200 bg-slate-950 p-8 text-white">
<p className="text-xs font-black uppercase tracking-[0.25em] text-orange-400">
Supplier Benchmarking Engine
</p>

<h2 className="mt-3 text-4xl font-black">
Supplier Network Benchmark
</h2>

<p className="mt-4 max-w-4xl text-sm font-semibold leading-7 text-slate-300">
Nexus Pavilion benchmarks supplier performance using award history,
quote participation, revenue concentration, win rate, AI score, and
supplier risk exposure.
</p>

<div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
<SupplierBenchmarkMetric
title="Top Supplier"
value={topSupplier?.name || "No Data"}
/>
<SupplierBenchmarkMetric
title="Network Maturity"
value={supplierNetworkMaturity}
/>
<SupplierBenchmarkMetric
title="Strategic Suppliers"
value={String(strategicSupplierCount)}
/>
<SupplierBenchmarkMetric
title="High Risk"
value={String(highRiskSupplierCount)}
/>
<SupplierBenchmarkMetric
title="Avg Win Rate"
value={`${averageWinRate}%`}
/>
</div>
</section>

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
function SupplierBenchmarkMetric({
title,
value,
}: {
title: string;
value: string;
}) {
return (
<div className="rounded-2xl bg-white/10 p-5">
<p className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">
{title}
</p>

<p className="mt-3 text-xl font-black text-white">{value}</p>
</div>
);
}
}
