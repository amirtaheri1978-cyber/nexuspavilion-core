"use client";

import { useMemo, useState } from "react";

type ReportType = "board" | "ceo" | "cfo" | "procurement";
type ReportStatus = "ready" | "insufficient-data" | "coming-soon";

type ExecutiveReport = {
id: ReportType;
title: string;
audience: string;
subtitle: string;
status: ReportStatus;
statusLabel: string;
primaryRequirement: string;
};

type GeneratedReportBody = {
summary: string;
sections: {
title: string;
body: string;
}[];
};

type BoardReportGeneratorProps = {
procurementRiskIndex: number;
procurementMaturityScore: number;
decisionSupportReadinessScore: number;
dataQualityScore: number;
supplierDependencyRisk: string;
concentrationLevel: string;
benchmarkReadinessScore: number;
boardHealthIndex: number;
enterpriseProcurementScore: number;
executiveReadinessScore: number;
procurementEfficiencyScore: number;
supplierEngagementScore: number;
digitalMaturityScore: number;
};

const reports: ExecutiveReport[] = [
{
id: "board",
title: "Board Report",
audience: "Board Members",
subtitle:
"Enterprise procurement performance, governance exposure, risk posture, and strategic decision readiness.",
status: "insufficient-data",
statusLabel: "Insufficient Data",
primaryRequirement:
"Requires validated RFQ, supplier, quote, award, risk, and financial impact data.",
},
{
id: "ceo",
title: "CEO Brief",
audience: "Chief Executive Officer",
subtitle:
"Executive overview of procurement momentum, supplier network health, and operational readiness.",
status: "insufficient-data",
statusLabel: "Insufficient Data",
primaryRequirement:
"Requires live procurement activity and supplier engagement history.",
},
{
id: "cfo",
title: "CFO Brief",
audience: "Chief Financial Officer",
subtitle:
"Spend visibility, savings opportunity, awarded volume, decision evidence, and budget exposure.",
status: "coming-soon",
statusLabel: "Coming Soon",
primaryRequirement:
"Requires financial analytics, awarded contract value, quote variance, and savings calculations.",
},
{
id: "procurement",
title: "Procurement Report",
audience: "Procurement Leadership",
subtitle:
"RFQ execution, supplier participation, quote coverage, award cycle performance, and workflow quality.",
status: "insufficient-data",
statusLabel: "Insufficient Data",
primaryRequirement:
"Requires completed RFQ-to-award workflow activity from live procurement operations.",
},
];

const requiredDataSources = [
"RFQ records",
"Supplier participation",
"Submitted quotes",
"Award decisions",
"Supplier risk signals",
"Decision-support readiness",
"Savings or cost-avoidance calculations",
];

const operationalNextSteps = [
"Create live RFQs with real procurement requirements.",
"Invite suppliers and collect validated quote responses.",
"Complete award workflows to establish decision history.",
"Connect risk and decision-evidence readiness to the executive reporting layer.",
"Generate executive reports only after sufficient validated data exists.",
];

function getReportStatusClass({
status,
boardReady,
}: {
status: ReportStatus;
boardReady: boolean;
}) {
if (status === "coming-soon") {
return "border-[#2CC4E8]/25 bg-[#2CC4E8]/10 text-[#9BE8F8]";
}

if (boardReady) {
return "border-emerald-300/20 bg-emerald-400/10 text-emerald-300";
}

return "border-orange-300/20 bg-orange-400/10 text-orange-300";
}

function getRiskNarrative(procurementRiskIndex: number) {
if (procurementRiskIndex >= 70) {
return "Procurement risk exposure is elevated and should remain visible at the board and executive level until supplier coverage, concentration exposure, and decision evidence improve.";
}

if (procurementRiskIndex >= 45) {
return "Procurement risk exposure is moderate. Leadership should continue monitoring supplier dependency, concentration level, and procurement decision quality.";
}

return "Procurement risk exposure is currently controlled. Continued monitoring is still required as procurement activity, supplier participation, and award workflows scale.";
}

