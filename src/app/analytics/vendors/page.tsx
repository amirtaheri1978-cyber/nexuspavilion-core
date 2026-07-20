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
return "bg-green-100 text-green-700";
}

if (value === "expiring_soon" || value === "pending") {
return "bg-orange-100 text-orange-700";
}

if (value === "expired" || value === "suspended") {
return "bg-red-100 text-red-700";
}

return "bg-slate-100 text-slate-600";
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

if (days === null) return "text-slate-400";
if (days < 0) return "text-red-600";
if (days <= 30) return "text-red-600";
if (days <= 90) return "text-orange-600";

return "text-green-700";
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

<section className="mt-6 overflow-hidden rounded-[32px] border border-white/10 bg-white shadow-2xl shadow-black/20">
<div className="grid lg:grid-cols-[1.35fr_0.65fr]">
<div className="p-6 sm:p-8 lg:p-10">
<div className="flex flex-wrap items-center gap-3">
<span className="rounded-full bg-orange-50 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.2em] text-orange-700">
Supplier Compliance Center
</span>
<span className="text-xs font-bold text-slate-400">
Approved vendor governance and RFQ readiness
</span>
</div>

<h1 className="mt-6 max-w-4xl text-4xl font-black leading-[1.02] tracking-[-0.04em] text-slate-950 sm:text-5xl lg:text-6xl">
Vendor compliance decisions, prioritized for procurement action.
</h1>

<p className="mt-5 max-w-3xl text-sm font-semibold leading-7 text-slate-600 sm:text-base">
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

<div className="border-t border-slate-200 bg-slate-950 p-6 text-white sm:p-8 lg:border-l lg:border-t-0 lg:p-10">
<p className="text-[10px] font-black uppercase tracking-[0.25em] text-orange-400">
Executive Decision Brief
</p>

<h2 className="mt-4 text-2xl font-black leading-tight tracking-[-0.03em]">
{highRiskVendors > 0 || missingCompliance > 0 || criticalExpiryVendors > 0
? "Supplier intervention is required."
: "The approved vendor portfolio is operationally ready."}
</h2>

