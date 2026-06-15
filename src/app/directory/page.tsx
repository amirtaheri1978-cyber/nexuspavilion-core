"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { createClient } from "@/lib/supabase/client";

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

type RankedCompany = Company & {
quotesSubmitted: number;
awardsWon: number;
awardedRevenue: number;
averageBid: number;
winRate: number;
supplierScore: number;
supplierRank: string;
reliabilitySignal: string;
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

function getRankClass(rank: string) {
if (rank === "Top Tier") return "bg-green-100 text-green-800";
if (rank === "Preferred") return "bg-blue-100 text-blue-800";
if (rank === "Qualified") return "bg-orange-100 text-orange-800";
if (rank === "Developing") return "bg-yellow-100 text-yellow-800";
return "bg-slate-100 text-slate-700";
}

function getAvlStatusClass(status: string | null | undefined) {
if (status === "approved") return "bg-green-100 text-green-800";
if (status === "conditional") return "bg-yellow-100 text-yellow-800";
if (status === "suspended") return "bg-red-100 text-red-800";
if (status === "rejected") return "bg-slate-200 text-slate-700";
return "bg-slate-100 text-slate-700";
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
{ data: quotesData },
{ data: approvedVendorData },
] = await Promise.all([
supabase
.from("companies")
.select("*")
.in("status", ["approved", "verified"])
.order("created_at", { ascending: false }),

supabase.from("quotes").select("id, company_id, amount, decision"),

currentProfile?.company_id
? supabase
.from("approved_vendors")
.select("vendor_company_id, status, rating")
: Promise.resolve({ data: [] }),
]);

if (!companiesError && companiesData) {
setCompanies(companiesData as Company[]);
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
suppliers: supplierCompanies.length,
totalAwards,
totalRevenue,
averageScore,
approvedCount,
conditionalCount,
suspendedCount,
};
}, [supplierCompanies, approvedVendors]);

const filteredCompanies = useMemo(() => {
const query = search.toLowerCase().trim();

if (!query) return rankedCompanies;

return rankedCompanies.filter((company) => {
const avlStatus = approvedVendorMap.get(company.id)?.status || "";

return (
company.name.toLowerCase().includes(query) ||
company.category.toLowerCase().includes(query) ||
company.location.toLowerCase().includes(query) ||
company.network_role.toLowerCase().includes(query) ||
company.supplierRank.toLowerCase().includes(query) ||
company.reliabilitySignal.toLowerCase().includes(query) ||
avlStatus.toLowerCase().includes(query)
);
});
}, [rankedCompanies, search, approvedVendorMap]);

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
setActionMessage(data.error || "Failed to update approved vendor.");
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
<main className="min-h-screen bg-[#f6f6f3] px-6 py-10">
<div className="mx-auto max-w-7xl">
<section className="rounded-[40px] border border-black/5 bg-white p-8 shadow-sm lg:p-10">
<div className="flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
<div>
<p className="text-xs font-black uppercase tracking-[0.35em] text-orange-500">
Supplier Network
</p>

<h1 className="mt-4 max-w-4xl text-5xl font-black leading-tight text-slate-950">
Construction Supplier Network
</h1>

<p className="mt-4 max-w-3xl text-sm font-semibold leading-7 text-slate-600">
Discover verified construction companies, suppliers,
contractors, manufacturers, consultants, architects, and
engineers with procurement activity, award history, supplier
intelligence, and approved vendor list controls.
</p>
</div>

<div className="flex w-full flex-col gap-3 lg:w-auto lg:min-w-[360px]">
<input
type="text"
placeholder="Search companies, categories, regions, ranks, or AVL status..."
value={search}
onChange={(event) => setSearch(event.target.value)}
className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4 text-sm font-bold text-slate-950 outline-none transition focus:border-slate-950 focus:bg-white"
/>

<div className="grid grid-cols-2 gap-3">
<Link
href="/login"
className="rounded-full border border-slate-200 bg-white px-5 py-3 text-center text-sm font-black text-slate-700 transition hover:border-slate-950 hover:text-slate-950"
>
Sign In
</Link>

