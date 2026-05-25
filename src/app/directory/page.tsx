"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

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

export default function PublicDirectoryPage() {
const supabase = createClient();

const [companies, setCompanies] = useState<Company[]>([]);
const [search, setSearch] = useState("");
const [loading, setLoading] = useState(true);

useEffect(() => {
async function loadCompanies() {
const { data, error } = await supabase
.from("companies")
.select("*")
.in("status", ["approved", "verified"])
.order("created_at", { ascending: false });

if (!error && data) {
setCompanies(data as Company[]);
}

setLoading(false);
}

loadCompanies();
}, [supabase]);

const filteredCompanies = useMemo(() => {
const query = search.toLowerCase().trim();

if (!query) return companies;

return companies.filter((company) => {
return (
company.name.toLowerCase().includes(query) ||
company.category.toLowerCase().includes(query) ||
company.location.toLowerCase().includes(query) ||
company.network_role.toLowerCase().includes(query)
);
});
}, [companies, search]);

return (
<main className="min-h-screen bg-slate-100 p-8">
<div className="mx-auto max-w-7xl">
<div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
<div>
<p className="text-sm font-semibold uppercase tracking-wide text-amber-700">
Public Directory
</p>

<h1 className="mt-2 text-4xl font-bold text-slate-900">
Global Enterprise Supply Network
</h1>

<p className="mt-3 max-w-2xl text-slate-600">
Browse verified companies across the Nexus Pavilion procurement
ecosystem.
</p>
</div>

<div className="flex w-full flex-col gap-3 md:w-auto md:flex-row">
<input
type="text"
placeholder="Search verified companies..."
value={search}
onChange={(event) => setSearch(event.target.value)}
className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-900 md:w-80"
/>

<Link
href="/login"
className="rounded-xl border border-slate-300 bg-white px-5 py-3 text-center text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
>
Login
</Link>

<Link
href="/register"
className="rounded-xl bg-slate-900 px-5 py-3 text-center text-sm font-semibold text-white transition hover:bg-slate-800"
>
Join Network
</Link>
</div>
</div>

{loading ? (
<div className="mt-12 rounded-2xl border border-slate-200 bg-white p-10 text-center text-slate-500">
Loading public directory...
</div>
) : filteredCompanies.length === 0 ? (
<div className="mt-12 rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
<h2 className="text-xl font-semibold text-slate-900">
No verified companies found
</h2>

<p className="mt-3 text-slate-500">
Try another search term or check back as the network grows.
</p>
</div>
) : (
<div className="mt-10 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
{filteredCompanies.map((company) => (
<Link
key={company.id}
href={`/company/${company.slug}`}
className="group block rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:border-slate-300 hover:shadow-lg"
>
<div className="flex items-start justify-between gap-4">
<div className="flex items-start gap-4">
{company.logo_url ? (
<img
src={company.logo_url}
alt={company.name}
className="h-14 w-14 rounded-2xl border border-slate-200 object-cover"
/>
) : (
<div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-xl font-bold text-slate-600">
{company.name.charAt(0)}
</div>
)}

<div>
<h2 className="text-xl font-bold text-slate-900">
{company.name}
</h2>

<p className="mt-2 text-sm text-slate-500">
{company.category} · {company.location}
</p>
</div>
</div>

<span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-emerald-800">
{company.status}
</span>
</div>

<div className="mt-6 rounded-xl bg-slate-50 p-4">
<p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
Network Role
</p>

<p className="mt-2 text-sm font-medium text-slate-900">
{company.network_role}
</p>
</div>

<div className="mt-6 flex items-center justify-between">
<p className="text-sm text-slate-500">
Public verified profile
</p>

<span className="text-sm font-semibold text-slate-900 transition group-hover:translate-x-1">
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