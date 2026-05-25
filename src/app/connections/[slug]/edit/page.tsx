"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";

import { createClient } from "@/lib/supabase/client";
import CompanyLogoUpload from "@/components/company-logo-upload";

type Company = {
id: string;
name: string;
slug: string;
category: string;
location: string;
network_role: string;
status: string;
logo_url?: string;
};

export default function EditCompanyPage() {
const supabase = createClient();

const params = useParams();
const router = useRouter();

const slug = params.slug as string;

const [company, setCompany] = useState<Company | null>(null);

const [name, setName] = useState("");
const [category, setCategory] = useState("");
const [location, setLocation] = useState("");
const [networkRole, setNetworkRole] = useState("");
const [status, setStatus] = useState("");

const [loading, setLoading] = useState(true);
const [saving, setSaving] = useState(false);
const [error, setError] = useState("");

useEffect(() => {
async function loadCompany() {
const {
data: { user },
} = await supabase.auth.getUser();

if (!user) {
router.push("/login");
return;
}

const { data, error } = await supabase
.from("companies")
.select("*")
.eq("slug", slug)
.eq("user_id", user.id)
.single();

if (error || !data) {
router.push("/connections");
return;
}

setCompany(data);

setName(data.name);
setCategory(data.category);
setLocation(data.location);
setNetworkRole(data.network_role);
setStatus(data.status);

setLoading(false);
}

loadCompany();
}, [slug, router, supabase]);

async function handleSubmit(
event: React.FormEvent<HTMLFormElement>
) {
event.preventDefault();

if (!company) return;

try {
setSaving(true);
setError("");

const { error } = await supabase
.from("companies")
.update({
name,
category,
location,
network_role: networkRole,
status,
})
.eq("id", company.id);

if (error) {
throw error;
}

router.push(`/connections/${slug}`);
} catch (err) {
console.error(err);

setError("Failed to update company.");
} finally {
setSaving(false);
}
}

if (loading) {
return (
<main className="min-h-screen bg-slate-100 p-8">
<div className="mx-auto max-w-3xl">
<div className="rounded-2xl border border-slate-200 bg-white p-10">
<p className="text-slate-500">
Loading company...
</p>
</div>
</div>
</main>
);
}

if (!company) {
return null;
}

return (
<main className="min-h-screen bg-slate-100 p-8">
<div className="mx-auto max-w-3xl">
<Link
href={`/connections/${slug}`}
className="text-sm font-medium text-slate-600 hover:text-slate-900"
>
← Back to Company
</Link>

<div className="mt-6 rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
<p className="text-sm font-semibold uppercase tracking-wide text-amber-700">
Enterprise Network
</p>

<h1 className="mt-2 text-4xl font-bold text-slate-900">
Edit Company
</h1>

<p className="mt-3 text-slate-600">
Update your workspace-owned enterprise company profile.
</p>

<form
onSubmit={handleSubmit}
className="mt-8 flex flex-col gap-5"
>
<input
type="text"
placeholder="Company Name"
value={name}
onChange={(event) =>
setName(event.target.value)
}
required
className="rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-slate-900"
/>

<input
type="text"
placeholder="Category"
value={category}
onChange={(event) =>
setCategory(event.target.value)
}
required
className="rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-slate-900"
/>

<input
type="text"
placeholder="Location"
value={location}
onChange={(event) =>
setLocation(event.target.value)
}
required
className="rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-slate-900"
/>

<select
value={networkRole}
onChange={(event) =>
setNetworkRole(event.target.value)
}
className="rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-slate-900"
>
<option>Owner / Developer</option>
<option>General Contractor</option>
<option>Industrial Supplier</option>
<option>Infrastructure Engineering</option>
<option>Manufacture Development</option>
</select>

<select
value={status}
onChange={(event) =>
setStatus(event.target.value)
}
className="rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-slate-900"
>
<option>approved</option>
<option>verified</option>
<option>pending</option>
</select>

<CompanyLogoUpload
companyId={company.id}
/>

{error && (
<p className="text-sm text-red-600">
{error}
</p>
)}

<button
type="submit"
disabled={saving}
className="rounded-xl bg-slate-900 px-5 py-4 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-50"
>
{saving
? "Saving..."
: "Save Changes"}
</button>
</form>
</div>
</div>
</main>
);
}