<Link
href="/signup"
className="rounded-full bg-slate-950 px-5 py-3 text-center text-sm font-black text-white transition hover:bg-slate-800"
>
Join Network
</Link>
</div>
</div>
</div>
</section>

{actionMessage ? (
<div className="mt-6 rounded-3xl border border-orange-200 bg-orange-50 px-6 py-4 text-sm font-black text-orange-700">
{actionMessage}
</div>
) : null}

<section className="mt-8 grid gap-6 md:grid-cols-4">
<MetricCard
title="Verified Suppliers"
value={String(networkStats.suppliers)}
detail="Ranked supplier companies"
/>

<MetricCard
title="Supplier Awards"
value={String(networkStats.totalAwards)}
detail="Awarded contracts tracked"
/>

<MetricCard
title="Awarded Revenue"
value={formatMoney(networkStats.totalRevenue)}
detail="Network supplier value"
/>

<MetricCard
title="Avg Supplier Score"
value={`${networkStats.averageScore}/100`}
detail="Supplier intelligence average"
/>
</section>

<section className="mt-6 grid gap-6 md:grid-cols-3">
<MetricCard
title="Approved Vendors"
value={String(networkStats.approvedCount)}
detail="Active AVL suppliers"
/>

<MetricCard
title="Conditional Vendors"
value={String(networkStats.conditionalCount)}
detail="Suppliers under review"
/>

<MetricCard
title="Suspended Vendors"
value={String(networkStats.suspendedCount)}
detail="Restricted supplier access"
/>
</section>

