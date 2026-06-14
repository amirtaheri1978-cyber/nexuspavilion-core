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
description:
"For owners, developers, general contractors, and procurement teams managing RFQs and awards.",
},
{
value: "vendor_supplier",
label: "Vendor / Supplier",
description:
"For manufacturers, distributors, subcontractors, specialty trades, and material suppliers.",
},
{
value: "consultant_service",
label: "Consultant / Service Provider",
description:
"For architects, engineers, cost consultants, design advisors, and professional service teams.",
},
];

const COMPANY_CATEGORIES = [
"Project Owner",
"Real Estate Developer",
"General Contractor",
"Construction Manager",
"Architecture",
"Engineering",
"Design Consultancy",
"Interior Construction",
"Building Envelope",
"Mechanical Systems",
"Electrical Systems",
"Building Technology Systems",
"Specialty Trades",
"Manufacturer",
"Distributor",
"Material Supplier",
"Professional Services",
"Cost Consultancy",
"Public Sector",
"Healthcare",
"Education",
"Hospitality & Mixed-Use",
"Other",
];

const NETWORK_ROLES_BY_ACCOUNT_TYPE: Record<AccountType, string[]> = {
buyer_owner: [
"Project Owner",
"Real Estate Developer",
"General Contractor",
"Construction Manager",
"Procurement Team",
],
vendor_supplier: [
"Manufacturer",
"Distributor",
"Material Supplier",
"Subcontractor",
"Specialty Trade",
],
consultant_service: [
"Architect",
"Engineer",
"Design Consultant",
"Cost Consultant",
"Professional Services Consultant",
],
};

const CAPABILITIES_BY_ACCOUNT_TYPE: Record<AccountType, string[]> = {
buyer_owner: [
"Create RFQs",
"Invite suppliers",
"Compare quotes",
"Award contracts",
],
vendor_supplier: [
"Discover opportunities",
"Respond to RFQs",
"Manage supplier profile",
"Track procurement activity",
],
consultant_service: [
"Support project teams",
"Join procurement workflows",
"Contribute professional expertise",
"Manage service visibility",
],
};

function normalizeValue(value: string) {
return value.trim();
}

