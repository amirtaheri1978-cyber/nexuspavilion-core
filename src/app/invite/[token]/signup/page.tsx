"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { createClient } from "@/lib/supabase/client";
import Image from "next/image";

const SITE_URL =
process.env.NEXT_PUBLIC_SITE_URL ||
"https://scaling-invention-5g7q4p5rwrwj3vwq7-3000.app.github.dev";

type CompanyRecord = {
id: string;
name: string | null;
category: string | null;
location: string | null;
logo_url: string | null;
};

type InvitationRecord = {
id: string;
company_id: string;
email: string | null;
role: string | null;
status: string | null;
token: string | null;
expires_at: string | null;
companies: CompanyRecord | CompanyRecord[] | null;
};

function formatRole(role: string | null | undefined) {
if (role === "admin") return "Admin";
if (role === "buyer") return "Buyer";
return "Vendor";
}

function isExpired(expiresAt: string | null) {
if (!expiresAt) return false;
return new Date(expiresAt).getTime() < Date.now();
}

export default function InviteSignupPage() {
const params = useParams<{ token: string }>();
const supabase = useMemo(() => createClient(), []);

const token = params.token;

const [invitation, setInvitation] = useState<InvitationRecord | null>(null);
const [loadingInvitation, setLoadingInvitation] = useState(true);

const [password, setPassword] = useState("");
const [confirmPassword, setConfirmPassword] = useState("");

const [submitting, setSubmitting] = useState(false);
const [message, setMessage] = useState("");
const [error, setError] = useState("");

const company = Array.isArray(invitation?.companies)
? invitation.companies[0]
: invitation?.companies;

const passwordIsReady = password.length >= 8;
const passwordsMatch = password.length > 0 && password === confirmPassword;
const formIsReady = Boolean(invitation) && passwordIsReady && passwordsMatch;

useEffect(() => {
async function loadInvitation() {
setLoadingInvitation(true);
setError("");

const { data, error } = await supabase
.from("invitations")
.select(
`
id,
company_id,
email,
role,
status,
token,
expires_at,
companies (
id,
name,
category,
location,
logo_url
)
`
)
.eq("token", token)
.single();

setLoadingInvitation(false);

if (error || !data) {
setError("Invitation not found or no longer available.");
setInvitation(null);
return;
}

setInvitation(data as InvitationRecord);
}

loadInvitation();
}, [supabase, token]);

async function acceptInvitationAfterSignup() {
const formData = new FormData();
formData.append("token", token);

const response = await fetch("/api/company-invitations/accept", {
method: "POST",
body: formData,
redirect: "manual",
});

if (response.type === "opaqueredirect" || response.status === 0) {
window.location.href = `${SITE_URL}/dashboard`;
return;
}

if (response.status >= 300 && response.status < 400) {
window.location.href = `${SITE_URL}/dashboard`;
return;
}

window.location.href = `${SITE_URL}/dashboard`;
}

async function handleSignup(event: React.FormEvent<HTMLFormElement>) {
event.preventDefault();

setSubmitting(true);
setMessage("");
setError("");

if (!invitation) {
setSubmitting(false);
setError("Invitation could not be loaded.");
return;
}

if (invitation.status !== "pending") {
setSubmitting(false);
setError("This invitation is no longer pending.");
return;
}

if (isExpired(invitation.expires_at)) {
setSubmitting(false);
setError("This invitation has expired.");
return;
}

if (!passwordIsReady) {
setSubmitting(false);
setError("Password must be at least 8 characters.");
return;
}

if (!passwordsMatch) {
setSubmitting(false);
setError("Passwords do not match.");
return;
}

const email = (invitation.email || "").trim().toLowerCase();

if (!email) {
setSubmitting(false);
setError("Invitation email is missing.");
return;
}

const { error: signupError } = await supabase.auth.signUp({
email,
password,
});

if (signupError && !signupError.message.toLowerCase().includes("already")) {
setSubmitting(false);
setError(signupError.message);
return;
}

const { error: signInError } = await supabase.auth.signInWithPassword({
email,
password,
});

if (signInError) {
setSubmitting(false);
setMessage(
"Account created. Please confirm your email if required, then sign in to accept the invitation."
);
return;
}

await acceptInvitationAfterSignup();
}

if (loadingInvitation) {
return (
<main className="flex min-h-screen items-center justify-center bg-[#f6f6f3] px-6 py-10">
<div className="rounded-[32px] border border-black/5 bg-white p-8 text-center">
<p className="text-sm font-bold text-slate-600">
Loading invitation...
</p>
</div>
</main>
);
}

if (!invitation) {
return (
<main className="flex min-h-screen items-center justify-center bg-[#f6f6f3] px-6 py-10">
<div className="w-full max-w-lg rounded-[32px] border border-black/5 bg-white p-8 text-center">
<h1 className="text-3xl font-black text-slate-950">
Invitation unavailable
</h1>

<p className="mt-3 text-sm leading-6 text-slate-600">
This invitation link is invalid, expired, or no longer exists.
</p>

<Link
href={`${SITE_URL}/login`}
className="mt-6 inline-flex rounded-full bg-slate-950 px-6 py-3 text-sm font-bold text-white"
>
Back to sign in
</Link>
</div>
</main>
);
}

const expired = isExpired(invitation.expires_at);
const unavailable = invitation.status !== "pending" || expired;

return (
<main className="min-h-screen bg-[#f6f6f3] px-6 py-10">
<div className="mx-auto max-w-5xl">
<Link
href={`${SITE_URL}/invite/${token}`}
className="text-sm font-bold text-slate-500 hover:text-slate-950"
>
← Back to invitation
</Link>

<section className="mt-8 grid gap-8 lg:grid-cols-[1fr_420px]">
<div className="rounded-[36px] border border-black/5 bg-white p-10">
<p className="text-xs font-black uppercase tracking-[0.35em] text-orange-500">
Nexus Pavilion Onboarding
</p>

<h1 className="mt-3 text-5xl font-black text-slate-950">
Create your account
</h1>

<p className="mt-4 max-w-2xl text-sm leading-6 text-slate-600">
Create a password to join this secure company workspace. Your
account will be connected automatically after signup.
</p>

<div className="mt-8 rounded-3xl bg-slate-50 p-6">
<div className="flex items-start gap-5">
{company?.logo_url ? (
<Image
src={company.logo_url}
alt={company.name || "Company"}
width={80}
height={80}
className="h-20 w-20 rounded-3xl border border-slate-200 bg-white object-contain p-2"
/>
) : (
<div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-white text-3xl font-black text-slate-500">
{company?.name?.charAt(0) || "N"}
</div>
)}

<div>
<p className="text-xs font-black uppercase tracking-[0.25em] text-slate-400">
Company Workspace
</p>

<h2 className="mt-2 text-3xl font-black text-slate-950">
{company?.name || "Company Workspace"}
</h2>

<p className="mt-2 text-sm font-semibold text-slate-600">
{company?.category || "Enterprise"} ·{" "}
{company?.location || "Location N/A"}
</p>
</div>
</div>
</div>

<div className="mt-6 grid gap-4 md:grid-cols-3">
<InfoBox title="Email" value={invitation.email || "Invited user"} />
<InfoBox title="Role" value={formatRole(invitation.role)} />
<InfoBox
title="Status"
value={expired ? "Expired" : invitation.status || "pending"}
/>
</div>
</div>

<div className="rounded-[36px] border border-black/5 bg-white p-8">
<h2 className="text-3xl font-black text-slate-950">
Set password
</h2>

<p className="mt-3 text-sm leading-6 text-slate-600">
This password will be used to sign in to Nexus Pavilion.
</p>

{unavailable ? (
<div className="mt-6 rounded-3xl bg-red-50 p-5">
<p className="text-sm font-bold text-red-700">
This invitation is not available for signup.
</p>
</div>
) : (
<form onSubmit={handleSignup} className="mt-6 space-y-5">
<label className="block">
<span className="mb-2 block text-xs font-black uppercase tracking-[0.2em] text-slate-500">
Invited email
</span>

<input
type="email"
readOnly
value={invitation.email || ""}
className="w-full rounded-2xl border border-slate-200 bg-slate-100 px-4 py-3 text-sm font-bold text-slate-500 outline-none"
/>
</label>

<label className="block">
<span className="mb-2 block text-xs font-black uppercase tracking-[0.2em] text-slate-500">
Password
</span>

<input
type="password"
required
placeholder="At least 8 characters"
value={password}
onChange={(event) => setPassword(event.target.value)}
className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-950 outline-none transition focus:border-slate-950 focus:bg-white"
/>
</label>

<label className="block">
<span className="mb-2 block text-xs font-black uppercase tracking-[0.2em] text-slate-500">
Confirm password
</span>

<input
type="password"
required
placeholder="Confirm your password"
value={confirmPassword}
onChange={(event) =>
setConfirmPassword(event.target.value)
}
className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-950 outline-none transition focus:border-slate-950 focus:bg-white"
/>
</label>

<div className="rounded-2xl bg-slate-50 px-4 py-3">
<div className="flex items-center justify-between text-xs font-bold">
<span className="text-slate-600">
Minimum 8 characters
</span>
<span
className={
passwordIsReady ? "text-green-700" : "text-slate-400"
}
>
{passwordIsReady ? "Ready" : "Pending"}
</span>
</div>

<div className="mt-2 flex items-center justify-between text-xs font-bold">
<span className="text-slate-600">Passwords match</span>
<span
className={
passwordsMatch ? "text-green-700" : "text-slate-400"
}
>
{passwordsMatch ? "Ready" : "Pending"}
</span>
</div>
</div>

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
disabled={submitting || !formIsReady}
className="w-full rounded-full bg-slate-950 px-6 py-3 text-sm font-bold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
>
{submitting ? "Creating account..." : "Create account & join"}
</button>
</form>
)}

<Link
href={`${SITE_URL}/login`}
className="mt-6 inline-block text-sm font-bold text-slate-500 hover:text-slate-950"
>
Already have an account? Sign in
</Link>
</div>
</section>
</div>
</main>
);
}

function InfoBox({ title, value }: { title: string; value: string }) {
return (
<div className="rounded-3xl bg-white p-5 shadow-sm">
<p className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">
{title}
</p>

<p className="mt-2 break-all text-lg font-black text-slate-950">
{value}
</p>
</div>
);
}