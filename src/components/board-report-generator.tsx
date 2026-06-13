"use client";

export default function BoardReportGenerator() {
const reports = [
{
title: "Board Report",
description:
"Enterprise board presentation summarizing procurement performance, risks, forecasts and strategic opportunities.",
},
{
title: "CEO Brief",
description:
"Executive growth-focused briefing covering savings, supplier expansion and strategic priorities.",
},
{
title: "CFO Brief",
description:
"Financial procurement report focused on spend control, savings opportunities and forecast accuracy.",
},
{
title: "Procurement Report",
description:
"Operational procurement report covering suppliers, RFQs, awards and performance indicators.",
},
];

return (
<section className="mt-8 rounded-3xl border border-slate-200 bg-white p-8">
<p className="text-xs font-black uppercase tracking-[0.25em] text-orange-500">
Executive Reporting Center
</p>

<h2 className="mt-3 text-3xl font-black text-slate-950">
Board Presentation Generator
</h2>

<p className="mt-3 max-w-4xl text-sm text-slate-600">
Generate executive-ready procurement reports for board members,
CEOs, CFOs and procurement leadership teams.
</p>

<div className="mt-8 grid gap-4 md:grid-cols-2">
{reports.map((report) => (
<div
key={report.title}
className="rounded-2xl border border-slate-200 bg-slate-50 p-5"
>
<p className="text-xs font-black uppercase tracking-[0.2em] text-orange-500">
{report.title}
</p>

<p className="mt-3 text-sm leading-7 text-slate-700">
{report.description}
</p>

<button
className="mt-5 rounded-xl bg-slate-950 px-4 py-3 text-sm font-black text-white transition hover:bg-black"
>
Generate Report
</button>
</div>
))}
</div>

<div className="mt-8 grid gap-4 md:grid-cols-4">
<div className="rounded-2xl border border-green-200 bg-green-50 p-5">
<p className="text-xs font-black uppercase text-green-700">
PDF Ready
</p>
</div>

<div className="rounded-2xl border border-blue-200 bg-blue-50 p-5">
<p className="text-xs font-black uppercase text-blue-700">
PowerPoint Ready
</p>
</div>

<div className="rounded-2xl border border-purple-200 bg-purple-50 p-5">
<p className="text-xs font-black uppercase text-purple-700">
Board Deck Ready
</p>
</div>

<div className="rounded-2xl border border-orange-200 bg-orange-50 p-5">
<p className="text-xs font-black uppercase text-orange-700">
Executive Summary Ready
</p>
</div>
</div>
</section>
);
}