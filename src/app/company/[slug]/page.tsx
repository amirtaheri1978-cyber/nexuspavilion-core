import Link from "next/link";

import StatusBadge from "@/components/ui/StatusBadge";
import { createClient } from "@/lib/supabase/server";

type StatusBadgeValue = "SANDBOX" | "PENDING" | "APPROVED" | "REJECTED";

type Company = {
id: string;
name: string;
slug: string;
category: string;
location: string;
network_role: string;
status: string;
logo_url: string | null;
};

function normalizeStatus(status: string): StatusBadgeValue {
const value = status.toLowerCase();

if (value === "verified" || value === "approved") return "APPROVED";
if (value === "pending") return "PENDING";
if (value === "rejected") return "REJECTED";

return "SANDBOX";
}

type PageProps = {
params: Promise<{
slug: string;
}>;
};

export default async function PublicCompanyPage({ params }: PageProps) {
const { slug } = await params;
const supabase = await createClient();

const { data } = await supabase
.from("companies")
.select("*")
.eq("slug", slug)
.in("status", ["approved", "verified"])
.limit(1);

const company = data?.[0] as Company | undefined;

if (!company) {
return (
<main className="min-h-screen bg-slate-100 p-8">
<div className="mx-auto max-w-3xl rounded-2xl border border-slate-200 bg-white p-8">
<h1 className="text-2xl font-bold text-slate-900">
Public company not found
</h1>

<Link
href="/directory"
className="mt-6 inline-block text-sm font-medium text-slate-700 hover:text-slate-900"
>
← Back to Public Directory
</Link>
</div>
</main>
);
}

return (
<main className="min-h-screen bg-slate-100 p-8">
<div className="mx-auto max-w-5xl">
<Link
href="/directory"
className="text-sm font-medium text-slate-600 hover:text-slate-900"
>
← Back to Public Directory
</Link>

<section className="mt-8 rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
<div className="flex items-start gap-6">
{company.logo_url ? (
<img
src={company.logo_url}
alt={company.name}
className="h-24 w-24 rounded-3xl border border-slate-200 object-cover"
/>
) : (
<div className="flex h-24 w-24 items-center justify-center rounded-3xl bg-slate-100 text-3xl font-bold text-slate-600">
{company.name.charAt(0)}
</div>
)}

<div>
<div className="flex flex-wrap items-center gap-3">
<h1 className="text-4xl font-bold text-slate-900">
{company.name}
</h1>

<StatusBadge status={normalizeStatus(company.status)} />
</div>

<p className="mt-3 text-lg text-slate-600">
{company.category} · {company.location}
</p>
</div>
</div>

<div className="mt-10 grid grid-cols-1 gap-5 md:grid-cols-3">
<div className="rounded-2xl border border-slate-200 p-5">
<p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
Category
</p>
<p className="mt-2 font-semibold text-slate-900">
{company.category}
</p>
</div>

<div className="rounded-2xl border border-slate-200 p-5">
<p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
Location
</p>
<p className="mt-2 font-semibold text-slate-900">
{company.location}
</p>
</div>

<div className="rounded-2xl border border-slate-200 p-5">
<p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
Network Role
</p>
<p className="mt-2 font-semibold text-slate-900">
{company.network_role}
</p>
</div>
</div>

<div className="mt-10 rounded-2xl bg-slate-50 p-6">
<h2 className="font-semibold text-slate-900">
Public Procurement Profile
</h2>

<p className="mt-3 text-sm leading-6 text-slate-600">
This verified enterprise profile is publicly visible in the Nexus
Pavilion supply network. Full compliance documents, RFQs, and
private procurement workflows require an authenticated workspace.
</p>
</div>
</section>
</div>
</main>
);
}