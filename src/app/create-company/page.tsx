"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

type CreateCompanyResponse = {
success?: boolean;
redirectTo?: string;
error?: string;
};

const COMPANY_CATEGORIES = [
"Developer / Owner",
"General Contracting",
"Architecture & Design",
"Engineering Consultant",
"Construction Management",
"Acoustic / Specialty Products",
"Interior Systems",
"Facade / Building Envelope",
"MEP / Building Systems",
"Manufacturer",
"Distributor / Supplier",
"Real Estate / Asset Management",
"Government / Public Sector",
"Education / Institutional",
"Healthcare / Life Sciences",
"Hospitality / Retail",
"Mixed-Use Development",
"Other",
];

const NETWORK_ROLES = [
"Owner / Developer",
"General Contractor",
"Architect / Designer",
"Manufacturer",
"Vendor / Supplier",
"Consultant",
];

function normalizeValue(value: string) {
return value.trim();
}

export default function CreateCompanyPage() {
const router = useRouter();

const [name, setName] = useState("");
const [category, setCategory] = useState("Mixed-Use Development");
const [location, setLocation] = useState("");
const [networkRole, setNetworkRole] = useState("Owner / Developer");

const [loading, setLoading] = useState(false);
const [error, setError] = useState("");

const formIsReady = useMemo(() => {
return (
normalizeValue(name).length >= 2 &&
normalizeValue(category).length > 0 &&
normalizeValue(location).length >= 2 &&
normalizeValue(networkRole).length > 0
);
}, [name, category, location, networkRole]);

async function handleCreateCompany(
event: React.FormEvent<HTMLFormElement>
) {
event.preventDefault();

const normalizedName = normalizeValue(name);
const normalizedCategory = normalizeValue(category);
const normalizedLocation = normalizeValue(location);
const normalizedNetworkRole = normalizeValue(networkRole);

if (!formIsReady) {
setError("Please complete all required workspace setup fields.");
return;
}

setLoading(true);
setError("");

try {
const response = await fetch("/api/companies/create", {
method: "POST",
headers: {
"Content-Type": "application/json",
},
body: JSON.stringify({
name: normalizedName,
category: normalizedCategory,
location: normalizedLocation,
networkRole: normalizedNetworkRole,
}),
});

const data = (await response.json()) as CreateCompanyResponse;

if (!response.ok) {
setError(data.error || "Failed to create company workspace.");
setLoading(false);
return;
}

router.push(data.redirectTo || "/company/settings");
router.refresh();
} catch (error) {
console.error(error);
setError("Request failed. Please try again.");
setLoading(false);
}
}

return (
<main className="min-h-screen bg-[#f6f6f3] px-6 py-10">
<div className="mx-auto max-w-6xl">
<Link
href="/dashboard"
className="text-sm font-bold text-slate-500 hover:text-slate-950"
>
← Back to dashboard
</Link>

<section className="mt-8 grid gap-8 lg:grid-cols-[1fr_420px]">
<div className="rounded-[40px] border border-black/5 bg-slate-950 p-10 text-white">
<p className="text-xs font-black uppercase tracking-[0.35em] text-orange-400">
Nexus Pavilion Setup
</p>

<h1 className="mt-4 text-5xl font-black leading-tight">
Create your company workspace
</h1>

<p className="mt-5 max-w-2xl text-sm leading-7 text-slate-300">
Start with only the essentials required to activate your company
workspace. Billing, tax ID, and legal verification are handled
later during subscription or enterprise verification.
</p>

<div className="mt-8 grid gap-4 md:grid-cols-2">
<SetupPoint
title="Fast setup"
description="No tax ID or billing details required at onboarding."
/>

<SetupPoint
title="Governance ready"
description="You can add admins, invite users, and manage access after setup."
/>

<SetupPoint
title="Marketplace identity"
description="Category and role define how your company appears in the network."
/>

<SetupPoint
title="Enterprise path"
description="Verification and subscription details can be completed later."
/>
</div>
</div>

<div className="rounded-[40px] border border-black/5 bg-white p-8 shadow-sm">
<p className="text-xs font-black uppercase tracking-[0.3em] text-orange-500">
Workspace Registration
</p>

<h2 className="mt-3 text-3xl font-black text-slate-950">
Company identity
</h2>

<p className="mt-3 text-sm leading-6 text-slate-600">
Create the workspace profile your team and suppliers will use
across Nexus Pavilion.
</p>

<form onSubmit={handleCreateCompany} className="mt-7 space-y-5">
<label className="block">
<span className="mb-2 block text-xs font-black uppercase tracking-[0.2em] text-slate-500">
Company Name
</span>

<input
type="text"
required
placeholder="Northline Development Group"
value={name}
onChange={(event) => setName(event.target.value)}
disabled={loading}
className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-950 outline-none transition focus:border-slate-950 focus:bg-white disabled:cursor-not-allowed disabled:opacity-60"
/>
</label>

<label className="block">
<span className="mb-2 block text-xs font-black uppercase tracking-[0.2em] text-slate-500">
Primary Category
</span>

<select
required
value={category}
onChange={(event) => setCategory(event.target.value)}
disabled={loading}
className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-950 outline-none transition focus:border-slate-950 focus:bg-white disabled:cursor-not-allowed disabled:opacity-60"
>
{COMPANY_CATEGORIES.map((item) => (
<option key={item} value={item}>
{item}
</option>
))}
</select>
</label>

<label className="block">
<span className="mb-2 block text-xs font-black uppercase tracking-[0.2em] text-slate-500">
Regional Hub
</span>

<input
type="text"
required
placeholder="Toronto, ON"
value={location}
onChange={(event) => setLocation(event.target.value)}
disabled={loading}
className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-950 outline-none transition focus:border-slate-950 focus:bg-white disabled:cursor-not-allowed disabled:opacity-60"
/>
</label>

<label className="block">
<span className="mb-2 block text-xs font-black uppercase tracking-[0.2em] text-slate-500">
Network Role
</span>

<select
required
value={networkRole}
onChange={(event) => setNetworkRole(event.target.value)}
disabled={loading}
className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-950 outline-none transition focus:border-slate-950 focus:bg-white disabled:cursor-not-allowed disabled:opacity-60"
>
{NETWORK_ROLES.map((item) => (
<option key={item} value={item}>
{item}
</option>
))}
</select>
</label>

<div className="rounded-3xl bg-slate-50 p-5">
<p className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">
Billing & Legal Details
</p>

<p className="mt-2 text-sm font-semibold leading-6 text-slate-600">
Tax ID, business number, subscription plan, and billing
contact will be collected later when you subscribe or request
company verification.
</p>
</div>

{error ? (
<div className="rounded-2xl bg-red-50 px-4 py-3 text-sm font-bold leading-6 text-red-600">
{error}
</div>
) : null}

<button
type="submit"
disabled={loading || !formIsReady}
className="w-full rounded-full bg-slate-950 px-7 py-4 text-sm font-bold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
>
{loading ? "Creating workspace..." : "Create Company Workspace"}
</button>
</form>
</div>
</section>
</div>
</main>
);
}

function SetupPoint({
title,
description,
}: {
title: string;
description: string;
}) {
return (
<div className="rounded-3xl bg-white/10 p-5">
<p className="text-sm font-black text-white">{title}</p>

<p className="mt-2 text-xs font-semibold leading-5 text-slate-400">
{description}
</p>
</div>
);
}