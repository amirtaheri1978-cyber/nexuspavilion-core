"use client";

import { useMemo, useState } from "react";

type NarrativeStatus = "ready" | "insufficient-data" | "coming-soon";

type ExecutiveNarrative = {
title: string;
audience: string;
status: NarrativeStatus;
statusLabel: string;
requirement: string;
narrative?: string;
};

type GeneratedNarrativePackage = {
title: string;
audience: string;
statusLabel: string;
generatedAt: string;
executiveInsight: string;
panels: {
title: string;
body: string;
}[];
};

type BoardNarrativeGeneratorProps = {
executiveBenchmarkStatus: string;
executiveStatus: string;
boardHealthIndex: number;
enterpriseProcurementScore: number;
executiveReadinessScore: number;
procurementRiskIndex: number;
supplierEngagementScore: number;
benchmarkReadinessScore: number;
boardRecommendation: string;
procurementMaturityScore: number;
decisionSupportReadinessScore: number;
decisionSupportReadinessLabel: string;
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
"Decision evidence metrics",
"Financial impact metrics",
];

const executiveEvidence = [
"RFQ Activity",
"Supplier Participation",
"Award Decisions",
"Risk Intelligence",
"Internal Benchmark Readiness",
"Financial Signals",
];

function getStatusClass(status: NarrativeStatus) {
if (status === "ready") {
return "border-emerald-300/20 bg-emerald-400/10 text-emerald-300";
}

if (status === "coming-soon") {
return "border-[#2CC4E8]/25 bg-[#2CC4E8]/10 text-[#9BE8F8]";
}

return "border-orange-300/20 bg-orange-400/10 text-orange-300";
}

function normalizeSentenceFragment(value: string) {
return value.trim().replace(/[.!?]+$/, "");
}

function generateBoardNarrative({
boardHealthIndex,
enterpriseProcurementScore,
executiveReadinessScore,
procurementRiskIndex,
benchmarkReadinessScore,
boardRecommendation,
}: Pick<
BoardNarrativeGeneratorProps,
| "boardHealthIndex"
| "enterpriseProcurementScore"
| "executiveReadinessScore"
| "procurementRiskIndex"
| "benchmarkReadinessScore"
| "boardRecommendation"
>) {
const normalizedRecommendation = normalizeSentenceFragment(boardRecommendation);

return `Nexus Pavilion is currently operating with a Board Health Index of ${boardHealthIndex}/100, an Enterprise Procurement Score of ${enterpriseProcurementScore}/100, and an Executive Readiness Score of ${executiveReadinessScore}/100. Internal benchmark readiness is ${benchmarkReadinessScore}/100. Current procurement risk exposure is ${procurementRiskIndex}/100. The board-level recommendation is: ${normalizedRecommendation}.`;
}

function generateCEONarrative({
executiveStatus,
executiveReadinessScore,
enterpriseProcurementScore,
supplierEngagementScore,
procurementRiskIndex,
}: Pick<
BoardNarrativeGeneratorProps,
| "executiveStatus"
| "executiveReadinessScore"
| "enterpriseProcurementScore"
| "supplierEngagementScore"
| "procurementRiskIndex"
>) {
return `Executive status is currently classified as ${executiveStatus}. The organization shows an executive readiness level of ${executiveReadinessScore}/100 and an enterprise procurement strength of ${enterpriseProcurementScore}/100. Supplier engagement is tracking at ${supplierEngagementScore}/100, while procurement risk exposure is ${procurementRiskIndex}/100.`;
}

function generateProcurementNarrative({
procurementMaturityScore,
supplierEngagementScore,
decisionSupportReadinessScore,
decisionSupportReadinessLabel,
benchmarkReadinessScore,
procurementRiskIndex,
}: Pick<
BoardNarrativeGeneratorProps,
| "procurementMaturityScore"
| "supplierEngagementScore"
| "decisionSupportReadinessScore"
| "decisionSupportReadinessLabel"
| "benchmarkReadinessScore"
| "procurementRiskIndex"
>) {
return `Procurement maturity is currently measured at ${procurementMaturityScore}/100, with supplier engagement at ${supplierEngagementScore}/100. Decision-support readiness is ${decisionSupportReadinessScore}/100 (${decisionSupportReadinessLabel}), and internal benchmark readiness is ${benchmarkReadinessScore}/100. Risk exposure remains visible at ${procurementRiskIndex}/100.`;
}

