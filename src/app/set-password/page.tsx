"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { createClient } from "@/lib/supabase/client";
import Image from "next/image";

const BRAND_LOGO_SRC = "/branding/logo-horizontal-512.png";

const SECURITY_SIGNALS = [
"Protected Password Setup",
"Identity Verification",
"Workspace Re-Access",
"Enterprise Session Control",
];

const inputClassName =
"h-[60px] w-full rounded-2xl border border-white/10 bg-[#07111F] px-5 text-sm font-semibold text-white outline-none transition placeholder:text-slate-500 focus:border-[#C8A646] focus:bg-[#081827] focus:ring-4 focus:ring-[#C8A646]/15 disabled:cursor-not-allowed disabled:opacity-60";

function getFriendlyPasswordUpdateError(message: string) {
const normalized = message.toLowerCase();

if (normalized.includes("weak") || normalized.includes("password")) {
return "Please choose a stronger password that meets the security requirements.";
}

if (
normalized.includes("expired") ||
normalized.includes("invalid") ||
normalized.includes("session")
) {
return "This recovery session is no longer valid. Please request a new password reset link.";
}

if (normalized.includes("rate") || normalized.includes("too many")) {
return "Too many password update attempts. Please wait a moment and try again.";
}

if (normalized.includes("network") || normalized.includes("fetch")) {
return "We could not reach the secure password service. Please check your connection and try again.";
}

return "We could not update your password securely. Please try again.";
}

function getPasswordStrength(password: string) {
const rules = [
password.length >= 8,
/[A-Z]/.test(password),
/[a-z]/.test(password),
/\d/.test(password),
/[^A-Za-z0-9]/.test(password),
];

const score = rules.filter(Boolean).length;

if (score <= 1) {
return {
label: "Weak",
width: "w-1/4",
tone: "bg-red-400",
};
}

if (score <= 3) {
return {
label: "Medium",
width: "w-2/4",
tone: "bg-amber-300",
};
}

if (score === 4) {
return {
label: "Strong",
width: "w-3/4",
tone: "bg-emerald-400",
};
}

return {
label: "Excellent",
width: "w-full",
tone: "bg-[#C8A646]",
};
}