function generateReportBody({
report,
boardReady,
procurementRiskIndex,
procurementMaturityScore,
decisionSupportReadinessScore,
dataQualityScore,
supplierDependencyRisk,
concentrationLevel,
benchmarkReadinessScore,
boardHealthIndex,
enterpriseProcurementScore,
executiveReadinessScore,
procurementEfficiencyScore,
supplierEngagementScore,
digitalMaturityScore,
}: {
report: ExecutiveReport;
boardReady: boolean;
} & BoardReportGeneratorProps): GeneratedReportBody {
if (!boardReady || report.id === "cfo") {
return {
summary:
report.id === "cfo"
? "The CFO Brief is intentionally held in Coming Soon status until awarded contract value, quote variance, savings calculations, and budget exposure analytics are available."
: "This report is not generated because Nexus Pavilion does not yet have enough validated procurement data to produce a board-grade executive report.",
sections: [
{
title: "Primary Requirement",
body: report.primaryRequirement,
},
{
title: "Required Data Sources",
body: requiredDataSources.join(", "),
},
{
title: "Operational Next Steps",
body: operationalNextSteps.join(" "),
},
{
title: "Decision Readiness",
body: "Executive decisions should not be generated from placeholder data, mock scores, or unverified analytics.",
},
],
};
}

const riskNarrative = getRiskNarrative(procurementRiskIndex);

if (report.id === "ceo") {
return {
summary: `Nexus Pavilion is ready to produce a CEO-level executive brief. Executive readiness is ${executiveReadinessScore}/100, enterprise procurement strength is ${enterpriseProcurementScore}/100, and supplier engagement is ${supplierEngagementScore}/100.`,
sections: [
{
title: "Executive Momentum",
body: `Procurement performance shows an enterprise score of ${enterpriseProcurementScore}/100 with digital maturity at ${digitalMaturityScore}/100.`,
},
{
title: "Supplier Network Health",
body: `Supplier engagement is currently ${supplierEngagementScore}/100. Supplier dependency risk is classified as ${supplierDependencyRisk}, with vendor concentration marked as ${concentrationLevel}.`,
},
{
title: "Risk Visibility",
body: riskNarrative,
},
{
title: "CEO Action",
body: "Maintain executive visibility over supplier participation, procurement throughput, award activity, and risk exposure as procurement operations scale.",
},
],
};
}

if (report.id === "procurement") {
return {
summary: `Nexus Pavilion is ready to produce a procurement leadership report. Procurement maturity is ${procurementMaturityScore}/100, procurement efficiency is ${procurementEfficiencyScore}/100, and decision-support readiness is ${decisionSupportReadinessScore}/100.`,
sections: [
{
title: "Procurement Execution",
body: `Procurement maturity is ${procurementMaturityScore}/100 and efficiency is ${procurementEfficiencyScore}/100.`,
},
{
title: "Supplier Participation",
body: `Supplier engagement is ${supplierEngagementScore}/100. Dependency risk is ${supplierDependencyRisk}, while concentration level is ${concentrationLevel}.`,
},
{
title: "Decision Evidence",
body: `Decision-support readiness is ${decisionSupportReadinessScore}/100, with data quality at ${dataQualityScore}/100.`,
},
{
title: "Operational Focus",
body: "Prioritize RFQ completion, supplier response depth, quote coverage, award history, and risk signal validation.",
},
],
};
}
return {
summary: `Nexus Pavilion is ready to produce a board-grade executive report. Board Health is ${boardHealthIndex}/100, Enterprise Procurement Score is ${enterpriseProcurementScore}/100, Executive Readiness is ${executiveReadinessScore}/100, and Decision-Support Readiness is ${decisionSupportReadinessScore}/100.`,
sections: [
{
title: "Executive Summary",
body: `Procurement intelligence has reached a board-reportable threshold. The current operating profile shows Board Health at ${boardHealthIndex}/100, Enterprise Procurement Score at ${enterpriseProcurementScore}/100, and Benchmark Readiness at ${benchmarkReadinessScore}/100.`,
},
{
title: "Strategic Highlights",
body: `Procurement maturity is ${procurementMaturityScore}/100, procurement efficiency is ${procurementEfficiencyScore}/100, supplier engagement is ${supplierEngagementScore}/100, and digital maturity is ${digitalMaturityScore}/100.`,
},
{
title: "Risk Assessment",
body: `${riskNarrative} Supplier dependency risk is ${supplierDependencyRisk}, vendor concentration is ${concentrationLevel}, and procurement risk index is ${procurementRiskIndex}/100.`,
},
{
title: "Decision Evidence",
body: `Decision-support readiness is ${decisionSupportReadinessScore}/100, with data quality at ${dataQualityScore}/100.`,
},
{
title: "Benchmark Position",
body: `Benchmark readiness is ${benchmarkReadinessScore}/100.`,
},
{
title: "Board Recommendation",
body: "Continue scaling validated procurement activity while maintaining governance over supplier concentration, decision evidence, and executive reporting quality.",
},
],
};
}

