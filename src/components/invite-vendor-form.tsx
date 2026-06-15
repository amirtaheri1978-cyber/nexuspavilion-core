"use client";

import { useEffect, useMemo, useState } from "react";

import { createClient } from "@/lib/supabase/client";

type InviteVendorFormProps = {
rfqId: string;
};

type InviteResponse = {
inviteUrl?: string;
message?: string;
error?: string;
};

type ApprovedVendor = {
vendor_company_id: string;
status: string | null;
rating: number | null;
};

type Company = {
id: string;
name: string | null;
category: string | null;
location: string | null;
network_role: string | null;
};

type VendorOption = Company & {
avlStatus: string;
avlRating: number;
};

function getStatusClass(status: string) {
if (status === "approved") return "bg-green-100 text-green-800";
if (status === "conditional") return "bg-yellow-100 text-yellow-800";
if (status === "suspended") return "bg-red-100 text-red-800";
return "bg-slate-100 text-slate-700";
}

export default function InviteVendorForm({ rfqId }: InviteVendorFormProps) {
const supabase = useMemo(() => createClient(), []);

const [email, setEmail] = useState("");
const [selectedVendorId, setSelectedVendorId] = useState("");
const [vendors, setVendors] = useState<VendorOption[]>([]);

const [inviteUrl, setInviteUrl] = useState("");
const [successMessage, setSuccessMessage] = useState("");
const [copyMessage, setCopyMessage] = useState("");
const [loading, setLoading] = useState(false);
const [vendorsLoading, setVendorsLoading] = useState(true);
const [error, setError] = useState("");

useEffect(() => {
async function loadApprovedVendors() {
setVendorsLoading(true);

const { data: avlData } = await supabase
.from("approved_vendors")
.select("vendor_company_id, status, rating")
.in("status", ["approved", "conditional"]);

const approvedVendorRows = (avlData || []) as ApprovedVendor[];
const vendorIds = approvedVendorRows.map((vendor) => vendor.vendor_company_id);

if (vendorIds.length === 0) {
setVendors([]);
setVendorsLoading(false);
return;
}

const { data: companyData } = await supabase
.from("companies")
.select("id, name, category, location, network_role")
.in("id", vendorIds);

const companies = (companyData || []) as Company[];

const options = companies
.map((company) => {
const avl = approvedVendorRows.find(
(vendor) => vendor.vendor_company_id === company.id
);

return {
...company,
avlStatus: avl?.status || "approved",
avlRating: avl?.rating || 85,
};
})
.sort((a, b) => b.avlRating - a.avlRating);

setVendors(options);
setVendorsLoading(false);
}

loadApprovedVendors();
}, [supabase]);

async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
event.preventDefault();

setLoading(true);
setError("");
setInviteUrl("");
setSuccessMessage("");
setCopyMessage("");

const response = await fetch("/api/invites", {
method: "POST",
headers: {
"Content-Type": "application/json",
},
body: JSON.stringify({
rfqId,
email,
vendorCompanyId: selectedVendorId || null,
}),
});

const data = (await response.json()) as InviteResponse;

setLoading(false);

if (!response.ok) {
setError(data.error || "Could not create supplier invite.");
return;
}

setInviteUrl(data.inviteUrl || "");
setSuccessMessage(data.message || "Supplier invite created successfully.");
setEmail("");
setSelectedVendorId("");
}

async function copyInviteLink() {
if (!inviteUrl) return;

const absoluteUrl = `${window.location.origin}${inviteUrl}`;

await navigator.clipboard.writeText(absoluteUrl);
setCopyMessage("Invite link copied.");
}

