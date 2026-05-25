import Link from "next/link";
import { notFound } from "next/navigation";

import CompanyLogoUpload from "@/components/company-logo-upload";
import { createClient } from "@/lib/supabase/server";

export default async function CompanyProfilePage({
params,
}: {
params: Promise<{ slug: string }>;
}) {
const { slug } = await params;

const supabase = await createClient();

const { data: company } = await supabase
.from("companies")
.select(`
id,
name,
slug,
category,
location,
network_role,
status,
logo_url
`)
.eq("slug", slug)
.single();

if (!company) {
notFound();
}

return (
<main className="min-h-screen bg-slate-100 px-6 py-12">
<div className="mx-auto max-w-5xl space-y-8">
<Link
href="/directory"
className="inline-block text-sm font-semibold text-slate-600 hover:text-slate-950"
>
← Back to Public Directory
</Link>

<section className="rounded-3xl border border-slate-200 bg-white p-10 shadow-sm">
<div className="flex items-start gap-6">
{company.logo_url ? (
<img
src={company.logo_url}
alt={company.name}
className="h-24 w-24 rounded-2xl border border-slate-200 bg-white object-contain p-2"
/>
) : (
<div className="flex h-24 w-24 items-center justify-center rounded-2xl bg-slate-100 text-3xl font-black text-slate-400">
{company.name?.charAt(0)}
</div>
)}

<div>
<div className="flex items-center gap-3">
<h1 className="text-5xl font-black text-slate-950">
{company.name}
</h1>

<span className="rounded-full bg-emerald-100 px-4 py-1 text-sm font-bold text-emerald-700">
{company.status}
</span>
</div>

<p className="mt-3 text-lg text-slate-600">
{company.category} · {company.location}
</p>
</div>
</div>

<div className="mt-10 grid gap-6 md:grid-cols-3">
<div className="rounded-2xl bg-slate-50 p-6">
<p className="text-sm font-semibold uppercase text-slate-500">
Category
</p>

<p className="mt-2 text-xl font-bold text-slate-950">
{company.category}
</p>
</div>

<div className="rounded-2xl bg-slate-50 p-6">
<p className="text-sm font-semibold uppercase text-slate-500">
Location
</p>

<p className="mt-2 text-xl font-bold text-slate-950">
{company.location}
</p>
</div>

<div className="rounded-2xl bg-slate-50 p-6">
<p className="text-sm font-semibold uppercase text-slate-500">
Network Role
</p>

<p className="mt-2 text-xl font-bold text-slate-950">
{company.network_role}
</p>
</div>
</div>

<div className="mt-10 rounded-3xl bg-slate-50 p-8">
<h2 className="text-2xl font-black text-slate-950">
Public Procurement Profile
</h2>

<p className="mt-4 leading-8 text-slate-600">
This verified enterprise profile is publicly visible in the Nexus
Pavilion supply network.
</p>
</div>
</section>

<CompanyLogoUpload
companyId={company.id}
currentLogoUrl={company.logo_url}
/>
</div>
</main>
);
}