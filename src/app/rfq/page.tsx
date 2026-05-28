import Link from "next/link";

import { createClient } from "@/lib/supabase/server";

export default async function RFQMarketplacePage() {
const supabase = await createClient();

const {
data: { user },
} = await supabase.auth.getUser();

const { data: profile } = await supabase
.from("profiles")
.select("company_id")
.eq("id", user?.id)
.single();

const { data: rfqs } = profile?.company_id
? await supabase
.from("rfqs")
.select("*")
.eq("company_id", profile.company_id)
.order("created_at", { ascending: false })
: { data: [] };

return (
<main className="min-h-screen bg-[#f6f6f3] px-8 py-10">
<div className="mx-auto max-w-7xl">
<div className="flex items-start justify-between">
<div>
<p className="text-xs font-black uppercase tracking-[0.35em] text-orange-500">
Procurement Marketplace
</p>

<h1 className="mt-3 text-5xl font-black text-slate-950">
RFQ Marketplace
</h1>

<p className="mt-4 max-w-2xl text-sm text-slate-600">
Browse and manage procurement opportunities connected to your
enterprise workspace.
</p>
</div>

<Link
href="/rfq/new"
className="rounded-full bg-slate-950 px-6 py-3 text-sm font-bold text-white"
>
Create RFQ
</Link>
</div>

<section className="mt-10 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
{rfqs && rfqs.length > 0 ? (
rfqs.map((rfq: any) => (
<Link
key={rfq.id}
href={`/rfq/${rfq.slug}`}
className="rounded-[28px] border border-black/5 bg-white p-7 transition hover:-translate-y-1 hover:shadow-xl"
>
<p className="text-xs font-black uppercase tracking-[0.25em] text-orange-500">
{rfq.category || "Procurement"}
</p>

<h2 className="mt-3 text-2xl font-black text-slate-950">
{rfq.title}
</h2>

<p className="mt-3 line-clamp-3 text-sm leading-relaxed text-slate-600">
{rfq.description}
</p>

<div className="mt-6 grid grid-cols-2 gap-4 text-sm">
<div>
<p className="font-bold text-slate-400">Location</p>
<p className="mt-1 font-semibold text-slate-700">
{rfq.location}
</p>
</div>

<div>
<p className="font-bold text-slate-400">Budget</p>
<p className="mt-1 font-semibold text-slate-700">
${Number(rfq.budget || 0).toLocaleString()}
</p>
</div>
</div>

<div className="mt-6 flex items-center justify-between">
<span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700">
{rfq.status || "open"}
</span>

<span className="text-sm font-black text-slate-950">
Open →
</span>
</div>
</Link>
))
) : (
<div className="col-span-full rounded-[28px] border border-dashed border-slate-300 bg-white p-12 text-center">
<h2 className="text-2xl font-black text-slate-950">
No RFQs found
</h2>

<p className="mt-2 text-sm text-slate-600">
Create your first company-scoped procurement opportunity.
</p>
</div>
)}
</section>
</div>
</main>
);
}