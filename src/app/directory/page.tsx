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
role.includes("manufacturer")
);
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

function buildRankedCompanies(companies: Company[], quotes: Quote[]) {
return companies.map((company) => {
const companyQuotes = quotes.filter((quote) => quote.company_id === company.id);
const awards = companyQuotes.filter((quote) => quote.decision === "awarded");

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
const supabase = createClient();

const [companies, setCompanies] = useState<Company[]>([]);
const [quotes, setQuotes] = useState<Quote[]>([]);
const [search, setSearch] = useState("");
const [loading, setLoading] = useState(true);

useEffect(() => {
async function loadDirectoryData() {
const [{ data: companiesData, error: companiesError }, { data: quotesData }] =
await Promise.all([
supabase
.from("companies")
.select("*")
.in("status", ["approved", "verified"])
.order("created_at", { ascending: false }),

supabase.from("quotes").select("id, company_id, amount, decision"),
]);

if (!companiesError && companiesData) {
setCompanies(companiesData as Company[]);
}

if (quotesData) {
setQuotes(quotesData as Quote[]);
}

setLoading(false);
}

loadDirectoryData();
}, [supabase]);

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

return {
suppliers: supplierCompanies.length,
totalAwards,
totalRevenue,
averageScore,
};
}, [supplierCompanies]);

const filteredCompanies = useMemo(() => {
const query = search.toLowerCase().trim();

if (!query) return rankedCompanies;

return rankedCompanies.filter((company) => {
return (
company.name.toLowerCase().includes(query) ||
company.category.toLowerCase().includes(query) ||
company.location.toLowerCase().includes(query) ||
company.network_role.toLowerCase().includes(query) ||
company.supplierRank.toLowerCase().includes(query) ||
company.reliabilitySignal.toLowerCase().includes(query)
);
});
}, [rankedCompanies, search]);

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
Discover verified construction companies, suppliers, contractors,
and manufacturers with procurement activity, award history, and
supplier intelligence signals.
</p>
</div>

<div className="flex w-full flex-col gap-3 lg:w-auto lg:min-w-[360px]">
<input
type="text"
placeholder="Search companies, categories, regions, or ranks..."
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
{filteredCompanies.map((company) => (
<Link
key={company.id}
href={`/company/${company.slug}`}
className="group block rounded-[32px] border border-black/5 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
>
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

{company.awardedRevenue > 0 ? (
<span className="rounded-full bg-green-100 px-3 py-1 text-xs font-black text-green-700">
{formatMoney(company.awardedRevenue)} awarded
</span>
) : null}
</div>

<div className="mt-6 flex items-center justify-between">
<p className="text-sm font-semibold text-slate-500">
Verified company profile
</p>

<span className="text-sm font-black text-slate-950 transition group-hover:translate-x-1">
View Profile →
</span>
</div>
</Link>
))}
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