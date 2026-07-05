"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { createClient } from "@/lib/supabase/client";
import Image from "next/image";

const BRAND_LOGO_SRC = "/branding/logo-horizontal-512.png";

const SITE_URL =
process.env.NEXT_PUBLIC_SITE_URL ||
"https://scaling-invention-5g7q4p5rwrwj3vwq7-3000.app.github.dev";

const SECURITY_SIGNALS = [
"Secure Recovery",
"Identity Verification",
"Workspace Protection",
"Enterprise Access",
];

const inputClassName =
"h-[60px] w-full rounded-2xl border border-white/10 bg-[#07111F] px-5 text-sm font-semibold text-white outline-none transition placeholder:text-slate-500 focus:border-[#C8A646] focus:bg-[#081827] focus:ring-4 focus:ring-[#C8A646]/15 disabled:cursor-not-allowed disabled:opacity-60";

function normalizeEmail(value: string) {
return value.trim().toLowerCase();
}

function getFriendlyResetError(message: string) {
const normalized = message.toLowerCase();

if (normalized.includes("email")) {
return "Please enter a valid work email address.";
}

if (normalized.includes("rate") || normalized.includes("too many")) {
return "Too many recovery attempts. Please wait a moment and try again.";
}

if (normalized.includes("network") || normalized.includes("fetch")) {
return "We could not reach the secure recovery service. Please check your connection and try again.";
}

return "We could not send a recovery link securely. Please review your email and try again.";
}

export default function ForgotPasswordPage() {
const supabase = useMemo(() => createClient(), []);

const [email, setEmail] = useState("");
const [submittedEmail, setSubmittedEmail] = useState("");
const [loading, setLoading] = useState(false);
const [sent, setSent] = useState(false);
const [error, setError] = useState("");

async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
event.preventDefault();

if (loading) return;

setLoading(true);
setError("");

const normalizedEmail = normalizeEmail(email);

try {
const { error } = await supabase.auth.resetPasswordForEmail(
normalizedEmail,
{
redirectTo: `${SITE_URL}/auth/callback?next=/set-password`,
}
);

if (error) {
setError(getFriendlyResetError(error.message));
return;
}

setSubmittedEmail(normalizedEmail);
setSent(true);
} catch {
setError(
"A secure recovery connection could not be completed. Please try again."
);
} finally {
setLoading(false);
}
}

