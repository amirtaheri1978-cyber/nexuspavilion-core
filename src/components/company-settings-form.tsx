"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

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

const NETWORK_ROLE_OPTIONS = [
"Owner / Developer",
"General Contractor",
"Architect / Designer",
"Manufacturer",
"Vendor / Supplier",
"Consultant",
];

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
} catch (requestError) {
console.error(requestError);
setError("Request failed. Please try again.");
} finally {
setLoading(false);
}
}

return (
<form onSubmit={handleUpdateCompany} className="mt-8 space-y-5">
<label className="block">
<FormLabel>Company Name</FormLabel>

<input
type="text"
required
disabled={!canUpdateCompany || loading}
placeholder="Northline Development Group"
value={name}
onChange={(event) => setName(event.target.value)}
className="w-full rounded-2xl border border-white/10 bg-[#061426]/80 px-4 py-4 text-sm font-bold text-white outline-none transition placeholder:text-slate-600 focus:border-[#2CC4E8]/40 focus:bg-[#07111F] disabled:cursor-not-allowed disabled:opacity-60"
/>
</label>

<div className="grid gap-5 md:grid-cols-2">
<label className="block">
<FormLabel>Category</FormLabel>

<input
type="text"
disabled={!canUpdateCompany || loading}
placeholder="General Contractor"
value={category}
onChange={(event) => setCategory(event.target.value)}
className="w-full rounded-2xl border border-white/10 bg-[#061426]/80 px-4 py-4 text-sm font-bold text-white outline-none transition placeholder:text-slate-600 focus:border-[#2CC4E8]/40 focus:bg-[#07111F] disabled:cursor-not-allowed disabled:opacity-60"
/>
</label>

<label className="block">
<FormLabel>Location</FormLabel>

<input
type="text"
disabled={!canUpdateCompany || loading}
placeholder="Toronto, ON"
value={location}
onChange={(event) => setLocation(event.target.value)}
className="w-full rounded-2xl border border-white/10 bg-[#061426]/80 px-4 py-4 text-sm font-bold text-white outline-none transition placeholder:text-slate-600 focus:border-[#2CC4E8]/40 focus:bg-[#07111F] disabled:cursor-not-allowed disabled:opacity-60"
/>
</label>
</div>

<label className="block">
<FormLabel>Network Role</FormLabel>

<select
disabled={!canUpdateCompany || loading}
value={networkRole}
onChange={(event) => setNetworkRole(event.target.value)}
className="w-full rounded-2xl border border-white/10 bg-[#061426]/80 px-4 py-4 text-sm font-bold text-white outline-none transition focus:border-[#2CC4E8]/40 focus:bg-[#07111F] disabled:cursor-not-allowed disabled:opacity-60"
>
{NETWORK_ROLE_OPTIONS.map((option) => (
<option key={option} value={option} className="bg-[#061426] text-white">
{option}
</option>
))}
</select>
</label>

{!canUpdateCompany ? (
<Notice tone="warning">
Your current role has read-only access to company profile settings.
</Notice>
) : null}

{message ? <Notice tone="success">{message}</Notice> : null}

{error ? <Notice tone="danger">{error}</Notice> : null}

<button
type="submit"
disabled={loading || !canUpdateCompany}
className="rounded-full bg-gradient-to-r from-[#B9902F] via-[#C8A646] to-[#F5D77B] px-7 py-4 text-sm font-black text-slate-950 shadow-[0_18px_55px_rgba(200,166,70,0.22)] transition hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-50"
>
{loading ? "Saving changes..." : "Save Company Settings"}
</button>
</form>
);
}

function FormLabel({ children }: { children: React.ReactNode }) {
return (
<span className="mb-2 block text-xs font-black uppercase tracking-[0.2em] text-slate-500">
{children}
</span>
);
}

function Notice({
children,
tone,
}: {
children: React.ReactNode;
tone: "success" | "warning" | "danger";
}) {
const toneClass =
tone === "success"
? "border-emerald-300/20 bg-emerald-400/10 text-emerald-200"
: tone === "warning"
? "border-orange-300/20 bg-orange-400/10 text-orange-200"
: "border-red-300/20 bg-red-400/10 text-red-200";

return (
<div className={`rounded-2xl border px-4 py-3 text-sm font-bold leading-6 ${toneClass}`}>
{children}
</div>
);
}