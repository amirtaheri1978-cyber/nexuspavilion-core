"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type OrganizationType =
| "owner_developer"
| "general_contractor"
| "consultant_service"
| "vendor_supplier";

type AccountType = "buyer_owner" | "vendor_supplier" | "consultant_service";

type CreateCompanyResponse = {
success?: boolean;
redirectTo?: string;
error?: string;
};

type OrganizationOption = {
value: OrganizationType;
label: string;
shortLabel: string;
accountType: AccountType;
networkRole: string;
description: string;
examples: string[];
workspaceTitle: string;
workspaceDescription: string;
workspaceCapabilities: string[];
};

const ORGANIZATION_TYPES: OrganizationOption[] = [
{
value: "owner_developer",
label: "Owner / Developer",
shortLabel: "Owner",
accountType: "buyer_owner",
networkRole: "Project Owner",
description:
"You own, develop, finance, or manage construction projects and procure services from contractors, consultants, suppliers, and vendors.",
examples: [
"Real estate developers",
"Asset owners",
"Property groups",
"Infrastructure owners",
],
workspaceTitle: "Owner Procurement Workspace",
workspaceDescription:
"Built for organizations that issue RFQs, compare proposals, award work, manage suppliers, and report procurement performance to leadership.",
workspaceCapabilities: [
"Create RFQs",
"Invite suppliers",
"Compare quotes",
"Award contracts",
"Generate executive reports",
],
},
{
value: "general_contractor",
label: "General Contractor",
shortLabel: "GC",
accountType: "buyer_owner",
networkRole: "General Contractor",
description:
"You manage project delivery and procure trades, subcontractors, materials, packages, and specialty vendors.",
examples: [
"General contractors",
"Construction managers",
"Design-build firms",
"Project delivery teams",
],
workspaceTitle: "Contractor Procurement Workspace",
workspaceDescription:
"Built for construction teams that need structured RFQs, supplier outreach, quote comparison, award tracking, and procurement visibility.",
workspaceCapabilities: [
"Create RFQs",
"Invite subcontractors",
"Compare trade quotes",
"Award packages",
"Track procurement execution",
],
},
{
value: "consultant_service",
label: "Consultant / Service Provider",
shortLabel: "Consultant",
accountType: "consultant_service",
networkRole: "Professional Services Consultant",
description:
"You provide design, engineering, planning, cost, project advisory, or professional construction services.",
examples: [
"Architects",
"Engineers",
"Cost consultants",
"Project advisors",
],
workspaceTitle: "Consultant Workspace",
workspaceDescription:
"Built for professional service teams that support procurement decisions, project requirements, advisory workflows, and collaboration.",
workspaceCapabilities: [
"Support project teams",
"Join procurement workflows",
"Manage service visibility",
"Collaborate on project requirements",
"Contribute professional expertise",
],
},
{
value: "vendor_supplier",
label: "Supplier / Vendor",
shortLabel: "Supplier",
accountType: "vendor_supplier",
networkRole: "Supplier / Vendor",
description:
"You provide products, materials, equipment, specialized trades, manufacturing, distribution, or construction services.",
examples: [
"Manufacturers",
"Distributors",
"Specialty trades",
"Material suppliers",
],
workspaceTitle: "Supplier Network Workspace",
workspaceDescription:
"Built for vendors and suppliers that want to receive RFQs, submit quotes, manage visibility, and build procurement reputation.",
workspaceCapabilities: [
"Receive RFQs",
"Submit quotes",
"Manage company profile",
"Track opportunities",
"Build procurement reputation",
],
},
];

const INDUSTRIES = [
"General Construction",
"Commercial Construction",
"Residential Development",
"Hospitality & Mixed-Use",
"Healthcare",
"Education",
"Infrastructure",
"Industrial",
"Interior Construction",
"Building Envelope",
"Mechanical / Electrical",
"Acoustics & Architectural Products",
"Professional Services",
"Other",
];

