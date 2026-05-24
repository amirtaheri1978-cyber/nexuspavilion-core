"use client";

import Link from "next/link";

export default function VerifyPage() {
return (
<main className="min-h-screen bg-slate-100 p-8">
<div className="mx-auto max-w-4xl">
<Link
href="/dashboard"
className="text-sm font-medium text-slate-600 hover:text-slate-900"
>
← Back to Dashboard
</Link>

<div className="mt-8 rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
<p className="text-sm font-semibold uppercase tracking-wide text-amber-700">
Sandbox Verification
</p>

<h1 className="mt-3 text-3xl font-bold text-slate-900">
Enterprise Verification Requirements
</h1>

<p className="mt-3 text-slate-600">
Complete these requirements before RFQ, Project Matrix, and Blueprint Center access can be unlocked.
</p>

<div className="mt-8 space-y-4">
<div className="rounded-xl border border-slate-200 p-5">
<h2 className="font-semibold text-slate-900">
1. Legal Entity Review
</h2>
<p className="mt-2 text-sm text-slate-600">
Confirm corporate legal name, tax identification, and regional operating hub.
</p>
</div>

<div className="rounded-xl border border-slate-200 p-5">
<h2 className="font-semibold text-slate-900">
2. Network Role Confirmation
</h2>
<p className="mt-2 text-sm text-slate-600">
Validate whether the organization acts as an owner, contractor, or industrial supplier.
</p>
</div>

<div className="rounded-xl border border-slate-200 p-5">
<h2 className="font-semibold text-slate-900">
3. Compliance Readiness
</h2>
<p className="mt-2 text-sm text-slate-600">
Prepare baseline documentation for enterprise procurement participation.
</p>
</div>
</div>

<div className="mt-8 rounded-xl bg-amber-50 p-5 text-sm text-amber-800">
Verification is currently simulated in Sandbox Mode. Approval workflows will be connected to backend services in a later phase.
</div>
</div>
</div>
</main>
);
}