return (
<section className="rounded-[32px] border border-black/5 bg-white p-8 shadow-sm">
<div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
<div>
<p className="text-xs font-black uppercase tracking-[0.3em] text-orange-500">
Supplier Invitations
</p>

<h2 className="mt-3 text-3xl font-black text-slate-950">
Invite approved suppliers to quote
</h2>

<p className="mt-3 max-w-2xl text-sm font-semibold leading-6 text-slate-600">
Route secure RFQ invitations through your Approved Vendor List. Open
RFQs may still use direct email invitations, while selective and
framework workflows should prioritize AVL suppliers.
</p>
</div>

<div className="rounded-2xl bg-slate-50 px-4 py-3">
<p className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">
Access Control
</p>

<p className="mt-2 text-sm font-black text-slate-950">
AVL Governance
</p>
</div>
</div>

{vendors.length > 0 ? (
<div className="mt-7 rounded-3xl border border-slate-200 bg-slate-50 p-5">
<p className="text-xs font-black uppercase tracking-[0.25em] text-slate-400">
Approved Vendor List
</p>

<div className="mt-4 grid gap-3">
{vendors.map((vendor) => (
<button
key={vendor.id}
type="button"
onClick={() => setSelectedVendorId(vendor.id)}
className={`rounded-2xl border p-4 text-left transition ${
selectedVendorId === vendor.id
? "border-slate-950 bg-white"
: "border-slate-200 bg-white hover:border-slate-400"
}`}
>
<div className="flex flex-wrap items-start justify-between gap-3">
<div>
<p className="text-sm font-black text-slate-950">
{vendor.name || "Approved Vendor"}
</p>

<p className="mt-1 text-xs font-semibold text-slate-500">
{vendor.category || "Supplier"} ·{" "}
{vendor.location || "Location N/A"}
</p>
</div>

<div className="flex flex-wrap gap-2">
<span
className={`rounded-full px-3 py-1 text-xs font-black ${getStatusClass(
vendor.avlStatus
)}`}
>
{vendor.avlStatus}
</span>

<span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-700">
{vendor.avlRating}/100
</span>
</div>
</div>
</button>
))}
</div>
</div>
) : (
<div className="mt-7 rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-5">
<p className="text-sm font-bold text-slate-500">
{vendorsLoading
? "Loading approved vendors..."
: "No approved vendors found yet. Add suppliers to your AVL from the Directory."}
</p>
</div>
)}

<form
onSubmit={handleSubmit}
className="mt-7 grid gap-4 md:grid-cols-[1fr_auto]"
>
<input
type="email"
value={email}
onChange={(event) => setEmail(event.target.value)}
placeholder={
selectedVendorId
? "supplier contact email for selected AVL vendor"
: "supplier@company.com"
}
required
className="rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4 text-sm font-bold text-slate-950 outline-none transition focus:border-slate-950 focus:bg-white"
/>

<button
type="submit"
disabled={loading}
className="rounded-full bg-slate-950 px-7 py-4 text-sm font-black text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
>
{loading ? "Creating Invite..." : "Create Supplier Invite"}
</button>
</form>

{selectedVendorId ? (
<p className="mt-3 text-xs font-bold text-slate-500">
Selected AVL vendor will be attached to this invitation for governance
tracking.
</p>
) : null}

{error ? (
<div className="mt-5 rounded-2xl bg-red-50 px-5 py-4 text-sm font-bold text-red-600">
{error}
</div>
) : null}

{successMessage ? (
<div className="mt-5 rounded-2xl bg-green-50 px-5 py-4 text-sm font-bold text-green-700">
{successMessage}
</div>
) : null}

{inviteUrl ? (
<div className="mt-5 rounded-3xl border border-slate-200 bg-slate-50 p-5">
<p className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">
Secure Invite Link
</p>

<p className="mt-3 break-all rounded-2xl bg-white px-4 py-3 text-sm font-bold text-slate-700">
{inviteUrl}
</p>

<div className="mt-4 flex flex-wrap gap-3">
<button
type="button"
onClick={copyInviteLink}
className="rounded-full bg-slate-950 px-5 py-3 text-xs font-black text-white transition hover:bg-slate-800"
>
Copy Invite Link
</button>

<a
href={inviteUrl}
className="rounded-full bg-white px-5 py-3 text-xs font-black text-slate-950 shadow-sm transition hover:shadow-md"
>
Open Invite
</a>
</div>

{copyMessage ? (
<p className="mt-3 text-xs font-black text-green-700">
{copyMessage}
</p>
) : null}
</div>
) : null}
</section>
);
}