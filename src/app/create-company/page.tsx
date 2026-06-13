"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type AccountType = "buyer_owner" | "vendor_supplier" | "consultant_service";

type CreateCompanyResponse = {
success?: boolean;
redirectTo?: string;
error?: string;
};

const ACCOUNT_TYPES: {
value: AccountType;
label: string;
description: string;
}[] = [
{
value: "buyer_owner",
label: "Buyer / Owner",
description: "For owners, developers, GCs, and procurement teams creating RFQs.",
},
{
value: "vendor_supplier",
label: "Vendor / Supplier",
description: "For suppliers, manufacturers, subcontractors, and specialty vendors.",
},
{
value: "consultant_service",
label: "Consultant / Service Provider",
description: "For architects, engineers, consultants, and professional services.",
},
];

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

const NETWORK_ROLES_BY_ACCOUNT_TYPE: Record<AccountType, string[]> = {
buyer_owner: [
"Owner / Developer",
"General Contractor",
"Construction Manager",
"Procurement Team",
],
vendor_supplier: [
"Vendor / Supplier",
"Manufacturer",
"Distributor / Supplier",
"Subcontractor",
"Specialty Contractor",
],
consultant_service: [
"Architect / Designer",
"Engineer",
"Cost Consultant",
"Project Consultant",
"Consultant",
],
};

function normalizeValue(value: string) {
return value.trim();
}

export default function CreateCompanyPage() {
const router = useRouter();

const [accountType, setAccountType] = useState<AccountType>("buyer_owner");
const [name, setName] = useState("");
const [category, setCategory] = useState("Mixed-Use Development");
const [location, setLocation] = useState("");
const [networkRole, setNetworkRole] = useState(
NETWORK_ROLES_BY_ACCOUNT_TYPE.buyer_owner[0]
);

const [loading, setLoading] = useState(false);
const [error, setError] = useState("");

const networkRoles = NETWORK_ROLES_BY_ACCOUNT_TYPE[accountType];

const formIsReady = useMemo(() => {
return (
normalizeValue(name).length >= 2 &&
normalizeValue(category).length > 0 &&
normalizeValue(location).length >= 2 &&
normalizeValue(accountType).length > 0 &&
normalizeValue(networkRole).length > 0
);
}, [name, category, location, accountType, networkRole]);

function handleAccountTypeChange(value: AccountType) {
setAccountType(value);
setNetworkRole(NETWORK_ROLES_BY_ACCOUNT_TYPE[value][0]);
}

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
accountType,
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

<section className="mt-8 grid gap-8 lg:grid-cols-[1fr_460px]">
<div className="rounded-[40px] border border-black/5 bg-slate-950 p-10 text-white">
<p className="text-xs font-black uppercase tracking-[0.35em] text-orange-400">
Nexus Pavilion Setup
</p>

<h1 className="mt-4 text-5xl font-black leading-tight">
Create your company workspace
</h1>

<p className="mt-5 max-w-2xl text-sm leading-7 text-slate-300">
Choose how your organization participates in Nexus Pavilion.
Your account type controls workspace permissions, RFQ access,
supplier visibility, and procurement workflows from day one.
</p>

<div className="mt-8 grid gap-4 md:grid-cols-2">
<SetupPoint
title="Correct role from day one"
description="Buyer-side and supplier-side accounts are assigned accurately during setup."
/>

<SetupPoint
title="Procurement-ready"
description="Owners and GCs can create RFQs. Vendors can discover opportunities and submit quotes."
/>

<SetupPoint
title="Enterprise governance"
description="Workspace ownership, access, and permissions are connected to account type."
/>

<SetupPoint
title="Billing later"
description="Tax ID, billing, and verification are collected later during subscription or review."
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
Set up the correct company profile and access model for your
organization.
</p>

<form onSubmit={handleCreateCompany} className="mt-7 space-y-5">
<label className="block">
<span className="mb-2 block text-xs font-black uppercase tracking-[0.2em] text-slate-500">
Account Type
</span>

<select
required
value={accountType}
onChange={(event) =>
handleAccountTypeChange(event.target.value as AccountType)
}
disabled={loading}
className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-950 outline-none transition focus:border-slate-950 focus:bg-white disabled:cursor-not-allowed disabled:opacity-60"
>
{ACCOUNT_TYPES.map((item) => (
<option key={item.value} value={item.value}>
{item.label}
</option>
))}
</select>

<p className="mt-2 text-xs font-semibold leading-5 text-slate-500">
{
ACCOUNT_TYPES.find((item) => item.value === accountType)
?.description
}
</p>
</label>

<label className="block">
<span className="mb-2 block text-xs font-black uppercase tracking-[0.2em] text-slate-500">
Company Name
</span>

<input
type="text"
required
placeholder={
accountType === "vendor_supplier"
? "Ottawa Interior Solutions Inc."
: "Northline Development Group"
}
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
{networkRoles.map((item) => (
<option key={item} value={item}>
{item}
</option>
))}
</select>
</label>

<div className="rounded-3xl bg-slate-50 p-5">
<p className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">
Access Model
</p>

<p className="mt-2 text-sm font-semibold leading-6 text-slate-600">
{accountType === "buyer_owner"
? "This workspace can create RFQs, invite suppliers, compare quotes, and award contracts."
: "This workspace can discover procurement opportunities, respond to RFQs, and manage supplier activity."}
</p>
</div>

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