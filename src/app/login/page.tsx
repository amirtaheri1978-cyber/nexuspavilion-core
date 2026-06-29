"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";

import { createClient } from "@/lib/supabase/client";

const BRAND_LOGO_SRC = "/branding/logo-horizontal-512.png";

const PLATFORM_SIGNALS = [
"RFQ Governance",
"Supplier Intelligence",
"Executive Reporting",
"Marketplace Network",
"Company Collaboration",
"AI Procurement Intelligence",
];

const inputClassName =
"h-[60px] w-full rounded-2xl border border-white/10 bg-[#07111F] px-5 text-sm font-semibold text-white outline-none transition placeholder:text-slate-500 focus:border-[#C8A646] focus:bg-[#081827] focus:ring-4 focus:ring-[#C8A646]/15 disabled:cursor-not-allowed disabled:opacity-60";

function getFriendlyAuthError(message: string) {
const normalized = message.toLowerCase();

if (normalized.includes("invalid login credentials")) {
return "The email or password entered does not match an active Nexus Pavilion account.";
}

if (normalized.includes("email not confirmed")) {
return "Please verify your email address before signing in.";
}

if (normalized.includes("too many requests")) {
return "Too many sign-in attempts. Please wait a moment and try again.";
}

if (normalized.includes("network") || normalized.includes("fetch")) {
return "We could not reach the authentication service. Please check your connection and try again.";
}

return "We could not sign you in securely. Please review your details and try again.";
}

