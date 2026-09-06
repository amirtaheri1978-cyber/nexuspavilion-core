"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { createClient } from "@/lib/supabase/client";
import {
  COMPANY_CAPABILITY_TYPES,
  COMPANY_CAPABILITY_TYPE_LABELS,
  groupCompanyCapabilities,
  type CompanyCapabilityRecord,
  type GroupedCompanyCapabilities,
} from "@/lib/company/capabilities";
import Image from "next/image";
import { EXECUTIVE_FOCUS_CYAN, EXECUTIVE_PAGE_CLASS } from "@/lib/design-system/executive-contract";
import {
  APPROVED_VENDOR_DOMAIN_AVAILABLE,
  APPROVED_VENDOR_UNAVAILABLE_MESSAGE,
} from "@/lib/procurement/supplier-domain-availability";

type Company = {
id: string;
name: string;
slug: string;
category: string;
location: string;
network_role: string;
status: string;
logo_url: string | null;
created_at: string;
};

type Quote = {
id: string;
company_id: string | null;
amount: number | string | null;
decision: string | null;
};

type Profile = {
company_id: string | null;
role: string | null;
};

type ApprovedVendor = {
vendor_company_id: string;
status: string | null;
rating: number | null;
};


function formatMoney(value: number) {
if (!Number.isFinite(value)) return "$0";

return `$${value.toLocaleString()}`;
}

function isSupplierCompany(company: Company) {
const role = String(company.network_role || "").toLowerCase();

return (
role.includes("vendor") ||
role.includes("supplier") ||
role.includes("contractor") ||
role.includes("manufacturer") ||
role.includes("consultant") ||
role.includes("architect") ||
role.includes("engineer")
);
}

function canManageAvl(role: string | null | undefined) {
return ["owner", "admin", "buyer"].includes(String(role || "").toLowerCase());
}

function getSupplierRank(score: number) {
if (score >= 90) return "Top Tier";
if (score >= 80) return "Preferred";
if (score >= 70) return "Qualified";
if (score >= 50) return "Developing";

return "Emerging";
}

function getReliabilitySignal(score: number) {
if (score >= 90) return "Excellent";
if (score >= 80) return "Strong";
if (score >= 70) return "Reliable";
if (score >= 50) return "Developing";

return "Limited Data";
}

function getRankTone(rank: string) {
if (rank === "Top Tier") return "success";
if (rank === "Preferred") return "blue";
if (rank === "Qualified") return "warning";
if (rank === "Developing") return "warning";

return "neutral";
}

function getAvlTone(status: string | null | undefined) {
if (status === "approved") return "success";
if (status === "conditional") return "warning";
if (status === "suspended") return "danger";
if (status === "rejected") return "neutral";

return "neutral";
}

function getAvlStatusLabel(status: string | null | undefined) {
if (status === "approved") return "Approved";
if (status === "conditional") return "Conditional";
if (status === "suspended") return "Suspended";
if (status === "rejected") return "Rejected";

return "Not in AVL";
}

