type NarrativeStatus = "insufficient-data" | "coming-soon";

type ExecutiveNarrative = {
title: string;
audience: string;
status: NarrativeStatus;
statusLabel: string;
requirement: string;
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

export default function AIBoardNarrativeGenerator() {
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

<div className="mt-8 grid gap-4 md:grid-cols-2">
{narratives.map((narrative) => (
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
narrative.status === "coming-soon"
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
Executive narrative generation is locked.
</h3>

<p className="mt-4 text-sm font-semibold leading-7 text-slate-300">
Nexus Pavilion will generate board, CEO, CFO, and procurement
narratives only after the underlying dataset can support the output
with real procurement evidence.
</p>

<p className="mt-4 text-sm font-semibold leading-7 text-slate-300">
Until then, this module remains in a transparent readiness state
instead of producing decorative AI language.
</p>
</div>
</div>
</section>
);
}