"use client";

import { useState } from "react";

type InviteVendorFormProps = {
rfqId: string;
};

type InviteResponse = {
inviteUrl?: string;
message?: string;
error?: string;
};

export default function InviteVendorForm({ rfqId }: InviteVendorFormProps) {
const [email, setEmail] = useState("");
const [inviteUrl, setInviteUrl] = useState("");
const [successMessage, setSuccessMessage] = useState("");
const [copyMessage, setCopyMessage] = useState("");
const [loading, setLoading] = useState(false);
const [error, setError] = useState("");

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
body: JSON.stringify({ rfqId, email }),
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
Invite suppliers to quote
</h2>

<p className="mt-3 max-w-2xl text-sm font-semibold leading-6 text-slate-600">
Send a secure RFQ invite to qualified suppliers. Invited suppliers
can access this procurement opportunity and submit their own quote.
</p>
</div>

<div className="rounded-2xl bg-slate-50 px-4 py-3">
<p className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">
Access Control
</p>

<p className="mt-2 text-sm font-black text-slate-950">
RFQ Owner Only
</p>
</div>
</div>

<form onSubmit={handleSubmit} className="mt-7 grid gap-4 md:grid-cols-[1fr_auto]">
<input
type="email"
value={email}
onChange={(event) => setEmail(event.target.value)}
placeholder="supplier@company.com"
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