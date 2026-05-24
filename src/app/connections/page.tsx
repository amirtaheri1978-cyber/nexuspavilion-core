"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

import { supabase } from "@/lib/supabase";
import StatusBadge from "@/components/ui/StatusBadge";

type Company = {
id: string;
name: string;
slug: string;
category: string;
location: string;
network_role: string;
status: string;
};

function normalizeStatus(status: string) {
return status.toUpperCase();
}

export default function ConnectionsPage() {
const [companies, setCompanies] = useState<Company[]>([]);
const [search, setSearch] = useState("");
const [loading, setLoading] = useState(true);

useEffect(() => {
async function fetchCompanies() {
const { data, error } = await supabase
.from("companies")
.select("*")
.order("created_at", { ascending: false });

if (error) {
console.error("Failed to fetch companies:", error);
setCompanies([]);
} else {
setCompanies(data ?? []);
}

setLoading(false);
}

fetchCompanies();
}, []);

const filteredCompanies = useMemo(() => {
const query = search.toLowerCase().trim();

if (!query) {
return companies;
}

return companies.filter((company) => {
return (
company.name.toLowerCase().includes(query) ||
company.category.toLowerCase().includes(query) ||
company.location.toLowerCase().includes(query) ||
company.network_role.toLowerCase().includes(query) ||
company.status.toLowerCase().includes(query)
);
});
}, [companies, search]);

return (
<main className="min-h-screen bg-slate-100 p-8">
<div className="mx-auto max-w-6xl">
<Link
href="/dashboard"
className="text-sm font-medium text-slate-600 hover:text-slate-900"
>
← Back to Dashboard
</Link>

<div className="mt-8 flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
<div>
<p className="text-sm font-semibold uppercase tracking-wide text-amber-700">
Connections Directory
</p>

<h1 className="mt-3 text-3xl font-bold text-slate-900">
Enterprise Supply Network
</h1>

<p className="mt-3 max-w-2xl text-slate-600">
Browse verified owners, contractors, and suppliers from the live Supabase network.
</p>
</div>

<input
type="text"
placeholder="Search company, role, region..."
value={search}
onChange={(event) => setSearch(event.target.value)}
className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition-all focus:border-slate-900 md:w-80"
/>
</div>

{loading && (
<p className="mt-8 text-sm text-slate-500">
Loading companies from Supabase...
</p>
)}

{!loading && (
<div className="mt-8 grid grid-cols-1 gap-5 md:grid-cols-2">
{filteredCompanies.map((company) => (
<Link
key={company.id}
href={`/connections/${company.slug}`}
className="block rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md"
>
<div className="flex items-start justify-between gap-4">
<div>
<h2 className="text-lg font-semibold text-slate-900">
{company.name}
</h2>

<p className="mt-1 text-sm text-slate-600">
{company.category} · {company.location}
</p>
</div>

<StatusBadge status={normalizeStatus(company.status)} />
</div>

<div className="mt-6 rounded-xl bg-slate-50 p-4">
<p className="text-xs font-medium uppercase tracking-wide text-slate-500">
Network Role
</p>

<p className="mt-1 text-sm font-semibold text-slate-900">
{company.network_role}
</p>
</div>
</Link>
))}
</div>
)}

{!loading && filteredCompanies.length === 0 && (
<div className="mt-8 rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center">
<h2 className="text-lg font-semibold text-slate-900">
No matching companies found
</h2>

<p className="mt-2 text-sm text-slate-600">
Try searching by company name, region, role, or verification status.
</p>
</div>
)}
</div>
</main>
);
}