"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";

import AppSidebar from "@/components/common/AppSidebar";
import AppTopbar from "@/components/common/AppTopbar";

import { supabase } from "@/lib/supabase";

type Company = {
id: string;
company_name: string;
category: string;
location: string;
role_type: string;
status: string;
slug: string;
};

export default function EditCompanyPage() {
const router = useRouter();
const params = useParams();

const slug = params.slug as string;

const [loading, setLoading] = useState(true);
const [saving, setSaving] = useState(false);

const [company, setCompany] = useState<Company | null>(null);

const [companyName, setCompanyName] = useState("");
const [category, setCategory] = useState("");
const [location, setLocation] = useState("");
const [roleType, setRoleType] = useState("OWNER");
const [status, setStatus] = useState("PENDING");

useEffect(() => {
async function loadCompany() {
const { data, error } = await supabase
.from("companies")
.select("*")
.eq("slug", slug)
.single();

if (error || !data) {
console.error(error);
return;
}

setCompany(data);

setCompanyName(data.company_name ?? "");
setCategory(data.category ?? "");
setLocation(data.location ?? "");
setRoleType(data.role_type ?? "OWNER");
setStatus(data.status ?? "PENDING");

setLoading(false);
}

loadCompany();
}, [slug]);

async function handleUpdateCompany(
event: React.FormEvent<HTMLFormElement>
) {
event.preventDefault();

if (!company) return;

setSaving(true);

const { error } = await supabase
.from("companies")
.update({
company_name: companyName,
category,
location,
role_type: roleType,
status,
})
.eq("id", company.id);

setSaving(false);

if (error) {
console.error(error);
alert("Failed to update company.");
return;
}

router.push(`/connections/${company.slug}`);
}

if (loading) {
return (
<main className="flex min-h-screen items-center justify-center bg-slate-100">
<p className="text-sm text-slate-500">
Loading company profile...
</p>
</main>
);
}

return (
<main className="min-h-screen bg-slate-100">
<div className="flex">
<AppSidebar />

<section className="min-h-screen flex-1">
<AppTopbar />

<div className="p-8">
<div className="mx-auto max-w-3xl">
<a
href={`/connections/${slug}`}
className="text-sm text-slate-500 transition hover:text-slate-900"
>
← Back to Company
</a>

<div className="mt-6 rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
<p className="text-sm font-semibold uppercase tracking-wide text-amber-700">
Enterprise Network
</p>

<h1 className="mt-2 text-3xl font-bold text-slate-900">
Edit Company
</h1>

<p className="mt-2 text-sm text-slate-600">
Update enterprise company profile data stored in the live
Supabase network.
</p>

<form
onSubmit={handleUpdateCompany}
className="mt-8 space-y-5"
>
<div>
<label className="mb-2 block text-sm font-medium text-slate-700">
Company Name
</label>

<input
type="text"
value={companyName}
onChange={(e) => setCompanyName(e.target.value)}
required
className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-900"
/>
</div>

<div>
<label className="mb-2 block text-sm font-medium text-slate-700">
Category
</label>

<input
type="text"
value={category}
onChange={(e) => setCategory(e.target.value)}
required
className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-900"
/>
</div>

<div>
<label className="mb-2 block text-sm font-medium text-slate-700">
Location
</label>

<input
type="text"
value={location}
onChange={(e) => setLocation(e.target.value)}
required
className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-900"
/>
</div>

<div>
<label className="mb-2 block text-sm font-medium text-slate-700">
Network Role
</label>

<select
value={roleType}
onChange={(e) => setRoleType(e.target.value)}
className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-900"
>
<option value="OWNER">Owner / Developer</option>
<option value="CONTRACTOR">
General Contractor
</option>
<option value="SUPPLIER">
Industrial Supplier
</option>
</select>
</div>

<div>
<label className="mb-2 block text-sm font-medium text-slate-700">
Verification Status
</label>

<select
value={status}
onChange={(e) => setStatus(e.target.value)}
className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-900"
>
<option value="PENDING">Pending</option>
<option value="APPROVED">Approved</option>
<option value="REJECTED">Rejected</option>
<option value="SANDBOX">Sandbox</option>
</select>
</div>

<button
type="submit"
disabled={saving}
className="w-full rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:opacity-50"
>
{saving ? "Updating Company..." : "Save Changes"}
</button>
</form>
</div>
</div>
</div>
</section>
</div>
</main>
);
}