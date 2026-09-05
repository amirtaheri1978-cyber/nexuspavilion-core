import Link from "next/link";
import { redirect } from "next/navigation";

import { getActiveMembershipForUserCompany } from "@/lib/auth/membership";
import { createClient } from "@/lib/supabase/server";
import {
  APPROVED_VENDOR_DOMAIN_AVAILABLE,
  APPROVED_VENDOR_UNAVAILABLE_MESSAGE,
  INVITE_BY_EMAIL_REMAINS_MESSAGE,
  SUPPLIER_COMPLIANCE_DOMAIN_AVAILABLE,
  SUPPLIER_COMPLIANCE_UNAVAILABLE_MESSAGE,
} from "@/lib/procurement/supplier-domain-availability";
import {
  type VendorWorkspaceApprovedVendor,
  type VendorWorkspaceCompliance,
  type VendorWorkspaceQuote,
  VendorDecisionWorkspace,
} from "@/components/vendor-intelligence/vendor-decision-workspace";
import { daysUntil } from "@/components/vendor-intelligence/vendor-display-utils";

type Compliance = VendorWorkspaceCompliance;
type QuotePerformance = VendorWorkspaceQuote;
type ApprovedVendor = VendorWorkspaceApprovedVendor;

function getComplianceForVendor(
complianceList: Compliance[],
vendorCompanyId: string | null | undefined
) {
if (!vendorCompanyId) return null;

return (
complianceList.find(
(compliance) => compliance.vendor_company_id === vendorCompanyId
) || null
);
}

function getVendorRiskLevel(compliance: Compliance | null) {
const score = Number(compliance?.compliance_score || 0);

if (!compliance || score === 0) return "Critical";
if (score >= 85) return "Low";
if (score >= 60) return "Medium";
return "High";
}

function hasExpiredOrCriticalExpiry(compliance: Compliance | null) {
if (!compliance) return true;

const expiries = [
compliance.insurance_expiry,
compliance.certificate_expiry,
compliance.license_expiry,
];

return expiries.some((expiry) => {
const days = daysUntil(expiry);
return days !== null && days <= 30;
});
}

function getVendorQuotes(
quotes: QuotePerformance[],
vendorCompanyId: string | null | undefined
) {
if (!vendorCompanyId) return [];

return quotes.filter((quote) => quote.company_id === vendorCompanyId);
}

