"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import AppSidebar from "@/components/common/AppSidebar";
import AppTopbar from "@/components/common/AppTopbar";
import SandboxStrip from "@/components/common/SandboxStrip";
import LogoutButton from "@/components/common/LogoutButton";
import StatusBadge from "@/components/ui/StatusBadge";

import { createClient } from "@/lib/supabase/client";

type Company = {
id: string;
name: string;
category: string;
location: string;
network_role: string;
status: string;
};

type StatusBadgeValue = "SANDBOX" | "PENDING" | "APPROVED" | "REJECTED";

function normalizeStatus(status: string): StatusBadgeValue {
const value = status.toLowerCase();

if (value === "approved" || value === "verified") return "APPROVED";
if (value === "pending") return "PENDING";
if (value === "rejected") return "REJECTED";

return "SANDBOX";
}

export default function DashboardPage() {
const supabase = createClient();

const [company, setCompany] = useState<Company | null>(null);
const [loading, setLoading] = useState(true);

useEffect(() => {
async function loadDashboard() {
const {
data: { user },
} = await supabase.auth.getUser();

if (!user) {
setLoading(false);
return;
}

const { data } = await supabase
.from("companies")
.select("*")
.eq("user_id", user.id)
.order("created_at", { ascending: false })
.limit(1)
.single();

setCompany(data ?? null);
setLoading(false);
}

loadDashboard();
}, [supabase]);

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
<p className="text-sm text-slate-500">Organization / Home</p>

<h1 className="mt-3 text-3xl font-bold text-slate-900">
Global Procurement Ledger
</h1>

<p className="mt-2 text-slate-600">
Explore active supply networks while your enterprise
verification is pending.
</p>
</div>

<div className="flex gap-3">
<Link
href="/connections/new"
className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800"
>
Add Company
</Link>

<LogoutButton />
</div>
</div>

{loading && (
<p className="mt-8 text-sm text-slate-500">
Loading workspace...
</p>
)}

{!loading && company && (
<div className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
<div className="flex items-center gap-3">
<h2 className="text-xl font-semibold text-slate-900">
{company.name}
</h2>

<StatusBadge status={normalizeStatus(company.status)} />
</div>

<p className="mt-2 text-sm text-slate-600">
{company.category} · {company.location}
</p>

<div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-3">
<div className="rounded-xl bg-slate-50 p-4">
<p className="text-xs font-medium uppercase tracking-wide text-slate-500">
Network Role
</p>

<p className="mt-1 text-sm font-semibold text-slate-900">
{company.network_role}
</p>
</div>

<div className="rounded-xl bg-slate-50 p-4">
<p className="text-xs font-medium uppercase tracking-wide text-slate-500">
Regional Hub
</p>

<p className="mt-1 text-sm font-semibold text-slate-900">
{company.location}
</p>
</div>

<div className="rounded-xl bg-slate-50 p-4">
<p className="text-xs font-medium uppercase tracking-wide text-slate-500">
Status
</p>

<p className="mt-1 text-sm font-semibold text-slate-900">
{company.status}
</p>
</div>
</div>
</div>
)}

{!loading && !company && (
<div className="mt-8 rounded-2xl border border-dashed border-slate-300 bg-white p-8">
<h2 className="text-lg font-semibold text-slate-900">
No company profile yet
</h2>

<p className="mt-2 text-sm text-slate-600">
Add your first company to start building your enterprise
workspace.
</p>

<Link
href="/connections/new"
className="mt-5 inline-flex rounded-xl bg-slate-900 px-5 py-3 text-sm font-medium text-white transition hover:bg-slate-800"
>
Add Company
</Link>
</div>
)}

<div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-3">
<div className="rounded-xl border border-slate-200 bg-white p-6">
<h3 className="font-semibold text-slate-900">
Directory Access
</h3>

<p className="mt-2 text-sm text-slate-600">
Public company listings are now connected to the live
Supabase directory.
</p>

<Link
href="/connections"
className="mt-4 inline-block text-sm font-medium text-slate-900"
>
View Directory →
</Link>
</div>

<div className="rounded-xl border border-slate-200 bg-white p-6">
<h3 className="font-semibold text-slate-900">
Verification Status
</h3>

<p className="mt-2 text-sm text-amber-700">
Sandbox mode active.
</p>

<Link
href="/verify"
className="mt-4 inline-block rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-amber-700"
>
View Requirements
</Link>
</div>

<div className="rounded-xl border border-slate-200 bg-white p-6">
<h3 className="font-semibold text-slate-900">
Procurement Systems
</h3>

<p className="mt-2 text-sm text-slate-600">
RFQ workflows are available in sandbox mode.
</p>

<Link
href="/rfq"
className="mt-4 inline-block text-sm font-medium text-slate-900"
>
Open RFQ Manager →
</Link>
</div>
</div>
</div>
</section>
</div>
</main>
);
}