function generateBenchmarkNarrative({
executiveBenchmarkStatus,
benchmarkReadinessScore,
}: Pick<
BoardNarrativeGeneratorProps,
"executiveBenchmarkStatus" | "benchmarkReadinessScore"
>) {
return `Internal benchmark readiness is currently classified as ${executiveBenchmarkStatus} with a readiness score of ${benchmarkReadinessScore}/100. This is an internal operating-readiness measure and does not represent an external peer or industry percentile.`;
}

function generateRiskNarrative({
procurementRiskIndex,
supplierEngagementScore,
enterpriseProcurementScore,
}: Pick<
BoardNarrativeGeneratorProps,
"procurementRiskIndex" | "supplierEngagementScore" | "enterpriseProcurementScore"
>) {
if (procurementRiskIndex >= 70) {
return `Procurement risk exposure is elevated at ${procurementRiskIndex}/100. Supplier engagement is ${supplierEngagementScore}/100 and enterprise procurement strength is ${enterpriseProcurementScore}/100. Board visibility is recommended until supplier participation, quote coverage, and decision evidence improve.`;
}

if (procurementRiskIndex >= 45) {
return `Procurement risk exposure is moderate at ${procurementRiskIndex}/100. Supplier engagement and enterprise procurement performance should continue to be monitored where supplier coverage or evidence readiness may affect decision quality.`;
}

return `Procurement risk exposure is currently controlled at ${procurementRiskIndex}/100. Current signals suggest that procurement risk is manageable, though continued monitoring is required as RFQ volume, supplier participation, and award activity increase.`;
}

function generateRecommendationNarrative({
boardRecommendation,
boardHealthIndex,
executiveReadinessScore,
procurementRiskIndex,
}: Pick<
BoardNarrativeGeneratorProps,
| "boardRecommendation"
| "boardHealthIndex"
| "executiveReadinessScore"
| "procurementRiskIndex"
>) {
const normalizedRecommendation = normalizeSentenceFragment(boardRecommendation);

return `Recommended board action: ${normalizedRecommendation}. This recommendation is based on a Board Health Index of ${boardHealthIndex}/100, Executive Readiness of ${executiveReadinessScore}/100, and Procurement Risk Index of ${procurementRiskIndex}/100.`;
}