export default async function VendorIntelligencePage() {
const supabase = await createClient();

const {
data: { user },
} = await supabase.auth.getUser();

if (!user) {
redirect("/login");
}

const { data: profile } = await supabase
.from("profiles")
.select("id, company_id, role")
.eq("id", user.id)
.single();

if (!profile?.company_id) {
redirect("/create-company");
}

const activeMembership = await getActiveMembershipForUserCompany(
supabase,
user.id,
profile.company_id,
);

if (!activeMembership) {
redirect("/analytics");
}

const companyId = activeMembership.companyId;

const { data: approvedVendorsData } = APPROVED_VENDOR_DOMAIN_AVAILABLE
? await supabase
.from("approved_vendors")
.select(
`
id,
buyer_company_id,
vendor_company_id,
status,
notes,
vendor:companies!approved_vendors_vendor_company_id_fkey(
id,
name,
slug,
category,
location,
network_role,
status
)
`
)
.eq("buyer_company_id", companyId)
.order("created_at", { ascending: false })
: { data: [] as ApprovedVendor[] };

const { data: complianceData } = SUPPLIER_COMPLIANCE_DOMAIN_AVAILABLE
? await supabase
.from("supplier_compliance")
.select(
"id, vendor_company_id, insurance_status, insurance_expiry, certificate_status, certificate_expiry, license_status, license_expiry, tax_status, compliance_score, overall_status"
)
.eq("buyer_company_id", companyId)
: { data: [] as Compliance[] };

const vendorCompanyIds = approvedVendorsData
? approvedVendorsData
.map((vendor) => vendor.vendor_company_id)
.filter(Boolean)
: [];

const { data: quotePerformanceData } =
vendorCompanyIds.length > 0
? await supabase
.from("quotes")
.select("id, rfq_id, company_id, amount, decision, created_at, awarded_at")
.in("company_id", vendorCompanyIds)
: { data: [] };

const approvedVendors = (approvedVendorsData ?? []) as unknown as ApprovedVendor[];
const complianceList = (complianceData ?? []) as Compliance[];
const quotePerformanceList = (quotePerformanceData ?? []) as QuotePerformance[];

const totalVendors = approvedVendors.length;

const compliantVendors = approvedVendors.filter((vendor) => {
const compliance = getComplianceForVendor(
complianceList,
vendor.vendor_company_id
);

return compliance?.overall_status === "valid";
}).length;

const expiringSoon = approvedVendors.filter((vendor) => {
const compliance = getComplianceForVendor(
complianceList,
vendor.vendor_company_id
);

return compliance?.overall_status === "expiring_soon";
}).length;

const highRiskVendors = APPROVED_VENDOR_DOMAIN_AVAILABLE
? approvedVendors.filter((vendor) => {
const compliance = getComplianceForVendor(
complianceList,
vendor.vendor_company_id
);

const risk = getVendorRiskLevel(compliance);

return risk === "High" || risk === "Critical";
}).length
: 0;

const missingCompliance = APPROVED_VENDOR_DOMAIN_AVAILABLE &&
SUPPLIER_COMPLIANCE_DOMAIN_AVAILABLE
? approvedVendors.filter((vendor) => {
const compliance = getComplianceForVendor(
complianceList,
vendor.vendor_company_id
);

return !compliance || compliance.overall_status === "missing";
}).length
: 0;

const expiryAlerts = approvedVendors.filter((vendor) => {
const compliance = getComplianceForVendor(
complianceList,
vendor.vendor_company_id
);

return hasExpiredOrCriticalExpiry(compliance);
}).length;

const criticalExpiryVendors = approvedVendors.filter((vendor) => {
const compliance = getComplianceForVendor(
complianceList,
vendor.vendor_company_id
);

if (!compliance) return true;

const expiries = [
compliance.insurance_expiry,
compliance.certificate_expiry,
compliance.license_expiry,
];

return expiries.some((expiry) => {
const days = daysUntil(expiry);
return days !== null && days <= 30;
});
}).length;

const expiredVendors = approvedVendors.filter((vendor) => {
const compliance = getComplianceForVendor(
complianceList,
vendor.vendor_company_id
);

if (!compliance) return false;

const expiries = [
compliance.insurance_expiry,
compliance.certificate_expiry,
compliance.license_expiry,
];

return expiries.some((expiry) => {
const days = daysUntil(expiry);
return days !== null && days < 0;
});
}).length;

const averageComplianceScore =
complianceList.length > 0
? Math.round(
complianceList.reduce(
(total, compliance) =>
total + Number(compliance.compliance_score || 0),
0
) / complianceList.length
)
: 0;

return (
<main className="min-h-screen bg-slate-950 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
<div className="mx-auto max-w-7xl">
<div className="flex items-center justify-between gap-4">
<Link
href="/analytics"
className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-[0.18em] text-slate-400 transition hover:text-white"
>
<span aria-hidden="true">←</span>
Back to Analytics
</Link>

<span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">
Vendor Intelligence
</span>
</div>

{!APPROVED_VENDOR_DOMAIN_AVAILABLE || !SUPPLIER_COMPLIANCE_DOMAIN_AVAILABLE ? (
<section className="mt-6 rounded-[28px] border border-white/10 bg-white/[0.04] p-6 sm:p-8">
<p className="text-[10px] font-black uppercase tracking-[0.22em] text-orange-400">
Insufficient data
</p>
<p className="mt-3 text-sm font-semibold leading-6 text-slate-300">
{!APPROVED_VENDOR_DOMAIN_AVAILABLE
? APPROVED_VENDOR_UNAVAILABLE_MESSAGE
: null}
{" "}
{!SUPPLIER_COMPLIANCE_DOMAIN_AVAILABLE
? SUPPLIER_COMPLIANCE_UNAVAILABLE_MESSAGE
: null}
</p>
<p className="mt-2 text-sm font-semibold leading-6 text-slate-400">
Missing AVL and compliance dimensions are unavailable, not scored as
zero or non-compliant.
</p>
</section>
) : null}

<section className="mt-6 overflow-hidden rounded-[32px] border border-white/10 bg-gradient-to-br from-white/[0.09] via-white/[0.055] to-white/[0.025] shadow-2xl shadow-black/25">
<div className="grid lg:grid-cols-[1.35fr_0.65fr]">
<div className="relative overflow-hidden p-6 sm:p-8 lg:p-10">
<div
className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full bg-cyan-400/[0.06] blur-3xl"
aria-hidden="true"
/>
<div className="relative">
<div className="flex flex-wrap items-center gap-3">
<span className="rounded-full border border-orange-400/20 bg-orange-400/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.2em] text-orange-300">
Supplier Compliance Center
</span>
<span className="text-xs font-bold text-slate-400">
Approved vendor governance and RFQ readiness
</span>
</div>

<h1 className="mt-6 max-w-4xl text-4xl font-black leading-[1.02] tracking-[-0.04em] text-white sm:text-5xl lg:text-6xl">
Vendor compliance decisions, prioritized for procurement action.
</h1>

<p className="mt-5 max-w-3xl text-sm font-semibold leading-7 text-slate-300 sm:text-base">
Review supplier eligibility, document exposure, and compliance readiness before vendors enter sensitive sourcing and award workflows.
</p>

<div className="mt-8 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
<ExecutiveMetric
label="Approved Vendors"
value={
APPROVED_VENDOR_DOMAIN_AVAILABLE ? String(totalVendors) : "Unavailable"
}
detail={
APPROVED_VENDOR_DOMAIN_AVAILABLE
? "In the active procurement portfolio"
: "Insufficient data"
}
/>
<ExecutiveMetric
label="Compliant"
value={
SUPPLIER_COMPLIANCE_DOMAIN_AVAILABLE
? String(compliantVendors)
: "Unavailable"
}
detail={
SUPPLIER_COMPLIANCE_DOMAIN_AVAILABLE
? "Cleared for current participation"
: "Insufficient data"
}
/>
<ExecutiveMetric
label="Expiring Soon"
value={
SUPPLIER_COMPLIANCE_DOMAIN_AVAILABLE ? String(expiringSoon) : "Unavailable"
}
detail={
SUPPLIER_COMPLIANCE_DOMAIN_AVAILABLE
? "Renewal action required"
: "Insufficient data"
}
/>
<ExecutiveMetric
label="Missing Records"
value={
SUPPLIER_COMPLIANCE_DOMAIN_AVAILABLE
? String(missingCompliance)
: "Unavailable"
}
detail={
SUPPLIER_COMPLIANCE_DOMAIN_AVAILABLE
? "Compliance setup incomplete"
: "Insufficient data"
}
/>
</div>
</div>
</div>

<div className="border-t border-white/10 bg-black/20 p-6 text-white backdrop-blur-sm sm:p-8 lg:border-l lg:border-t-0 lg:p-10">
<p className="text-[10px] font-black uppercase tracking-[0.25em] text-orange-400">
Executive Decision Brief
</p>

<h2 className="mt-4 text-2xl font-black leading-tight tracking-[-0.03em]">
{totalVendors === 0
? APPROVED_VENDOR_DOMAIN_AVAILABLE
? "The approved supplier portfolio is not yet established."
: APPROVED_VENDOR_UNAVAILABLE_MESSAGE
: highRiskVendors > 0 ||
  missingCompliance > 0 ||
  criticalExpiryVendors > 0
? "Supplier intervention is required."
: "The approved vendor portfolio is operationally ready."}
</h2>

<p className="mt-4 text-sm font-semibold leading-6 text-slate-300">
{totalVendors === 0
? APPROVED_VENDOR_DOMAIN_AVAILABLE
? "No suppliers are currently governed through this workspace. Approve qualified vendors to activate compliance monitoring, eligibility control, and performance intelligence."
: `${APPROVED_VENDOR_UNAVAILABLE_MESSAGE} ${SUPPLIER_COMPLIANCE_UNAVAILABLE_MESSAGE}`
: highRiskVendors > 0 ||
  missingCompliance > 0 ||
  criticalExpiryVendors > 0
? `${highRiskVendors} high-risk vendors, ${criticalExpiryVendors} critical expiry cases, and ${missingCompliance} incomplete compliance records require review before unrestricted RFQ participation.`
: "No immediate high-risk, critical-expiry, or missing-record conditions are currently identified across approved vendors."}
</p>

<div className="mt-8 grid grid-cols-2 gap-3">
<DarkMetric
title="Avg Compliance"
value={
!SUPPLIER_COMPLIANCE_DOMAIN_AVAILABLE
? "Unavailable"
: averageComplianceScore > 0
? `${averageComplianceScore}/100`
: "Setup"
}
/>
<DarkMetric
title="High Risk"
value={
APPROVED_VENDOR_DOMAIN_AVAILABLE &&
SUPPLIER_COMPLIANCE_DOMAIN_AVAILABLE
? String(highRiskVendors)
: "Unavailable"
}
/>
<DarkMetric
title="Critical Expiry"
value={
SUPPLIER_COMPLIANCE_DOMAIN_AVAILABLE
? String(criticalExpiryVendors)
: "Unavailable"
}
/>
<DarkMetric
title="Expired"
value={
SUPPLIER_COMPLIANCE_DOMAIN_AVAILABLE
? String(expiredVendors)
: "Unavailable"
}
/>
</div>

<div className="mt-6 rounded-2xl border border-white/10 bg-white/[0.05] p-4">
<p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
Decision Priority
</p>
<p className="mt-2 text-sm font-black text-white">
{!APPROVED_VENDOR_DOMAIN_AVAILABLE
? APPROVED_VENDOR_UNAVAILABLE_MESSAGE
: totalVendors === 0
? "Approve qualified suppliers to establish portfolio governance."
: expiredVendors > 0
? "Resolve expired documents before supplier engagement."
: criticalExpiryVendors > 0
? "Prioritize renewals due within 30 days."
: missingCompliance > 0
? "Complete missing supplier compliance records."
: "Maintain current monitoring cadence."}
</p>
</div>
</div>
</div>
</section>
<section
id="vendor-portfolio-actions"
className="mt-8 overflow-hidden rounded-[28px] border border-white/10 bg-white/[0.04]"
>
<div className="grid lg:grid-cols-[1fr_auto] lg:items-center">
<div className="p-6 sm:p-8">
<div className="flex flex-wrap items-center gap-3">
<span
className={`inline-flex h-2.5 w-2.5 rounded-full ${
totalVendors === 0
? "bg-slate-500"
: expiredVendors > 0 ||
  criticalExpiryVendors > 0 ||
  highRiskVendors > 0
? "bg-red-400"
: missingCompliance > 0 || expiryAlerts > 0
? "bg-orange-400"
: "bg-emerald-400"
}`}
aria-hidden="true"
/>

<p className="text-[10px] font-black uppercase tracking-[0.24em] text-orange-400">
Portfolio Action Layer
</p>

<span className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-slate-300">
{!APPROVED_VENDOR_DOMAIN_AVAILABLE
? "Insufficient data"
: totalVendors === 0
? "Portfolio Not Established"
: expiredVendors > 0 ||
  criticalExpiryVendors > 0 ||
  highRiskVendors > 0 ||
  missingCompliance > 0
? "Action Required"
: "Controls Current"}
</span>
</div>

<h2 className="mt-4 max-w-3xl text-2xl font-black leading-tight tracking-[-0.03em] text-white sm:text-3xl">
{!APPROVED_VENDOR_DOMAIN_AVAILABLE
? APPROVED_VENDOR_UNAVAILABLE_MESSAGE
: totalVendors === 0
? "Establish the approved supplier portfolio before governance can begin."
: expiredVendors > 0
? `${expiredVendors} supplier ${
expiredVendors === 1 ? "record requires" : "records require"
} immediate expiry resolution.`
: criticalExpiryVendors > 0
? `${criticalExpiryVendors} supplier ${
criticalExpiryVendors === 1 ? "requires" : "suppliers require"
} renewal action within 30 days.`
: highRiskVendors > 0
? `${highRiskVendors} high-risk ${
highRiskVendors === 1 ? "supplier requires" : "suppliers require"
} procurement review.`
: missingCompliance > 0
? `${missingCompliance} supplier ${
missingCompliance === 1 ? "record is" : "records are"
} incomplete.`
: "No immediate supplier compliance intervention is required."}
</h2>

<p className="mt-3 max-w-3xl text-sm font-semibold leading-6 text-slate-300">
{!APPROVED_VENDOR_DOMAIN_AVAILABLE
? `${SUPPLIER_COMPLIANCE_UNAVAILABLE_MESSAGE} ${INVITE_BY_EMAIL_REMAINS_MESSAGE}`
: totalVendors === 0
? "Approve qualified suppliers to activate document monitoring, RFQ eligibility controls, and supplier performance intelligence."
: expiredVendors > 0
? "Resolve expired eligibility evidence before the affected suppliers participate in sourcing or award decisions."
: criticalExpiryVendors > 0
? "Prioritize time-sensitive insurance, certificate, or license renewals before eligibility is disrupted."
: highRiskVendors > 0
? "Review compliance evidence and procurement eligibility before unrestricted RFQ participation."
: missingCompliance > 0
? "Complete missing supplier records before treating the portfolio as fully governed."
: "Portfolio monitoring is current. Continue the standard renewal and eligibility review cadence."}
</p>

{totalVendors > 0 ? (
<div className="mt-5 flex flex-wrap gap-2">
<ActionSignal
label="High Risk"
value={highRiskVendors}
attention={highRiskVendors > 0}
/>
<ActionSignal
label="Expiry Alerts"
value={expiryAlerts}
attention={expiryAlerts > 0}
/>
<ActionSignal
label="Missing Records"
value={missingCompliance}
attention={missingCompliance > 0}
/>
<ActionSignal
label="Critical Expiry"
value={criticalExpiryVendors}
attention={criticalExpiryVendors > 0}
/>
<ActionSignal
label="Expired"
value={expiredVendors}
attention={expiredVendors > 0}
/>
</div>
) : null}
</div>

<div className="border-t border-white/10 p-6 sm:p-8 lg:min-w-64 lg:border-l lg:border-t-0">
<p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">
Recommended Next Step
</p>

<p className="mt-3 max-w-xs text-sm font-black leading-6 text-white">
{!APPROVED_VENDOR_DOMAIN_AVAILABLE
? INVITE_BY_EMAIL_REMAINS_MESSAGE
: totalVendors === 0
? "Approve qualified suppliers from the Supplier Directory."
: expiredVendors > 0
? "Resolve expired compliance evidence."
: criticalExpiryVendors > 0
? "Coordinate priority renewals."
: highRiskVendors > 0
? "Open the affected vendor records."
: missingCompliance > 0
? "Complete supplier compliance setup."
: "Continue scheduled portfolio monitoring."}
</p>

{totalVendors === 0 ? (
<Link
href="/directory"
className="mt-5 inline-flex rounded-full bg-white px-5 py-3 text-xs font-black text-slate-950 transition hover:bg-slate-200"
>
Open Supplier Directory
</Link>
) : (
<a
href="#approved-vendor-list"
className="mt-5 inline-flex rounded-full border border-white/15 bg-white/[0.06] px-5 py-3 text-xs font-black text-white transition hover:bg-white/[0.12]"
>
Review Vendor Portfolio
</a>
)}
</div>
</div>
</section>

<section
id="approved-vendor-list"
className="mt-8 overflow-hidden rounded-[32px] border border-white/10 bg-white/[0.035] shadow-2xl shadow-black/20 backdrop-blur-sm"
>
<div className="border-b border-white/10 bg-white/[0.02] p-6 sm:p-8">
<p className="text-xs font-black uppercase tracking-[0.3em] text-orange-500">
Vendor Compliance Matrix
</p>

<h2 className="mt-3 text-3xl font-black tracking-[-0.03em] text-white">
Approved Vendor List
</h2>

<p className="mt-3 max-w-3xl text-sm font-semibold leading-6 text-slate-400">
Compliance records are scoped to your company workspace. Vendors
can be approved in one buyer workspace and still require separate
compliance review in another.
</p>
</div>

{approvedVendors.length > 0 ? (
<div className="divide-y divide-white/10">
{approvedVendors.map((approvedVendor) => {
const compliance = getComplianceForVendor(
complianceList,
approvedVendor.vendor_company_id
);
const vendorQuotes = getVendorQuotes(
quotePerformanceList,
approvedVendor.vendor_company_id
);

return (
<VendorDecisionWorkspace
key={approvedVendor.id}
approvedVendor={approvedVendor}
compliance={compliance}
vendorQuotes={vendorQuotes}
/>
);
})}
</div>
) : (
<div className="relative overflow-hidden p-10 text-center sm:p-14">
<div
className="pointer-events-none absolute left-1/2 top-0 h-56 w-56 -translate-x-1/2 rounded-full bg-cyan-400/[0.05] blur-3xl"
aria-hidden="true"
/>
<div className="relative">
<p className="text-2xl font-black tracking-[-0.02em] text-white">
{APPROVED_VENDOR_DOMAIN_AVAILABLE
? "No approved vendors yet"
: APPROVED_VENDOR_UNAVAILABLE_MESSAGE}
</p>

<p className="mx-auto mt-3 max-w-xl text-sm font-semibold leading-6 text-slate-400">
{APPROVED_VENDOR_DOMAIN_AVAILABLE
? "Approved vendors will appear here after they are added to your company’s approved vendor list."
: `${SUPPLIER_COMPLIANCE_UNAVAILABLE_MESSAGE} Existing RFQ and quote analytics remain available on the main analytics workspace.`}
</p>

<Link
href="/directory"
className="mt-6 inline-flex rounded-full bg-white px-6 py-3 text-sm font-black text-slate-950 transition hover:bg-slate-200"
>
Open Supplier Directory
</Link>
</div>
</div>
)}
</section>
</div>
</main>
);
}


function ExecutiveMetric({
label,
value,
detail,
}: {
label: string;
value: string;
detail: string;
}) {
return (
<div className="rounded-2xl border border-white/10 bg-white/[0.045] p-5 shadow-inner shadow-white/[0.02]">
<p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
{label}
</p>
<p className="mt-3 text-3xl font-black tracking-[-0.03em] text-white">
{value}
</p>
<p className="mt-2 text-xs font-bold leading-5 text-slate-400">
{detail}
</p>
</div>
);
}

function DarkMetric({ title, value }: { title: string; value: string }) {
return (
<div className="rounded-2xl bg-white/10 p-4">
<p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
{title}
</p>

<p className="mt-2 text-2xl font-black text-white">{value}</p>
</div>
);
}

function ActionSignal({
label,
value,
attention,
}: {
label: string;
value: number;
attention: boolean;
}) {
return (
<span
className={`rounded-full border px-3 py-2 text-[10px] font-black uppercase tracking-[0.14em] ${
attention
? "border-orange-400/30 bg-orange-400/10 text-orange-200"
: "border-white/10 bg-white/[0.05] text-slate-400"
}`}
>
{value} {label}
</span>
);
}