export default function CreateCompanyPage() {
const router = useRouter();

const [accountType, setAccountType] = useState<AccountType>("buyer_owner");
const [name, setName] = useState("");
const [category, setCategory] = useState("Hospitality & Mixed-Use");
const [location, setLocation] = useState("");
const [networkRole, setNetworkRole] = useState(
NETWORK_ROLES_BY_ACCOUNT_TYPE.buyer_owner[0]
);

const [loading, setLoading] = useState(false);
const [error, setError] = useState("");

const networkRoles = NETWORK_ROLES_BY_ACCOUNT_TYPE[accountType];
const capabilities = CAPABILITIES_BY_ACCOUNT_TYPE[accountType];

const selectedAccountType = ACCOUNT_TYPES.find(
(item) => item.value === accountType
);

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

let data: CreateCompanyResponse = {};

try {
data = (await response.json()) as CreateCompanyResponse;
} catch {
data = {};
}

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
<main className="min-h-screen bg-[#f6f6f3] px-4 py-6 text-slate-950 sm:px-6 lg:px-8 lg:py-10">
<div className="mx-auto max-w-7xl">
<Link
href="/dashboard"
className="inline-flex text-sm font-bold text-slate-500 transition hover:text-slate-950"
>
← Back to dashboard
</Link>

<section className="mt-6 grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
<section className="overflow-hidden rounded-[36px] border border-black/5 bg-slate-950 text-white shadow-sm">
<div className="p-6 sm:p-10 lg:p-14">
<p className="text-xs font-black uppercase tracking-[0.32em] text-orange-400">
Nexus Pavilion Setup
</p>

<h1 className="mt-5 max-w-4xl text-5xl font-black tracking-[-0.055em] text-white sm:text-6xl lg:text-7xl">
Establish your procurement identity.
</h1>

<p className="mt-6 max-w-2xl text-base leading-8 text-slate-300 sm:text-lg">
Define how your organization participates in Nexus Pavilion.
This setup controls workspace access, procurement workflows,
supplier visibility, and company-level permissions.
</p>

<div className="mt-8 grid gap-3 sm:grid-cols-2">
<SetupPoint
title="Role clarity"
description="Buyer, supplier, and consultant paths are separated from the beginning."
/>
<SetupPoint
title="Permission-ready"
description="Workspace access is connected to company identity and account type."
/>
<SetupPoint
title="Procurement workflow"
description="RFQ, supplier, quote, and award access is aligned to the selected model."
/>
<SetupPoint
title="Billing later"
description="Tax, billing, subscription, and verification details are collected later."
/>
</div>
</div>
</section>

<section className="rounded-[36px] border border-black/5 bg-white p-5 shadow-sm sm:p-8 lg:p-10">
<p className="text-xs font-black uppercase tracking-[0.32em] text-orange-500">
Workspace registration
</p>

<h2 className="mt-3 text-4xl font-black tracking-[-0.04em] text-slate-950 sm:text-5xl">
Company identity.
</h2>

<p className="mt-4 text-sm leading-7 text-slate-600">
Select the correct company model before entering the platform.
These settings define the first layer of access and workflow
behavior.
</p>

<form onSubmit={handleCreateCompany} className="mt-8 space-y-5">
<label className="block">
<span className="mb-2 block text-xs font-black uppercase tracking-[0.2em] text-slate-500">
Account type
</span>

<select
required
value={accountType}
onChange={(event) =>
handleAccountTypeChange(event.target.value as AccountType)
}
disabled={loading}
className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-950 outline-none transition focus:border-slate-950 focus:bg-white focus:ring-4 focus:ring-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
>
{ACCOUNT_TYPES.map((item) => (
<option key={item.value} value={item.value}>
{item.label}
</option>
))}
</select>

<p className="mt-2 text-xs font-semibold leading-5 text-slate-500">
{selectedAccountType?.description}
</p>
</label>

<label className="block">
<span className="mb-2 block text-xs font-black uppercase tracking-[0.2em] text-slate-500">
Company name
</span>

<input
type="text"
required
placeholder={
accountType === "vendor_supplier"
? "Ottawa Interior Construction Inc."
: "Northline Development Group"
}
value={name}
onChange={(event) => setName(event.target.value)}
disabled={loading}
className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-950 outline-none transition focus:border-slate-950 focus:bg-white focus:ring-4 focus:ring-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
/>
</label>

<div className="grid gap-5 sm:grid-cols-2">
<label className="block">
<span className="mb-2 block text-xs font-black uppercase tracking-[0.2em] text-slate-500">
Primary category
</span>

<select
required
value={category}
onChange={(event) => setCategory(event.target.value)}
disabled={loading}
className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-950 outline-none transition focus:border-slate-950 focus:bg-white focus:ring-4 focus:ring-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
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
Regional hub
</span>

<input
type="text"
required
placeholder="Toronto, ON"
value={location}
onChange={(event) => setLocation(event.target.value)}
disabled={loading}
className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-950 outline-none transition focus:border-slate-950 focus:bg-white focus:ring-4 focus:ring-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
/>
</label>
</div>

<label className="block">
<span className="mb-2 block text-xs font-black uppercase tracking-[0.2em] text-slate-500">
Network role
</span>

<select
required
value={networkRole}
onChange={(event) => setNetworkRole(event.target.value)}
disabled={loading}
className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-950 outline-none transition focus:border-slate-950 focus:bg-white focus:ring-4 focus:ring-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
>
{networkRoles.map((item) => (
<option key={item} value={item}>
{item}
</option>
))}
</select>
</label>

<div className="rounded-3xl border border-slate-100 bg-slate-50 p-5">
<p className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">
Workspace capabilities
</p>

<div className="mt-4 grid gap-3 sm:grid-cols-2">
{capabilities.map((capability) => (
<div
key={capability}
className="rounded-2xl bg-white px-4 py-3 text-xs font-black text-slate-700"
>
✓ {capability}
</div>
))}
</div>
</div>

<div className="rounded-3xl border border-slate-100 bg-slate-50 p-5">
<p className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">
Deferred setup
</p>

<p className="mt-2 text-sm font-semibold leading-6 text-slate-600">
Tax ID, business number, billing contact, verification, and
subscription details are collected later when required.
</p>
</div>

{error ? (
<div
role="alert"
className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold leading-6 text-red-700"
>
{error}
</div>
) : null}

<button
type="submit"
disabled={loading || !formIsReady}
className="w-full rounded-full bg-slate-950 px-7 py-4 text-sm font-black text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
>
{loading
? "Creating company workspace..."
: "Create Company Workspace"}
</button>
</form>
</section>
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
<div className="rounded-3xl border border-white/10 bg-white/[0.04] p-5">
<p className="text-sm font-black text-white">{title}</p>

<p className="mt-2 text-xs font-semibold leading-5 text-slate-400">
{description}
</p>
</div>
);
}
