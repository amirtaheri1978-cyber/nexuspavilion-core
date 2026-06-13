export default function ExecutiveExportPanel() {
return (
<section className="mt-8 rounded-3xl border border-slate-200 bg-white p-8">
<p className="text-xs font-black uppercase tracking-[0.25em] text-orange-500">
Executive Export Center
</p>

<h2 className="mt-3 text-3xl font-black text-slate-950">
Board Report Generator
</h2>

<p className="mt-3 max-w-3xl text-sm text-slate-600">
Generate executive board reports, procurement summaries,
performance scorecards, benchmark reports, and supplier
portfolio reviews.
</p>

<div className="mt-8 grid gap-4 md:grid-cols-4">
<button
type="button"
className="rounded-2xl border border-slate-200 bg-slate-50 p-5 text-left transition hover:border-orange-300 hover:bg-orange-50"
>
<p className="text-xs font-black uppercase tracking-[0.2em] text-orange-500">
Executive
</p>

<p className="mt-3 font-black text-slate-950">
Export Board Report
</p>
</button>

<button
type="button"
className="rounded-2xl border border-slate-200 bg-slate-50 p-5 text-left transition hover:border-orange-300 hover:bg-orange-50"
>
<p className="text-xs font-black uppercase tracking-[0.2em] text-orange-500">
Finance
</p>

<p className="mt-3 font-black text-slate-950">
Export CFO Summary
</p>
</button>

<button
type="button"
className="rounded-2xl border border-slate-200 bg-slate-50 p-5 text-left transition hover:border-orange-300 hover:bg-orange-50"
>
<p className="text-xs font-black uppercase tracking-[0.2em] text-orange-500">
Procurement
</p>

<p className="mt-3 font-black text-slate-950">
Export Procurement Report
</p>
</button>

<button
type="button"
className="rounded-2xl border border-slate-200 bg-slate-50 p-5 text-left transition hover:border-orange-300 hover:bg-orange-50"
>
<p className="text-xs font-black uppercase tracking-[0.2em] text-orange-500">
Supplier
</p>

<p className="mt-3 font-black text-slate-950">
Export Supplier Portfolio
</p>
</button>
</div>

<div className="mt-8 rounded-3xl border border-orange-200 bg-orange-50 p-6">
<p className="text-xs font-black uppercase tracking-[0.2em] text-orange-600">
Roadmap Status
</p>

<p className="mt-3 text-sm font-semibold leading-7 text-slate-700">
Export actions are currently in preview mode. PDF generation,
executive report rendering, and automated board packages will
be connected in the next phase.
</p>
</div>
</section>
);
}