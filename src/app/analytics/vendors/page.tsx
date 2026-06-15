import Link from "next/link";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

type Company = {
id: string;
name: string | null;
slug: string | null;
category: string | null;
location: string | null;
network_role: string | null;
status: string | null;
};

type ApprovedVendor = {
id: string;
buyer_company_id: string | null;
vendor_company_id: string | null;
status: string | null;
notes: string | null;
vendor?: Company | null;
};

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

const approvedVendors = (approvedVendorsData ?? []) as any[];
const complianceList = (complianceData ?? []) as Compliance[];

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

const averageComplianceScore =
complianceList.length > 0
? Math.round(
complianceList.reduce(
(total, compliance) => total + Number(compliance.compliance_score || 0),
0
) / complianceList.length
)
: 0;

return (
<main className="min-h-screen bg-[#f6f6f3] px-8 py-10">
<div className="mx-auto max-w-7xl">
<Link
href="/analytics"
className="text-sm font-bold text-slate-500 hover:text-slate-950"
>
← Back to Analytics
</Link>

<section className="mt-8 rounded-[40px] border border-black/5 bg-white p-10 shadow-sm">
<p className="text-xs font-black uppercase tracking-[0.35em] text-orange-500">
Supplier Compliance Center
</p>

<div className="mt-4 grid gap-8 lg:grid-cols-[1fr_0.8fr] lg:items-end">
<div>
<h1 className="max-w-4xl text-5xl font-black leading-tight text-slate-950">
Approved Vendor Compliance Intelligence
</h1>

<p className="mt-4 max-w-3xl text-sm font-semibold leading-7 text-slate-600">
Monitor approved vendors, insurance status, certificate expiry,
license validity, tax compliance, and procurement eligibility
before suppliers participate in sensitive RFQs.
</p>
</div>

<div className="rounded-[32px] bg-slate-950 p-6 text-white">
<p className="text-xs font-black uppercase tracking-[0.25em] text-orange-400">
Compliance Readiness
</p>

<div className="mt-5 grid grid-cols-2 gap-4">
<DarkMetric title="Vendors" value={String(totalVendors)} />
<DarkMetric
title="Avg Score"
value={
averageComplianceScore > 0
? `${averageComplianceScore}/100`
: "Setup"
}
/>
<DarkMetric title="Valid" value={String(compliantVendors)} />
<DarkMetric title="Missing" value={String(missingCompliance)} />
</div>
</div>
</div>
</section>

<section className="mt-8 grid gap-6 md:grid-cols-4">
<MetricCard
title="Approved Vendors"
value={String(totalVendors)}
detail="Supplier companies approved for procurement workflows"
/>

<MetricCard
title="Compliant"
value={String(compliantVendors)}
detail="Vendors with valid compliance status"
/>

<MetricCard
title="Expiring Soon"
value={String(expiringSoon)}
detail="Vendors requiring renewal review"
/>

<MetricCard
title="Missing Compliance"
value={String(missingCompliance)}
detail="Vendors missing required compliance records"
/>
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

function MetricCard({
title,
value,
detail,
}: {
title: string;
value: string;
detail: string;
}) {
return (
<div className="rounded-3xl border border-black/5 bg-white p-6 shadow-sm">
<p className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">
{title}
</p>

<p className="mt-3 text-3xl font-black text-slate-950">{value}</p>

<p className="mt-2 text-sm font-semibold leading-6 text-slate-500">
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