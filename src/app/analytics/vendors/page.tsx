import Link from "next/link";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import {
  getAwardedQuotes,
  getAwardedRevenue,
  getPerformanceRank,
  getPerformanceScore,
  getSupplierIntelligenceRank,
  getSupplierIntelligenceScore,
  getWinRate,
} from "@/lib/procurement/supplier-intelligence";

type Compliance = {
id: string;
vendor_company_id: string | null;
insurance_status: string | null;
insurance_expiry: string | null;
certificate_status: string | null;
certificate_expiry: string | null;
license_status: string | null;
license_expiry: string | null;
tax_status: string | null;
compliance_score: number | null;
overall_status: string | null;
};

type QuotePerformance = {
id: string;
rfq_id: string | null;
company_id: string | null;
amount: number | string | null;
decision: string | null;
created_at: string | null;
awarded_at: string | null;
};

type ApprovedVendor = {
id: string;
buyer_company_id: string | null;
vendor_company_id: string;
status: string | null;
notes: string | null;
created_by: string | null;
created_at: string | null;
approved_at: string | null;
vendor?: {
id: string;
name: string | null;
slug: string | null;
category: string | null;
location: string | null;
network_role: string | null;
status: string | null;
logo_url?: string | null;
} | null;
};

function formatStatus(value: string | null | undefined) {
if (!value) return "Missing";

return value
.split("_")
.map((part) => part.charAt(0).toUpperCase() + part.slice(1))
.join(" ");
}

function getStatusClass(value: string | null | undefined) {
if (value === "valid" || value === "approved") {
return "border border-emerald-400/20 bg-emerald-400/10 text-emerald-300";
}

if (value === "expiring_soon" || value === "pending") {
return "border border-orange-400/20 bg-orange-400/10 text-orange-300";
}

if (value === "expired" || value === "suspended") {
return "border border-red-400/20 bg-red-400/10 text-red-300";
}

return "border border-white/10 bg-white/[0.05] text-slate-300";
}

function formatDate(value: string | null | undefined) {
if (!value) return "Not provided";

const date = new Date(value);

if (Number.isNaN(date.getTime())) {
return "Not provided";
}

return date.toLocaleDateString("en-US", {
year: "numeric",
month: "short",
day: "numeric",
});
}
function formatMoney(value: number | string | null | undefined) {
const amount = Number(value);

if (!Number.isFinite(amount)) return "$0";

return `$${amount.toLocaleString()}`;
}

function daysUntil(value: string | null | undefined) {
if (!value) return null;

const date = new Date(value);

if (Number.isNaN(date.getTime())) return null;

const now = new Date();
const diff = date.getTime() - now.getTime();

return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

function getExpirySignal(value: string | null | undefined) {
const days = daysUntil(value);

if (days === null) return "Missing";
if (days < 0) return "Expired";
if (days <= 30) return `${days} days`;
if (days <= 90) return `${days} days`;

return "Current";
}

function getExpiryClass(value: string | null | undefined) {
const days = daysUntil(value);

if (days === null) return "text-slate-500";
if (days < 0) return "text-red-300";
if (days <= 30) return "text-red-300";
if (days <= 90) return "text-orange-300";

return "text-emerald-300";
}

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

const { data: approvedVendorsData } = await supabase
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
.eq("buyer_company_id", profile.company_id)
.order("created_at", { ascending: false });

const { data: complianceData } = await supabase
.from("supplier_compliance")
.select(
"id, vendor_company_id, insurance_status, insurance_expiry, certificate_status, certificate_expiry, license_status, license_expiry, tax_status, compliance_score, overall_status"
)
.eq("buyer_company_id", profile.company_id);

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

const missingCompliance = approvedVendors.filter((vendor) => {
const compliance = getComplianceForVendor(
complianceList,
vendor.vendor_company_id
);

return !compliance || compliance.overall_status === "missing";
}).length;

const highRiskVendors = approvedVendors.filter((vendor) => {
const compliance = getComplianceForVendor(
complianceList,
vendor.vendor_company_id
);

const risk = getVendorRiskLevel(compliance);

return risk === "High" || risk === "Critical";
}).length;

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
value={String(totalVendors)}
detail="In the active procurement portfolio"
/>
<ExecutiveMetric
label="Compliant"
value={String(compliantVendors)}
detail="Cleared for current participation"
/>
<ExecutiveMetric
label="Expiring Soon"
value={String(expiringSoon)}
detail="Renewal action required"
/>
<ExecutiveMetric
label="Missing Records"
value={String(missingCompliance)}
detail="Compliance setup incomplete"
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
? "The approved supplier portfolio is not yet established."
: highRiskVendors > 0 ||
  missingCompliance > 0 ||
  criticalExpiryVendors > 0
? "Supplier intervention is required."
: "The approved vendor portfolio is operationally ready."}
</h2>