{topSupplier ? (
<section className="mt-8 overflow-hidden rounded-[36px] border border-black/5 bg-slate-950 text-white">
<div className="grid gap-8 p-8 lg:grid-cols-[1.2fr_0.8fr]">
<div>
<p className="text-xs font-black uppercase tracking-[0.3em] text-orange-400">
Supplier Intelligence
</p>

<h2 className="mt-4 text-4xl font-black leading-tight">
Top ranked supplier: {topSupplier.name}
</h2>

<p className="mt-4 max-w-3xl text-sm font-semibold leading-7 text-white/65">
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
<div className="mt-12 rounded-3xl border border-slate-200 bg-white p-10 text-center text-sm font-bold text-slate-500">
Loading supplier network...
</div>
) : filteredCompanies.length === 0 ? (
<div className="mt-12 rounded-3xl border border-dashed border-slate-300 bg-white p-10 text-center">
<h2 className="text-xl font-black text-slate-950">
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
const canShowAvlActions =
canManageApprovedVendors &&
!isSelfCompany &&
isSupplierCompany(company);

return (
<div
key={company.id}
className="group rounded-[32px] border border-black/5 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
>
<Link href={`/company/${company.slug}`} className="block">
<div className="flex items-start justify-between gap-4">
<div className="flex items-start gap-4">
{company.logo_url ? (
<img
src={company.logo_url}
alt={company.name}
className="h-14 w-14 rounded-2xl border border-slate-200 bg-white object-cover"
/>
) : (
<div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-xl font-black text-slate-600">
{company.name.charAt(0)}
</div>
)}

<div>
<h2 className="text-xl font-black text-slate-950">
{company.name}
</h2>

<p className="mt-2 text-sm font-semibold leading-6 text-slate-500">
{company.category} · {company.location}
</p>
</div>
</div>

<span className="rounded-full bg-emerald-100 px-3 py-1 text-[10px] font-black uppercase tracking-wide text-emerald-800">
{company.status}
</span>
</div>

<div className="mt-6 grid gap-3 md:grid-cols-2">
<InfoBox title="Network Role" value={company.network_role} />
<InfoBox title="Supplier Rank" value={company.supplierRank} />
</div>
</Link>
<div className="mt-5 grid gap-3 md:grid-cols-3">
<SmallMetric title="Score" value={`${company.supplierScore}/100`} />
<SmallMetric title="Win" value={`${company.winRate}%`} />
<SmallMetric title="Awards" value={String(company.awardsWon)} />
</div>

<div className="mt-5 flex flex-wrap gap-2">
<span
className={`rounded-full px-3 py-1 text-xs font-black ${getRankClass(
company.supplierRank
)}`}
>
{company.supplierRank}
</span>

<span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-700">
{company.reliabilitySignal}
</span>

<span
className={`rounded-full px-3 py-1 text-xs font-black ${getAvlStatusClass(
avlRecord?.status
)}`}
>
{getAvlStatusLabel(avlRecord?.status)}
</span>

{company.awardedRevenue > 0 ? (
<span className="rounded-full bg-green-100 px-3 py-1 text-xs font-black text-green-700">
{formatMoney(company.awardedRevenue)} awarded
</span>
) : null}
</div>

{canShowAvlActions ? (
<div className="mt-6 rounded-3xl border border-slate-200 bg-slate-50 p-4">
<p className="text-xs font-black uppercase tracking-[0.25em] text-slate-400">
Approved Vendor List Controls
</p>

<div className="mt-4 grid gap-2 sm:grid-cols-2">
<button
type="button"
disabled={savingVendorId === company.id}
onClick={() => updateApprovedVendor(company.id, "approved")}
className="rounded-full bg-slate-950 px-4 py-3 text-xs font-black text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
>
{savingVendorId === company.id
? "Saving..."
: "Approve Vendor"}
</button>

<button
type="button"
disabled={savingVendorId === company.id}
onClick={() =>
updateApprovedVendor(company.id, "conditional")
}
className="rounded-full bg-yellow-100 px-4 py-3 text-xs font-black text-yellow-800 transition hover:bg-yellow-200 disabled:cursor-not-allowed disabled:opacity-50"
>
Conditional
</button>

<button
type="button"
disabled={savingVendorId === company.id}
onClick={() => updateApprovedVendor(company.id, "suspended")}
className="rounded-full bg-red-100 px-4 py-3 text-xs font-black text-red-800 transition hover:bg-red-200 disabled:cursor-not-allowed disabled:opacity-50"
>
Suspend
</button>

<button
type="button"
disabled={savingVendorId === company.id}
onClick={() => updateApprovedVendor(company.id, "rejected")}
className="rounded-full bg-slate-200 px-4 py-3 text-xs font-black text-slate-700 transition hover:bg-slate-300 disabled:cursor-not-allowed disabled:opacity-50"
>
Reject
</button>
</div>

<p className="mt-4 text-xs font-semibold leading-5 text-slate-500">
AVL status controls future selective routing, framework
invitations, supplier governance, and procurement access
decisions.
</p>
</div>
) : null}

<div className="mt-6 flex items-center justify-between">
<p className="text-sm font-semibold text-slate-500">
Verified company profile
</p>

<Link
href={`/company/${company.slug}`}
className="text-sm font-black text-slate-950 transition hover:text-orange-600"
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
<div className="rounded-3xl border border-black/5 bg-white p-6 shadow-sm">
<p className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">
{title}
</p>

<p className="mt-3 text-3xl font-black text-slate-950">{value}</p>

<p className="mt-2 text-sm font-semibold text-slate-500">{detail}</p>
</div>
);
}

function DarkSignal({ title, value }: { title: string; value: string }) {
return (
<div className="rounded-3xl bg-white/10 px-5 py-5 text-center">
<p className="text-xs font-black uppercase tracking-[0.2em] text-white/40">
{title}
</p>

<p className="mt-2 text-lg font-black text-white">{value}</p>
</div>
);
}

function InfoBox({ title, value }: { title: string; value: string }) {
return (
<div className="rounded-2xl bg-slate-50 p-4">
<p className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">
{title}
</p>

<p className="mt-2 text-sm font-black text-slate-950">{value}</p>
</div>
);
}

function SmallMetric({ title, value }: { title: string; value: string }) {
return (
<div className="rounded-2xl bg-slate-50 px-3 py-3">
<p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
{title}
</p>

<p className="mt-1 text-sm font-black text-slate-950">{value}</p>
</div>
);
}