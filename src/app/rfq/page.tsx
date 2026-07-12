import Link from "next/link";
import type { ReactNode } from "react";

import { createClient } from "@/lib/supabase/server";

type ProcurementScope =
| "material"
| "subcontractor"
| "equipment"
| "professional_service";

type SourcingMethod = "open" | "invited" | "sealed_bid";

type ContractFramework = "project_specific" | "framework";

type RFQ = {
id: string;
slug: string;
title: string | null;
description: string | null;
category: string | null;
location: string | null;
budget: number | string | null;
status: string | null;
company_id: string | null;
created_at?: string | null;
procurement_scope: ProcurementScope | null;
sourcing_method: SourcingMethod | null;
contract_framework: ContractFramework | null;
};

type Profile = {
company_id: string | null;
role: string | null;
};

type Company = {
id: string;
network_role: string | null;
};

type RfqInvite = {
rfq_id: string;
email: string | null;
status: string | null;
};

type SupplierQuoteAccess = {
rfq_id: string;
};

const PROCUREMENT_SCOPE_LABELS: Record<ProcurementScope, string> = {
material: "Material / Product",
subcontractor: "Subcontractor / Trade",
equipment: "Equipment Rental",
professional_service: "Professional Service",
};

const SOURCING_METHOD_LABELS: Record<SourcingMethod, string> = {
open: "Open Tender",
invited: "Invited / Selective",
sealed_bid: "Sealed Bid",
};

const CONTRACT_FRAMEWORK_LABELS: Record<ContractFramework, string> = {
project_specific: "Project Specific",
framework: "Framework Agreement",
};

function getStatusLabel(status: string | null) {
if (status === "awarded") return "Awarded";
if (status === "closed") return "Closed";
return "Open";
}

function getStatusTone(status: string | null) {
if (status === "awarded") return "success";
if (status === "closed") return "neutral";
return "warning";
}

function getActionLabel(status: string | null) {
if (status === "awarded") return "View Award →";
if (status === "closed") return "View Closed →";
return "Open →";
}

function isSupplierCompany(networkRole: string | null | undefined) {
const value = String(networkRole || "").toLowerCase();

return (
value.includes("vendor") ||
value.includes("supplier") ||
value.includes("manufacturer") ||
value.includes("distributor") ||
value.includes("trade")
);
}

function canCreateRFQ(
role: string | null | undefined,
networkRole: string | null | undefined
) {
const normalizedRole = String(role || "").toLowerCase();

if (["owner", "admin", "buyer"].includes(normalizedRole)) {
return true;
}

return !isSupplierCompany(networkRole);
}

function getPageDescription(networkRole: string | null | undefined) {
if (isSupplierCompany(networkRole)) {
return "Browse public RFQs and secure invited opportunities available to your supplier account.";
}

return "Browse, classify, monitor, and manage construction RFQs connected to your enterprise workspace.";
}

function getMarketplaceMode(networkRole: string | null | undefined) {
if (isSupplierCompany(networkRole)) {
return "Supplier Opportunity View";
}

return "Buyer Procurement Workspace";
}

function isOpenRFQ(status: string | null) {
return !status || status === "open";
}

function getProcurementScope(value: ProcurementScope | null | undefined) {
if (value && PROCUREMENT_SCOPE_LABELS[value]) {
return value;
}

return "subcontractor";
}

function getSourcingMethod(value: SourcingMethod | null | undefined) {
if (value && SOURCING_METHOD_LABELS[value]) {
return value;
}

return "invited";
}

function getContractFramework(value: ContractFramework | null | undefined) {
if (value && CONTRACT_FRAMEWORK_LABELS[value]) {
return value;
}

return "project_specific";
}

function getScopeLabel(value: ProcurementScope | null | undefined) {
return PROCUREMENT_SCOPE_LABELS[getProcurementScope(value)];
}

function getSourcingLabel(value: SourcingMethod | null | undefined) {
return SOURCING_METHOD_LABELS[getSourcingMethod(value)];
}

function getFrameworkLabel(value: ContractFramework | null | undefined) {
return CONTRACT_FRAMEWORK_LABELS[getContractFramework(value)];
}