return (
<main className="relative min-h-screen overflow-hidden bg-[#061426] px-4 py-6 text-white sm:px-6 lg:px-10">
<div className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(circle_at_top_left,rgba(44,196,232,0.18),transparent_34%),radial-gradient(circle_at_top_right,rgba(200,166,70,0.15),transparent_30%),linear-gradient(180deg,#061426_0%,#07111F_45%,#020617_100%)]" />

<div className="pointer-events-none fixed inset-0 -z-10 bg-[linear-gradient(120deg,rgba(255,255,255,0.05),transparent_34%,rgba(200,166,70,0.05)_68%,transparent)]" />

<section className="mx-auto grid min-h-[calc(100vh-3rem)] w-full max-w-[1560px] items-center gap-8 lg:grid-cols-[0.82fr_1.18fr] xl:gap-10">
<aside className="rounded-[38px] border border-white/10 bg-white/[0.045] p-7 shadow-[0_32px_110px_rgba(0,0,0,0.42)] backdrop-blur-2xl sm:p-9 lg:p-11 xl:p-12">
<BrandTile />

<p className="mt-10 text-xs font-black uppercase tracking-[0.34em] text-[#C8A646]">
Enterprise Identity Recovery
</p>

<h1 className="mt-5 max-w-2xl text-4xl font-black tracking-[-0.05em] text-white sm:text-5xl xl:text-[64px] xl:leading-[0.98]">
Recover secure access to your enterprise workspace.
</h1>

<p className="mt-7 max-w-2xl text-base font-semibold leading-8 text-slate-300 xl:text-lg">
Reset your password through a protected identity flow designed for
secure procurement access, company workspaces, RFQ governance, and
executive reporting.
</p>

<div className="mt-9 grid gap-3 sm:grid-cols-2">
{SECURITY_SIGNALS.map((signal) => (
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
Secure Recovery Path
</p>
<p className="mt-3 text-sm font-semibold leading-6 text-slate-300">
Recovery links are time-sensitive and return users to a protected
password setup flow before workspace access is restored.
</p>
</div>
</aside>

<section className="mx-auto w-full max-w-[700px] rounded-[40px] border border-white/10 bg-white/[0.065] p-7 shadow-[0_36px_120px_rgba(0,0,0,0.52)] backdrop-blur-2xl sm:p-10 lg:p-12 xl:p-14">
<Link
href="/login"
className="inline-flex text-sm font-bold text-slate-400 transition hover:text-white"
>
← Back to sign in
</Link>

{!sent ? (
<>
<div className="mt-8">
<p className="text-xs font-black uppercase tracking-[0.34em] text-[#C8A646]">
Secure Recovery
</p>

<h2 className="mt-5 text-4xl font-black tracking-[-0.05em] text-white sm:text-5xl xl:text-[58px]">
Forgot password?
</h2>

<p className="mt-5 text-base font-semibold leading-8 text-slate-300">
Enter your work email and we will send a secure password reset
link for your procurement workspace.
</p>
</div>

<form onSubmit={handleSubmit} className="mt-10 space-y-6">
<label className="block">
<span className="mb-2 block text-xs font-black uppercase tracking-[0.22em] text-slate-400">
Work email
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
{loading ? "Sending secure link..." : "Send Reset Link"}
</button>
</form>

<div className="mt-8 rounded-3xl border border-white/10 bg-[#07111F]/75 p-5">
<p className="text-sm font-semibold leading-6 text-slate-400">
Remember your password?{" "}
<Link href="/login" className="font-black text-[#F5D77B]">
Back to sign in
</Link>
.
</p>
</div>

<div className="mt-5 rounded-2xl border border-white/10 bg-white/[0.035] px-4 py-3">
<p className="text-xs font-bold leading-5 text-slate-400">
🔒 Password recovery protected by Nexus Pavilion Security.
</p>
</div>
</>
) : (
<div className="mt-8">
<div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-emerald-300/20 bg-emerald-400/10 text-2xl text-emerald-300">
✓
</div>

<p className="mt-8 text-xs font-black uppercase tracking-[0.34em] text-[#C8A646]">
Recovery Email Sent
</p>

<h2 className="mt-5 text-4xl font-black tracking-[-0.05em] text-white sm:text-5xl xl:text-[58px]">
Check your inbox.
</h2>

<p className="mt-5 text-base font-semibold leading-8 text-slate-300">
We sent a secure recovery link to{" "}
<span className="font-black text-white">{submittedEmail}</span>.
Use the newest email only and complete the password reset from
the protected link.
</p>

<div className="mt-8 rounded-3xl border border-white/10 bg-[#07111F]/75 p-5">
<p className="text-xs font-black uppercase tracking-[0.24em] text-slate-500">
Next Steps
</p>

<div className="mt-4 space-y-3">
<RecoveryStep label="Open the newest Nexus Pavilion email" />
<RecoveryStep label="Follow the secure reset link" />
<RecoveryStep label="Create your new password" />
</div>
</div>

<div className="mt-8 grid gap-3 sm:grid-cols-2">
<button
type="button"
onClick={() => {
setSent(false);
setError("");
}}
className="h-[56px] rounded-2xl border border-white/10 bg-white/[0.045] px-5 text-sm font-black text-white transition hover:bg-white/[0.08]"
>
Resend Link
</button>

<Link
href="/login"
className="flex h-[56px] items-center justify-center rounded-2xl bg-gradient-to-r from-[#B9902F] via-[#C8A646] to-[#F5D77B] px-5 text-sm font-black uppercase tracking-[0.12em] text-slate-950 shadow-[0_18px_55px_rgba(200,166,70,0.3)] transition hover:scale-[1.01]"
>
Back to Sign In
</Link>
</div>

<p className="mt-6 text-xs font-bold leading-5 text-slate-500">
If you do not see the email, check your spam folder or request a
new link.
</p>
</div>
)}
</section>
</section>
</main>
);
}

function BrandTile() {
return (
<div className="inline-flex rounded-[30px] border border-white/10 bg-white/[0.06] p-2 shadow-[0_22px_70px_rgba(0,0,0,0.42)] backdrop-blur-xl">
<div className="rounded-[24px] border border-white/10 bg-black px-6 py-5">
<Image
src={BRAND_LOGO_SRC}
alt="Nexus Pavilion"
width={240}
height={88}
className="h-[72px] w-auto object-contain sm:h-[82px] xl:h-[88px]"
priority
/>
</div>
</div>
);
}

function RecoveryStep({ label }: { label: string }) {
return (
<div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.045] px-4 py-3">
<span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-[#C8A646]/30 bg-[#C8A646]/10 text-xs text-[#F5D77B]">
✓
</span>
<span className="text-sm font-bold text-slate-300">{label}</span>
</div>
);
}