export default function BoardReportGenerator(props: BoardReportGeneratorProps) {
const {
procurementRiskIndex,
procurementMaturityScore,
decisionSupportReadinessScore,
dataQualityScore,
supplierDependencyRisk,
concentrationLevel,
benchmarkReadinessScore,
boardHealthIndex,
enterpriseProcurementScore,
executiveReadinessScore,
procurementEfficiencyScore,
supplierEngagementScore,
digitalMaturityScore,
} = props;

const [activeReport, setActiveReport] = useState<ExecutiveReport | null>(null);
const [activeReportBody, setActiveReportBody] =
useState<GeneratedReportBody | null>(null);
const [isGenerating, setIsGenerating] = useState(false);
const [generatingReportId, setGeneratingReportId] =
useState<ReportType | null>(null);
const [errorMessage, setErrorMessage] = useState("");
const [copied, setCopied] = useState(false);

const generatedAt = useMemo(
() =>
new Date().toLocaleDateString("en-US", {
year: "numeric",
month: "long",
day: "numeric",
}),
[],
);

const boardReady =
procurementMaturityScore >= 50 &&
benchmarkReadinessScore >= 50 &&
enterpriseProcurementScore >= 50 &&
decisionSupportReadinessScore >= 50;

const reportStatusLabel = boardReady ? "Ready" : "Insufficient Data";

const executiveSummary = useMemo(() => {
if (!activeReport || !activeReportBody) return "";

return `${activeReport.title}

Audience:
${activeReport.audience}

Status:
${activeReport.id === "cfo" ? activeReport.statusLabel : reportStatusLabel}

Summary:
${activeReportBody.summary}

Report Sections:
${activeReportBody.sections
.map((section) => `${section.title}:\n${section.body}`)
.join("\n\n")}

Executive Metrics:
- Procurement Risk Index: ${procurementRiskIndex}/100
- Procurement Maturity Score: ${procurementMaturityScore}/100
- Decision-Support Readiness: ${decisionSupportReadinessScore}/100
- Data Quality: ${dataQualityScore}/100
- Supplier Dependency Risk: ${supplierDependencyRisk}
- Vendor Concentration: ${concentrationLevel}
- Benchmark Readiness Score: ${benchmarkReadinessScore}/100
- Board Health Index: ${boardHealthIndex}/100
- Enterprise Procurement Score: ${enterpriseProcurementScore}/100
- Executive Readiness Score: ${executiveReadinessScore}/100
- Procurement Efficiency Score: ${procurementEfficiencyScore}/100
- Supplier Engagement Score: ${supplierEngagementScore}/100
- Digital Maturity Score: ${digitalMaturityScore}/100

Decision Readiness:
Executive decisions are generated only from validated Nexus Pavilion operating intelligence.`;
}, [
activeReport,
activeReportBody,
reportStatusLabel,
procurementRiskIndex,
procurementMaturityScore,
decisionSupportReadinessScore,
dataQualityScore,
supplierDependencyRisk,
concentrationLevel,
benchmarkReadinessScore,
boardHealthIndex,
enterpriseProcurementScore,
executiveReadinessScore,
procurementEfficiencyScore,
supplierEngagementScore,
digitalMaturityScore,
]);

async function generateReport(report: ExecutiveReport) {
setIsGenerating(true);
setGeneratingReportId(report.id);
setErrorMessage("");
setCopied(false);

try {
window.setTimeout(() => {
const body = generateReportBody({
report,
boardReady,
...props,
});

setActiveReport(report);
setActiveReportBody(body);
setIsGenerating(false);
setGeneratingReportId(null);
}, 450);
} catch {
setErrorMessage("Unable to generate this executive report. Please try again.");
setIsGenerating(false);
setGeneratingReportId(null);
}
}

async function copySummary() {
if (!executiveSummary) return;

await navigator.clipboard.writeText(executiveSummary);
setCopied(true);

window.setTimeout(() => {
setCopied(false);
}, 2500);
}

function printReport() {
const reportElement = document.getElementById("board-report-print-area");

if (!reportElement) return;

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
<title>Nexus Pavilion Executive Report</title>
${styles}
<style>
@page { size: A4; margin: 14mm; }
body { margin: 0; background: white; }
.no-print { display: none !important; }
#board-report-print-area {
margin: 0 !important;
box-shadow: none !important;
border: none !important;
}
</style>
</head>
<body>
${reportElement.outerHTML}
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
<div className="no-print flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
<div>
<p className="text-[11px] font-black uppercase tracking-[0.34em] text-[#C8A646]">
Executive Reporting Center
</p>

<h2 className="mt-4 text-3xl font-black leading-tight text-white sm:text-4xl">
Board Presentation Generator
</h2>

<p className="mt-4 max-w-4xl text-sm font-semibold leading-7 text-slate-400">
Generate board-ready procurement reports only when validated
operating data is available. Placeholder metrics, fake scores, and
unverified AI narratives remain blocked.
</p>
</div>

<div className="rounded-[26px] border border-[#2CC4E8]/15 bg-[#2CC4E8]/[0.055] p-5">
<p className="text-[10px] font-black uppercase tracking-[0.24em] text-[#9BE8F8]">
Reporting Standard
</p>

<p className="mt-2 text-sm font-black text-white">
Truth-first. Data-first. Decision-ready.
</p>

<p className="mt-2 text-xs font-semibold leading-5 text-slate-500">
Reports are generated only from validated Nexus Pavilion operating
intelligence.
</p>
</div>
</div>
{errorMessage ? (
<div className="no-print mt-6 rounded-2xl border border-red-400/20 bg-red-400/10 p-4 text-sm font-bold text-red-200">
{errorMessage}
</div>
) : null}

<div className="no-print mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
{reports.map((report) => {
const currentStatusLabel =
report.id === "cfo" ? report.statusLabel : reportStatusLabel;

const statusClass = getReportStatusClass({
status: report.id === "cfo" ? "coming-soon" : report.status,
boardReady,
});

const isActive = activeReport?.id === report.id;
const isButtonLoading = generatingReportId === report.id;

return (
<button
key={report.id}
type="button"
disabled={isGenerating}
onClick={() => generateReport(report)}
className={[
"group rounded-[28px] border p-6 text-left transition hover:-translate-y-1 disabled:cursor-not-allowed disabled:opacity-70",
isActive
? "border-[#2CC4E8]/35 bg-[#2CC4E8]/10 shadow-[0_0_55px_rgba(44,196,232,0.12)]"
: "border-white/10 bg-white/[0.045] hover:border-[#2CC4E8]/25 hover:bg-white/[0.06]",
].join(" ")}
>
<div className="flex items-center justify-between gap-3">
<p className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-500">
{report.title}
</p>

<span
className={`rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] ${statusClass}`}
>
{currentStatusLabel}
</span>
</div>

<h3 className="mt-5 text-xl font-black text-white">
{report.audience}
</h3>

<p className="mt-4 text-sm font-semibold leading-7 text-slate-400">
{report.subtitle}
</p>

<span className="mt-5 inline-flex rounded-full border border-[#2CC4E8]/25 bg-[#2CC4E8]/10 px-4 py-2 text-xs font-black text-[#9BE8F8] transition group-hover:bg-[#2CC4E8]/15">
{isButtonLoading
? "Generating..."
: report.id === "board"
? "Generate Board Deck"
: report.id === "ceo"
? "Generate CEO Brief"
: report.id === "cfo"
? "Preview CFO Brief"
: "Generate Procurement Report"}
</span>
</button>
);
})}
</div>

{!boardReady ? (
<div className="no-print mt-8 rounded-[28px] border border-orange-300/15 bg-orange-400/10 p-6">
<p className="text-[10px] font-black uppercase tracking-[0.28em] text-orange-300">
Operational Next Steps
</p>

<div className="mt-5 grid gap-3 md:grid-cols-2">
{operationalNextSteps.map((step, index) => (
<div
key={step}
className="rounded-2xl border border-white/10 bg-black/15 p-4"
>
<p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">
Step {index + 1}
</p>

<p className="mt-2 text-sm font-bold leading-6 text-slate-300">
{step}
</p>
</div>
))}
</div>
</div>
) : null}

{activeReport && activeReportBody ? (
<div
id="board-report-print-area"
className="mt-10 overflow-hidden rounded-[30px] border border-white/10 bg-white text-slate-950 shadow-xl"
>
<header className="border-b border-slate-200 bg-white p-8 sm:p-10">
<div className="flex flex-col gap-8 xl:flex-row xl:items-start xl:justify-between">
<div>
<p className="text-xs font-black uppercase tracking-[0.35em] text-slate-400">
Nexus Pavilion Executive Intelligence
</p>

<h3 className="mt-5 text-3xl font-black text-slate-950 sm:text-4xl">
{activeReport.title}
</h3>

<p className="mt-4 max-w-3xl text-sm font-semibold leading-7 text-slate-600">
{activeReport.subtitle}
</p>

<div className="mt-8 grid gap-3 text-sm text-slate-600 md:grid-cols-2">
<div>
<p className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">
Prepared For
</p>
<p className="mt-2 font-bold text-slate-950">
{activeReport.audience}
</p>
</div>

<div>
<p className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">
Generated
</p>
<p className="mt-2 font-bold text-slate-950">
{generatedAt}
</p>
</div>
</div>
</div>

<div
className={
activeReport.id === "cfo"
? "rounded-2xl border border-blue-200 bg-blue-50 p-5 text-blue-800"
: boardReady
? "rounded-2xl border border-green-200 bg-green-50 p-5 text-green-800"
: "rounded-2xl border border-amber-200 bg-amber-50 p-5 text-amber-800"
}
>
<p className="text-xs font-black uppercase tracking-[0.2em]">
Report Status
</p>
<p className="mt-2 text-2xl font-black">
{activeReport.id === "cfo"
? activeReport.statusLabel
: reportStatusLabel}
</p>
</div>
</div>
</header>
<main className="grid gap-0 lg:grid-cols-[0.85fr_1.15fr]">
<aside className="border-r border-slate-200 bg-slate-50 p-8">
<p className="text-xs font-black uppercase tracking-[0.25em] text-slate-400">
Data Policy
</p>

<div className="mt-5 space-y-4">
<PolicyCard label="Fake KPIs" value="Blocked" />
<PolicyCard label="Mock Scores" value="Blocked" />
<PolicyCard label="Placeholder AI" value="Blocked" />
<PolicyCard label="Unverified Reports" value="Blocked" />
</div>

<div className="mt-8 rounded-3xl border border-slate-200 bg-white p-5">
<p className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">
Primary Requirement
</p>

<p className="mt-3 text-sm font-semibold leading-7 text-slate-700">
{activeReport.primaryRequirement}
</p>
</div>
</aside>

<section className="p-8">
<section>
<p className="text-xs font-black uppercase tracking-[0.25em] text-slate-400">
Executive Summary
</p>

<div className="mt-4 rounded-3xl border border-slate-200 bg-white p-6">
<p className="text-sm font-semibold leading-7 text-slate-700">
{activeReportBody.summary}
</p>
</div>
</section>

<section className="mt-8">
<p className="text-xs font-black uppercase tracking-[0.25em] text-slate-400">
Report Narrative
</p>

<div className="mt-4 space-y-4">
{activeReportBody.sections.map((section) => (
<div
key={section.title}
className="rounded-3xl border border-slate-200 bg-slate-50 p-6"
>
<p className="text-xs font-black uppercase tracking-[0.2em] text-[#0B3D91]">
{section.title}
</p>

<p className="mt-3 text-sm font-semibold leading-7 text-slate-700">
{section.body}
</p>
</div>
))}
</div>
</section>

<section className="mt-8">
<p className="text-xs font-black uppercase tracking-[0.25em] text-slate-400">
Executive Metrics
</p>

<div className="mt-4 grid gap-3 md:grid-cols-2">
<ReportMetric label="Board Health" value={`${boardHealthIndex}/100`} />
<ReportMetric
label="Enterprise Score"
value={`${enterpriseProcurementScore}/100`}
/>
<ReportMetric
label="Executive Readiness"
value={`${executiveReadinessScore}/100`}
/>
<ReportMetric
label="Procurement Risk"
value={`${procurementRiskIndex}/100`}
/>
<ReportMetric
label="Procurement Maturity"
value={`${procurementMaturityScore}/100`}
/>
<ReportMetric
label="Supplier Engagement"
value={`${supplierEngagementScore}/100`}
/>
<ReportMetric
label="Decision-Support Readiness"
value={`${decisionSupportReadinessScore}/100`}
/>
<ReportMetric label="Data Quality" value={`${dataQualityScore}/100`} />
</div>
</section>

<section className="mt-8 rounded-3xl border border-slate-950 bg-slate-950 p-6 text-white">
<p className="text-xs font-black uppercase tracking-[0.25em] text-slate-400">
Decision Readiness
</p>

<p className="mt-3 text-sm font-semibold leading-7 text-slate-300">
Executive decisions are generated only from validated Nexus
Pavilion operating intelligence. Placeholder reports, fake
scores, and decorative AI narratives remain blocked.
</p>
</section>

<div className="no-print mt-8 flex flex-wrap gap-3">
<button
type="button"
onClick={printReport}
className="rounded-full bg-slate-950 px-6 py-3 text-sm font-black text-white transition hover:bg-black"
>
Print / Save PDF
</button>

<button
type="button"
onClick={copySummary}
className="rounded-full border border-slate-300 bg-white px-6 py-3 text-sm font-black text-slate-950 transition hover:bg-slate-50"
>
{copied ? "Copied" : "Copy Summary"}
</button>
</div>
</section>
</main>
</div>
) : null}
</section>
);
}

function PolicyCard({ label, value }: { label: string; value: string }) {
return (
<div className="rounded-2xl border border-slate-200 bg-white p-5">
<p className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">
{label}
</p>

<p className="mt-2 text-lg font-black text-slate-950">{value}</p>
</div>
);
}

function ReportMetric({ label, value }: { label: string; value: string }) {
return (
<div className="rounded-2xl border border-slate-200 bg-white p-4">
<p className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">
{label}
</p>

<p className="mt-2 text-sm font-black text-slate-950">{value}</p>
</div>
);
}
