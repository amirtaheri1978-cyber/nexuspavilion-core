import Link from "next/link";
import { redirect } from "next/navigation";

import StatusBadge from "@/components/ui/StatusBadge";
import DeleteCompanyButton from "@/components/connections/DeleteCompanyButton";
import { createClient } from "@/lib/supabase/server";
import Image from "next/image";
type StatusBadgeValue = "SANDBOX" | "PENDING" | "APPROVED" | "REJECTED";

type Company = {
id: string;
name: string;
slug: string;
category: string;
location: string;
network_role: string;
status: string;
created_at: string;
user_id: string | null;
logo_url: string | null;
};

function normalizeStatus(status: string): StatusBadgeValue {
const value = status.toLowerCase();

if (value === "verified" || value === "approved") return "APPROVED";
if (value === "pending") return "PENDING";
if (value === "rejected") return "REJECTED";

return "SANDBOX";
}

function formatStatus(status: string) {
const value = status.toLowerCase();

if (value === "verified" || value === "approved") return "Approved";
if (value === "sandbox") return "Sandbox";
if (value === "pending") return "Pending";
if (value === "rejected") return "Rejected";

return status;
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

const supabase = await createClient();

const {
data: { user },
} = await supabase.auth.getUser();

if (!user) {
redirect("/login");
}

const { data, error } = await supabase
.from("companies")
.select("*")
.eq("slug", slug)
.eq("user_id", user.id)
.order("created_at", { ascending: false })
.limit(1);

const company = data?.[0] as Company | undefined;

if (error || !company) {
return (
<main className="min-h-screen bg-slate-100 p-8">
<div className="mx-auto max-w-4xl rounded-2xl border border-slate-200 bg-white p-8">
<h1 className="text-2xl font-bold text-slate-900">
Company not found
</h1>

<p className="mt-3 text-sm text-slate-600">
This company either does not exist or does not belong to your
workspace.
</p>

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
<div className="flex items-start gap-5">
{company.logo_url ? (
<Image
src={company.logo_url}
alt={company.name}
width={80}
height={80}
className="h-20 w-20 rounded-2xl border border-slate-200 object-contain ..."
/>
) : (
<div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-slate-100 text-2xl font-bold text-slate-600">
{company.name.charAt(0)}
</div>
)}

<div>
<div className="flex flex-wrap items-center gap-3">
<h1 className="text-3xl font-bold text-slate-900">
{company.name}
</h1>

<StatusBadge status={normalizeStatus(company.status)} />
</div>

<p className="mt-3 text-slate-600">
{company.category} · {company.location}
</p>
</div>
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
<h2 className="font-semibold text-slate-900">Compliance Notes</h2>

<p className="mt-4 text-sm leading-6 text-slate-600">
This company profile is loaded from the live Supabase database and
restricted to the authenticated workspace owner.
</p>

<div className="mt-6 flex flex-wrap gap-3">
<Link
href={`/connections/${company.slug}/edit`}
className="inline-flex rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800"
>
Edit Company
</Link>

<DeleteCompanyButton
id={company.id}
companyName={company.name}
/>
</div>
</div>
</section>
</div>
</main>
);
}