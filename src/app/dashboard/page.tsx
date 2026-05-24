"use client";

import AppSidebar from "@/components/common/AppSidebar";
import AppTopbar from "@/components/common/AppTopbar";
import SandboxStrip from "@/components/common/SandboxStrip";
import LogoutButton from "@/components/common/LogoutButton";
import StatusBadge from "@/components/ui/StatusBadge";

import { useRequireOrganization } from "@/hooks/useRequireOrganization";

function formatRoleType(roleType: string) {
const roleMap: Record<string, string> = {
OWNER: "Owner / Developer",
CONTRACTOR: "General Contractor",
SUPPLIER: "Industrial Supplier",
};

return roleMap[roleType] ?? roleType;
}

export default function DashboardPage() {
const { organization, loading } = useRequireOrganization();

if (loading) {
return (
<main className="flex min-h-screen items-center justify-center bg-slate-100">
<p className="text-sm text-slate-500">
Loading enterprise workspace...
</p>
</main>
);
}

return (
<main className="min-h-screen bg-slate-100">
<SandboxStrip />

<div className="flex">
<AppSidebar />

<section className="min-h-screen flex-1">
<AppTopbar />

<div className="p-8">
<div className="flex items-start justify-between gap-6">
<div>
<h1 className="text-3xl font-bold text-slate-900">
Global Procurement Ledger
</h1>

<p className="mt-2 text-slate-600">
Explore active supply networks while your enterprise verification is pending.
</p>
</div>

<LogoutButton />
</div>

{organization && (
<div className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
<div className="flex items-start justify-between gap-6">
<div>
<div className="flex items-center gap-3">
<h2 className="text-xl font-semibold text-slate-900">
{organization.companyName}
</h2>

<StatusBadge status="SANDBOX" />
</div>

<p className="mt-2 text-sm text-slate-600">
{organization.primaryCategory} · {organization.regionalHub}
</p>
</div>
</div>

<div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-3">
<div className="rounded-xl bg-slate-50 p-4">
<p className="text-xs font-medium uppercase tracking-wide text-slate-500">
Network Role
</p>

<p className="mt-1 text-sm font-semibold text-slate-900">
{formatRoleType(organization.roleType)}
</p>
</div>

<div className="rounded-xl bg-slate-50 p-4">
<p className="text-xs font-medium uppercase tracking-wide text-slate-500">
Regional Hub
</p>

<p className="mt-1 text-sm font-semibold text-slate-900">
{organization.regionalHub}
</p>
</div>

<div className="rounded-xl bg-slate-50 p-4">
<p className="text-xs font-medium uppercase tracking-wide text-slate-500">
Tax ID
</p>

<p className="mt-1 text-sm font-semibold text-slate-900">
{organization.taxId}
</p>
</div>
</div>
</div>
)}

<div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-3">
<div className="rounded-xl border border-slate-200 bg-white p-6">
<h3 className="font-semibold text-slate-900">
Directory Access
</h3>

<p className="mt-2 text-sm text-slate-600">
Public company listings are available in read-only mode.
</p>
</div>

<div className="rounded-xl border border-slate-200 bg-white p-6">
<h3 className="font-semibold text-slate-900">
Verification Status
</h3>

<p className="mt-2 text-sm text-amber-700">
Sandbox mode active.
</p>

<a
href="/verify"
className="mt-4 inline-block rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-amber-700"
>
View Requirements
</a>
</div>

<div className="rounded-xl border border-slate-200 bg-white p-6">
<h3 className="font-semibold text-slate-900">
Locked Systems
</h3>

<p className="mt-2 text-sm text-slate-600">
RFQ, Project Matrix, and Blueprint Center unlock after approval.
</p>
</div>
</div>
</div>
</section>
</div>
</main>
);
}