export default function BoardNarrativeGenerator({
executiveBenchmarkStatus,
executiveStatus,
boardHealthIndex,
enterpriseProcurementScore,
executiveReadinessScore,
procurementRiskIndex,
supplierEngagementScore,
benchmarkReadinessScore,
boardRecommendation,
procurementMaturityScore,
decisionSupportReadinessScore,
decisionSupportReadinessLabel,
}: BoardNarrativeGeneratorProps) {
const [generatedPackage, setGeneratedPackage] =
useState<GeneratedNarrativePackage | null>(null);
const [isGenerating, setIsGenerating] = useState(false);
const [copied, setCopied] = useState(false);
const [errorMessage, setErrorMessage] = useState("");

const generatedAt = useMemo(() => {
return new Date().toLocaleDateString("en-US", {
year: "numeric",
month: "long",
day: "numeric",
});
}, []);

const narrativeReady =
boardHealthIndex >= 55 &&
enterpriseProcurementScore >= 50 &&
executiveReadinessScore >= 50 &&
decisionSupportReadinessScore >= 50;

const narrativeStatusLabel = narrativeReady ? "Ready" : "Insufficient Data";

const boardNarrative = generateBoardNarrative({
boardHealthIndex,
enterpriseProcurementScore,
executiveReadinessScore,
procurementRiskIndex,
benchmarkReadinessScore,
boardRecommendation,
});

const ceoNarrative = generateCEONarrative({
executiveStatus,
executiveReadinessScore,
enterpriseProcurementScore,
supplierEngagementScore,
procurementRiskIndex,
});

const procurementNarrative = generateProcurementNarrative({
procurementMaturityScore,
supplierEngagementScore,
decisionSupportReadinessScore,
decisionSupportReadinessLabel,
benchmarkReadinessScore,
procurementRiskIndex,
});

const benchmarkNarrative = generateBenchmarkNarrative({
executiveBenchmarkStatus,
benchmarkReadinessScore,
});

const riskNarrative = generateRiskNarrative({
procurementRiskIndex,
supplierEngagementScore,
enterpriseProcurementScore,
});

const recommendationNarrative = generateRecommendationNarrative({
boardRecommendation,
boardHealthIndex,
executiveReadinessScore,
procurementRiskIndex,
});

const liveNarratives: ExecutiveNarrative[] = narratives.map((narrative) => {
if (narrative.status === "coming-soon") {
return narrative;
}

const generatedNarrative =
narrative.title === "Board Narrative"
? boardNarrative
: narrative.title === "CEO Narrative"
? ceoNarrative
: procurementNarrative;

return {
...narrative,
status: narrativeReady ? "ready" : "insufficient-data",
statusLabel: narrativeStatusLabel,
narrative: narrativeReady ? generatedNarrative : undefined,
requirement: narrativeReady
? "Deterministic narrative assembled from validated Nexus Pavilion executive intelligence."
: narrative.requirement,
};
});

const executiveNarrativeInsight = narrativeReady
? `Nexus Pavilion has sufficient validated executive intelligence to assemble board and leadership narratives. Current signals show ${executiveBenchmarkStatus} internal benchmark readiness, ${executiveStatus.toLowerCase()} executive status, ${benchmarkReadinessScore}/100 internal benchmark readiness, ${decisionSupportReadinessScore}/100 (${decisionSupportReadinessLabel}) decision-support readiness, ${supplierEngagementScore}/100 supplier engagement, and ${procurementRiskIndex}/100 procurement risk exposure.`
: "Executive narrative assembly remains locked until Nexus Pavilion has enough validated procurement activity, supplier participation, awards, risk signals, decision evidence, and financial impact evidence.";

const packageText = useMemo(() => {
if (!narrativeReady || !generatedPackage) return "";

return `${generatedPackage.title}

Audience:
${generatedPackage.audience}

Status:
${generatedPackage.statusLabel}

Generated:
${generatedPackage.generatedAt}

Executive Insight:
${generatedPackage.executiveInsight}

Narrative Package:
${generatedPackage.panels
.map((panel) => `${panel.title}:\n${panel.body}`)
.join("\n\n")}`;
}, [generatedPackage, narrativeReady]);

function generateNarrativePackage() {
if (!narrativeReady) {
setGeneratedPackage(null);
setCopied(false);
setErrorMessage("");
return;
}

setIsGenerating(true);
setErrorMessage("");
setCopied(false);

try {
window.setTimeout(() => {
setGeneratedPackage({
title: "Board Narrative Package",
audience: "Board Members / Executive Leadership",
statusLabel: narrativeStatusLabel,
generatedAt,
executiveInsight: executiveNarrativeInsight,
panels: [
{ title: "Executive Summary", body: boardNarrative },
{ title: "Risk Assessment", body: riskNarrative },
{ title: "Internal Benchmark Readiness", body: benchmarkNarrative },
{
title: "Board Recommendation",
body: recommendationNarrative,
},
],
});

setIsGenerating(false);
}, 450);
} catch {
setErrorMessage(
"Unable to generate the executive narrative package. Please try again.",
);
setIsGenerating(false);
}
}

async function copyNarrativePackage() {
if (!narrativeReady || !packageText) return;

await navigator.clipboard.writeText(packageText);
setCopied(true);

window.setTimeout(() => {
setCopied(false);
}, 2500);
}

function printNarrativePackage() {
if (!narrativeReady || !generatedPackage) return;

const packageElement = document.getElementById(
"board-narrative-print-area",
);

if (!packageElement) return;

const printWindow = window.open("", "_blank", "width=1200,height=900");

if (!printWindow) return;

const styles = Array.from(
document.querySelectorAll("style, link[rel='stylesheet']"),
)
.map((node) => node.outerHTML)
.join("\n");

printWindow.document.write(`
<!DOCTYPE html>
<html>
<head>
<title>Nexus Pavilion Board Narrative Package</title>
${styles}
<style>
@page { size: A4; margin: 14mm; }
body { margin: 0; background: white; }
.no-print { display: none !important; }
#board-narrative-print-area {
margin: 0 !important;
box-shadow: none !important;
border: none !important;
}
</style>
</head>
<body>
${packageElement.outerHTML}
<script>
window.onload = function () {
setTimeout(function () {
window.focus();
window.print();
}, 500);
};
</script>
</body>
</html>
`);

printWindow.document.close();
}

return (
<section className="mt-8 rounded-[34px] border border-white/10 bg-[#061426]/88 p-6 text-white shadow-executive sm:p-8">
<div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
<div>
<p className="text-[11px] font-black uppercase tracking-[0.34em] text-[#C8A646]">
Executive Narrative Governance
</p>

<h2 className="mt-4 text-3xl font-black leading-tight text-white sm:text-4xl">
Board Narrative Generator
</h2>

<p className="mt-4 max-w-4xl text-sm font-semibold leading-7 text-slate-400">
Executive narratives are assembled deterministically only when Nexus Pavilion has
enough validated procurement intelligence. Placeholder board
language and unverified executive claims remain blocked.
</p>
</div>

<div className="rounded-[26px] border border-[#C8A646]/20 bg-[#C8A646]/10 p-5">
<p className="text-[10px] font-black uppercase tracking-[0.24em] text-[#F5D77B]">
Evidence Policy
</p>

<p className="mt-2 text-sm font-black text-white">
Validated evidence only
</p>

<p className="mt-2 text-xs font-semibold leading-5 text-slate-500">
Narrative generation remains locked until evidence is sufficient.
</p>
</div>
</div>

{errorMessage ? (
<div className="mt-6 rounded-2xl border border-red-400/20 bg-red-400/10 p-4 text-sm font-bold text-red-200">
{errorMessage}
</div>
) : null}

<section className="mt-8 rounded-[30px] border border-white/10 bg-white/[0.045] p-6">
<div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
<div>
<p className="text-[10px] font-black uppercase tracking-[0.28em] text-[#C8A646]">
Board Readiness Intelligence
</p>

<h3 className="mt-3 text-2xl font-black text-white">
Executive Narrative Inputs
</h3>
</div>

<span
className={`rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] ${getStatusClass(
narrativeReady ? "ready" : "insufficient-data",
)}`}
>
{narrativeStatusLabel}
</span>
</div>

<div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
<NarrativeMetric title="Board Health" value={`${boardHealthIndex}/100`} />
<NarrativeMetric
title="Internal Benchmark Readiness"
value={`${benchmarkReadinessScore}/100`}
/>
<NarrativeMetric
title="Decision Evidence Readiness"
value={`${decisionSupportReadinessScore}/100`}
/>
<NarrativeMetric title="Recommendation" value={boardRecommendation} />
</div>

<div className="mt-6 flex flex-wrap gap-3">
<button
type="button"
onClick={generateNarrativePackage}
disabled={isGenerating || !narrativeReady}
title={
narrativeReady
? undefined
: "Narrative generation is locked until validated evidence reaches the minimum executive readiness threshold."
}
className="rounded-full bg-[#C8A646] px-6 py-3 text-sm font-black text-slate-950 transition hover:bg-[#F5D77B] disabled:cursor-not-allowed disabled:opacity-70"
>
{!narrativeReady
? "Narrative Locked"
: isGenerating
? "Generating..."
: generatedPackage
? "Regenerate Board Narrative"
: "Generate Board Narrative"}
</button>

{narrativeReady && generatedPackage ? (
<>
<button
type="button"
onClick={printNarrativePackage}
className="rounded-full border border-white/10 bg-white/10 px-6 py-3 text-sm font-black text-white transition hover:bg-white/15"
>
Print / Save PDF
</button>

<button
type="button"
onClick={copyNarrativePackage}
className="rounded-full border border-white/10 bg-transparent px-6 py-3 text-sm font-black text-white transition hover:bg-white/10"
>
{copied ? "Copied" : "Copy Package"}
</button>
</>
) : null}
</div>
</section>

<section className="mt-6 grid gap-6 xl:grid-cols-2">
<div className="rounded-[30px] border border-white/10 bg-white/[0.045] p-6">
<p className="text-[10px] font-black uppercase tracking-[0.28em] text-[#C8A646]">
CEO Briefing Intelligence
</p>

<div className="mt-6 grid gap-4 md:grid-cols-2">
<NarrativeMetric title="Executive Status" value={executiveStatus} />
<NarrativeMetric
title="Readiness Score"
value={`${executiveReadinessScore}/100`}
/>
<NarrativeMetric title="Risk Index" value={`${procurementRiskIndex}/100`} />
<NarrativeMetric
title="Enterprise Score"
value={`${enterpriseProcurementScore}/100`}
/>
</div>
</div>

<div className="rounded-[30px] border border-white/10 bg-white/[0.045] p-6">
<p className="text-[10px] font-black uppercase tracking-[0.28em] text-[#C8A646]">
Procurement Intelligence
</p>

<div className="mt-6 grid gap-4 md:grid-cols-2">
<NarrativeMetric
title="Procurement Maturity"
value={`${procurementMaturityScore}/100`}
/>
<NarrativeMetric
title="Supplier Engagement"
value={`${supplierEngagementScore}/100`}
/>
<NarrativeMetric
title="Decision Evidence Readiness"
value={`${decisionSupportReadinessScore}/100 · ${decisionSupportReadinessLabel}`}
/>
<NarrativeMetric
title="Internal Benchmark Readiness"
value={`${benchmarkReadinessScore}/100`}
/>
</div>
</div>
</section>

<section className="mt-6 rounded-[30px] border border-[#2CC4E8]/15 bg-[#2CC4E8]/[0.045] p-6">
<p className="text-[10px] font-black uppercase tracking-[0.28em] text-[#9BE8F8]">
Executive Evidence Layer
</p>

<p className="mt-3 max-w-4xl text-sm font-semibold leading-7 text-slate-400">
Executive intelligence is supported by validated procurement evidence
rather than generated assumptions.
</p>

<div className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
{executiveEvidence.map((item) => (
<div
key={item}
className="rounded-[18px] border border-white/10 bg-[#061426]/70 p-4"
>
<p className="text-sm font-bold text-white">{item}</p>
</div>
))}
</div>
</section>

<div className="mt-6 grid gap-4 md:grid-cols-2">
{liveNarratives.map((narrative) => (
<div
key={narrative.title}
className="rounded-[26px] border border-white/10 bg-white/[0.045] p-5"
>
<div className="flex flex-wrap items-start justify-between gap-3">
<div>
<p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-500">
{narrative.title}
</p>

<h3 className="mt-3 text-xl font-black text-white">
{narrative.audience}
</h3>
</div>

<span
className={`rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] ${getStatusClass(
narrative.status,
)}`}
>
{narrative.statusLabel}
</span>
</div>

<p className="mt-4 text-sm font-semibold leading-7 text-slate-400">
{narrative.requirement}
</p>

{narrative.narrative ? (
<div className="mt-5 rounded-[20px] border border-[#2CC4E8]/15 bg-[#2CC4E8]/[0.045] p-5">
<p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#9BE8F8]">
Deterministic Narrative
</p>

<p className="mt-3 text-sm font-semibold leading-7 text-slate-300">
{narrative.narrative}
</p>
</div>
) : null}
</div>
))}
</div>

{narrativeReady && generatedPackage ? (
<section
id="board-narrative-print-area"
className="mt-6 rounded-[30px] border border-[#C8A646]/20 bg-[#C8A646]/[0.055] p-6"
>
<p className="text-[10px] font-black uppercase tracking-[0.28em] text-[#F5D77B]">
{generatedPackage.title}
</p>

<h3 className="mt-4 text-2xl font-black text-white">
{generatedPackage.statusLabel === "Ready"
? "Executive narrative package is ready."
: "Executive narrative package is locked."}
</h3>

<p className="mt-3 max-w-4xl text-sm font-semibold leading-7 text-slate-400">
{generatedPackage.executiveInsight}
</p>

<div className="mt-6 grid gap-4 lg:grid-cols-2">
{generatedPackage.panels.map((panel) => (
<NarrativePanel
key={panel.title}
title={panel.title}
body={panel.body}
/>
))}
</div>
</section>
) : null}

<div className="mt-6 grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
<div className="rounded-[30px] border border-white/10 bg-white/[0.045] p-6">
<p className="text-[10px] font-black uppercase tracking-[0.28em] text-slate-500">
Required Data
</p>

<div className="mt-4 grid gap-3">
{dataRequirements.map((item) => (
<div
key={item}
className="rounded-[18px] border border-white/10 bg-[#061426]/70 p-4"
>
<p className="text-sm font-bold text-slate-300">{item}</p>
</div>
))}
</div>
</div>

<div className="rounded-[30px] border border-white/10 bg-[#061426]/80 p-6">
<p className="text-[10px] font-black uppercase tracking-[0.28em] text-slate-500">
Narrative Readiness
</p>

<h3 className="mt-4 text-2xl font-black text-white">
{narrativeReady
? "Executive narrative assembly is ready."
: "Executive narrative assembly is locked."}
</h3>

<p className="mt-4 text-sm font-semibold leading-7 text-slate-400">
{executiveNarrativeInsight}
</p>

<p className="mt-4 text-sm font-semibold leading-7 text-slate-400">
{narrativeReady
? "Narratives are assembled deterministically from validated Nexus Pavilion operating metrics and recorded decision evidence."
: "Until then, this module remains in a transparent readiness state and does not assemble a board-facing narrative."}
</p>
</div>
</div>
</section>
);
}

function NarrativeMetric({ title, value }: { title: string; value: string }) {
return (
<div className="rounded-[20px] border border-white/10 bg-[#061426]/70 p-4">
<p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">
{title}
</p>

<p className="mt-3 text-lg font-black text-white">{value}</p>
</div>
);
}

function NarrativePanel({ title, body }: { title: string; body: string }) {
return (
<div className="rounded-[22px] border border-white/10 bg-[#061426]/70 p-5">
<p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#C8A646]">
{title}
</p>

<p className="mt-3 text-sm font-semibold leading-7 text-slate-300">
{body}
</p>
</div>
);
}