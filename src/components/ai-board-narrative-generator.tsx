type NarrativeStatus = "ready" | "insufficient-data" | "coming-soon";

type ExecutiveNarrative = {
title: string;
audience: string;
status: NarrativeStatus;
statusLabel: string;
requirement: string;
};

type AIBoardNarrativeGeneratorProps = {
executiveBenchmarkStatus: string;
industryBenchmarkScore: number;
executiveStatus: string;
boardHealthIndex: number;
enterpriseProcurementScore: number;
executiveReadinessScore: number;
procurementRiskIndex: number;
supplierEngagementScore: number;
benchmarkReadinessScore: number;
boardRecommendation: string;
procurementMaturityScore: number;
awardPredictionConfidence: string;
};

const narratives: ExecutiveNarrative[] = [
{
title: "Board Narrative",
audience: "Board Members",
status: "insufficient-data",
statusLabel: "Insufficient Data",
requirement:
"Requires validated RFQ activity, supplier participation, award decisions, risk intelligence, and financial impact metrics.",
},
{
title: "CEO Narrative",
audience: "Chief Executive Officer",
status: "insufficient-data",
statusLabel: "Insufficient Data",
requirement:
"Requires live supplier network activity, procurement throughput, category performance, and executive trend signals.",
},
{
title: "CFO Narrative",
audience: "Chief Financial Officer",
status: "coming-soon",
statusLabel: "Coming Soon",
requirement:
"Requires awarded volume, quote variance, savings calculation, budget exposure, and financial forecasting integration.",
},
{
title: "Procurement Narrative",
audience: "Procurement Leadership",
status: "insufficient-data",
statusLabel: "Insufficient Data",
requirement:
"Requires completed RFQ-to-award workflows, supplier response history, quote coverage, and operational performance data.",
},
];

const dataRequirements = [
"RFQ activity",
"Supplier responses",
"Submitted quotes",
"Award decisions",
"Risk signals",
"Confidence analytics",
"Financial impact metrics",
];

