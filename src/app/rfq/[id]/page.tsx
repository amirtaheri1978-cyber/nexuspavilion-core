import Link from "next/link";

import { rfqs } from "@/data/rfqs";

function getStatusStyle(status: string) {
switch (status) {
case "OPEN":
return "bg-amber-100 text-amber-700";
case "REVIEWING":
return "bg-blue-100 text-blue-700";
case "AWARDED":
return "bg-emerald-100 text-emerald-700";
default:
return "bg-slate-100 text-slate-700";
}
}

function formatStatus(status: string) {
const statusMap: Record<string, string> = {
OPEN: "Open",
REVIEWING: "Reviewing",
AWARDED: "Awarded",
};

return statusMap[status] ?? status;
}

type RFQDetailPageProps = {
params: Promise<{
id: string;
}>;
};

export default async function RFQDetailPage({
params,
}: RFQDetailPageProps) {
const { id } = await params;

const rfq = rfqs.find((item) => item.slug === id);

if (!rfq) {
return (
<main className="min-h-screen bg-[#f7f7f5] p-10">
<div className="mx-auto max-w-4xl rounded-3xl border border-neutral-200 bg-white p-8">
<h1 className="text-2xl font-semibold text-neutral-900">
RFQ not found
</h1>

<Link
href="/rfq"
className="mt-6 inline-block text-sm font-medium text-neutral-500 hover:text-neutral-900"
>
← Back to RFQ Manager
</Link>
</div>
</main>
);
}

return (
<main className="min-h-screen bg-[#f7f7f5] p-10">
<div className="mx-auto max-w-5xl">
<Link
href="/rfq"
className="mb-6 inline-block text-sm font-medium text-neutral-500 hover:text-neutral-900"
>
← Back to RFQ Manager
</Link>

<section className="rounded-3xl border border-neutral-200 bg-white p-8">
<div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
<div>
<p className="text-sm font-medium text-neutral-500">
{rfq.id}
</p>

<h1 className="mt-3 text-4xl font-semibold text-neutral-900">
{rfq.project}
</h1>

<p className="mt-3 text-neutral-600">
{rfq.tradePackage}
</p>
</div>

<span
className={`rounded-full px-4 py-2 text-sm font-medium ${getStatusStyle(
rfq.status
)}`}
>
{formatStatus(rfq.status)}
</span>
</div>

<div className="mt-8 grid grid-cols-1 gap-5 md:grid-cols-3">
<div className="rounded-2xl bg-neutral-50 p-5">
<p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
Due Date
</p>

<p className="mt-2 text-sm font-semibold text-neutral-900">
{rfq.dueDate}
</p>
</div>

<div className="rounded-2xl bg-neutral-50 p-5">
<p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
Budget Range
</p>

<p className="mt-2 text-sm font-semibold text-neutral-900">
{rfq.budgetRange}
</p>
</div>

<div className="rounded-2xl bg-neutral-50 p-5">
<p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
Procurement Contact
</p>

<p className="mt-2 text-sm font-semibold text-neutral-900">
{rfq.procurementContact}
</p>
</div>
</div>

<div className="mt-8 grid grid-cols-1 gap-5 md:grid-cols-2">
<div className="rounded-2xl border border-neutral-200 p-6">
<h2 className="text-lg font-semibold text-neutral-900">
Scope of Work
</h2>

<p className="mt-4 leading-7 text-neutral-600">
{rfq.scopeOfWork}
</p>
</div>

<div className="rounded-2xl border border-neutral-200 p-6">
<h2 className="text-lg font-semibold text-neutral-900">
Required Certifications
</h2>

<ul className="mt-4 space-y-3">
{rfq.requiredCertifications.map((item) => (
<li
key={item}
className="rounded-xl bg-neutral-50 px-4 py-3 text-sm text-neutral-700"
>
{item}
</li>
))}
</ul>
</div>
</div>

<div className="mt-8 rounded-2xl border border-amber-200 bg-amber-50 p-6">
<h2 className="text-lg font-semibold text-amber-900">
Sandbox Restriction
</h2>

<p className="mt-3 leading-7 text-amber-800">
Proposal submission is disabled while the organization operates under sandbox governance. This workflow will unlock after enterprise verification approval.
</p>
</div>
</section>
</div>
</main>
);
}