function getBudgetLabel(value: number | string | null | undefined) {
const amount = Number(value || 0);

if (!Number.isFinite(amount) || amount <= 0) {
return "Not specified";
}

return `$${amount.toLocaleString()}`;
}

function getTotalBudget(rfqs: RFQ[]) {
return rfqs.reduce((total, rfq) => {
const amount = Number(rfq.budget || 0);
return total + (Number.isFinite(amount) ? amount : 0);
}, 0);
}

function isSupplierVisibleRfq(
rfq: RFQ,
accessibleRfqIds: Set<string>
) {
const sourcingMethod = getSourcingMethod(rfq.sourcing_method);
const contractFramework = getContractFramework(rfq.contract_framework);

if (!isOpenRFQ(rfq.status)) return false;

if (sourcingMethod === "open") return true;

if (
sourcingMethod === "invited" ||
sourcingMethod === "sealed_bid" ||
contractFramework === "framework"
) {
return accessibleRfqIds.has(rfq.id);
}

return false;
}

function getVisibilityBadge(
rfq: RFQ,
supplierMode: boolean,
invitedRfqIds: Set<string>,
supplierQuotedRfqIds: Set<string>
) {
const sourcingMethod = getSourcingMethod(rfq.sourcing_method);
const contractFramework = getContractFramework(rfq.contract_framework);

if (!supplierMode) {
if (contractFramework === "framework") return "Framework Managed";
if (sourcingMethod === "open") return "Public Marketplace";
if (sourcingMethod === "sealed_bid") return "Sealed Bid Control";
return "Invite-Controlled";
}

if (invitedRfqIds.has(rfq.id)) return "Invited Access";
if (supplierQuotedRfqIds.has(rfq.id)) return "Supplier Account Access";
if (sourcingMethod === "open") return "Open Marketplace";

return "Restricted";
}

function getProcurementHealth({
total,
open,
awarded,
closed,
}: {
total: number;
open: number;
awarded: number;
closed: number;
}) {
if (total === 0) return "Insufficient Data";
if (awarded > 0 && open > 0) return "Active";
if (open > 0) return "Pipeline Active";
if (closed > 0 || awarded > 0) return "Completed";
return "Ready";
}

