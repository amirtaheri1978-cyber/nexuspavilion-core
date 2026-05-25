"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { createClient } from "@/lib/supabase/client";

function createSlug(value: string) {
return value
.toLowerCase()
.trim()
.replace(/[^a-z0-9]+/g, "-")
.replace(/^-+|-+$/g, "");
}

export default function NewCompanyPage() {
const router = useRouter();
const supabase = createClient();

const [name, setName] = useState("");
const [category, setCategory] = useState("");
const [location, setLocation] = useState("");
const [networkRole, setNetworkRole] = useState("Owner / Developer");
const [status, setStatus] = useState("approved");
const [saving, setSaving] = useState(false);
const [error, setError] = useState("");

async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
event.preventDefault();

setSaving(true);
setError("");

const {
data: { user },
error: userError,
} = await supabase.auth.getUser();

if (userError || !user) {
setError("You must be logged in to create a company.");
setSaving(false);
return;
}

const slug = createSlug(name);

const { data, error } = await supabase
.from("companies")
.insert({
name,
slug,
category,
location,
network_role: networkRole,
status,
user_id: user.id,
})
.select("slug")
.single();

if (error || !data) {
console.error(error);
setError("Could not create company. Please check Supabase permissions.");
setSaving(false);
return;
}

router.push(`/connections/${data.slug}`);
router.refresh();
}

return (
<main className="min-h-screen bg-slate-100 p-8">
<div className="mx-auto max-w-3xl">
<Link
href="/connections"
className="text-sm font-medium text-slate-600 hover:text-slate-900"
>
← Back to Connections
</Link>

<section className="mt-8 rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
<p className="text-sm font-semibold uppercase tracking-wide text-amber-700">
Connections Directory
</p>

<h1 className="mt-3 text-3xl font-bold text-slate-900">
Add Company
</h1>

<p className="mt-3 text-slate-600">
Create a new enterprise network profile in the live Supabase database.
</p>

{error && (
<p className="mt-6 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
{error}
</p>
)}

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
<option value="approved">Approved</option>
<option value="verified">Verified</option>
<option value="sandbox">Sandbox</option>
<option value="pending">Pending</option>
<option value="rejected">Rejected</option>
</select>

<button
type="submit"
disabled={saving}
className="w-full rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-60"
>
{saving ? "Creating Company..." : "Create Company"}
</button>
</form>
</section>
</div>
</main>
);
}