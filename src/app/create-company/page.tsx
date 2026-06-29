"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type OrganizationType =
| "owner_developer"
| "general_contractor"
| "consultant"
| "service_provider"
| "supplier";

type AccountType =
| "buyer_owner"
| "vendor_supplier"
| "consultant"
| "service_provider";

type WizardStep = "identity" | "organization" | "review";

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

const BRAND_LOGO_SRC = "/branding/logo-horizontal-512.png";

const ORGANIZATION_TYPES: OrganizationOption[] = [
{
value: "owner_developer",
label: "Owner / Developer",
shortLabel: "Owner",
accountType: "buyer_owner",
networkRole: "Project Owner",
description:
"Organizations responsible for planning, funding, developing, owning, and governing capital construction projects.",
examples: [
"Commercial Real Estate Developers",
"Institutional Owners",
"Public Sector Agencies",
"Infrastructure Developers",
],
workspaceTitle: "Owner Procurement Workspace",
workspaceDescription:
"Built for owners and developers managing RFQs, consultant engagement, contractor procurement, supplier participation, awards, and executive reporting.",
workspaceCapabilities: [
"Create RFQs",
"Invite suppliers",
"Compare proposals",
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
"Organizations responsible for delivering construction projects through contracting, construction management, design-build, and EPC delivery models.",
examples: [
"General Contracting Firms",
"Construction Management Firms",
"Design-Build Firms",
"Infrastructure Contractors",
],
workspaceTitle: "Contractor Procurement Workspace",
workspaceDescription:
"Built for contractors managing trade packages, supplier outreach, quote comparison, subcontractor awards, procurement visibility, and project execution intelligence.",
workspaceCapabilities: [
"Create RFQs",
"Invite subcontractors",
"Compare trade quotes",
"Award packages",
"Track procurement execution",
],
},
{
value: "consultant",
label: "Consultant",
shortLabel: "Consultant",
accountType: "consultant",
networkRole: "Professional Consultant",
description:
"Professional consulting organizations providing architecture, engineering, project management, cost management, and technical advisory services.",
examples: [
"Architecture Firms",
"Engineering Firms",
"Cost Consultants",
"Project Management Firms",
],
workspaceTitle: "Consultant Workspace",
workspaceDescription:
"Built for professional consulting teams supporting project requirements, procurement strategy, technical evaluation, advisory workflows, and collaboration.",
workspaceCapabilities: [
"Support project teams",
"Join procurement workflows",
"Manage advisory visibility",
"Collaborate on requirements",
"Contribute technical expertise",
],
},
{
value: "service_provider",
label: "Service Provider",
shortLabel: "Service",
accountType: "service_provider",
networkRole: "Construction Service Provider",
description:
"Organizations delivering specialized construction services, trade installation, commissioning, testing, inspection, logistics, and facility support.",
examples: [
"Specialty Trade Contractors",
"Mechanical Contractors",
"Electrical Contractors",
"Testing & Inspection Firms",
],
workspaceTitle: "Construction Services Workspace",
workspaceDescription:
"Built for service providers receiving service RFQs, submitting technical and commercial proposals, managing project opportunities, and tracking awarded work.",
workspaceCapabilities: [
"Receive service RFQs",
"Submit technical proposals",
"Manage project opportunities",
"Track awarded contracts",
"Showcase service expertise",
],
},
{
value: "supplier",
label: "Building Products Supplier",
shortLabel: "Supplier",
accountType: "vendor_supplier",
networkRole: "Building Products Supplier",
description:
"Organizations supplying construction materials, architectural products, building systems, construction equipment, and distribution services.",
examples: [
"Building Materials Suppliers",
"Architectural Products Suppliers",
"Building Systems Suppliers",
"Construction Product Distributors",
],
workspaceTitle: "Supplier Network Workspace",
workspaceDescription:
"Built for suppliers that receive RFQs, submit quotes, manage company visibility, track project opportunities, and build procurement reputation.",
workspaceCapabilities: [
"Receive RFQs",
"Submit quotes",
"Manage company profile",
"Track opportunities",
"Build procurement reputation",
],
},
];

const STEPS: { key: WizardStep; label: string; description: string }[] = [
{
key: "identity",
label: "Company Identity",
description: "Name and regional hub",
},
{
key: "organization",
label: "Organization Type",
description: "Workspace configuration",
},
{
key: "review",
label: "Review & Activate",
description: "Launch workspace",
},
];

const inputClassName =
"h-[58px] w-full rounded-2xl border border-white/10 bg-[#07111F] px-5 text-sm font-semibold text-white outline-none transition placeholder:text-slate-500 focus:border-[#C8A646] focus:bg-[#081827] focus:ring-4 focus:ring-[#C8A646]/15 disabled:cursor-not-allowed disabled:opacity-60";

function normalizeValue(value: string) {
return value.trim();
}

function getFriendlyCreateCompanyError(message?: string) {
const normalized = String(message || "").toLowerCase();

if (normalized.includes("unauthorized")) {
return "Your secure session has expired. Please sign in again to create your workspace.";
}

if (normalized.includes("duplicate") || normalized.includes("already")) {
return "A workspace with similar company details may already exist. Please review your company name or contact your administrator.";
}

if (normalized.includes("network") || normalized.includes("fetch")) {
return "We could not reach the secure workspace service. Please check your connection and try again.";
}

return "We could not create your workspace securely. Please review your details and try again.";
}
export default function CreateCompanyPage() {
const router = useRouter();

const [currentStep, setCurrentStep] = useState<WizardStep>("identity");
const [organizationType, setOrganizationType] =
useState<OrganizationType>("owner_developer");
const [name, setName] = useState("");
const [location, setLocation] = useState("");

const [loading, setLoading] = useState(false);
const [error, setError] = useState("");

const selectedOrganization =
ORGANIZATION_TYPES.find((item) => item.value === organizationType) ||
ORGANIZATION_TYPES[0];

const identityIsReady = useMemo(() => {
return normalizeValue(name).length >= 2 && normalizeValue(location).length >= 2;
}, [name, location]);

const formIsReady = identityIsReady && Boolean(selectedOrganization);

function goToStep(step: WizardStep) {
if (loading) return;

if (step !== "identity" && !identityIsReady) {
setError("Please complete your company name and regional hub first.");
setCurrentStep("identity");
return;
}

setError("");
setCurrentStep(step);
}

function goNext() {
if (currentStep === "identity") {
if (!identityIsReady) {
setError("Please enter your company name and regional hub to continue.");
return;
}

setError("");
setCurrentStep("organization");
return;
}

if (currentStep === "organization") {
setError("");
setCurrentStep("review");
}
}

function goBack() {
if (loading) return;

setError("");

if (currentStep === "review") {
setCurrentStep("organization");
return;
}

if (currentStep === "organization") {
setCurrentStep("identity");
}
}

async function handleCreateCompany(event: React.FormEvent<HTMLFormElement>) {
event.preventDefault();

const normalizedName = normalizeValue(name);
const normalizedLocation = normalizeValue(location);

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
setError(getFriendlyCreateCompanyError(data.error));
setLoading(false);
return;
}

router.push(data.redirectTo || "/company/settings");
router.refresh();
} catch {
setError(
"A secure workspace creation request could not be completed. Please try again."
);
setLoading(false);
}
}