function buildRankedCompanies(companies: Company[], quotes: Quote[]) {
return companies.map((company) => {
const companyQuotes = quotes.filter(
(quote) => quote.company_id === company.id
);

const awards = companyQuotes.filter(
(quote) => quote.decision === "awarded"
);

const totalBidValue = companyQuotes.reduce((total, quote) => {
const amount = Number(quote.amount);
return total + (Number.isFinite(amount) ? amount : 0);
}, 0);

const awardedRevenue = awards.reduce((total, quote) => {
const amount = Number(quote.amount);
return total + (Number.isFinite(amount) ? amount : 0);
}, 0);

const quotesSubmitted = companyQuotes.length;
const awardsWon = awards.length;

const averageBid =
quotesSubmitted > 0 ? Math.round(totalBidValue / quotesSubmitted) : 0;

const winRate =
quotesSubmitted > 0 ? Math.round((awardsWon / quotesSubmitted) * 100) : 0;

const supplierScore = Math.min(
100,
Math.round(
winRate * 0.45 +
awardsWon * 12 +
Math.min(awardedRevenue / 25000, 25) +
Math.min(quotesSubmitted * 2, 15)
)
);

return {
...company,
quotesSubmitted,
awardsWon,
awardedRevenue,
averageBid,
winRate,
supplierScore,
supplierRank: getSupplierRank(supplierScore),
reliabilitySignal: getReliabilitySignal(supplierScore),
};
});
}
export default function PublicDirectoryPage() {
const supabase = useMemo(() => createClient(), []);

const [companies, setCompanies] = useState<Company[]>([]);
const [quotes, setQuotes] = useState<Quote[]>([]);
const [capabilityRows, setCapabilityRows] = useState<CompanyCapabilityRecord[]>([]);
const [approvedVendors, setApprovedVendors] = useState<ApprovedVendor[]>([]);
const [profile, setProfile] = useState<Profile | null>(null);

const [search, setSearch] = useState("");
const [loading, setLoading] = useState(true);
const [savingVendorId, setSavingVendorId] = useState<string | null>(null);
const [actionMessage, setActionMessage] = useState("");

useEffect(() => {
async function loadDirectoryData() {
setLoading(true);

const {
data: { user },
} = await supabase.auth.getUser();

const { data: profileData } = user
? await supabase
.from("profiles")
.select("company_id, role")
.eq("id", user.id)
.maybeSingle()
: { data: null };

const currentProfile = (profileData || null) as Profile | null;
setProfile(currentProfile);

const [
{ data: companiesData, error: companiesError },
{ data: capabilityData, error: capabilityError },
{ data: quotesData },
{ data: approvedVendorData },
] = await Promise.all([
supabase
.from("company_directory")
.select("id, name, slug, category, location, network_role, status, logo_url, created_at")
.in("status", ["approved", "verified"])
.order("created_at", { ascending: false }),

supabase
.from("company_capabilities")
.select("id, company_id, capability_type, label, sort_order")
.order("sort_order", { ascending: true })
.order("label", { ascending: true }),

supabase.from("quotes").select("id, company_id, amount, decision"),

APPROVED_VENDOR_DOMAIN_AVAILABLE && currentProfile?.company_id
? supabase
.from("approved_vendors")
.select("vendor_company_id, status, rating")
: Promise.resolve({ data: [] as ApprovedVendor[] }),
]);

if (!companiesError && companiesData) {
setCompanies(companiesData as Company[]);
}

if (capabilityError) {
console.error("Company network capability lookup failed.", capabilityError);
} else if (capabilityData) {
setCapabilityRows(capabilityData as CompanyCapabilityRecord[]);
}

if (quotesData) {
setQuotes(quotesData as Quote[]);
}

if (approvedVendorData) {
setApprovedVendors(approvedVendorData as ApprovedVendor[]);
}

setLoading(false);
}

loadDirectoryData();
}, [supabase]);

const approvedVendorMap = useMemo(() => {
const map = new Map<string, ApprovedVendor>();

approvedVendors.forEach((vendor) => {
map.set(vendor.vendor_company_id, vendor);
});

return map;
}, [approvedVendors]);

const capabilitiesByCompany = useMemo(() => {
const rowsByCompany = new Map<string, CompanyCapabilityRecord[]>();

capabilityRows.forEach((capability) => {
const existing = rowsByCompany.get(capability.company_id) || [];
existing.push(capability);
rowsByCompany.set(capability.company_id, existing);
});

const groupedByCompany = new Map<string, GroupedCompanyCapabilities>();

rowsByCompany.forEach((rows, companyId) => {
groupedByCompany.set(companyId, groupCompanyCapabilities(rows));
});

return groupedByCompany;
}, [capabilityRows]);

const rankedCompanies = useMemo(() => {
return buildRankedCompanies(companies, quotes);
}, [companies, quotes]);

const supplierCompanies = useMemo(() => {
return rankedCompanies
.filter((company) => isSupplierCompany(company))
.sort((a, b) => b.supplierScore - a.supplierScore);
}, [rankedCompanies]);

const topSupplier = supplierCompanies[0];

const networkStats = useMemo(() => {
const totalAwards = supplierCompanies.reduce(
(total, company) => total + company.awardsWon,
0
);

const totalRevenue = supplierCompanies.reduce(
(total, company) => total + company.awardedRevenue,
0
);

const averageScore =
supplierCompanies.length > 0
? Math.round(
supplierCompanies.reduce(
(total, company) => total + company.supplierScore,
0
) / supplierCompanies.length
)
: 0;

const approvedCount = approvedVendors.filter(
(vendor) => vendor.status === "approved"
).length;

const conditionalCount = approvedVendors.filter(
(vendor) => vendor.status === "conditional"
).length;

const suspendedCount = approvedVendors.filter(
(vendor) => vendor.status === "suspended"
).length;

return {
companies: rankedCompanies.length,
suppliers: supplierCompanies.length,
totalAwards,
totalRevenue,
averageScore,
approvedCount,
conditionalCount,
suspendedCount,
};
}, [rankedCompanies, supplierCompanies, approvedVendors]);

const filteredCompanies = useMemo(() => {
const query = search.toLowerCase().trim();

if (!query) return rankedCompanies;

return rankedCompanies.filter((company) => {
const avlStatus = approvedVendorMap.get(company.id)?.status || "";
const capabilityContext = capabilitiesByCompany.get(company.id);
const capabilityMatch = capabilityContext
? COMPANY_CAPABILITY_TYPES.some((capabilityType) =>
capabilityContext[capabilityType].some((label) =>
label.toLowerCase().includes(query)
)
)
: false;
const supplierScopedMatch =
isSupplierCompany(company) &&
(
company.supplierRank.toLowerCase().includes(query) ||
company.reliabilitySignal.toLowerCase().includes(query) ||
avlStatus.toLowerCase().includes(query)
);

return (
company.name.toLowerCase().includes(query) ||
company.category.toLowerCase().includes(query) ||
company.location.toLowerCase().includes(query) ||
company.network_role.toLowerCase().includes(query) ||
capabilityMatch ||
supplierScopedMatch
);
});
}, [rankedCompanies, search, approvedVendorMap, capabilitiesByCompany]);

async function updateApprovedVendor(
vendorCompanyId: string,
status: "approved" | "conditional" | "suspended" | "rejected"
) {
try {
setSavingVendorId(vendorCompanyId);
setActionMessage("");

const response = await fetch("/api/approved-vendors", {
method: "POST",
headers: {
"Content-Type": "application/json",
},
body: JSON.stringify({
vendorCompanyId,
status,
rating: status === "approved" ? 85 : status === "conditional" ? 70 : 40,
}),
});

const data = await response.json();

if (!response.ok) {
setActionMessage(data.error || APPROVED_VENDOR_UNAVAILABLE_MESSAGE);
return;
}

const nextVendor: ApprovedVendor = {
vendor_company_id: vendorCompanyId,
status: data.approvedVendor?.status || status,
rating: data.approvedVendor?.rating || 85,
};

setApprovedVendors((current) => {
const existing = current.filter(
(vendor) => vendor.vendor_company_id !== vendorCompanyId
);

return [...existing, nextVendor];
});

setActionMessage("Approved vendor list updated.");
} catch (error) {
console.error(error);
setActionMessage("Something went wrong while updating AVL.");
} finally {
setSavingVendorId(null);
}
}

const canManageApprovedVendors = canManageAvl(profile?.role);
return (
<main className="relative min-h-screen overflow-hidden bg-[#061426] text-white">
<div className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(circle_at_top_left,rgba(44,196,232,0.18),transparent_34%),radial-gradient(circle_at_top_right,rgba(200,166,70,0.15),transparent_30%),linear-gradient(180deg,#061426_0%,#07111F_45%,#020617_100%)]" />

<div className={EXECUTIVE_PAGE_CLASS}>
<section className="rounded-[32px] border border-white/10 bg-white/[0.065] p-7 shadow-[0_36px_120px_rgba(0,0,0,0.52)] backdrop-blur-2xl sm:p-10">
<div className="flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
<div>
<p className="text-xs font-black uppercase tracking-[0.35em] text-[#C8A646]">
Company Network
</p>

<h1 className="mt-4 max-w-4xl text-5xl font-black leading-tight tracking-[-0.05em] text-white">
Construction Company Network
</h1>

<p className="mt-4 max-w-3xl text-sm font-semibold leading-7 text-slate-300">
Discover verified construction companies across contractors,
manufacturers, suppliers, consultants, architects, engineers,
and other industry roles. Review company profiles and
supplier-specific procurement intelligence where supported.
</p>
</div>

<div className="flex w-full flex-col gap-3 lg:w-auto lg:min-w-[380px]">
<input
type="text"
placeholder="Search companies, categories, regions, roles, or capabilities..."
value={search}
onChange={(event) => setSearch(event.target.value)}
aria-label="Search company network"
className="h-[58px] w-full rounded-2xl border border-white/10 bg-[#07111F] px-5 text-sm font-semibold text-white outline-none transition placeholder:text-slate-400 focus:border-[#C8A646] focus:bg-[#081827] focus-visible:ring-2 focus-visible:ring-[#C8A646]/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[#07111F]"
/>

<div className="grid grid-cols-2 gap-3">
<Link
href="/login"
className={`flex h-[52px] items-center justify-center rounded-2xl border border-white/10 bg-white/[0.045] px-5 text-center text-sm font-black text-white transition hover:bg-white/[0.08] ${EXECUTIVE_FOCUS_CYAN}`}
>
Sign In
</Link>

<Link
href="/signup"
className="flex h-[52px] items-center justify-center rounded-2xl bg-gradient-to-r from-[#B9902F] via-[#C8A646] to-[#F5D77B] px-5 text-center text-sm font-black text-slate-950 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C8A646]/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[#07111F]"
>
Join Network
</Link>
</div>
</div>
</div>
</section>

{actionMessage ? (
<div className="mt-6 rounded-3xl border border-[#C8A646]/25 bg-[#C8A646]/10 px-6 py-4 text-sm font-black text-[#F5D77B]">
{actionMessage}
</div>
) : null}

<section className="mt-8 grid gap-6 md:grid-cols-4">
<MetricCard
title="Verified Companies"
value={String(networkStats.companies)}
detail="Approved and verified network companies"
/>

<MetricCard
title="Supplier Awards"
value={String(networkStats.totalAwards)}
detail="Awarded contracts tracked"
/>

<MetricCard
title="Supplier Awarded Value"
value={formatMoney(networkStats.totalRevenue)}
detail="Award value tracked for suppliers"
/>

<MetricCard
title="Avg Supplier Score"
value={`${networkStats.averageScore}/100`}
detail="Supplier intelligence average"
/>
</section>

<section className="mt-6 rounded-[28px] border border-white/10 bg-white/[0.055] p-6">
<p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-500">
Approved Vendor List
</p>
<p className="mt-3 text-sm font-semibold leading-6 text-slate-300">
{APPROVED_VENDOR_DOMAIN_AVAILABLE
? "Approved vendor status is managed in this workspace."
: APPROVED_VENDOR_UNAVAILABLE_MESSAGE}
</p>
</section>

{topSupplier ? (
<section className="mt-8 overflow-hidden rounded-[36px] border border-[#2CC4E8]/15 bg-gradient-to-br from-[#0B3D91]/35 via-[#07111F]/92 to-[#061426] p-8 shadow-[0_0_70px_rgba(44,196,232,0.10)]">
<div className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr]">
<div>
<p className="text-xs font-black uppercase tracking-[0.3em] text-[#C8A646]">
Supplier Intelligence
</p>

<h2 className="mt-4 text-4xl font-black leading-tight text-white">
Top ranked supplier: {topSupplier.name}
</h2>

<p className="mt-4 max-w-3xl text-sm font-semibold leading-7 text-slate-300">
Nexus Pavilion ranks suppliers using quote volume, award
history, win rate, awarded revenue, and network performance
signals.
</p>
</div>

<div className="grid gap-3 sm:grid-cols-3">
<DarkSignal title="Score" value={`${topSupplier.supplierScore}/100`} />
<DarkSignal title="Rank" value={topSupplier.supplierRank} />
<DarkSignal title="Reliability" value={topSupplier.reliabilitySignal} />
</div>
</div>
</section>
) : null}

{loading ? (
<div className="mt-12 rounded-3xl border border-white/10 bg-white/[0.045] p-10 text-center text-sm font-bold text-slate-500">
Loading company network...
</div>
) : filteredCompanies.length === 0 ? (
<div className="mt-12 rounded-3xl border border-dashed border-white/15 bg-white/[0.035] p-10 text-center">
<h2 className="text-xl font-black text-white">
No verified companies found
</h2>

<p className="mt-3 text-sm font-semibold text-slate-500">
Try another search term or check back as the network grows.
</p>
</div>
) : (
<div className="mt-10 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
{filteredCompanies.map((company) => {
const avlRecord = approvedVendorMap.get(company.id);
const isSelfCompany = profile?.company_id === company.id;
const isSupplierScopedCompany = isSupplierCompany(company);
const capabilityContext = capabilitiesByCompany.get(company.id);
const capabilityPreview = capabilityContext
? COMPANY_CAPABILITY_TYPES.flatMap((capabilityType) =>
capabilityContext[capabilityType].map((label) => ({
capabilityType,
label,
}))
)
: [];
const canShowAvlActions =
APPROVED_VENDOR_DOMAIN_AVAILABLE &&
canManageApprovedVendors &&
!isSelfCompany &&
isSupplierScopedCompany;

return (
<div
key={company.id}
className="group rounded-[32px] border border-white/10 bg-white/[0.055] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.26)] transition hover:border-[#2CC4E8]/25 hover:bg-white/[0.07]"
>
<Link href={`/company/${company.slug}`} className="block rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2CC4E8]/40 focus-visible:ring-offset-2 focus-visible:ring-offset-[#07111F]">
<div className="flex items-start justify-between gap-4">
<div className="flex items-start gap-4">
{company.logo_url ? (
<Image
src={company.logo_url}
alt={company.name}
width={56}
height={56}
className="h-14 w-14 rounded-2xl border border-white/10 bg-white object-contain"
/>
) : (
<div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.055] text-xl font-black text-slate-400">
{company.name.charAt(0)}
</div>
)}

<div>
<h2 className="text-xl font-black text-white">
{company.name}
</h2>

<p className="mt-2 text-sm font-semibold leading-6 text-slate-400">
{company.category} · {company.location}
</p>
</div>
</div>

<StatusPill tone="success">{company.status}</StatusPill>
</div>

<div
className={`mt-6 grid gap-3 ${
isSupplierScopedCompany ? "md:grid-cols-2" : ""
}`}
>
<InfoBox title="Network Role" value={company.network_role} />
{isSupplierScopedCompany ? (
<InfoBox title="Supplier Rank" value={company.supplierRank} />
) : null}
</div>
</Link>

{capabilityPreview.length > 0 ? (
<div className="mt-5 rounded-3xl border border-white/10 bg-[#07111F]/70 p-4">
<p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-500">
Company Capabilities
</p>

<div className="mt-3 flex flex-wrap gap-2">
{capabilityPreview.slice(0, 6).map((item) => (
<span
key={`${item.capabilityType}-${item.label}`}
className="inline-flex max-w-full items-center rounded-full border border-white/10 bg-white/[0.055] px-3 py-1.5 text-[11px] font-bold leading-5 text-slate-200 break-words"
>
<span className="mr-1 text-slate-500">
{COMPANY_CAPABILITY_TYPE_LABELS[item.capabilityType]}:
</span>
{item.label}
</span>
))}

{capabilityPreview.length > 6 ? (
<span className="inline-flex items-center rounded-full border border-white/10 bg-white/[0.035] px-3 py-1.5 text-[11px] font-black leading-5 text-slate-400">
+{capabilityPreview.length - 6} more
</span>
) : null}
</div>
</div>
) : null}

{isSupplierScopedCompany ? (
<div className="mt-5 grid gap-3 md:grid-cols-3">
<SmallMetric
title="Score"
value={`${company.supplierScore}/100`}
/>

<SmallMetric
title="Win"
value={`${company.winRate}%`}
/>

<SmallMetric
title="Awards"
value={String(company.awardsWon)}
/>
</div>
) : null}

{isSupplierScopedCompany ? (
<div className="mt-5 flex flex-wrap gap-2">
<StatusPill tone={getRankTone(company.supplierRank)}>
{company.supplierRank}
</StatusPill>

<StatusPill tone="blue">
{company.reliabilitySignal}
</StatusPill>

{APPROVED_VENDOR_DOMAIN_AVAILABLE ? (
<StatusPill tone={getAvlTone(avlRecord?.status)}>
{getAvlStatusLabel(avlRecord?.status)}
</StatusPill>
) : null}

{company.awardedRevenue > 0 && (
<StatusPill tone="success">
{formatMoney(company.awardedRevenue)}
</StatusPill>
)}
</div>
) : null}

{canShowAvlActions ? (
<div className="mt-6 rounded-3xl border border-white/10 bg-[#07111F] p-4">
<p className="text-xs font-black uppercase tracking-[0.25em] text-[#C8A646]">
Approved Vendor List
</p>

<div className="mt-4 grid gap-2 sm:grid-cols-2">
<button
type="button"
disabled={savingVendorId === company.id}
onClick={() =>
updateApprovedVendor(company.id, "approved")
}
className="rounded-full bg-gradient-to-r from-[#B9902F] via-[#C8A646] to-[#F5D77B] px-4 py-3 text-xs font-black text-slate-950 transition disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C8A646]/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[#07111F]"
>
{savingVendorId === company.id
? "Saving..."
: "Approve"}
</button>

<button
type="button"
disabled={savingVendorId === company.id}
onClick={() =>
updateApprovedVendor(company.id, "conditional")
}
className="rounded-full border border-yellow-500/30 bg-yellow-500/10 px-4 py-3 text-xs font-black text-yellow-300 transition hover:bg-yellow-500/20 disabled:cursor-not-allowed disabled:opacity-50"
>
Conditional
</button>

<button
type="button"
disabled={savingVendorId === company.id}
onClick={() =>
updateApprovedVendor(company.id, "suspended")
}
className="rounded-full border border-red-500/30 bg-red-500/10 px-4 py-3 text-xs font-black text-red-300 transition hover:bg-red-500/20 disabled:cursor-not-allowed disabled:opacity-50"
>
Suspend
</button>

<button
type="button"
disabled={savingVendorId === company.id}
onClick={() =>
updateApprovedVendor(company.id, "rejected")
}
className="rounded-full border border-white/10 bg-white/[0.06] px-4 py-3 text-xs font-black text-slate-300 transition hover:bg-white/[0.12] disabled:cursor-not-allowed disabled:opacity-50"
>
Reject
</button>
</div>

<p className="mt-4 text-xs font-semibold leading-5 text-slate-400">
AVL status affects preferred supplier routing,
procurement governance and future RFQ invitations.
</p>
</div>
) : null}

<div className="mt-6 flex items-center justify-between">
<p className="text-sm font-semibold text-slate-500">
Verified company profile
</p>

<Link
href={`/company/${company.slug}`}
className="text-sm font-black text-[#9BE8F8] transition hover:text-white"
>
View Profile →
</Link>
</div>
</div>
);
})}
</div>
)}
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
<div className="rounded-[28px] border border-white/10 bg-white/[0.055] p-6 shadow-[0_16px_50px_rgba(0,0,0,.25)]">
<p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-500">
{title}
</p>

<p className="mt-3 text-3xl font-black text-white">
{value}
</p>

<p className="mt-2 text-sm font-semibold text-slate-400">
{detail}
</p>
</div>
);
}

