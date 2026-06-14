"use client";
import { useMemo, useState } from "react";

type ReportType = "board" | "ceo" | "cfo" | "procurement";
type ReportStatus = "insufficient-data" | "coming-soon";

type ExecutiveReport = {
id: ReportType;
title: string;
audience: string;
subtitle: string;
status: ReportStatus;
statusLabel: string;
primaryRequirement: string;
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
"Spend visibility, savings opportunity, awarded volume, forecast confidence, and budget exposure.",
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
"Confidence analytics",
"Savings or cost-avoidance calculations",
];

const operationalNextSteps = [
"Create live RFQs with real procurement requirements.",
"Invite suppliers and collect validated quote responses.",
"Complete award workflows to establish decision history.",
"Connect risk and confidence engines to the executive reporting layer.",
"Generate executive reports only after sufficient validated data exists.",
];

function getReport(type: ReportType) {
return reports.find((report) => report.id === type) || reports[0];
}

export default function BoardReportGenerator() {
const [activeReport, setActiveReport] = useState<ExecutiveReport | null>(
null
);
const [copied, setCopied] = useState(false);

const generatedAt = useMemo(() => {
return new Date().toLocaleDateString("en-US", {
year: "numeric",
month: "long",
day: "numeric",
});
}, []);

const executiveSummary = useMemo(() => {
if (!activeReport) return "";

return `${activeReport.title}

Audience:
${activeReport.audience}

Status:
${activeReport.statusLabel}

Summary:
This report is not generated because Nexus Pavilion does not yet have enough validated procurement data to produce a board-grade executive report.

Requirement:
${activeReport.primaryRequirement}

Required Data Sources:
${requiredDataSources.map((item) => `- ${item}`).join("\n")}

Recommended Next Steps:
${operationalNextSteps.map((item, index) => `${index + 1}. ${item}`).join("\n")}

Decision Readiness:
Executive decisions should not be generated from placeholder data, mock scores, or unverified analytics.`;
}, [activeReport]);

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
document.querySelectorAll("style, link[rel='stylesheet']")
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
@page {
size: A4;
margin: 14mm;
}

body {
margin: 0;
background: white;
}

.no-print {
display: none !important;
}

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
<section className="mt-8 rounded-3xl border border-slate-200 bg-white p-8">
<style>
{`
@media print {
@page {
size: A4;
margin: 14mm;
}

body * {
visibility: hidden !important;
}

#board-report-print-area,
#board-report-print-area * {
visibility: visible !important;
}

#board-report-print-area {
position: absolute !important;
left: 0 !important;
top: 0 !important;
width: 100% !important;
margin: 0 !important;
padding: 0 !important;
border: 0 !important;
box-shadow: none !important;
background: white !important;
}

.no-print {
display: none !important;
}
}
`}
</style>

<div className="no-print flex flex-wrap items-start justify-between gap-6">
<div>
<p className="text-xs font-black uppercase tracking-[0.3em] text-slate-400">
Executive Reporting Center
</p>

<h2 className="mt-3 text-4xl font-black text-slate-950">
Board Presentation Generator
</h2>

<p className="mt-4 max-w-4xl text-sm leading-7 text-slate-600">
Generate executive reports only when validated procurement data is
available. Placeholder metrics, fake scores, and unverified AI
narratives are intentionally blocked.
</p>
</div>

<div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
<p className="text-xs font-black uppercase tracking-[0.2em] text-slate-500">
Reporting Standard
</p>
<p className="mt-2 text-sm font-semibold text-slate-700">
Truth-first. Data-first. Decision-ready.
</p>
</div>
</div>

<div className="no-print mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
{reports.map((report) => (
<button
key={report.id}
type="button"
onClick={() => {
setActiveReport(getReport(report.id));
setCopied(false);
}}
className="group rounded-3xl border border-slate-200 bg-white p-6 text-left transition hover:-translate-y-1 hover:border-slate-400 hover:shadow-xl"
>
<div className="flex items-center justify-between gap-3">
<p className="text-xs font-black uppercase tracking-[0.25em] text-slate-400">
{report.title}
</p>

<span
className={
report.status === "coming-soon"
? "rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-blue-700"
: "rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-amber-700"
}
>
{report.statusLabel}
</span>
</div>

<h3 className="mt-5 text-xl font-black text-slate-950">
{report.audience}
</h3>

<p className="mt-4 text-sm leading-7 text-slate-600">
{report.subtitle}
</p>

<span className="mt-5 inline-flex rounded-full bg-slate-950 px-4 py-2 text-xs font-black text-white transition group-hover:bg-slate-800">
Review Status
</span>
</button>
))}
</div>

{activeReport ? (
<div
id="board-report-print-area"
className="mt-10 overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-xl"
>
<header className="border-b border-slate-200 bg-white p-10">
<div className="flex flex-wrap items-start justify-between gap-8">
<div>
<p className="text-xs font-black uppercase tracking-[0.35em] text-slate-400">
Nexus Pavilion Executive Intelligence
</p>

<h3 className="mt-5 text-4xl font-black text-slate-950">
{activeReport.title}
</h3>

<p className="mt-4 max-w-3xl text-sm leading-7 text-slate-600">
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
activeReport.status === "coming-soon"
? "rounded-2xl border border-blue-200 bg-blue-50 p-5 text-blue-800"
: "rounded-2xl border border-amber-200 bg-amber-50 p-5 text-amber-800"
}
>
<p className="text-xs font-black uppercase tracking-[0.2em]">
Report Status
</p>
<p className="mt-2 text-2xl font-black">
{activeReport.statusLabel}
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
This report is not generated because Nexus Pavilion does
not yet have enough validated procurement data to produce a
board-grade executive report.
</p>

<p className="mt-4 text-sm leading-7 text-slate-600">
Executive reporting will remain locked until the platform
can support the output with real RFQ activity, supplier
participation, quote responses, award decisions, risk
intelligence, confidence analytics, and financial impact
metrics.
</p>
</div>
</section>

<section className="mt-8">
<p className="text-xs font-black uppercase tracking-[0.25em] text-slate-400">
Required Data Sources
</p>

<div className="mt-4 grid gap-3 md:grid-cols-2">
{requiredDataSources.map((source) => (
<div
key={source}
className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
>
<p className="text-sm font-bold text-slate-800">
{source}
</p>
</div>
))}
</div>
</section>

<section className="mt-8">
<p className="text-xs font-black uppercase tracking-[0.25em] text-slate-400">
Operational Next Steps
</p>

<div className="mt-4 space-y-3">
{operationalNextSteps.map((step, index) => (
<div
key={step}
className="flex gap-4 rounded-2xl border border-slate-200 p-4"
>
<p className="text-sm font-black text-slate-400">
{String(index + 1).padStart(2, "0")}
</p>
<p className="text-sm font-semibold leading-7 text-slate-700">
{step}
</p>
</div>
))}
</div>
</section>

<section className="mt-8 rounded-3xl border border-slate-950 bg-slate-950 p-6 text-white">
<p className="text-xs font-black uppercase tracking-[0.25em] text-slate-400">
Decision Readiness
</p>
<p className="mt-3 text-sm font-semibold leading-7 text-slate-300">
Executive decisions should not be generated from placeholder
data, mock scores, or unverified analytics. This report will
become available only when the underlying procurement dataset
is validated.
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