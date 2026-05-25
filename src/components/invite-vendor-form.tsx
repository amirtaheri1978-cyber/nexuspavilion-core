"use client";

import { useState } from "react";

type InviteVendorFormProps = {
rfqId: string;
};

export default function InviteVendorForm({ rfqId }: InviteVendorFormProps) {
const [email, setEmail] = useState("");
const [inviteUrl, setInviteUrl] = useState("");
const [loading, setLoading] = useState(false);
const [error, setError] = useState("");

async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
event.preventDefault();

setLoading(true);
setError("");
setInviteUrl("");

const response = await fetch("/api/invites", {
method: "POST",
headers: {
"Content-Type": "application/json",
},
body: JSON.stringify({ rfqId, email }),
});

const data = await response.json();

setLoading(false);

if (!response.ok) {
setError(data.error || "Could not create invite.");
return;
}

setInviteUrl(data.inviteUrl);
setEmail("");
}

return (
<section className="mt-10 rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
<p className="text-sm font-semibold uppercase tracking-[0.2em] text-orange-500">
Vendor Invitation
</p>

<h2 className="mt-3 text-3xl font-black text-slate-900">
Invite Supplier
</h2>

<form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4 md:flex-row">
<input
type="email"
value={email}
onChange={(event) => setEmail(event.target.value)}
placeholder="supplier@email.com"
required
className="flex-1 rounded-2xl border border-slate-200 px-5 py-4 outline-none focus:border-slate-900"
/>

<button
type="submit"
disabled={loading}
className="rounded-2xl bg-slate-900 px-6 py-4 text-sm font-bold text-white transition hover:bg-slate-800 disabled:opacity-50"
>
{loading ? "Creating..." : "Create Invite"}
</button>
</form>

{error && <p className="mt-4 text-sm font-semibold text-red-600">{error}</p>}

{inviteUrl && (
<div className="mt-6 rounded-2xl bg-slate-50 p-5">
<p className="text-sm font-semibold text-slate-700">
Invite link created:
</p>

<p className="mt-2 break-all text-sm text-slate-600">
{inviteUrl}
</p>
</div>
)}
</section>
);
}