export default function AIBoardNarrativeGenerator({
executiveBenchmarkStatus,
industryBenchmarkScore,
executiveStatus,
boardHealthIndex,
enterpriseProcurementScore,
executiveReadinessScore,
procurementRiskIndex,
supplierEngagementScore,
benchmarkReadinessScore,
boardRecommendation,
procurementMaturityScore,
awardPredictionConfidence,
}: AIBoardNarrativeGeneratorProps) {

const narrativeReady =
boardHealthIndex >= 55 &&
enterpriseProcurementScore >= 50 &&
executiveReadinessScore >= 50;

const narrativeStatusLabel = narrativeReady ? "Ready" : "Insufficient Data";

const liveNarratives: ExecutiveNarrative[] = narratives.map((narrative) => {
if (narrative.status === "coming-soon") {
return narrative;
}

return {
...narrative,
status: narrativeReady ? "ready" : "insufficient-data",
statusLabel: narrativeStatusLabel,
requirement: narrativeReady
? `Live narrative available. Board Health ${boardHealthIndex}/100, Enterprise Score ${enterpriseProcurementScore}/100, Executive Readiness ${executiveReadinessScore}/100, Industry Benchmark ${industryBenchmarkScore}/100, Executive Status ${executiveStatus}, Risk Index ${procurementRiskIndex}/100.`
: narrative.requirement,
};
});

const executiveNarrativeInsight = narrativeReady
? `Nexus Pavilion has sufficient validated executive intelligence to generate board and leadership narratives. Current signals show ${executiveBenchmarkStatus} benchmark readiness, ${executiveStatus.toLowerCase()} executive status, ${industryBenchmarkScore}/100 industry benchmark strength, ${supplierEngagementScore}/100 supplier engagement, and ${procurementRiskIndex}/100 procurement risk exposure.`
: "Executive narrative generation remains locked until Nexus Pavilion has enough validated procurement activity, supplier participation, awards, risk signals, and financial impact evidence.";

return (
<section className="mt-8 rounded-3xl border border-slate-200 bg-white p-8">
<div className="flex flex-wrap items-start justify-between gap-6">
<div>
<p className="text-xs font-black uppercase tracking-[0.25em] text-slate-400">
Executive Narrative Governance
</p>

<h2 className="mt-3 text-3xl font-black text-slate-950">
AI Board Narrative Generator
</h2>

<p className="mt-3 max-w-4xl text-sm leading-7 text-slate-600">
Executive narratives are intentionally locked until Nexus Pavilion
has validated procurement data. The platform does not generate
board-facing language from placeholder metrics, fake scores, or
unverified analytics.
</p>
</div>

<div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
<p className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">
Data Policy
</p>
<p className="mt-2 text-sm font-bold text-slate-800">
No fake AI narratives
</p>
</div>
</div>

<section className="mt-8 rounded-3xl border border-slate-200 bg-slate-50 p-6">
<p className="text-xs font-black uppercase tracking-[0.25em] text-orange-500">
Board Readiness Intelligence
</p>

<div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
<NarrativeMetric
title="Board Health"
value={`${boardHealthIndex}/100`}
/>

<NarrativeMetric
title="Benchmark Readiness"
value={`${benchmarkReadinessScore}/100`}
/>

<NarrativeMetric
title="Benchmark Status"
value={executiveBenchmarkStatus}
/>

<NarrativeMetric
title="Recommendation"
value={boardRecommendation}
/>
</div>
</section>

<section className="mt-6 rounded-3xl border border-slate-200 bg-white p-6">
<p className="text-xs font-black uppercase tracking-[0.25em] text-orange-500">
CEO Briefing Intelligence
</p>

<div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
<NarrativeMetric
title="Executive Status"
value={executiveStatus}
/>

<NarrativeMetric
title="Readiness Score"
value={`${executiveReadinessScore}/100`}
/>

<NarrativeMetric
title="Risk Index"
value={`${procurementRiskIndex}/100`}
/>

<NarrativeMetric
title="Enterprise Score"
value={`${enterpriseProcurementScore}/100`}
/>
</div>
</section>


<section className="mt-6 rounded-3xl border border-slate-200 bg-white p-6">
<p className="text-xs font-black uppercase tracking-[0.25em] text-orange-500">
Procurement Intelligence
</p>

<div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
<NarrativeMetric
title="Procurement Maturity"
value={`${procurementMaturityScore}/100`}
/>

<NarrativeMetric
title="Supplier Engagement"
value={`${supplierEngagementScore}/100`}
/>

<NarrativeMetric
title="Award Confidence"
value={awardPredictionConfidence}
/>

<NarrativeMetric
title="Industry Score"
value={`${industryBenchmarkScore}/100`}
/>
</div>
</section>

<div className="mt-8 grid gap-4 md:grid-cols-2">

{liveNarratives.map((narrative) => (

<div
key={narrative.title}
className="rounded-2xl border border-slate-200 bg-slate-50 p-5"
>
<div className="flex flex-wrap items-start justify-between gap-3">
<div>
<p className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">
{narrative.title}
</p>

<h3 className="mt-3 text-xl font-black text-slate-950">
{narrative.audience}
</h3>
</div>

<span
className={
narrative.status === "ready"
? "rounded-full border border-green-200 bg-green-50 px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-green-700"
: narrative.status === "coming-soon"
? "rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-blue-700"
: "rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-amber-700"
}
>
{narrative.statusLabel}
</span>
</div>

<p className="mt-4 text-sm font-semibold leading-7 text-slate-700">
{narrative.requirement}
</p>
</div>
))}
</div>

<div className="mt-8 grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
<div className="rounded-3xl border border-slate-200 bg-white p-6">
<p className="text-xs font-black uppercase tracking-[0.25em] text-slate-400">
Required Data
</p>

<div className="mt-4 grid gap-3">
{dataRequirements.map((item) => (
<div
key={item}
className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
>
<p className="text-sm font-bold text-slate-800">{item}</p>
</div>
))}
</div>
</div>

<div className="rounded-3xl border border-slate-950 bg-slate-950 p-6 text-white">
<p className="text-xs font-black uppercase tracking-[0.25em] text-slate-400">
Narrative Readiness
</p>

<h3 className="mt-4 text-2xl font-black">
{narrativeReady
? "Executive narrative generation is ready."
: "Executive narrative generation is locked."}
</h3>

<p className="mt-4 text-sm font-semibold leading-7 text-slate-300">
{executiveNarrativeInsight}
</p>

<p className="mt-4 text-sm font-semibold leading-7 text-slate-300">
{narrativeReady
? "Narratives are generated from validated Nexus Pavilion operating metrics, not placeholder language or decorative AI output."
: "Until then, this module remains in a transparent readiness state instead of producing decorative AI language."}
</p>

</div>
</div>
</section>
);
}
function NarrativeMetric({
title,
value,
}: {
title: string;
value: string;
}) {
return (
<div className="rounded-2xl border border-slate-200 bg-white p-4">
<p className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">
{title}
</p>

<p className="mt-3 text-lg font-black text-slate-950">
{value}
</p>
</div>
);
}