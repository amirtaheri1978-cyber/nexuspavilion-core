"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";

type CreateCompanyResponse = {
success?: boolean;
redirectTo?: string;
error?: string;
};

export default function CreateCompanyPage() {
const router = useRouter();

const [name, setName] = useState("");
const [category, setCategory] = useState("");
const [location, setLocation] = useState("");
const [networkRole, setNetworkRole] = useState("Owner / Developer");

const [loading, setLoading] = useState(false);
const [error, setError] = useState("");

async function handleCreateCompany(
event: React.FormEvent<HTMLFormElement>
) {
event.preventDefault();

setLoading(true);
setError("");

try {
const response = await fetch("/api/companies/create", {
method: "POST",
headers: {
"Content-Type": "application/json",
},
body: JSON.stringify({
name,
category,
location,
networkRole,
}),
});

const data = (await response.json()) as CreateCompanyResponse;

if (!response.ok) {
setError(data.error || "Failed to create company.");
setLoading(false);
return;
}

router.push(data.redirectTo || "/company");
router.refresh();
} catch (error) {
console.error(error);
setError("Request failed. Please try again.");
setLoading(false);
}
}

return (
<main className="min-h-screen bg-[#f6f6f3] px-6 py-10">
<div className="mx-auto max-w-4xl">
<Link
href="/dashboard"
className="text-sm font-bold text-slate-500 hover:text-slate-950"
>
← Back to dashboard
</Link>

<section className="mt-8 rounded-[36px] border border-black/5 bg-white p-10">
<p className="text-xs font-black uppercase tracking-[0.35em] text-orange-500">
Nexus Pavilion Setup
</p>

<h1 className="mt-3 text-5xl font-black text-slate-950">
Create your company workspace
</h1>

<p className="mt-4 max-w-2xl text-sm leading-6 text-slate-600">
Create an enterprise workspace for your company. You will become the
workspace admin and can invite vendors, buyers, and team members.
</p>

<form onSubmit={handleCreateCompany} className="mt-8 space-y-5">
<label className="block">
<span className="mb-2 block text-xs font-black uppercase tracking-[0.2em] text-slate-500">
Company Name
</span>

<input
type="text"
required
placeholder="Northline Development Group"
value={name}
onChange={(event) => setName(event.target.value)}
className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-950 outline-none transition focus:border-slate-950 focus:bg-white"
/>
</label>

<div className="grid gap-5 md:grid-cols-2">
<label className="block">
<span className="mb-2 block text-xs font-black uppercase tracking-[0.2em] text-slate-500">
Category
</span>

<input
type="text"
placeholder="Mixed-use Development"
value={category}
onChange={(event) => setCategory(event.target.value)}
className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-950 outline-none transition focus:border-slate-950 focus:bg-white"
/>
</label>

<label className="block">
<span className="mb-2 block text-xs font-black uppercase tracking-[0.2em] text-slate-500">
Location
</span>

<input
type="text"
placeholder="Toronto, ON"
value={location}
onChange={(event) => setLocation(event.target.value)}
className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-950 outline-none transition focus:border-slate-950 focus:bg-white"
/>
</label>
</div>

<label className="block">
<span className="mb-2 block text-xs font-black uppercase tracking-[0.2em] text-slate-500">
Network Role
</span>

<select
value={networkRole}
onChange={(event) => setNetworkRole(event.target.value)}
className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-950 outline-none transition focus:border-slate-950 focus:bg-white"
>
<option value="Owner / Developer">Owner / Developer</option>
<option value="General Contractor">General Contractor</option>
<option value="Architect / Designer">
Architect / Designer
</option>
<option value="Manufacturer">Manufacturer</option>
<option value="Vendor / Supplier">Vendor / Supplier</option>
<option value="Consultant">Consultant</option>
</select>
</label>

{error && (
<div className="rounded-2xl bg-red-50 px-4 py-3 text-sm font-bold leading-6 text-red-600">
{error}
</div>
)}

<button
type="submit"
disabled={loading}
className="rounded-full bg-slate-950 px-7 py-4 text-sm font-bold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
>
{loading ? "Creating workspace..." : "Create Company Workspace"}
</button>
</form>
</section>
</div>
</main>
);
}