function DarkSignal({
title,
value,
}: {
title: string;
value: string;
}) {
return (
<div className="rounded-3xl border border-white/10 bg-white/[0.08] px-5 py-5 text-center">
<p className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">
{title}
</p>

<p className="mt-2 text-xl font-black text-white">
{value}
</p>
</div>
);
}

function InfoBox({
title,
value,
}: {
title: string;
value: string;
}) {
return (
<div className="rounded-2xl border border-white/10 bg-[#07111F] p-4">
<p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">
{title}
</p>

<p className="mt-2 text-sm font-black text-white">
{value}
</p>
</div>
);
}

function SmallMetric({
title,
value,
}: {
title: string;
value: string;
}) {
return (
<div className="rounded-2xl border border-white/10 bg-[#07111F] px-3 py-3">
<p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">
{title}
</p>

<p className="mt-1 text-sm font-black text-white">
{value}
</p>
</div>
);
}

function StatusPill({
children,
tone = "neutral",
}: {
children: React.ReactNode;
tone?: "success" | "warning" | "danger" | "blue" | "neutral";
}) {
const classes =
tone === "success"
? "border-emerald-300/20 bg-emerald-400/10 text-emerald-300"
: tone === "warning"
? "border-yellow-300/20 bg-yellow-400/10 text-yellow-300"
: tone === "danger"
? "border-red-300/20 bg-red-400/10 text-red-300"
: tone === "blue"
? "border-[#2CC4E8]/25 bg-[#2CC4E8]/10 text-[#9BE8F8]"
: "border-white/10 bg-white/[0.055] text-slate-300";

return (
<span
className={`inline-flex rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] ${classes}`}
>
{children}
</span>
);
}