export default function SetPasswordPage() {
const router = useRouter();
const supabase = useMemo(() => createClient(), []);

const [password, setPassword] = useState("");
const [confirmPassword, setConfirmPassword] = useState("");

const [showPassword, setShowPassword] = useState(false);
const [showConfirmPassword, setShowConfirmPassword] = useState(false);
const [loading, setLoading] = useState(false);
const [completed, setCompleted] = useState(false);
const [error, setError] = useState("");

const passwordRules = [
{
label: "Minimum 8 characters",
ready: password.length >= 8,
},
{
label: "Uppercase letter",
ready: /[A-Z]/.test(password),
},
{
label: "Lowercase letter",
ready: /[a-z]/.test(password),
},
{
label: "Number",
ready: /\d/.test(password),
},
{
label: "Special character",
ready: /[^A-Za-z0-9]/.test(password),
},
];

const passwordStrength = getPasswordStrength(password);
const passwordIsReady = passwordRules.every((rule) => rule.ready);
const passwordsMatch = password.length > 0 && password === confirmPassword;
const formIsReady = passwordIsReady && passwordsMatch;

async function handleSetPassword(event: React.FormEvent<HTMLFormElement>) {
event.preventDefault();

if (loading) return;

setLoading(true);
setError("");

if (!passwordIsReady) {
setLoading(false);
setError(
"Please choose a password that meets all enterprise security requirements."
);
return;
}

if (!passwordsMatch) {
setLoading(false);
setError("The password confirmation does not match. Please review both fields.");
return;
}

try {
const { error } = await supabase.auth.updateUser({
password,
});

if (error) {
setError(getFriendlyPasswordUpdateError(error.message));
return;
}

setCompleted(true);

await supabase.auth.signOut();

window.setTimeout(() => {
router.push("/login");
router.refresh();
}, 1400);
} catch {
setError(
"A secure password update connection could not be completed. Please try again."
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
Enterprise Password Reset
</p>

<h1 className="mt-5 max-w-2xl text-4xl font-black tracking-[-0.05em] text-white sm:text-5xl xl:text-[64px] xl:leading-[0.98]">
Set a new secure password for your workspace.
</h1>

<p className="mt-7 max-w-2xl text-base font-semibold leading-8 text-slate-300 xl:text-lg">
Complete your protected password reset and restore access to your
company workspace, RFQ governance, supplier intelligence, and
executive procurement reporting.
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
Secure Password Policy
</p>
<p className="mt-3 text-sm font-semibold leading-6 text-slate-300">
Use a strong password that is unique to Nexus Pavilion. You will be
signed out after the update and asked to sign in again securely.
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

{!completed ? (
<>
<div className="mt-8">
<p className="text-xs font-black uppercase tracking-[0.34em] text-[#C8A646]">
Secure Password Setup
</p>

<h2 className="mt-5 text-4xl font-black tracking-[-0.05em] text-white sm:text-5xl xl:text-[58px]">
Set new password.
</h2>

<p className="mt-5 text-base font-semibold leading-8 text-slate-300">
Create a new enterprise-grade password before restoring access
to your procurement workspace.
</p>
</div>

<form onSubmit={handleSetPassword} className="mt-10 space-y-6">
<label className="block">
<span className="mb-2 block text-xs font-black uppercase tracking-[0.22em] text-slate-400">
New password
</span>

<div className="relative">
<input
type={showPassword ? "text" : "password"}
required
placeholder="Create a secure password"
value={password}
onChange={(event) => setPassword(event.target.value)}
disabled={loading}
className={`${inputClassName} pr-20`}
/>

<button
type="button"
onClick={() => setShowPassword((current) => !current)}
disabled={loading}
className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-black uppercase tracking-wide text-[#F5D77B] transition hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
>
{showPassword ? "Hide" : "Show"}
</button>
</div>
</label>

<label className="block">
<span className="mb-2 block text-xs font-black uppercase tracking-[0.22em] text-slate-400">
Confirm password
</span>

<div className="relative">
<input
type={showConfirmPassword ? "text" : "password"}
required
placeholder="Confirm your secure password"
value={confirmPassword}
onChange={(event) => setConfirmPassword(event.target.value)}
disabled={loading}
className={`${inputClassName} pr-20`}
/>

<button
type="button"
onClick={() =>
setShowConfirmPassword((current) => !current)
}
disabled={loading}
className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-black uppercase tracking-wide text-[#F5D77B] transition hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
>
{showConfirmPassword ? "Hide" : "Show"}
</button>
</div>
</label>

<div className="rounded-3xl border border-white/10 bg-[#07111F]/75 p-5">
<div className="flex items-center justify-between gap-4">
<p className="text-xs font-black uppercase tracking-[0.22em] text-slate-500">
Password Strength
</p>
<p className="text-xs font-black text-[#F5D77B]">
{passwordStrength.label}
</p>
</div>

<div className="mt-4 h-2 overflow-hidden rounded-full bg-white/10">
<div
className={`h-full rounded-full transition-all ${passwordStrength.width} ${passwordStrength.tone}`}
/>
</div>

<div className="mt-5 grid gap-3 sm:grid-cols-2">
{passwordRules.map((rule) => (
<CheckRow
key={rule.label}
label={rule.label}
ready={rule.ready}
/>
))}

<CheckRow label="Passwords match" ready={passwordsMatch} />
</div>
</div>

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
disabled={loading || !formIsReady}
className="h-[60px] w-full rounded-2xl bg-gradient-to-r from-[#B9902F] via-[#C8A646] to-[#F5D77B] px-6 text-sm font-black uppercase tracking-[0.14em] text-slate-950 shadow-[0_22px_65px_rgba(200,166,70,0.34)] transition hover:shadow-[0_28px_80px_rgba(200,166,70,0.42)] disabled:cursor-not-allowed disabled:opacity-50"
>
{loading ? "Updating secure password..." : "Update Password"}
</button>
</form>

<div className="mt-5 rounded-2xl border border-white/10 bg-white/[0.035] px-4 py-3">
<p className="text-xs font-bold leading-5 text-slate-400">
🔒 Password update protected by Nexus Pavilion Security.
</p>
</div>
</>
) : (
<div className="mt-8">
<div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-emerald-300/20 bg-emerald-400/10 text-2xl text-emerald-300">
✓
</div>

<p className="mt-8 text-xs font-black uppercase tracking-[0.34em] text-[#C8A646]">
Password Updated
</p>

<h2 className="mt-5 text-4xl font-black tracking-[-0.05em] text-white sm:text-5xl xl:text-[58px]">
Secure access restored.
</h2>

<p className="mt-5 text-base font-semibold leading-8 text-slate-300">
Your password has been updated successfully. For security, you
will be signed out and redirected to sign in again with your new
password.
</p>

<div className="mt-8 rounded-3xl border border-white/10 bg-[#07111F]/75 p-5">
<p className="text-xs font-black uppercase tracking-[0.24em] text-slate-500">
Next Step
</p>
<p className="mt-3 text-sm font-semibold leading-6 text-slate-300">
Sign in again to continue to your enterprise procurement
workspace.
</p>
</div>

<Link
href="/login"
className="mt-8 flex h-[56px] items-center justify-center rounded-2xl bg-gradient-to-r from-[#B9902F] via-[#C8A646] to-[#F5D77B] px-5 text-sm font-black uppercase tracking-[0.12em] text-slate-950 shadow-[0_18px_55px_rgba(200,166,70,0.3)] transition"
>
Back to Sign In
</Link>
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
priority
className="h-[72px] w-auto object-contain sm:h-[82px] xl:h-[88px]"
/>
</div>
</div>
);
}

function CheckRow({ label, ready }: { label: string; ready: boolean }) {
return (
<div className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.035] px-4 py-3 text-xs font-bold">
<span className="text-slate-300">{label}</span>
<span className={ready ? "text-emerald-300" : "text-slate-500"}>
{ready ? "Ready" : "Pending"}
</span>
</div>
);
}