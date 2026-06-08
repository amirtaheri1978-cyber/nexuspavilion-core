"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type CompanySettingsFormProps = {
companyId: string;
initialName: string;
initialCategory: string;
initialLocation: string;
initialNetworkRole: string;
currentUserRole: string;
};

type UpdateCompanyResponse = {
success?: boolean;
error?: string;
};

export default function CompanySettingsForm({
companyId,
initialName,
initialCategory,
initialLocation,
initialNetworkRole,
currentUserRole,
}: CompanySettingsFormProps) {
const router = useRouter();

const canUpdateCompany =
currentUserRole === "admin" ||
currentUserRole === "buyer" ||
currentUserRole === "owner";

const [name, setName] = useState(initialName);
const [category, setCategory] = useState(initialCategory);
const [location, setLocation] = useState(initialLocation);
const [networkRole, setNetworkRole] = useState(initialNetworkRole);

const [loading, setLoading] = useState(false);
const [message, setMessage] = useState("");
const [error, setError] = useState("");

async function handleUpdateCompany(event: React.FormEvent<HTMLFormElement>) {
event.preventDefault();

if (!canUpdateCompany) {
setError("Your current role has read-only access to company profile settings.");
return;
}

setLoading(true);
setMessage("");
setError("");

try {
const response = await fetch(`/api/companies/${companyId}`, {
method: "PATCH",
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

const data = (await response.json()) as UpdateCompanyResponse;

if (!response.ok) {
setError(data.error || "Failed to update company.");
setLoading(false);
return;
}

setMessage("Company settings updated successfully.");
router.refresh();
} catch (error) {
console.error(error);
setError("Request failed. Please try again.");
} finally {
setLoading(false);
}
}

return (
<form onSubmit={handleUpdateCompany} className="mt-8 space-y-5">
<label className="block">
<span className="mb-2 block text-xs font-black uppercase tracking-[0.2em] text-slate-500">
Company Name
</span>

<input
type="text"
required
disabled={!canUpdateCompany || loading}
placeholder="Northline Development Group"
value={name}
onChange={(event) => setName(event.target.value)}
className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-950 outline-none transition focus:border-slate-950 focus:bg-white disabled:cursor-not-allowed disabled:opacity-60"
/>
</label>

<div className="grid gap-5 md:grid-cols-2">
<label className="block">
<span className="mb-2 block text-xs font-black uppercase tracking-[0.2em] text-slate-500">
Category
</span>

<input
type="text"
disabled={!canUpdateCompany || loading}
placeholder="General Contractor"
value={category}
onChange={(event) => setCategory(event.target.value)}
className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-950 outline-none transition focus:border-slate-950 focus:bg-white disabled:cursor-not-allowed disabled:opacity-60"
/>
</label>

<label className="block">
<span className="mb-2 block text-xs font-black uppercase tracking-[0.2em] text-slate-500">
Location
</span>

<input
type="text"
disabled={!canUpdateCompany || loading}
placeholder="Toronto, ON"
value={location}
onChange={(event) => setLocation(event.target.value)}
className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-950 outline-none transition focus:border-slate-950 focus:bg-white disabled:cursor-not-allowed disabled:opacity-60"
/>
</label>
</div>

<label className="block">
<span className="mb-2 block text-xs font-black uppercase tracking-[0.2em] text-slate-500">
Network Role
</span>

<select
disabled={!canUpdateCompany || loading}
value={networkRole}
onChange={(event) => setNetworkRole(event.target.value)}
className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-950 outline-none transition focus:border-slate-950 focus:bg-white disabled:cursor-not-allowed disabled:opacity-60"
>
<option value="Owner / Developer">Owner / Developer</option>
<option value="General Contractor">General Contractor</option>
<option value="Architect / Designer">Architect / Designer</option>
<option value="Manufacturer">Manufacturer</option>
<option value="Vendor / Supplier">Vendor / Supplier</option>
<option value="Consultant">Consultant</option>
</select>
</label>

{!canUpdateCompany ? (
<div className="rounded-2xl bg-amber-50 px-4 py-3 text-sm font-bold leading-6 text-amber-700">
Your current role has read-only access to company profile settings.
</div>
) : null}

{message ? (
<div className="rounded-2xl bg-green-50 px-4 py-3 text-sm font-bold leading-6 text-green-700">
{message}
</div>
) : null}

{error ? (
<div className="rounded-2xl bg-red-50 px-4 py-3 text-sm font-bold leading-6 text-red-600">
{error}
</div>
) : null}

<button
type="submit"
disabled={loading || !canUpdateCompany}
className="rounded-full bg-slate-950 px-7 py-4 text-sm font-bold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
>
{loading ? "Saving changes..." : "Save Company Settings"}
</button>
</form>
);
}