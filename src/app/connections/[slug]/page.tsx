import Link from "next/link";

import { supabase } from "@/lib/supabase";

type Company = {
id: string;
name: string;
slug: string;
category: string;
location: string;
network_role: string;
status: string;
created_at: string;
};

function formatStatus(status: string) {
const value = status.toLowerCase();

if (value === "verified") return "Verified";
if (value === "sandbox") return "Sandbox";
if (value === "pending") return "Pending";

return status;
}

function getStatusStyle(status: string) {
const value = status.toLowerCase();

if (value === "verified") {
return "bg-emerald-100 text-emerald-700";
}

if (value === "pending") {
return "bg-blue-100 text-blue-700";
}

return "bg-amber-100 text-amber-700";
}

type CompanyProfilePageProps = {
params: Promise<{
slug: string;
}>;
};

export default async function CompanyProfilePage({
params,
}: CompanyProfilePageProps) {
const { slug } = await params;

const { data: company, error } = await supabase
.from("companies")
.select("*")
.eq("slug", slug)
.single<Company>();

if (error || !company) {
return (
<main className="min-h-screen bg-slate-100 p-8">
<div className="mx-auto max-w-4xl rounded-2xl border border-slate-200 bg-white p-8">
<h1 className="text-2xl font-bold text-slate-900">
Company not found
</h1>

<Link
href="/connections"
className="mt-6 inline-block text-sm font-medium text-slate-600 hover:text-slate-900"
>
← Back to Connections
</Link>
</div>
</main>
);
}

return (
<main className="min-h-screen bg-slate-100 p-8">
<div className="mx-auto max-w-5xl">
<Link
href="/connections"
className="text-sm font-medium text-slate-600 hover:text-slate-900"
>
← Back to Connections
</Link>

<section className="mt-8 rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
<div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
<div>
<div className="flex flex-wrap items-center gap-3">
<h1 className="text-3xl font-bold text-slate-900">
{company.name}
</h1>

<span
className={`rounded-full px-3 py-1 text-xs font-semibold ${getStatusStyle(
company.status
)}`}
>
{formatStatus(company.status)}
</span>
</div>

<p className="mt-3 text-slate-600">
{company.category} · {company.location}
</p>
</div>

<div className="rounded-xl bg-slate-50 px-5 py-4">
<p className="text-xs font-medium uppercase tracking-wide text-slate-500">
Network Role
</p>

<p className="mt-1 text-sm font-semibold text-slate-900">
{company.network_role}
</p>
</div>
</div>

<div className="mt-8 grid grid-cols-1 gap-5 md:grid-cols-3">
<div className="rounded-xl border border-slate-200 p-5">
<p className="text-xs font-medium uppercase tracking-wide text-slate-500">
Category
</p>

<p className="mt-2 text-sm font-semibold text-slate-900">
{company.category}
</p>
</div>

<div className="rounded-xl border border-slate-200 p-5">
<p className="text-xs font-medium uppercase tracking-wide text-slate-500">
Location
</p>

<p className="mt-2 text-sm font-semibold text-slate-900">
{company.location}
</p>
</div>

<div className="rounded-xl border border-slate-200 p-5">
<p className="text-xs font-medium uppercase tracking-wide text-slate-500">
Status
</p>

<p className="mt-2 text-sm font-semibold text-slate-900">
{formatStatus(company.status)}
</p>
</div>
</div>

<div className="mt-8 rounded-xl border border-slate-200 p-6">
<h2 className="font-semibold text-slate-900">
Compliance Notes
</h2>

<p className="mt-4 text-sm leading-6 text-slate-600">
This company profile is loaded from the live Supabase database.
Additional compliance records, capabilities, documents, and
verification workflow data will be connected in the next backend
phase.
</p>
</div>
</section>
</div>
</main>
);
}