export default function LoginPage() {
const router = useRouter();
const supabase = createClient();

const [email, setEmail] = useState("");
const [password, setPassword] = useState("");

const [loading, setLoading] = useState(false);
const [error, setError] = useState("");

async function syncUserProfile(userId: string, userEmail: string | null) {
const normalizedEmail = String(userEmail || "").trim().toLowerCase();

const { data: existingProfile } = await supabase
.from("profiles")
.select("id")
.eq("id", userId)
.maybeSingle();

if (existingProfile) {
await supabase
.from("profiles")
.update({
email: normalizedEmail,
})
.eq("id", userId);

return;
}

await supabase.from("profiles").insert({
id: userId,
email: normalizedEmail,
role: "buyer",
});
}

async function handleLogin(event: React.FormEvent<HTMLFormElement>) {
event.preventDefault();

if (loading) return;

setLoading(true);
setError("");

try {
const normalizedEmail = email.trim().toLowerCase();

const { data, error } = await supabase.auth.signInWithPassword({
email: normalizedEmail,
password,
});

if (error) {
setError(getFriendlyAuthError(error.message));
return;
}

const user = data.user;

if (user) {
await syncUserProfile(user.id, user.email ?? null);
}

router.push("/dashboard");
router.refresh();
} catch {
setError(
"A secure sign-in connection could not be completed. Please try again."
);
} finally {
setLoading(false);
}
}

return (
<main className="relative min-h-screen overflow-hidden bg-[#061426] px-4 py-6 text-white sm:px-6 lg:px-10">
<div className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(circle_at_top_left,rgba(44,196,232,0.18),transparent_34%),radial-gradient(circle_at_top_right,rgba(200,166,70,0.15),transparent_30%),linear-gradient(180deg,#061426_0%,#07111F_45%,#020617_100%)]" />

<div className="pointer-events-none fixed inset-0 -z-10 bg-[linear-gradient(120deg,rgba(255,255,255,0.05),transparent_34%,rgba(200,166,70,0.05)_68%,transparent)]" />

<section className="mx-auto grid min-h-[calc(100vh-3rem)] w-full max-w-[1680px] items-center gap-8 lg:grid-cols-[0.82fr_1.18fr] xl:gap-10">
<aside className="rounded-[38px] border border-white/10 bg-white/[0.045] p-7 shadow-[0_32px_110px_rgba(0,0,0,0.42)] backdrop-blur-2xl sm:p-9 lg:p-11 xl:p-12">
<BrandTile />

<p className="mt-10 text-xs font-black uppercase tracking-[0.34em] text-[#C8A646]">
Enterprise Procurement Intelligence
</p>

<h1 className="mt-5 max-w-2xl text-4xl font-black tracking-[-0.05em] text-white sm:text-5xl xl:text-[64px] xl:leading-[0.98]">
Secure access to your enterprise workspace.
</h1>

<p className="mt-7 max-w-2xl text-base font-semibold leading-8 text-slate-300 xl:text-lg">
Sign in to your organization&apos;s protected procurement command
center for RFQs, supplier intelligence, award governance, and
executive reporting.
</p>

<div className="mt-9 grid gap-3 sm:grid-cols-2">
{PLATFORM_SIGNALS.map((signal) => (
<div
key={signal}
className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.045] px-4 py-3 text-sm font-black text-slate-200"
>
<span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-[#C8A646]/30 bg-[#C8A646]/10 text-xs text-[#F5D77B]">
✓
</span>
<span>{signal}</span>
</div>
))}
</div>

<div className="mt-9 rounded-3xl border border-white/10 bg-[#07111F]/75 p-5">
<p className="text-xs font-black uppercase tracking-[0.24em] text-slate-500">
Protected Workspace
</p>
<p className="mt-3 text-sm font-semibold leading-6 text-slate-300">
Access is restricted to verified company users, invited team
members, and approved enterprise accounts.
</p>
</div>
</aside>

<section className="mx-auto w-full max-w-[700px] rounded-[40px] border border-white/10 bg-white/[0.065] p-7 shadow-[0_36px_120px_rgba(0,0,0,0.52)] backdrop-blur-2xl sm:p-10 lg:p-12 xl:p-14">
<p className="text-xs font-black uppercase tracking-[0.34em] text-[#C8A646]">
Secure Enterprise Access
</p>

<h2 className="mt-5 text-4xl font-black tracking-[-0.05em] text-white sm:text-5xl xl:text-[58px]">
Enterprise sign in.
</h2>

<p className="mt-5 text-base font-semibold leading-8 text-slate-300">
Access your organization&apos;s secure procurement intelligence
workspace.
</p>

<form onSubmit={handleLogin} className="mt-10 space-y-6">
<label className="block">
<span className="mb-2 block text-xs font-black uppercase tracking-[0.22em] text-slate-400">
Email
</span>

<input
type="email"
required
placeholder="you@company.com"
value={email}
onChange={(event) => setEmail(event.target.value)}
disabled={loading}
className={inputClassName}
/>
</label>

<label className="block">
<div className="mb-2 flex items-center justify-between gap-4">
<span className="block text-xs font-black uppercase tracking-[0.22em] text-slate-400">
Password
</span>

<Link
href="/forgot-password"
className="text-xs font-black text-[#F5D77B] transition hover:text-white"
>
Forgot password?
</Link>
</div>

<input
type="password"
required
placeholder="Enter your password"
value={password}
onChange={(event) => setPassword(event.target.value)}
disabled={loading}
className={inputClassName}
/>
</label>

{error ? (
<div
role="alert"
className="rounded-2xl border border-red-300/20 bg-red-400/10 px-4 py-3 text-sm font-bold leading-6 text-red-200"
>
{error}
</div>
) : null}

<button
type="submit"
disabled={loading}
className="h-[60px] w-full rounded-2xl bg-gradient-to-r from-[#B9902F] via-[#C8A646] to-[#F5D77B] px-6 text-sm font-black uppercase tracking-[0.14em] text-slate-950 shadow-[0_22px_65px_rgba(200,166,70,0.34)] transition hover:scale-[1.01] hover:shadow-[0_28px_80px_rgba(200,166,70,0.42)] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:scale-100"
>
{loading ? "Securing access..." : "Sign in to Workspace"}
</button>
</form>

<div className="mt-8 rounded-3xl border border-white/10 bg-[#07111F]/75 p-5">
<p className="text-sm font-semibold leading-6 text-slate-400">
New to Nexus Pavilion?{" "}
<Link href="/signup" className="font-black text-[#F5D77B]">
Create an account
</Link>{" "}
or use your company invitation link to join an existing
workspace.
</p>
</div>

<div className="mt-5 rounded-2xl border border-white/10 bg-white/[0.035] px-4 py-3">
<p className="text-xs font-bold leading-5 text-slate-400">
🔒 Enterprise authentication protected by Nexus Pavilion Security.
</p>
</div>
</section>
</section>
</main>
);
}

function BrandTile() {
return (
<div className="inline-flex rounded-[30px] border border-white/10 bg-white/[0.06] p-2 shadow-[0_22px_70px_rgba(0,0,0,0.42)] backdrop-blur-xl">
<div className="rounded-[24px] border border-white/10 bg-black px-6 py-5">
<img
src={BRAND_LOGO_SRC}
alt="Nexus Pavilion"
className="h-[72px] w-auto object-contain sm:h-[82px] xl:h-[88px]"
/>
</div>
</div>
);
}