<p className="mt-4 text-sm font-semibold leading-6 text-slate-300">
{highRiskVendors > 0 || missingCompliance > 0 || criticalExpiryVendors > 0
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
{expiredVendors > 0
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
<section className="mt-8 rounded-[36px] bg-slate-950 p-8 text-white">
<p className="text-xs font-black uppercase tracking-[0.3em] text-orange-400">
Supplier Risk Intelligence
</p>

<div className="mt-5 grid gap-8 lg:grid-cols-[1fr_0.9fr]">
<div>
<h2 className="text-4xl font-black leading-tight">
Compliance risk engine is active.
</h2>

<p className="mt-4 max-w-3xl text-sm font-semibold leading-7 text-slate-300">
Nexus Pavilion evaluates approved vendors using compliance score,
document status, expiry exposure, and procurement eligibility signals.
</p>

<div className="mt-6 flex flex-wrap gap-3">
<DarkBadge>{highRiskVendors} High Risk</DarkBadge>
<DarkBadge>{expiryAlerts} Expiry Alerts</DarkBadge>
<DarkBadge>{missingCompliance} Missing Records</DarkBadge>
<DarkBadge>{criticalExpiryVendors} Critical Expiry</DarkBadge>
<DarkBadge>{expiredVendors} Expired</DarkBadge>
</div>
</div>

<div className="grid gap-4 sm:grid-cols-2">
<DarkMetric title="Avg Compliance" value={averageComplianceScore > 0 ? `${averageComplianceScore}/100` : "Setup"} />
<DarkMetric title="High Risk" value={String(highRiskVendors)} />
<DarkMetric title="Critical Expiry" value={String(criticalExpiryVendors)} />
<DarkMetric title="Expired" value={String(expiredVendors)} />
</div>
</div>
</section>

<section className="mt-8 overflow-hidden rounded-[36px] border border-black/5 bg-white shadow-sm">
<div className="border-b border-slate-100 p-8">
<p className="text-xs font-black uppercase tracking-[0.3em] text-orange-500">
Vendor Compliance Matrix
</p>

<h2 className="mt-3 text-3xl font-black text-slate-950">
Approved Vendor List
</h2>

<p className="mt-3 max-w-3xl text-sm font-semibold leading-6 text-slate-600">
Compliance records are scoped to your company workspace. Vendors
can be approved in one buyer workspace and still require separate
compliance review in another.
</p>
</div>

{approvedVendors.length > 0 ? (
<div className="divide-y divide-slate-100">
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

return (
<div
key={approvedVendor.id}
className="grid gap-6 p-8 lg:grid-cols-[1fr_1.2fr_0.7fr]"
>
<div>
<div className="flex flex-wrap items-center gap-2">
<span
className={`rounded-full px-3 py-1 text-xs font-black ${getStatusClass(
approvedVendor.status
)}`}
>
{formatStatus(approvedVendor.status)}
</span>

<span
className={`rounded-full px-3 py-1 text-xs font-black ${getStatusClass(
compliance?.overall_status
)}`}
>
{formatStatus(compliance?.overall_status)}
</span>
</div>

<h3 className="mt-4 text-2xl font-black text-slate-950">
{vendor?.name || "Unnamed Vendor"}
</h3>

<p className="mt-2 text-sm font-semibold leading-6 text-slate-500">
{vendor?.category || "Supplier"} ·{" "}
{vendor?.location || "Location N/A"}
</p>

<p className="mt-2 text-sm font-semibold text-slate-400">
{vendor?.network_role || "Network role pending"}
</p>

{vendor?.slug ? (
<Link
href={`/company/${vendor.slug}`}
className="mt-5 inline-flex rounded-full bg-slate-950 px-5 py-3 text-xs font-black text-white transition hover:bg-slate-800"
>
Open Vendor Profile
</Link>
) : null}
</div>

<div className="grid gap-4 sm:grid-cols-2">
<ComplianceBox
title="Insurance"
status={compliance?.insurance_status}
expiry={compliance?.insurance_expiry}
/>

<ComplianceBox
title="Certificate"
status={compliance?.certificate_status}
expiry={compliance?.certificate_expiry}
/>

<ComplianceBox
title="License"
status={compliance?.license_status}
expiry={compliance?.license_expiry}
/>

<ComplianceBox
title="Tax"
status={compliance?.tax_status}
expiry={null}
/>
</div>

<div className="rounded-[28px] bg-slate-50 p-6">
<p className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">
Compliance Score
</p>

<p className="mt-3 text-4xl font-black text-slate-950">
{complianceScore > 0 ? `${complianceScore}/100` : "Setup"}
</p>

<p className="mt-3 text-sm font-semibold leading-6 text-slate-500">
{compliance
? "Calculated from insurance, certificate, license, and tax status."
: "No compliance record has been created for this vendor yet."}
</p>

<div className="mt-5 rounded-2xl bg-white p-4">
<p className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">
Supplier Intelligence
</p>

<p className="mt-2 text-2xl font-black text-slate-950">
{supplierIntelligenceScore}/100
</p>

<p className="mt-1 text-xs font-black text-slate-500">
{supplierIntelligenceRank}
</p>

<p className="mt-3 text-xs font-bold leading-5 text-slate-400">
Based on compliance score, quote participation, and award performance.
</p>
</div>

<div className="mt-4 rounded-2xl bg-white p-4">
<p className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">
Performance Scorecard
</p>

<p className="mt-2 text-2xl font-black text-slate-950">
{performanceScore}/100
</p>

<p className="mt-1 text-xs font-black text-slate-500">
{performanceRank}
</p>

<p className="mt-3 text-xs font-bold leading-5 text-slate-400">
Based on awards won, quote activity, win rate, and awarded revenue.
</p>
</div>

<div className="mt-4 grid grid-cols-2 gap-3">
<SmallSignal title="Quotes" value={String(vendorQuotes.length)} />
<SmallSignal title="Awards" value={String(awardedVendorQuotes.length)} />
<SmallSignal title="Win Rate" value={`${vendorWinRate}%`} />
<SmallSignal title="Awarded" value={formatMoney(awardedRevenue)} />
</div>

<div className="mt-5 rounded-2xl bg-white p-4">
<p className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">
RFQ Eligibility
</p>

<p className="mt-2 text-sm font-black text-slate-950">
{compliance?.overall_status === "valid"
? "Eligible"
: "Review Required"}
</p>
</div>
</div>
</div>
);
})}
</div>
) : (
<div className="p-12 text-center">
<p className="text-2xl font-black text-slate-950">
No approved vendors yet
</p>

<p className="mx-auto mt-3 max-w-xl text-sm font-semibold leading-6 text-slate-500">
Approved vendors will appear here after they are added to your
company’s approved vendor list.
</p>

<Link
href="/directory"
className="mt-6 inline-flex rounded-full bg-slate-950 px-6 py-3 text-sm font-black text-white transition hover:bg-slate-800"
>
Open Supplier Directory
</Link>
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
<div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
<p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
{label}
</p>
<p className="mt-3 text-3xl font-black tracking-[-0.03em] text-slate-950">
{value}
</p>
<p className="mt-2 text-xs font-bold leading-5 text-slate-500">
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

function DarkBadge({ children }: { children: React.ReactNode }) {
return (
<span className="rounded-full bg-white/10 px-4 py-2 text-xs font-black uppercase tracking-[0.15em] text-white">
{children}
</span>
);
}

function SmallSignal({ title, value }: { title: string; value: string }) {
return (
<div className="rounded-2xl bg-white p-4">
<p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
{title}
</p>

<p className="mt-2 text-lg font-black text-slate-950">{value}</p>
</div>
);
}

function ComplianceBox({
title,
status,
expiry,
}: {
title: string;
status: string | null | undefined;
expiry: string | null | undefined;
}) {
return (
<div className="rounded-3xl border border-slate-200 bg-white p-5">
<div className="flex items-start justify-between gap-3">
<div>
<p className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">
{title}
</p>

<p className="mt-2 text-lg font-black text-slate-950">
{formatStatus(status)}
</p>
</div>

<span
className={`rounded-full px-3 py-1 text-xs font-black ${getStatusClass(
status
)}`}
>
{formatStatus(status)}
</span>
</div>

{expiry ? (
<div className="mt-4 rounded-2xl bg-slate-50 p-4">
<p className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">
Expiry
</p>

<p className="mt-2 text-sm font-black text-slate-950">
{formatDate(expiry)}
</p>

<p className={`mt-1 text-xs font-black ${getExpiryClass(expiry)}`}>
{getExpirySignal(expiry)}
</p>
</div>
) : (
<p className="mt-4 text-xs font-bold text-slate-400">
No expiry date recorded.
</p>
)}
</div>
);
}