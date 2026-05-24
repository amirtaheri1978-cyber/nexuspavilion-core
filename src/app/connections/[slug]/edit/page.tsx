"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";

import { supabase } from "@/lib/supabase";

type Company = {
id: string;
name: string;
slug: string;
category: string;
location: string;
network_role: string;
status: string;
};

function createSlug(value: string) {
return value
.toLowerCase()
.trim()
.replace(/[^a-z0-9]+/g, "-")
.replace(/^-+|-+$/g, "");
}

export default function EditCompanyPage() {
const router = useRouter();
const params = useParams<{ slug: string }>();

const [companyId, setCompanyId] = useState("");
const [name, setName] = useState("");
const [category, setCategory] = useState("");
const [location, setLocation] = useState("");
const [networkRole, setNetworkRole] = useState("Owner / Developer");
const [status, setStatus] = useState("verified");
const [loading, setLoading] = useState(true);
const [saving, setSaving] = useState(false);
const [error, setError] = useState("");

useEffect(() => {
async function fetchCompany() {
const { data, error } = await supabase
.from("companies")
.select("*")
.eq("slug", params.slug)
.single<Company>();

if (error || !data) {
setError("Company not found.");
setLoading(false);
return;
}

setCompanyId(data.id);
setName(data.name);
setCategory(data.category);
setLocation(data.location);
setNetworkRole(data.network_role);
setStatus(data.status);
setLoading(false);
}

fetchCompany();
}, [params.slug]);

async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
event.preventDefault();
setSaving(true);
setError("");

const updatedSlug = createSlug(name);

const { error } = await supabase
.from("companies")
.update({
name,
slug: updatedSlug,
category,
location,
network_role: networkRole,
status,
})
.eq("id", companyId);

if (error) {
setError("Could not update company. Please check Supabase permissions.");
setSaving(false);
return;
}

router.push(`/connections/${updatedSlug}`);
}

if (loading) {
return (
<main className="flex min-h-screen items-center justify-center bg-slate-100">
<p className="text-sm text-slate-500">Loading company profile...</p>
</main>
);
}

return (
<main className="min-h-screen bg-slate-100 p-8">
<div className="mx-auto max-w-3xl">
<Link
href={`/connections/${params.slug}`}
className="text-sm font-medium text-slate-600 hover:text-slate-900"
>
← Back to Company
</Link>

<section className="mt-8 rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
<p className="text-sm font-semibold uppercase tracking-wide text-amber-700">
Connections Directory
</p>

<h1 className="mt-3 text-3xl font-bold text-slate-900">
Edit Company
</h1>

<p className="mt-3 text-slate-600">
Update this live Supabase company profile.
</p>

{error && (
<p className="mt-6 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
{error}
</p>
)}

{!error && (
<form onSubmit={handleSubmit} className="mt-8 space-y-5">
<input
value={name}
onChange={(event) => setName(event.target.value)}
placeholder="Company name"
required
className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-slate-900"
/>

<input
value={category}
onChange={(event) => setCategory(event.target.value)}
placeholder="Category"
required
className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-slate-900"
/>

<input
value={location}
onChange={(event) => setLocation(event.target.value)}
placeholder="Location"
required
className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-slate-900"
/>

<select
value={networkRole}
onChange={(event) => setNetworkRole(event.target.value)}
className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-slate-900"
>
<option>Owner / Developer</option>
<option>General Contractor</option>
<option>Industrial Supplier</option>
</select>

<select
value={status}
onChange={(event) => setStatus(event.target.value)}
className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-slate-900"
>
<option value="verified">Verified</option>
<option value="sandbox">Sandbox</option>
<option value="pending">Pending</option>
</select>

<button
type="submit"
disabled={saving}
className="w-full rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-60"
>
{saving ? "Saving..." : "Save Changes"}
</button>
</form>
)}
</section>
</div>
</main>
);
}