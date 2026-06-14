import Link from "next/link";

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

function getStatusClass(status: string | null) {
if (status === "awarded") return "bg-green-100 text-green-700";
if (status === "closed") return "bg-slate-200 text-slate-600";
return "bg-orange-100 text-orange-700";
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

function isSupplierVisibleRfq(rfq: RFQ, invitedRfqIds: Set<string>) {
const sourcingMethod = getSourcingMethod(rfq.sourcing_method);
const contractFramework = getContractFramework(rfq.contract_framework);

if (!isOpenRFQ(rfq.status)) return false;

if (sourcingMethod === "open") return true;

if (sourcingMethod === "invited") {
return invitedRfqIds.has(rfq.id);
}

if (sourcingMethod === "sealed_bid") {
return invitedRfqIds.has(rfq.id);
}

if (contractFramework === "framework") {
return invitedRfqIds.has(rfq.id);
}

return false;
}

function getVisibilityBadge(rfq: RFQ, supplierMode: boolean, invitedRfqIds: Set<string>) {
const sourcingMethod = getSourcingMethod(rfq.sourcing_method);
const contractFramework = getContractFramework(rfq.contract_framework);

if (!supplierMode) {
if (contractFramework === "framework") return "Framework Managed";
if (sourcingMethod === "open") return "Public Marketplace";
if (sourcingMethod === "sealed_bid") return "Sealed Bid Control";
return "Invite-Controlled";
}

if (invitedRfqIds.has(rfq.id)) return "Invited Access";
if (sourcingMethod === "open") return "Open Marketplace";

return "Restricted";
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

const { data: invitedRows } =
supplierMode && userEmail
? await supabase
.from("rfq_invites")
.select("rfq_id, email, status")
.eq("email", userEmail)
: { data: [] };

const inviteList = (invitedRows ?? []) as RfqInvite[];
const invitedRfqIds = new Set(inviteList.map((invite) => invite.rfq_id));

const { data: rfqs } = supplierMode
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
: { data: [] };

const rawRfqList = (rfqs ?? []) as RFQ[];

const rfqList = supplierMode
? rawRfqList.filter((rfq) => isSupplierVisibleRfq(rfq, invitedRfqIds))
: rawRfqList;

const openCount = rfqList.filter((rfq) => isOpenRFQ(rfq.status)).length;

const awardedCount = rfqList.filter(
(rfq) => rfq.status === "awarded"
).length;

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

return (
<main className="min-h-screen bg-[#f6f6f3] px-8 py-10">
<div className="mx-auto max-w-7xl">
<div className="flex items-start justify-between gap-6">
<div>
<p className="text-xs font-black uppercase tracking-[0.35em] text-orange-500">
Construction Procurement Marketplace
</p>

<h1 className="mt-3 text-5xl font-black text-slate-950">
RFQ Marketplace
</h1>

<p className="mt-4 max-w-3xl text-sm leading-6 text-slate-600">
{getPageDescription(company?.network_role)}
</p>

<p className="mt-3 text-xs font-black uppercase tracking-[0.2em] text-slate-400">
Marketplace Mode: {getMarketplaceMode(company?.network_role)}
</p>
</div>

{canCreateRFQ(profile?.role, company?.network_role) ? (
<Link
href="/rfq/new"
className="rounded-full bg-slate-950 px-6 py-3 text-sm font-bold text-white transition hover:bg-slate-800"
>
Create RFQ
</Link>
) : null}
</div>

<section className="mt-8 grid gap-4 md:grid-cols-4">
<StatusCard title="Visible RFQs" value={rfqList.length} />
<StatusCard title="Open" value={openCount} />
<StatusCard title="Awarded" value={awardedCount} />
<StatusCard title="Closed" value={closedCount} />
</section>

<section className="mt-6 grid gap-4 md:grid-cols-4">
<StatusCard title="Material RFQs" value={materialCount} />
<StatusCard title="Trade RFQs" value={tradeCount} />
<StatusCard title="Equipment RFQs" value={equipmentCount} />
<StatusCard title="Service RFQs" value={serviceCount} />
</section>

<section className="mt-6 grid gap-4 md:grid-cols-4">
<StatusCard title="Open Tender" value={openTenderCount} />
<StatusCard title="Invited" value={invitedCount} />
<StatusCard title="Sealed Bid" value={sealedBidCount} />
<StatusCard title="Framework" value={frameworkCount} />
</section>

<section className="mt-10 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
{rfqList.length > 0 ? (
rfqList.map((rfq) => (
<Link
key={rfq.id}
href={`/rfq/${rfq.slug}`}
className="group rounded-[28px] border border-black/5 bg-white p-7 transition hover:-translate-y-1 hover:shadow-xl"
>
<div className="flex items-start justify-between gap-4">
<p className="text-xs font-black uppercase tracking-[0.25em] text-orange-500">
{rfq.category || "Procurement"}
</p>

<span
className={`rounded-full px-3 py-1 text-xs font-black ${getStatusClass(
rfq.status
)}`}
>
{getStatusLabel(rfq.status)}
</span>
</div>

<h2 className="mt-3 text-2xl font-black text-slate-950">
{rfq.title || "Untitled RFQ"}
</h2>

<div className="mt-4 flex flex-wrap gap-2">
<Badge>{getScopeLabel(rfq.procurement_scope)}</Badge>
<Badge>{getSourcingLabel(rfq.sourcing_method)}</Badge>
<Badge>{getFrameworkLabel(rfq.contract_framework)}</Badge>
</div>

<p className="mt-4 line-clamp-3 text-sm leading-relaxed text-slate-600">
{rfq.description || "No description provided."}
</p>

<div className="mt-6 grid grid-cols-2 gap-4 text-sm">
<div>
<p className="font-bold text-slate-400">Location</p>
<p className="mt-1 font-semibold text-slate-700">
{rfq.location || "N/A"}
</p>
</div>

<div>
<p className="font-bold text-slate-400">Budget</p>
<p className="mt-1 font-semibold text-slate-700">
{getBudgetLabel(rfq.budget)}
</p>
</div>
</div>

<div className="mt-6 flex items-center justify-between gap-4">
<span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-600">
{getVisibilityBadge(rfq, supplierMode, invitedRfqIds)}
</span>

<span className="text-sm font-black text-slate-950 transition group-hover:translate-x-1">
{getActionLabel(rfq.status)}
</span>
</div>
</Link>
))
) : (
<div className="col-span-full rounded-[28px] border border-dashed border-slate-300 bg-white p-12 text-center">
<h2 className="text-2xl font-black text-slate-950">
No RFQs found
</h2>

<p className="mt-2 text-sm leading-6 text-slate-600">
{supplierMode
? "No public or invited RFQs are currently available for your supplier account."
: "Create your first classified construction procurement opportunity."}
</p>

{canCreateRFQ(profile?.role, company?.network_role) ? (
<Link
href="/rfq/new"
className="mt-6 inline-flex rounded-full bg-slate-950 px-6 py-3 text-sm font-bold text-white"
>
Create RFQ
</Link>
) : null}
</div>
)}
</section>
</div>
</main>
);
}

function StatusCard({ title, value }: { title: string; value: number }) {
return (
<div className="rounded-3xl border border-black/5 bg-white p-6">
<p className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">
{title}
</p>

<p className="mt-3 text-3xl font-black text-slate-950">{value}</p>
</div>
);
}

function Badge({ children }: { children: React.ReactNode }) {
return (
<span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-600">
{children}
</span>
);
}