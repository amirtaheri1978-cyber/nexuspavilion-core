"use client";

import { useEffect, useState } from "react";

import AppSidebar from "@/components/common/AppSidebar";
import AppTopbar from "@/components/common/AppTopbar";
import SandboxStrip from "@/components/common/SandboxStrip";

import {
getEnterpriseSession,
type MockEnterpriseSession,
} from "@/lib/mockEnterpriseSession";

export default function DashboardPage() {
const [session, setSession] = useState<MockEnterpriseSession | null>(null);

useEffect(() => {
setSession(getEnterpriseSession());
}, []);

return (
<main className="min-h-screen bg-slate-100">
<SandboxStrip />

<div className="flex">
<AppSidebar />

<section className="min-h-screen flex-1">
<AppTopbar />

<div className="p-8">
<h1 className="text-3xl font-bold text-slate-900">
Global Procurement Ledger
</h1>

<p className="mt-2 text-slate-600">
Explore active supply networks while your enterprise verification is pending.
</p>

{session && (
<div className="mt-8 rounded-xl border border-slate-200 bg-white p-6">
<h2 className="text-lg font-semibold text-slate-900">
{session.legalName}
</h2>

<p className="mt-2 text-sm text-slate-600">
{session.primaryCategory} · {session.regionalHub}
</p>

<p className="mt-2 text-sm text-amber-700">
Verification Status: {session.verificationStatus}
</p>
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