return (
<main className="relative min-h-screen overflow-hidden bg-[#061426] px-4 py-6 text-white sm:px-6 lg:px-10">
<div className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(circle_at_top_left,rgba(44,196,232,0.18),transparent_34%),radial-gradient(circle_at_top_right,rgba(200,166,70,0.15),transparent_30%),linear-gradient(180deg,#061426_0%,#07111F_45%,#020617_100%)]" />

<div className="pointer-events-none fixed inset-0 -z-10 bg-[linear-gradient(120deg,rgba(255,255,255,0.05),transparent_34%,rgba(200,166,70,0.05)_68%,transparent)]" />

<div className="mx-auto w-full max-w-[1680px]">
<header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
<BrandTile />

<Link
href="/dashboard"
className="inline-flex w-fit items-center rounded-full border border-white/10 bg-white/[0.045] px-4 py-2 text-sm font-black text-slate-300 transition hover:border-[#C8A646]/40 hover:bg-[#C8A646]/10 hover:text-white"
>
← Back to Executive Workspace
</Link>
</header>

<section className="mt-8 grid gap-8 lg:grid-cols-[0.86fr_1.14fr] xl:gap-10">
<aside className="rounded-[38px] border border-white/10 bg-white/[0.045] p-7 shadow-[0_32px_110px_rgba(0,0,0,0.42)] backdrop-blur-2xl sm:p-9 lg:p-11 xl:p-12">
<p className="text-xs font-black uppercase tracking-[0.34em] text-[#C8A646]">
Executive Company Setup
</p>

<h1 className="mt-5 max-w-2xl text-4xl font-black tracking-[-0.05em] text-white sm:text-5xl xl:text-[64px] xl:leading-[0.98]">
Activate your enterprise workspace.
</h1>

<p className="mt-7 max-w-2xl text-base font-semibold leading-8 text-slate-300 xl:text-lg">
Configure your company identity, organization type, access model,
and procurement workspace foundation before entering Nexus
Pavilion.
</p>

<div className="mt-9 rounded-[32px] border border-[#2CC4E8]/15 bg-[#2CC4E8]/[0.055] p-6">
<p className="text-xs font-black uppercase tracking-[0.28em] text-[#9BE8F8]">
{selectedOrganization.workspaceTitle}
</p>

<h2 className="mt-4 text-3xl font-black text-white">
{selectedOrganization.label}
</h2>

<p className="mt-4 text-sm font-semibold leading-7 text-slate-300">
{selectedOrganization.workspaceDescription}
</p>

<div className="mt-6 grid gap-3">
{selectedOrganization.workspaceCapabilities.map((capability) => (
<div
key={capability}
className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.055] px-4 py-3 text-sm font-bold text-slate-200"
>
<span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-[#C8A646]/30 bg-[#C8A646]/10 text-xs text-[#F5D77B]">
✓
</span>
<span>{capability}</span>
</div>
))}
</div>
</div>

<div className="mt-8 grid gap-3 sm:grid-cols-2">
<SetupPoint
title="Guided setup"
description="A focused onboarding flow for your enterprise workspace."
/>

<SetupPoint
title="Clear access model"
description="Your organization type configures workspace behavior."
/>

<SetupPoint
title="Procurement ready"
description="RFQs, suppliers, analytics, and reporting activate after setup."
/>

<SetupPoint
title="Profile details later"
description="Branding, products, services, and certifications can be completed next."
/>
</div>
</aside>
<section className="rounded-[40px] border border-white/10 bg-white/[0.065] p-6 text-white shadow-[0_36px_120px_rgba(0,0,0,0.52)] backdrop-blur-2xl sm:p-8 lg:p-10 xl:p-12">
<div className="flex flex-col gap-5 border-b border-white/10 pb-7 lg:flex-row lg:items-center lg:justify-between">
<div>
<p className="text-xs font-black uppercase tracking-[0.34em] text-[#C8A646]">
Workspace Registration
</p>

<h2 className="mt-3 text-4xl font-black tracking-[-0.05em] text-white sm:text-5xl">
Company setup.
</h2>
</div>

<div className="grid gap-2 sm:grid-cols-3">
{STEPS.map((step, index) => {
const active = step.key === currentStep;
const completed =
(step.key === "identity" && identityIsReady) ||
(step.key === "organization" &&
currentStep === "review" &&
identityIsReady);

return (
<button
key={step.key}
type="button"
onClick={() => goToStep(step.key)}
disabled={loading}
className={`rounded-2xl border px-4 py-3 text-left transition disabled:cursor-not-allowed disabled:opacity-60 ${
active
? "border-[#C8A646]/45 bg-[#C8A646]/10"
: "border-white/10 bg-white/[0.035] hover:bg-white/[0.06]"
}`}
>
<p
className={`text-[10px] font-black uppercase tracking-[0.2em] ${
active ? "text-[#F5D77B]" : "text-slate-500"
}`}
>
{completed ? "Ready" : `Step ${index + 1}`}
</p>

<p className="mt-1 text-xs font-black text-white">
{step.label}
</p>
</button>
);
})}
</div>
</div>

<form onSubmit={handleCreateCompany} className="mt-8">
{currentStep === "identity" ? (
<section className="space-y-6">
<div>
<p className="text-xs font-black uppercase tracking-[0.28em] text-slate-400">
Company Identity
</p>

<p className="mt-3 text-sm font-semibold leading-7 text-slate-300">
Start with the minimum required details. Company branding,
marketplace visibility, services, products, and
certifications can be completed in the Company Command
Center.
</p>
</div>

<label className="block">
<span className="mb-2 block text-xs font-black uppercase tracking-[0.22em] text-slate-400">
Company name
</span>

<input
type="text"
required
placeholder={
organizationType === "supplier"
? "Northline Building Products Ltd."
: "Northline Development Group"
}
value={name}
onChange={(event) => setName(event.target.value)}
disabled={loading}
className={inputClassName}
/>

<p className="mt-2 text-xs font-semibold leading-5 text-slate-500">
This name will be visible to procurement teams, suppliers,
and project partners across Nexus Pavilion.
</p>
</label>

<label className="block">
<span className="mb-2 block text-xs font-black uppercase tracking-[0.22em] text-slate-400">
Regional hub
</span>

<input
type="text"
required
placeholder="Toronto, ON"
value={location}
onChange={(event) => setLocation(event.target.value)}
disabled={loading}
className={inputClassName}
/>

<p className="mt-2 text-xs font-semibold leading-5 text-slate-500">
Used for supplier discovery, market context, procurement
reporting, and regional intelligence.
</p>
</label>
</section>
) : null}

{currentStep === "organization" ? (
<section className="space-y-6">
<div>
<p className="text-xs font-black uppercase tracking-[0.28em] text-slate-400">
Organization Type
</p>

<p className="mt-3 text-sm font-semibold leading-7 text-slate-300">
Select the organization type that best represents your
business. Nexus Pavilion will configure the correct
workspace behavior.
</p>
</div>

<div className="grid gap-4">
{ORGANIZATION_TYPES.map((item) => {
const selected = item.value === organizationType;

return (
<button
key={item.value}
type="button"
disabled={loading}
onClick={() => setOrganizationType(item.value)}
className={`rounded-3xl border p-5 text-left transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60 ${
selected
? "border-[#C8A646]/45 bg-slate-950 text-white shadow-[0_18px_45px_rgba(0,0,0,0.35)]"
: "border-white/10 bg-white/[0.045] text-white hover:border-[#C8A646]/40 hover:bg-white/[0.07]"
}`}
>
<div className="flex items-start justify-between gap-4">
<div>
<p className="text-lg font-black">{item.label}</p>

<p
className={`mt-2 text-sm font-semibold leading-6 ${
selected ? "text-slate-300" : "text-slate-400"
}`}
>
{item.description}
</p>
</div>

<span
className={`mt-1 rounded-full px-3 py-1 text-xs font-black ${
selected
? "bg-[#C8A646] text-slate-950"
: "bg-white/10 text-slate-300"
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
: "bg-white/[0.06] text-slate-400"
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
) : null}
{currentStep === "review" ? (
<section className="space-y-6">
<div>
<p className="text-xs font-black uppercase tracking-[0.28em] text-slate-400">
Review & Activate
</p>

<p className="mt-3 text-sm font-semibold leading-7 text-slate-300">
Review your company workspace configuration before
activation.
</p>
</div>

<div className="rounded-3xl border border-white/10 bg-[#07111F]/75 p-6">
<p className="text-xs font-black uppercase tracking-[0.24em] text-slate-500">
Workspace Summary
</p>

<div className="mt-5 grid gap-4 sm:grid-cols-2">
<ReviewItem label="Company" value={name || "Not set"} />

<ReviewItem
label="Regional Hub"
value={location || "Not set"}
/>

<ReviewItem
label="Organization Type"
value={selectedOrganization.label}
/>

<ReviewItem
label="Network Role"
value={selectedOrganization.networkRole}
/>
</div>
</div>

<section className="rounded-3xl border border-white/10 bg-white/[0.045] p-5">
<p className="text-xs font-black uppercase tracking-[0.2em] text-slate-500">
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
description="Add logo, profile details, service coverage, products, certifications, and marketplace visibility."
/>

<NextStep
number="03"
title="Invite team members"
description="Bring procurement, finance, operations, consultants, service providers, or supplier teams into the workspace."
/>

<NextStep
number="04"
title="Start procurement activity"
description="Create RFQs, compare proposals, track awards, and open executive analytics."
/>
</div>
</section>
</section>
) : null}

{error ? (
<div
role="alert"
className="mt-6 rounded-2xl border border-red-300/20 bg-red-400/10 px-4 py-3 text-sm font-bold leading-6 text-red-200"
>
{error}
</div>
) : null}

<div className="mt-8 flex flex-col gap-3 sm:flex-row">
{currentStep !== "identity" ? (
<button
type="button"
onClick={goBack}
disabled={loading}
className="h-[58px] rounded-2xl border border-white/10 bg-white/[0.045] px-6 text-sm font-black text-white transition hover:bg-white/[0.08] disabled:cursor-not-allowed disabled:opacity-50 sm:w-44"
>
Back
</button>
) : null}

{currentStep !== "review" ? (
<button
type="button"
onClick={goNext}
disabled={loading}
className="h-[58px] flex-1 rounded-2xl bg-gradient-to-r from-[#B9902F] via-[#C8A646] to-[#F5D77B] px-6 text-sm font-black uppercase tracking-[0.12em] text-slate-950 shadow-[0_18px_55px_rgba(200,166,70,0.3)] transition hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:scale-100"
>
Continue
</button>
) : (
<button
type="submit"
disabled={loading || !formIsReady}
className="h-[58px] flex-1 rounded-2xl bg-gradient-to-r from-[#B9902F] via-[#C8A646] to-[#F5D77B] px-6 text-sm font-black uppercase tracking-[0.12em] text-slate-950 shadow-[0_18px_55px_rgba(200,166,70,0.3)] transition hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:scale-100"
>
{loading ? "Activating Workspace..." : "Launch Workspace"}
</button>
)}
</div>
</form>
</section>
</section>
</div>
</main>
);
}

function BrandTile() {
return (
<div className="inline-flex rounded-[30px] border border-white/10 bg-white/[0.06] p-2 shadow-[0_22px_70px_rgba(0,0,0,0.42)] backdrop-blur-xl">
<div className="rounded-[24px] border border-white/10 bg-black px-6 py-5">
<img
src={BRAND_LOGO_SRC}
alt="Nexus Pavilion"
className="h-[72px] w-auto object-contain sm:h-[82px]"
/>
</div>
</div>
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
<div className="rounded-3xl border border-white/10 bg-white/[0.045] p-5">
<p className="text-sm font-black text-white">{title}</p>

<p className="mt-2 text-xs font-semibold leading-5 text-slate-400">
{description}
</p>
</div>
);
}

function ReviewItem({ label, value }: { label: string; value: string }) {
return (
<div className="rounded-2xl border border-white/10 bg-white/[0.045] p-4">
<p className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">
{label}
</p>

<p className="mt-2 text-sm font-black text-white">{value}</p>
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
<div className="rounded-2xl border border-white/10 bg-[#07111F] p-4">
<p className="text-xs font-black uppercase tracking-[0.2em] text-[#C8A646]">
{number}
</p>

<p className="mt-2 text-sm font-black text-white">{title}</p>

<p className="mt-1 text-xs font-semibold leading-5 text-slate-400">
{description}
</p>
</div>
);
}
