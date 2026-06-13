export default function AIBoardNarrativeGenerator() {
const narratives = [
{
title: "Board Narrative",
text: "Procurement performance remains under executive intelligence review, with board-level visibility across supplier activity, award efficiency, savings opportunity, and operational risk.",
},
{
title: "CEO Narrative",
text: "Executive focus should remain on supplier network expansion, strategic category growth, market competitiveness, and high-value procurement opportunities.",
},
{
title: "CFO Narrative",
text: "Financial leadership should monitor awarded volume, forecast savings, budget utilization, vendor concentration, and cost optimization opportunities.",
},
{
title: "Procurement Narrative",
text: "Procurement leadership should continue improving RFQ competition, supplier participation, award conversion, and supplier portfolio health.",
},
];

return (
<section className="mt-8 rounded-3xl border border-slate-200 bg-slate-950 p-8 text-white">
<p className="text-xs font-black uppercase tracking-[0.25em] text-orange-400">
AI Board Narrative Generator
</p>

<h2 className="mt-3 text-3xl font-black">
Executive Narrative Intelligence
</h2>

<p className="mt-3 max-w-4xl text-sm leading-7 text-slate-300">
Generate board-ready executive narratives for CEO, CFO,
procurement leadership, and enterprise stakeholders.
</p>

<div className="mt-8 grid gap-4 md:grid-cols-2">
{narratives.map((narrative) => (
<div
key={narrative.title}
className="rounded-2xl border border-white/10 bg-white/5 p-5"
>
<p className="text-xs font-black uppercase tracking-[0.2em] text-orange-400">
{narrative.title}
</p>

<p className="mt-3 text-sm font-semibold leading-7 text-slate-300">
{narrative.text}
</p>
</div>
))}
</div>
</section>
);
}