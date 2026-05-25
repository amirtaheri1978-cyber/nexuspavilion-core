import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export default async function RFQMarketplacePage() {
const supabase = await createClient();

const { data: rfqs } = await supabase
.from("rfqs")
.select("*")
.order("created_at", { ascending: false });

return (
<main className="min-h-screen bg-neutral-50 px-6 py-12">
<div className="mx-auto max-w-6xl">
<div className="mb-10 flex items-center justify-between">
<div>
<p className="text-sm font-semibold uppercase tracking-[0.2em] text-orange-700">
Procurement RFQs
</p>

<h1 className="mt-2 text-5xl font-black tracking-tight text-neutral-900">
RFQ Marketplace
</h1>

<p className="mt-4 max-w-3xl text-lg text-neutral-600">
Browse active procurement opportunities across the Nexus Pavilion
network.
</p>
</div>

<Link
href="/rfq/new"
className="rounded-xl bg-black px-5 py-3 text-sm font-semibold text-white transition hover:bg-neutral-800"
>
Create RFQ
</Link>
</div>

{!rfqs || rfqs.length === 0 ? (
<div className="rounded-3xl border border-dashed border-neutral-300 bg-white p-16 text-center">
<h2 className="text-2xl font-bold text-neutral-900">
No RFQs yet
</h2>

<p className="mt-3 text-neutral-600">
Create your first procurement request.
</p>
</div>
) : (
<div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
{rfqs.map((rfq) => (
<div
key={rfq.id}
className="rounded-3xl border border-neutral-200 bg-white p-8 shadow-sm transition hover:-translate-y-1 hover:shadow-xl"
>
<div className="flex items-start justify-between gap-4">
<h2 className="text-3xl font-black text-neutral-900">
{rfq.title}
</h2>

<span className="rounded-full bg-green-100 px-4 py-2 text-sm font-bold uppercase tracking-wide text-green-700">
{rfq.status || "OPEN"}
</span>
</div>

<p className="mt-3 text-sm font-medium text-neutral-500">
{rfq.category} · {rfq.location}
</p>

<p className="mt-6 line-clamp-3 text-base leading-7 text-neutral-700">
{rfq.description}
</p>

<div className="mt-8 grid grid-cols-2 gap-4">
<div>
<p className="text-xs font-bold uppercase tracking-[0.2em] text-neutral-400">
Budget
</p>

<p className="mt-2 text-2xl font-black text-neutral-900">
{rfq.budget}
</p>
</div>

<div>
<p className="text-xs font-bold uppercase tracking-[0.2em] text-neutral-400">
Deadline
</p>

<p className="mt-2 text-xl font-bold text-neutral-900">
{rfq.deadline}
</p>
</div>
</div>

<Link
href={`/rfq/${rfq.slug}`}
className="mt-10 inline-flex items-center text-lg font-bold text-black transition hover:translate-x-1"
>
View RFQ →
</Link>
</div>
))}
</div>
)}
</div>
</main>
);
}