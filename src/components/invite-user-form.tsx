"use client";

import { useState } from "react";

type InviteResponse = {
success?: boolean;
inviteUrl?: string;
error?: string;
};

export default function InviteUserForm() {
const [email, setEmail] = useState("");
const [role, setRole] = useState("vendor");
const [loading, setLoading] = useState(false);
const [inviteUrl, setInviteUrl] = useState("");
const [copied, setCopied] = useState(false);
const [error, setError] = useState("");

async function handleInvite(event: React.FormEvent<HTMLFormElement>) {
event.preventDefault();

setLoading(true);
setInviteUrl("");
setCopied(false);
setError("");

try {
const response = await fetch("/api/company-invitations", {
method: "POST",
headers: {
"Content-Type": "application/json",
},
body: JSON.stringify({
email: email.trim(),
role,
}),
});

const rawText = await response.text();

let data: InviteResponse = {};

try {
data = rawText ? JSON.parse(rawText) : {};
} catch {
setError(
`API returned non-JSON response. Status: ${response.status}. Response: ${rawText.slice(
0,
250
)}`
);
return;
}

if (!response.ok) {
setError(data.error || `Failed to create invitation. Status: ${response.status}`);
return;
}

if (!data.inviteUrl) {
setError("Invitation was created, but no invite link was returned.");
return;
}

setInviteUrl(data.inviteUrl);
setEmail("");
} catch (error) {
console.error(error);
setError(
error instanceof Error
? `Request failed: ${error.message}`
: "Request failed. Please try again."
);
} finally {
setLoading(false);
}
}

async function handleCopyInviteUrl() {
if (!inviteUrl) return;

try {
await navigator.clipboard.writeText(inviteUrl);
setCopied(true);

setTimeout(() => {
setCopied(false);
}, 2500);
} catch (error) {
console.error(error);
setError("Could not copy invite link. Please copy it manually.");
}
}

return (
<section className="rounded-[32px] border border-black/5 bg-white p-8">
<div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
<div>
<p className="text-xs font-black uppercase tracking-[0.3em] text-orange-500">
Team Invitations
</p>

<h2 className="mt-3 text-3xl font-black text-slate-950">
Invite user to workspace
</h2>

<p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
Invite vendors, buyers, or admins to join your company workspace.
For now, copy and share the invite link manually. Email delivery is
coming in the next sprint.
</p>
</div>

<div className="rounded-3xl bg-slate-50 px-5 py-4">
<p className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">
Status
</p>

<p className="mt-1 text-sm font-black text-slate-950">
Manual Link Sharing
</p>
</div>
</div>

<form
onSubmit={handleInvite}
className="mt-6 grid gap-4 md:grid-cols-[1fr_180px_auto]"
>
<input
type="email"
required
placeholder="user@company.com"
value={email}
onChange={(event) => setEmail(event.target.value)}
className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-950 outline-none transition focus:border-slate-950 focus:bg-white"
/>

<select
value={role}
onChange={(event) => setRole(event.target.value)}
className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-950 outline-none transition focus:border-slate-950 focus:bg-white"
>
<option value="vendor">Vendor</option>
<option value="buyer">Buyer</option>
<option value="admin">Admin</option>
</select>

<button
type="submit"
disabled={loading}
className="rounded-full bg-slate-950 px-6 py-3 text-sm font-bold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
>
{loading ? "Creating..." : "Create Invite"}
</button>
</form>

{inviteUrl && (
<div className="mt-6 rounded-3xl border border-green-100 bg-green-50 p-5">
<div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
<div>
<p className="text-sm font-black text-green-700">
Invitation created
</p>

<p className="mt-2 max-w-3xl break-all text-sm font-semibold leading-6 text-green-800">
{inviteUrl}
</p>
</div>

<button
type="button"
onClick={handleCopyInviteUrl}
className="rounded-full bg-green-700 px-5 py-3 text-sm font-bold text-white transition hover:bg-green-800"
>
{copied ? "Copied!" : "Copy Link"}
</button>
</div>

<p className="mt-4 text-xs font-bold leading-5 text-green-700">
Share this link with the invited user. They must sign in using the
same email address used for this invitation.
</p>
</div>
)}

{error && (
<div className="mt-6 rounded-2xl bg-red-50 p-4 text-sm font-bold leading-6 text-red-600">
{error}
</div>
)}
</section>
);
}