<p className="mt-4 text-sm font-semibold leading-6 text-slate-300">
{totalVendors === 0
? "No suppliers are currently governed through this workspace. Approve qualified vendors to activate compliance monitoring, eligibility control, and performance intelligence."
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
averageComplianceScore > 0
? `${averageComplianceScore}/100`
: "Setup"
}
/>
<DarkMetric title="High Risk" value={String(highRiskVendors)} />
<DarkMetric
title="Critical Expiry"
value={String(criticalExpiryVendors)}
/>
<DarkMetric title="Expired" value={String(expiredVendors)} />
</div>

<div className="mt-6 rounded-2xl border border-white/10 bg-white/[0.05] p-4">
<p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
Decision Priority
</p>
<p className="mt-2 text-sm font-black text-white">
{totalVendors === 0
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
{totalVendors === 0
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
{totalVendors === 0
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
{totalVendors === 0
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
{totalVendors === 0
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
const vendor = approvedVendor.vendor;
const compliance = getComplianceForVendor(
complianceList,
approvedVendor.vendor_company_id
);
const vendorQuotes = getVendorQuotes(
quotePerformanceList,
approvedVendor.vendor_company_id
);

const awardedVendorQuotes = getAwardedQuotes(vendorQuotes);

const supplierIntelligenceScore = getSupplierIntelligenceScore({
compliance,
quotes: vendorQuotes,
});

const supplierIntelligenceRank = getSupplierIntelligenceRank(
supplierIntelligenceScore
);

const vendorWinRate = getWinRate(vendorQuotes);
const awardedRevenue = getAwardedRevenue(vendorQuotes);
const performanceScore = getPerformanceScore(vendorQuotes);
const performanceRank = getPerformanceRank(performanceScore);

const complianceScore = Number(
compliance?.compliance_score || 0
);

const riskLevel = getVendorRiskLevel(compliance);
const eligibilityStatus =
compliance?.overall_status === "valid" ? "Eligible" : "Review Required";

const recommendedAction = getVendorRecommendedAction(compliance);

return (
<article
key={approvedVendor.id}
className="p-5 transition-colors hover:bg-white/[0.02] sm:p-6 lg:p-8"
>
<div className="overflow-hidden rounded-[28px] border border-white/10 bg-black/15">
<div className="grid gap-6 border-b border-white/10 p-5 sm:p-6 lg:grid-cols-[1fr_auto] lg:items-start">
<div>
<div className="flex flex-wrap items-center gap-2">
<span
className={`rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] ${getStatusClass(
approvedVendor.status
)}`}
>
{formatStatus(approvedVendor.status)}
</span>

<span
className={`rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] ${getStatusClass(
compliance?.overall_status
)}`}
>
{formatStatus(compliance?.overall_status)}
</span>

<span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">
{riskLevel} Risk
</span>
</div>

<h3 className="mt-4 text-2xl font-black tracking-[-0.03em] text-white">
{vendor?.name || "Unnamed Vendor"}
</h3>

<p className="mt-2 text-sm font-semibold leading-6 text-slate-400">
{vendor?.category || "Supplier"} ·{" "}
{vendor?.location || "Location N/A"} ·{" "}
{vendor?.network_role || "Network role pending"}
</p>
</div>

<div className="flex flex-col items-start gap-3 lg:items-end">
<div className="rounded-2xl border border-white/10 bg-white/[0.045] px-4 py-3 lg:text-right">
<p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">
RFQ Eligibility
</p>
<p
className={`mt-1 text-sm font-black ${
eligibilityStatus === "Eligible"
? "text-emerald-300"
: "text-orange-300"
}`}
>
{eligibilityStatus}
</p>
</div>

{vendor?.slug ? (
<Link
href={`/company/${vendor.slug}`}
className="inline-flex rounded-full border border-white/15 bg-white px-5 py-3 text-xs font-black text-slate-950 transition hover:bg-slate-200"
>
Open Vendor Profile
</Link>
) : null}
</div>
</div>

<div className="grid gap-0 lg:grid-cols-[1.15fr_0.85fr]">
<div className="border-b border-white/10 p-5 sm:p-6 lg:border-b-0 lg:border-r">
<p className="text-[10px] font-black uppercase tracking-[0.22em] text-orange-400">
Compliance Evidence
</p>

<div className="mt-4 overflow-hidden rounded-2xl border border-white/10">
<ComplianceRow
title="Insurance"
status={compliance?.insurance_status}
expiry={compliance?.insurance_expiry}
/>
<ComplianceRow
title="Certificate"
status={compliance?.certificate_status}
expiry={compliance?.certificate_expiry}
/>
<ComplianceRow
title="License"
status={compliance?.license_status}
expiry={compliance?.license_expiry}
/>
<ComplianceRow
title="Tax"
status={compliance?.tax_status}
expiry={null}
/>
</div>
</div>

<div className="p-5 sm:p-6">
<p className="text-[10px] font-black uppercase tracking-[0.22em] text-orange-400">
Decision Intelligence
</p>

<div className="mt-4 grid grid-cols-3 gap-3">
<DecisionMetric
label="Compliance"
value={complianceScore > 0 ? `${complianceScore}` : "—"}
detail={complianceScore > 0 ? "of 100" : "Setup"}
/>
<DecisionMetric
label="Intelligence"
value={String(supplierIntelligenceScore)}
detail={supplierIntelligenceRank}
/>
<DecisionMetric
label="Performance"
value={String(performanceScore)}
detail={performanceRank}
/>
</div>

<div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-2 rounded-2xl border border-white/10 bg-white/[0.035] px-4 py-3 text-xs font-black text-slate-300">
<span>{vendorQuotes.length} Quotes</span>
<span className="text-slate-600" aria-hidden="true">•</span>
<span>{awardedVendorQuotes.length} Awards</span>
<span className="text-slate-600" aria-hidden="true">•</span>
<span>{vendorWinRate}% Win Rate</span>
<span className="text-slate-600" aria-hidden="true">•</span>
<span>{formatMoney(awardedRevenue)} Awarded</span>
</div>

<div className="mt-4 rounded-2xl border border-white/10 bg-black/20 p-4">
<div className="flex flex-wrap items-start justify-between gap-4">
<div>
<p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">
Recommended Action
</p>
<p className="mt-2 text-sm font-black leading-6 text-white">
{recommendedAction.title}
</p>
<p className="mt-1 text-xs font-semibold leading-5 text-slate-400">
{recommendedAction.detail}
</p>
</div>

<span
className={`rounded-full border px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.14em] ${
recommendedAction.tone === "critical"
? "border-red-400/20 bg-red-400/10 text-red-300"
: recommendedAction.tone === "attention"
? "border-orange-400/20 bg-orange-400/10 text-orange-300"
: "border-emerald-400/20 bg-emerald-400/10 text-emerald-300"
}`}
>
{recommendedAction.label}
</span>
</div>
</div>
</div>
</div>
</div>
</article>
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
No approved vendors yet
</p>

<p className="mx-auto mt-3 max-w-xl text-sm font-semibold leading-6 text-slate-400">
Approved vendors will appear here after they are added to your
company’s approved vendor list.
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

function DecisionMetric({
label,
value,
detail,
}: {
label: string;
value: string;
detail: string;
}) {
return (
<div className="rounded-2xl border border-white/10 bg-white/[0.045] p-4">
<p className="text-[9px] font-black uppercase tracking-[0.18em] text-slate-500">
{label}
</p>
<p className="mt-2 text-2xl font-black tracking-[-0.03em] text-white">
{value}
</p>
<p className="mt-1 text-[10px] font-black text-slate-400">
{detail}
</p>
</div>
);
}

function ComplianceRow({
title,
status,
expiry,
}: {
title: string;
status: string | null | undefined;
expiry: string | null | undefined;
}) {
return (
<div className="grid gap-3 border-b border-white/10 bg-white/[0.02] px-4 py-3 last:border-b-0 sm:grid-cols-[1fr_auto_auto] sm:items-center">
<div>
<p className="text-xs font-black text-white">{title}</p>
<p className="mt-1 text-[10px] font-bold text-slate-500">
{expiry ? formatDate(expiry) : "No expiry date recorded"}
</p>
</div>

<span
className={`w-fit rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-[0.12em] ${getStatusClass(
status
)}`}
>
{formatStatus(status)}
</span>

<p
className={`text-xs font-black sm:min-w-20 sm:text-right ${
expiry ? getExpiryClass(expiry) : "text-slate-500"
}`}
>
{expiry ? getExpirySignal(expiry) : "No Expiry"}
</p>
</div>
);
}

function getVendorRecommendedAction(compliance: Compliance | null) {
if (!compliance) {
return {
title: "Complete supplier compliance setup",
detail:
"Create the required compliance record before treating this supplier as RFQ-ready.",
label: "Setup Required",
tone: "critical" as const,
};
}

const expiries = [
{ title: "Insurance", value: compliance.insurance_expiry },
{ title: "Certificate", value: compliance.certificate_expiry },
{ title: "License", value: compliance.license_expiry },
];

const expiredDocument = expiries.find(({ value }) => {
const days = daysUntil(value);
return days !== null && days < 0;
});

if (expiredDocument) {
return {
title: `Renew expired ${expiredDocument.title.toLowerCase()} evidence`,
detail:
"Restore current eligibility documentation before further sourcing or award activity.",
label: "Immediate Action",
tone: "critical" as const,
};
}

const criticalDocument = expiries.find(({ value }) => {
const days = daysUntil(value);
return days !== null && days <= 30;
});

if (criticalDocument) {
return {
title: `Coordinate ${criticalDocument.title.toLowerCase()} renewal`,
detail:
"Complete renewal within the current 30-day exposure window to protect RFQ eligibility.",
label: "Renewal Due",
tone: "attention" as const,
};
}

if (compliance.overall_status !== "valid") {
return {
title: "Review supplier eligibility evidence",
detail:
"Resolve incomplete or non-current compliance conditions before unrestricted RFQ participation.",
label: "Review Required",
tone: "attention" as const,
};
}

return {
title: "Continue standard supplier monitoring",
detail:
"No immediate compliance intervention is required for current procurement participation.",
label: "Controls Current",
tone: "current" as const,
};
}