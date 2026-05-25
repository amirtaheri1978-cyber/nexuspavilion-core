import Link from "next/link";

import { createClient } from "@/lib/supabase/server";

export default async function RFQMarketplacePage() {
const supabase = await createClient();

const { data: rfqs } = await supabase
.from("rfqs")
.select("*")
.order("created_at", { ascending: false });

return (
<main className="min-h-screen bg-slate-100 px-6 py-12">
<div className="mx-auto max-w-7xl">
<div className="mb-10 flex items-center justify-between gap-6">
<div>
<p className="text-sm font-semibold uppercase tracking-[0.25em] text-orange-500">
Procurement Marketplace
</p>

<h1 className="mt-3 text-5xl font-black text-slate-950">
RFQ Marketplace
</h1>

<p className="mt-4 max-w-3xl text-lg text-slate-600">
Browse active procurement opportunities and submit supplier quotes.
</p>
</div>

<div className="flex gap-3">
<Link
href="/vendor-dashboard"
className="rounded-full border border-slate-300 bg-white px-5 py-3 text-sm font-bold text-slate-900"
>
Vendor Dashboard
</Link>

<Link
href="/rfq/new"
className="rounded-full bg-slate-950 px-5 py-3 text-sm font-bold text-white"
>
Create RFQ
</Link>
</div>
</div>

{!rfqs || rfqs.length === 0 ? (
<section className="rounded-3xl border border-dashed border-slate-300 bg-white p-12 text-center shadow-sm">
<h2 className="text-2xl font-black text-slate-950">
No RFQs posted yet
</h2>

<p className="mt-3 text-slate-600">
Create the first procurement opportunity.
</p>
</section>
) : (
<section className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
{rfqs.map((rfq) => (
<article
key={rfq.id}
className="rounded-3xl border border-slate-200 bg-white p-7 shadow-sm transition hover:-translate-y-1 hover:shadow-xl"
>
<div className="flex items-start justify-between gap-4">
<div>
<p className="text-xs font-bold uppercase tracking-[0.2em] text-orange-500">
{rfq.category || "Procurement"}
</p>

<h2 className="mt-3 text-3xl font-black text-slate-950">
{rfq.title}
</h2>

<p className="mt-2 text-sm font-medium text-slate-500">
{rfq.location}
</p>
</div>

<span className="rounded-full bg-emerald-100 px-4 py-2 text-xs font-black uppercase text-emerald-700">
{rfq.status || "open"}
</span>
</div>

<p className="mt-6 line-clamp-3 text-sm leading-7 text-slate-600">
{rfq.description}
</p>

<div className="mt-8 grid grid-cols-2 gap-4">
<div className="rounded-2xl bg-slate-50 p-4">
<p className="text-xs font-bold uppercase text-slate-400">
Budget
</p>
<p className="mt-2 text-lg font-black text-slate-950">
{rfq.budget || "Not specified"}
</p>
</div>

<div className="rounded-2xl bg-slate-50 p-4">
<p className="text-xs font-bold uppercase text-slate-400">
Deadline
</p>
<p className="mt-2 text-lg font-black text-slate-950">
{rfq.deadline || "TBD"}
</p>
</div>
</div>

<Link
href={`/rfq/${rfq.slug}`}
className="mt-8 inline-flex rounded-full bg-slate-950 px-5 py-3 text-sm font-bold text-white transition hover:bg-slate-800"
>
View & Submit Quote →
</Link>
</article>
))}
</section>
)}
</div>
</main>
);
}