export default async function RFQMarketplacePage() {
const supabase = await createClient();

const {
data: { user },
} = await supabase.auth.getUser();

const userEmail = String(user?.email || "").trim().toLowerCase();

const { data: profileData } = user
? await supabase
.from("profiles")
.select("company_id, role")
.eq("id", user.id)
.single()
: { data: null };

const profile = profileData as Profile | null;

const { data: companyData } = profile?.company_id
? await supabase
.from("companies")
.select("id, network_role")
.eq("id", profile.company_id)
.single()
: { data: null };

const company = companyData as Company | null;

const supplierMode =
profile?.role === "vendor" || isSupplierCompany(company?.network_role);

const {
data: invitedRows,
error: invitedRowsError,
} =
supplierMode && userEmail
? await supabase
.from("rfq_invites")
.select("rfq_id, email, status")
.ilike("email", userEmail)
: { data: [], error: null };

const {
data: supplierQuoteRows,
error: supplierQuoteRowsError,
} =
supplierMode && profile?.company_id
? await supabase
.from("quotes")
.select("rfq_id")
.eq("company_id", profile.company_id)
: { data: [], error: null };

const inviteList = (invitedRows ?? []) as RfqInvite[];
const supplierQuoteAccessList =
(supplierQuoteRows ?? []) as SupplierQuoteAccess[];

const invitedRfqIds = new Set(
inviteList.map((invite) => invite.rfq_id)
);

const supplierQuotedRfqIds = new Set(
supplierQuoteAccessList.map((quote) => quote.rfq_id)
);

const accessibleRfqIds = new Set([
...invitedRfqIds,
...supplierQuotedRfqIds,
]);

const {
data: rfqs,
error: rfqsError,
} = supplierMode
? await supabase
.from("rfqs")
.select("*")
.or("status.eq.open,status.is.null")
.order("created_at", { ascending: false })
: profile?.company_id
? await supabase
.from("rfqs")
.select("*")
.eq("company_id", profile.company_id)
.order("created_at", { ascending: false })
: { data: [], error: null };

if (invitedRowsError || supplierQuoteRowsError || rfqsError) {
console.error("[RFQ Marketplace] Data access error", {
inviteError: invitedRowsError?.message ?? null,
supplierQuoteError: supplierQuoteRowsError?.message ?? null,
rfqError: rfqsError?.message ?? null,
authenticatedEmail: userEmail || null,
supplierCompanyId: profile?.company_id ?? null,
});
}

const rawRfqList = (rfqs ?? []) as RFQ[];

const rfqList = supplierMode
? rawRfqList.filter((rfq) =>
isSupplierVisibleRfq(rfq, accessibleRfqIds)
)
: rawRfqList;

const openCount = rfqList.filter((rfq) => isOpenRFQ(rfq.status)).length;
const awardedCount = rfqList.filter((rfq) => rfq.status === "awarded").length;
const closedCount = rfqList.filter((rfq) => rfq.status === "closed").length;

const materialCount = rfqList.filter(
(rfq) => getProcurementScope(rfq.procurement_scope) === "material"
).length;

const tradeCount = rfqList.filter(
(rfq) => getProcurementScope(rfq.procurement_scope) === "subcontractor"
).length;

const equipmentCount = rfqList.filter(
(rfq) => getProcurementScope(rfq.procurement_scope) === "equipment"
).length;

const serviceCount = rfqList.filter(
(rfq) => getProcurementScope(rfq.procurement_scope) === "professional_service"
).length;

const openTenderCount = rfqList.filter(
(rfq) => getSourcingMethod(rfq.sourcing_method) === "open"
).length;

const invitedCount = rfqList.filter(
(rfq) => getSourcingMethod(rfq.sourcing_method) === "invited"
).length;

const sealedBidCount = rfqList.filter(
(rfq) => getSourcingMethod(rfq.sourcing_method) === "sealed_bid"
).length;

const frameworkCount = rfqList.filter(
(rfq) => getContractFramework(rfq.contract_framework) === "framework"
).length;

const totalBudget = getTotalBudget(rfqList);

const procurementHealth = getProcurementHealth({
total: rfqList.length,
open: openCount,
awarded: awardedCount,
closed: closedCount,
});

return (
<main className="relative min-h-screen overflow-hidden bg-[#061426] px-4 py-6 text-white sm:px-6 lg:px-10">
<div className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(circle_at_top_left,rgba(44,196,232,0.18),transparent_34%),radial-gradient(circle_at_top_right,rgba(200,166,70,0.15),transparent_30%),linear-gradient(180deg,#061426_0%,#07111F_45%,#020617_100%)]" />
<div className="pointer-events-none fixed inset-0 -z-10 bg-[linear-gradient(120deg,rgba(255,255,255,0.055),transparent_32%,rgba(200,166,70,0.05)_66%,transparent)]" />

<div className="mx-auto w-full max-w-[1680px]">
<section className="rounded-[38px] border border-white/10 bg-white/[0.045] p-6 shadow-[0_32px_110px_rgba(0,0,0,0.42)] backdrop-blur-2xl sm:p-8 lg:p-10">
<div className="flex flex-col gap-8 xl:flex-row xl:items-start xl:justify-between">
<div>
<p className="text-xs font-black uppercase tracking-[0.34em] text-[#C8A646]">
Executive Procurement Workspace
</p>

<h1 className="mt-4 max-w-5xl text-4xl font-black tracking-[-0.05em] text-white sm:text-5xl xl:text-[64px] xl:leading-[0.98]">
RFQ Command Center
</h1>

<p className="mt-5 max-w-4xl text-sm font-semibold leading-7 text-slate-300 sm:text-base">
{getPageDescription(company?.network_role)}
</p>

<div className="mt-6 flex flex-wrap gap-3">
<ExecutiveBadge tone="blue">
{getMarketplaceMode(company?.network_role)}
</ExecutiveBadge>

<ExecutiveBadge tone={rfqList.length > 0 ? "success" : "warning"}>
{rfqList.length > 0 ? "Available" : "Insufficient Data"}
</ExecutiveBadge>

<ExecutiveBadge tone="neutral">
{supplierMode ? "Supplier View" : "Buyer Workspace"}
</ExecutiveBadge>
</div>
</div>

<div className="grid min-w-full gap-4 sm:grid-cols-2 xl:min-w-[520px]">
<HeroMetric title="Visible RFQs" value={String(rfqList.length)} />
<HeroMetric title="Procurement Health" value={procurementHealth} />
<HeroMetric title="Open Pipeline" value={String(openCount)} />
<HeroMetric title="Total Budget" value={getBudgetLabel(totalBudget)} />
</div>
</div>

<div className="mt-8 flex flex-wrap gap-3">
{canCreateRFQ(profile?.role, company?.network_role) ? (
<Link
href="/rfq/new"
className="rounded-full bg-gradient-to-r from-[#B9902F] via-[#C8A646] to-[#F5D77B] px-6 py-3 text-sm font-black text-slate-950 shadow-[0_18px_55px_rgba(200,166,70,0.24)] transition hover:scale-[1.01]"
>
Create RFQ
</Link>
) : null}

<Link
href="/dashboard"
className="rounded-full border border-white/10 bg-white/[0.055] px-6 py-3 text-sm font-black text-white transition hover:bg-white/[0.08]"
>
Dashboard
</Link>

<Link
href="/analytics"
className="rounded-full border border-[#2CC4E8]/25 bg-[#2CC4E8]/10 px-6 py-3 text-sm font-black text-[#9BE8F8] transition hover:bg-[#2CC4E8]/15"
>
Executive Analytics
</Link>
</div>
</section>

<section className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
<StatusCard title="Visible RFQs" value={rfqList.length} />
<StatusCard title="Open" value={openCount} />
<StatusCard title="Awarded" value={awardedCount} />
<StatusCard title="Closed" value={closedCount} />
</section>

<section className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
<StatusCard title="Material RFQs" value={materialCount} />
<StatusCard title="Trade RFQs" value={tradeCount} />
<StatusCard title="Equipment RFQs" value={equipmentCount} />
<StatusCard title="Service RFQs" value={serviceCount} />
</section>

<section className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
<StatusCard title="Open Tender" value={openTenderCount} />
<StatusCard title="Invited" value={invitedCount} />
<StatusCard title="Sealed Bid" value={sealedBidCount} />
<StatusCard title="Framework" value={frameworkCount} />
</section>

<section className="mt-10 rounded-[36px] border border-white/10 bg-white/[0.045] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.28)] backdrop-blur-xl sm:p-8">
<div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
<div>
<p className="text-xs font-black uppercase tracking-[0.3em] text-[#C8A646]">
Procurement Pipeline
</p>

<h2 className="mt-3 text-3xl font-black text-white">
Active RFQ Records
</h2>

<p className="mt-3 max-w-3xl text-sm font-semibold leading-7 text-slate-400">
Review procurement opportunities, sourcing controls, contract
framework, budget visibility, and marketplace access from one
executive RFQ workspace.
</p>
</div>

<ExecutiveBadge tone="blue">
{rfqList.length} Records
</ExecutiveBadge>
</div>

<div className="mt-8 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
{rfqList.length > 0 ? (
rfqList.map((rfq) => (
<Link
key={rfq.id}
href={`/rfq/${rfq.slug}`}
className="group rounded-[30px] border border-white/10 bg-[#061426]/72 p-6 shadow-[0_22px_70px_rgba(0,0,0,0.22)] transition hover:-translate-y-1 hover:border-[#2CC4E8]/25 hover:bg-[#07111F]"
>
<div className="flex items-start justify-between gap-4">
<p className="text-xs font-black uppercase tracking-[0.25em] text-[#C8A646]">
{rfq.category || "Procurement"}
</p>

<ExecutiveBadge tone={getStatusTone(rfq.status)}>
{getStatusLabel(rfq.status)}
</ExecutiveBadge>
</div>

<h2 className="mt-4 text-2xl font-black leading-tight text-white">
{rfq.title || "Untitled RFQ"}
</h2>

<div className="mt-4 flex flex-wrap gap-2">
<Badge>{getScopeLabel(rfq.procurement_scope)}</Badge>
<Badge>{getSourcingLabel(rfq.sourcing_method)}</Badge>
<Badge>{getFrameworkLabel(rfq.contract_framework)}</Badge>
</div>

<p className="mt-4 line-clamp-3 text-sm font-semibold leading-7 text-slate-400">
{rfq.description || "No description provided."}
</p>

<div className="mt-6 grid grid-cols-2 gap-4 text-sm">
<SignalBlock label="Location" value={rfq.location || "N/A"} />
<SignalBlock label="Budget" value={getBudgetLabel(rfq.budget)} />
</div>

<div className="mt-6 flex items-center justify-between gap-4">
<span className="rounded-full border border-white/10 bg-white/[0.055] px-3 py-1 text-xs font-black text-slate-300">
{getVisibilityBadge(
rfq,
supplierMode,
invitedRfqIds,
supplierQuotedRfqIds
)}
</span>

<span className="text-sm font-black text-[#9BE8F8] transition group-hover:translate-x-1">
{getActionLabel(rfq.status)}
</span>
</div>
</Link>
))
) : (
<div className="col-span-full">
<EmptyState
title="No RFQs Found"
description={
supplierMode
? "No public or invited RFQs are currently available for your supplier account."
: "Create your first classified construction procurement opportunity."
}
canCreate={canCreateRFQ(profile?.role, company?.network_role)}
/>
</div>
)}
</div>
</section>
</div>
</main>
);
}

function HeroMetric({ title, value }: { title: string; value: string }) {
return (
<div className="rounded-[26px] border border-white/10 bg-[#061426]/75 p-5">
<p className="text-xs font-black uppercase tracking-[0.2em] text-slate-500">
{title}
</p>

<p className="mt-2 text-2xl font-black text-white">{value}</p>
</div>
);
}

function StatusCard({ title, value }: { title: string; value: number }) {
return (
<div className="rounded-[28px] border border-white/10 bg-white/[0.045] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.26)] backdrop-blur-xl">
<p className="text-xs font-black uppercase tracking-[0.2em] text-slate-500">
{title}
</p>

<p className="mt-3 text-4xl font-black text-white">{value}</p>
</div>
);
}

function Badge({ children }: { children: ReactNode }) {
return (
<span className="rounded-full border border-white/10 bg-white/[0.055] px-3 py-1 text-xs font-black text-slate-300">
{children}
</span>
);
}

function ExecutiveBadge({
children,
tone = "neutral",
}: {
children: ReactNode;
tone?: "success" | "warning" | "blue" | "neutral";
}) {
const toneClass =
tone === "success"
? "border-emerald-300/20 bg-emerald-400/10 text-emerald-300"
: tone === "warning"
? "border-orange-300/20 bg-orange-400/10 text-orange-300"
: tone === "blue"
? "border-[#2CC4E8]/25 bg-[#2CC4E8]/10 text-[#9BE8F8]"
: "border-white/10 bg-white/[0.055] text-slate-300";

return (
<span
className={`inline-flex rounded-full border px-3 py-1 text-xs font-black uppercase tracking-[0.16em] ${toneClass}`}
>
{children}
</span>
);
}

function SignalBlock({ label, value }: { label: string; value: string }) {
return (
<div className="rounded-[22px] border border-white/10 bg-white/[0.035] p-4">
<p className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">
{label}
</p>

<p className="mt-2 text-sm font-black text-white">{value}</p>
</div>
);
}

function EmptyState({
title,
description,
canCreate,
}: {
title: string;
description: string;
canCreate: boolean;
}) {
return (
<div className="rounded-[30px] border border-dashed border-white/15 bg-white/[0.035] p-10 text-center">
<p className="text-xs font-black uppercase tracking-[0.3em] text-[#C8A646]">
Procurement Pipeline
</p>

<h2 className="mt-4 text-3xl font-black text-white">{title}</h2>

<p className="mx-auto mt-3 max-w-2xl text-sm font-semibold leading-7 text-slate-400">
{description}
</p>

{canCreate ? (
<Link
href="/rfq/new"
className="mt-7 inline-flex rounded-full bg-gradient-to-r from-[#B9902F] via-[#C8A646] to-[#F5D77B] px-6 py-3 text-sm font-black text-slate-950 shadow-[0_18px_55px_rgba(200,166,70,0.24)] transition hover:scale-[1.01]"
>
Create RFQ
</Link>
) : null}
</div>
);
}