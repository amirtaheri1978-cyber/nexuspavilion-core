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

const hasSupplierData =
supplierRiskRadar.length > 0 || supplierRanking.length > 0;

return (
<>
<section className="mt-8 rounded-[34px] border border-white/10 bg-[#061426]/88 p-6 text-white shadow-executive sm:p-8">
<div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
<div>
<p className="text-[11px] font-black uppercase tracking-[0.34em] text-[#C8A646]">
Supplier Benchmarking Engine
</p>

<h2 className="mt-4 text-3xl font-black leading-tight text-white sm:text-4xl">
Supplier Network Benchmark
</h2>

<p className="mt-4 max-w-4xl text-sm font-semibold leading-7 text-slate-400">
Nexus Pavilion benchmarks supplier performance using award
history, quote participation, revenue concentration, win rate,
intelligence score, and supplier risk exposure.
</p>
</div>

<StatusBadge tone={hasSupplierData ? "success" : "warning"}>
{hasSupplierData ? "Available" : "Insufficient Data"}
</StatusBadge>
</div>

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

<section className="mt-8 rounded-[34px] border border-white/10 bg-white/[0.045] p-6 text-white shadow-inner-executive sm:p-8">
<div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
<div>
<p className="text-[10px] font-black uppercase tracking-[0.28em] text-[#C8A646]">
Supplier Risk Radar
</p>

<h2 className="mt-3 text-2xl font-black text-white">
Supplier Risk Intelligence
</h2>
</div>

<StatusBadge tone={supplierRiskRadar.length > 0 ? "success" : "warning"}>
{supplierRiskRadar.length > 0 ? "Available" : "Insufficient Data"}
</StatusBadge>
</div>

<div className="mt-6 overflow-x-auto rounded-[24px] border border-white/10">
<table className="w-full min-w-[820px] text-left">
<thead className="bg-[#07111F] text-white">
<tr>
<th className="px-4 py-4 text-sm">Supplier</th>
<th className="px-4 py-4 text-sm">Overall</th>
<th className="px-4 py-4 text-sm">Financial</th>
<th className="px-4 py-4 text-sm">Performance</th>
<th className="px-4 py-4 text-sm">Capacity</th>
<th className="px-4 py-4 text-sm">Dependency</th>
</tr>
</thead>

<tbody className="bg-[#061426]/70">
{supplierRiskRadar.map((supplier) => (
<tr
key={supplier.name || "unknown-supplier-risk"}
className="border-t border-white/10"
>
<td className="px-4 py-4 font-bold text-white">
{supplier.name || "Unknown Supplier"}
</td>
<td className="px-4 py-4 font-black">
<RiskValue value={supplier.overallRisk} />
</td>
<td className="px-4 py-4 text-slate-300">
{supplier.financialRisk}
</td>
<td className="px-4 py-4 text-slate-300">
{supplier.performanceRisk}
</td>
<td className="px-4 py-4 text-slate-300">
{supplier.capacityRisk}
</td>
<td className="px-4 py-4 text-slate-300">
{supplier.dependencyRisk}
</td>
</tr>
))}

{supplierRiskRadar.length === 0 ? (
<tr>
<td
colSpan={6}
className="px-5 py-10 text-center text-sm font-semibold text-slate-500"
>
No supplier risk data available. Status: Insufficient Data.
</td>
</tr>
) : null}
</tbody>
</table>
</div>
</section>

<section className="mt-8 rounded-[34px] border border-white/10 bg-white/[0.045] p-6 text-white shadow-inner-executive sm:p-8">
<div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
<div>
<p className="text-[10px] font-black uppercase tracking-[0.28em] text-[#C8A646]">
AI Supplier Ranking Engine
</p>

<h2 className="mt-3 text-2xl font-black text-white">
Supplier Intelligence Ranking
</h2>
</div>

<StatusBadge tone={supplierRanking.length > 0 ? "success" : "warning"}>
{supplierRanking.length > 0 ? "Available" : "Insufficient Data"}
</StatusBadge>
</div>

<div className="mt-6 overflow-x-auto rounded-[24px] border border-white/10">
<table className="w-full min-w-[920px] text-left">
<thead className="bg-[#07111F] text-white">
<tr>
<th className="px-5 py-4 text-sm">Supplier</th>
<th className="px-5 py-4 text-sm">AI Score</th>
<th className="px-5 py-4 text-sm">Tier</th>
<th className="px-5 py-4 text-sm">Win Rate</th>
<th className="px-5 py-4 text-sm">Revenue</th>
<th className="px-5 py-4 text-sm">Recommendation</th>
</tr>
</thead>

<tbody className="bg-[#061426]/70">
{supplierRanking.map((vendor) => (
<tr
key={vendor.name || "unknown-supplier-ranking"}
className="border-t border-white/10"
>
<td className="px-5 py-4 font-bold text-white">
{vendor.name || "Unknown Supplier"}
</td>

<td className="px-5 py-4 font-black text-emerald-300">
{vendor.aiScore}
</td>

<td className="px-5 py-4">
<span className="rounded-full border border-[#2CC4E8]/20 bg-[#2CC4E8]/10 px-3 py-1 text-sm font-bold text-[#9BE8F8]">
{vendor.tier}
</span>
</td>

<td className="px-5 py-4 text-slate-300">
{vendor.winRate}%
</td>

<td className="px-5 py-4 text-slate-300">
${vendor.revenue.toLocaleString()}
</td>

<td className="px-5 py-4 text-slate-300">
{vendor.recommendation}
</td>
</tr>
))}

{supplierRanking.length === 0 ? (
<tr>
<td
colSpan={6}
className="px-5 py-10 text-center text-sm font-semibold text-slate-500"
>
No supplier intelligence available. Status: Insufficient Data.
</td>
</tr>
) : null}
</tbody>
</table>
</div>
</section>
</>
);
}

function SupplierBenchmarkMetric({
title,
value,
}: {
title: string;
value: string;
}) {
return (
<div className="rounded-[22px] border border-white/10 bg-white/[0.055] p-5">
<p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">
{title}
</p>

<p className="mt-3 text-xl font-black text-white">{value}</p>
</div>
);
}

function RiskValue({ value }: { value: number }) {
const tone =
value >= 70
? "text-red-300"
: value >= 45
? "text-yellow-300"
: "text-emerald-300";

return <span className={tone}>{value}</span>;
}

function StatusBadge({
children,
tone = "neutral",
}: {
children: React.ReactNode;
tone?: "success" | "warning" | "neutral";
}) {
const toneClass =
tone === "success"
? "border-emerald-300/20 bg-emerald-400/10 text-emerald-300"
: tone === "warning"
? "border-orange-300/20 bg-orange-400/10 text-orange-300"
: "border-white/10 bg-white/[0.055] text-slate-300";

return (
<span
className={`inline-flex rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] ${toneClass}`}
>
{children}
</span>
);
}