function normalizeValue(value: string) {
return value.trim();
}

export default function CreateCompanyPage() {
const router = useRouter();

const [organizationType, setOrganizationType] =
useState<OrganizationType>("owner_developer");
const [name, setName] = useState("");
const [location, setLocation] = useState("");
const [industry, setIndustry] = useState("General Construction");

const [loading, setLoading] = useState(false);
const [error, setError] = useState("");

const selectedOrganization =
ORGANIZATION_TYPES.find((item) => item.value === organizationType) ||
ORGANIZATION_TYPES[0];

const formIsReady = useMemo(() => {
return (
normalizeValue(name).length >= 2 &&
normalizeValue(location).length >= 2 &&
Boolean(selectedOrganization)
);
}, [name, location, selectedOrganization]);

async function handleCreateCompany(
event: React.FormEvent<HTMLFormElement>
) {
event.preventDefault();

const normalizedName = normalizeValue(name);
const normalizedLocation = normalizeValue(location);
const normalizedIndustry =
normalizeValue(industry) || "General Construction";

if (!formIsReady || !selectedOrganization) {
setError(
"Please select your organization type and complete the required fields."
);
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
category: normalizedIndustry,
location: normalizedLocation,
accountType: selectedOrganization.accountType,
networkRole: selectedOrganization.networkRole,
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

<section className="mt-6 grid gap-6 lg:grid-cols-[1.02fr_0.98fr]">
<section className="overflow-hidden rounded-[36px] border border-black/5 bg-slate-950 text-white shadow-sm">
<div className="p-6 sm:p-10 lg:p-14">
<p className="text-xs font-black uppercase tracking-[0.32em] text-orange-400">
Nexus Pavilion Setup
</p>

<h1 className="mt-5 max-w-4xl text-5xl font-black tracking-[-0.055em] text-white sm:text-6xl lg:text-7xl">
Establish your procurement workspace.
</h1>

<p className="mt-6 max-w-2xl text-base leading-8 text-slate-300 sm:text-lg">
Create a company workspace that matches how your organization
participates in construction procurement.
</p>

<div className="mt-8 rounded-[32px] border border-white/10 bg-white/[0.04] p-6">
<p className="text-xs font-black uppercase tracking-[0.28em] text-orange-300">
{selectedOrganization.workspaceTitle}
</p>

<h2 className="mt-4 text-3xl font-black text-white">
{selectedOrganization.label}
</h2>

<p className="mt-4 text-sm leading-7 text-slate-300">
{selectedOrganization.workspaceDescription}
</p>

<div className="mt-6 grid gap-3">
{selectedOrganization.workspaceCapabilities.map(
(capability) => (
<div
key={capability}
className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-bold text-slate-200"
>
✓ {capability}
</div>
)
)}
</div>
</div>

<div className="mt-8 grid gap-3 sm:grid-cols-2">
<SetupPoint
title="Simple setup"
description="Only the fields required to create your workspace are collected now."
/>

<SetupPoint
title="Clear access model"
description="Your organization type automatically configures role and workflow behavior."
/>

<SetupPoint
title="Procurement ready"
description="RFQs, supplier activity, analytics, and reporting are activated after setup."
/>

<SetupPoint
title="Business details later"
description="Billing, verification, tax, and subscription details are collected when required."
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
Select the option that best describes your organization. Nexus
Pavilion will configure the correct procurement workspace behind
the scenes.
</p>

<form onSubmit={handleCreateCompany} className="mt-8 space-y-6">
<section>
<p className="text-xs font-black uppercase tracking-[0.2em] text-slate-500">
What best describes your organization?
</p>

<div className="mt-4 grid gap-4">
{ORGANIZATION_TYPES.map((item) => {
const selected = item.value === organizationType;

return (
<button
key={item.value}
type="button"
disabled={loading}
onClick={() => setOrganizationType(item.value)}
className={`rounded-3xl border p-5 text-left transition ${
selected
? "border-slate-950 bg-slate-950 text-white shadow-xl"
: "border-slate-200 bg-slate-50 text-slate-950 hover:border-slate-400 hover:bg-white"
}`}
>
<div className="flex items-start justify-between gap-4">
<div>
<p className="text-lg font-black">{item.label}</p>

<p
className={`mt-2 text-sm leading-6 ${
selected ? "text-slate-300" : "text-slate-600"
}`}
>
{item.description}
</p>
</div>

<span
className={`mt-1 rounded-full px-3 py-1 text-xs font-black ${
selected
? "bg-orange-500 text-white"
: "bg-white text-slate-500"
}`}
>
{selected ? "Selected" : item.shortLabel}
</span>
</div>
<div className="mt-4 flex flex-wrap gap-2">
{item.examples.map((example) => (
<span
key={example}
className={`rounded-full px-3 py-1 text-xs font-bold ${
selected
? "bg-white/10 text-slate-200"
: "bg-white text-slate-500"
}`}
>
{example}
</span>
))}
</div>
</button>
);
})}
</div>
</section>

<label className="block">
<span className="mb-2 block text-xs font-black uppercase tracking-[0.2em] text-slate-500">
Company name
</span>

<input
type="text"
required
placeholder={
organizationType === "vendor_supplier"
? "Northern Acoustics & Ceilings Ltd."
: "Northline Development Group"
}
value={name}
onChange={(event) => setName(event.target.value)}
disabled={loading}
className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-950 outline-none transition focus:border-slate-950 focus:bg-white focus:ring-4 focus:ring-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
/>

<p className="mt-2 text-xs font-semibold leading-5 text-slate-500">
This name will be visible to procurement teams, suppliers, and
project partners across Nexus Pavilion.
</p>
</label>

<div className="grid gap-5 sm:grid-cols-2">
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

<p className="mt-2 text-xs font-semibold leading-5 text-slate-500">
Used for supplier discovery, market context, procurement
reporting, and regional intelligence.
</p>
</label>

<label className="block">
<span className="mb-2 block text-xs font-black uppercase tracking-[0.2em] text-slate-500">
Industry
<span className="ml-2 font-bold text-slate-400">
Optional
</span>
</span>

<select
value={industry}
onChange={(event) => setIndustry(event.target.value)}
disabled={loading}
className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-950 outline-none transition focus:border-slate-950 focus:bg-white focus:ring-4 focus:ring-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
>
{INDUSTRIES.map((item) => (
<option key={item} value={item}>
{item}
</option>
))}
</select>

<p className="mt-2 text-xs font-semibold leading-5 text-slate-500">
Helps personalize benchmarks, analytics, supplier context,
and executive reporting.
</p>
</label>
</div>

<section className="rounded-3xl border border-slate-100 bg-slate-50 p-5">
<p className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">
What happens next?
</p>

<div className="mt-4 grid gap-3">
<NextStep
number="01"
title="Create your workspace"
description="Nexus Pavilion creates your company command center."
/>

<NextStep
number="02"
title="Complete your company profile"
description="Add logo, profile details, and marketplace visibility."
/>

<NextStep
number="03"
title="Invite team members"
description="Bring procurement, finance, operations, or vendor teams into the workspace."
/>

<NextStep
number="04"
title="Start procurement activity"
description="Create RFQs, compare quotes, track awards, and open executive analytics."
/>
</div>
</section>
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
{loading ? "Creating workspace..." : "Create Workspace"}
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

function NextStep({
number,
title,
description,
}: {
number: string;
title: string;
description: string;
}) {
return (
<div className="rounded-2xl bg-white p-4">
<p className="text-xs font-black uppercase tracking-[0.2em] text-orange-500">
{number}
</p>

<p className="mt-2 text-sm font-black text-slate-950">{title}</p>

<p className="mt-1 text-xs font-semibold leading-5 text-slate-500">
{description}
</p>
</div>
);
}
