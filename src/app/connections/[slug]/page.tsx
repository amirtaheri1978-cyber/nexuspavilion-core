import Link from "next/link";

import { companies } from "@/data/companies";
import StatusBadge from "@/components/ui/StatusBadge";

function formatRole(role: string) {
const roleMap: Record<string, string> = {
OWNER: "Owner / Developer",
CONTRACTOR: "General Contractor",
SUPPLIER: "Industrial Supplier",
};

return roleMap[role] ?? role;
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

const company = companies.find(
(item) => item.slug.trim() === slug.trim()
);

if (!company) {
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

<StatusBadge status={company.status} />
</div>

<p className="mt-3 text-slate-600">
{company.category} · {company.region}
</p>
</div>

<div className="rounded-xl bg-slate-50 px-5 py-4">
<p className="text-xs font-medium uppercase tracking-wide text-slate-500">
Network Role
</p>

<p className="mt-1 text-sm font-semibold text-slate-900">
{formatRole(company.role)}
</p>
</div>
</div>

<div className="mt-8 grid grid-cols-1 gap-5 md:grid-cols-2">
<div className="rounded-xl border border-slate-200 p-5">
<h2 className="font-semibold text-slate-900">
Capabilities
</h2>

<ul className="mt-4 space-y-3">
{company.capabilities.map((capability) => (
<li
key={capability}
className="rounded-lg bg-slate-50 px-4 py-3 text-sm text-slate-700"
>
{capability}
</li>
))}
</ul>
</div>

<div className="rounded-xl border border-slate-200 p-5">
<h2 className="font-semibold text-slate-900">
Compliance Notes
</h2>

<p className="mt-4 text-sm leading-6 text-slate-600">
{company.complianceNotes}
</p>
</div>
</div>
</section>
</div>
</main>
);
}