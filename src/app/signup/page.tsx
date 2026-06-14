"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { createClient } from "@/lib/supabase/client";

type SignupResponseMessage = {
type: "success" | "error";
text: string;
};

const platformCapabilities = [
"Company-based onboarding",
"Buyer and supplier paths",
"Permission-ready workspace",
"Procurement intelligence foundation",
];

const setupSteps = [
"Create secure account",
"Complete company workspace",
"Choose account type",
"Activate correct permissions",
];

function normalizeEmail(value: string) {
return value.trim().toLowerCase();
}

export default function SignupPage() {
const router = useRouter();
const supabase = useMemo(() => createClient(), []);

const [email, setEmail] = useState("");
const [password, setPassword] = useState("");
const [confirmPassword, setConfirmPassword] = useState("");

const [loading, setLoading] = useState(false);
const [responseMessage, setResponseMessage] =
useState<SignupResponseMessage | null>(null);

const normalizedEmail = normalizeEmail(email);
const passwordIsReady = password.length >= 8;
const passwordsMatch = password.length > 0 && password === confirmPassword;

const formIsReady =
normalizedEmail.length > 0 && passwordIsReady && passwordsMatch;

async function handleSignup(event: React.FormEvent<HTMLFormElement>) {
event.preventDefault();

setLoading(true);
setResponseMessage(null);

if (!passwordIsReady) {
setLoading(false);
setResponseMessage({
type: "error",
text: "Password must be at least 8 characters.",
});
return;
}

if (!passwordsMatch) {
setLoading(false);
setResponseMessage({
type: "error",
text: "Passwords do not match.",
});
return;
}

try {
const { error: signupError } = await supabase.auth.signUp({
email: normalizedEmail,
password,
options: {
emailRedirectTo: `${window.location.origin}/create-company`,
},
});

if (signupError) {
setLoading(false);
setResponseMessage({
type: "error",
text: signupError.message,
});
return;
}

const { error: signInError } = await supabase.auth.signInWithPassword({
email: normalizedEmail,
password,
});

setLoading(false);

if (signInError) {
setResponseMessage({
type: "success",
text: "Account created. Please confirm your email if required, then sign in to complete company setup.",
});
return;
}

router.push("/create-company");
router.refresh();
} catch (error) {
console.error(error);

setLoading(false);
setResponseMessage({
type: "error",
text: "Request failed. Please try again.",
});
}
}

return (
<main className="min-h-screen bg-[#f6f6f3] px-4 py-6 text-slate-950 sm:px-6 lg:px-8 lg:py-10">
<div className="mx-auto grid min-h-[calc(100vh-5rem)] max-w-7xl items-center gap-6 lg:grid-cols-[1.12fr_0.88fr]">
<section className="overflow-hidden rounded-[36px] border border-black/5 bg-slate-950 text-white shadow-sm">
<div className="p-6 sm:p-10 lg:p-14">
<p className="text-xs font-black uppercase tracking-[0.32em] text-orange-400">
Nexus Pavilion Access
</p>

<h1 className="mt-5 max-w-4xl text-5xl font-black tracking-[-0.055em] text-white sm:text-6xl lg:text-7xl">
Build your procurement workspace from the right foundation.
</h1>

<p className="mt-6 max-w-2xl text-base leading-8 text-slate-300 sm:text-lg">
Create a secure account, connect it to a real company workspace,
and activate the correct role before entering the procurement
intelligence platform.
</p>

<div className="mt-8 grid gap-3 sm:grid-cols-2">
{platformCapabilities.map((capability) => (
<div
key={capability}
className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-black text-white"
>
✓ {capability}
</div>
))}
</div>
</div>
</section>

<section className="rounded-[36px] border border-black/5 bg-white p-5 shadow-sm sm:p-8 lg:p-10">
<Link
href="/"
className="inline-flex text-sm font-bold text-slate-500 transition hover:text-slate-950"
>
← Back to home
</Link>

<div className="mt-8">
<p className="text-xs font-black uppercase tracking-[0.32em] text-orange-500">
Secure account
</p>

<h2 className="mt-3 text-4xl font-black tracking-[-0.04em] text-slate-950 sm:text-5xl">
Create account.
</h2>

<p className="mt-4 text-sm leading-7 text-slate-600">
Your account is created first. Company setup, account type, and
permissions are assigned in the next step.
</p>
</div>

<form onSubmit={handleSignup} className="mt-8 space-y-5">
<label className="block">
<span className="mb-2 block text-xs font-black uppercase tracking-[0.2em] text-slate-500">
Work email
</span>
<input
type="email"
required
placeholder="you@company.com"
value={email}
onChange={(event) => setEmail(event.target.value)}
disabled={loading}
className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-950 outline-none transition focus:border-slate-950 focus:bg-white focus:ring-4 focus:ring-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
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
disabled={loading}
className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-950 outline-none transition focus:border-slate-950 focus:bg-white focus:ring-4 focus:ring-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
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
onChange={(event) => setConfirmPassword(event.target.value)}
disabled={loading}
className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-950 outline-none transition focus:border-slate-950 focus:bg-white focus:ring-4 focus:ring-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
/>
</label>

<div className="rounded-3xl border border-slate-100 bg-slate-50 p-5">
<p className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">
Setup sequence
</p>

<div className="mt-4 space-y-3">
{setupSteps.map((step, index) => (
<StatusRow
key={step}
label={step}
ready={index === 0 && formIsReady}
/>
))}
</div>
</div>

<div className="rounded-3xl border border-slate-100 bg-slate-50 px-4 py-3">
<CheckRow label="Minimum 8 characters" ready={passwordIsReady} />
<div className="mt-2">
<CheckRow label="Passwords match" ready={passwordsMatch} />
</div>
</div>

{responseMessage ? (
<div
role="status"
className={`rounded-2xl border px-4 py-3 text-sm font-bold leading-6 ${
responseMessage.type === "success"
? "border-emerald-200 bg-emerald-50 text-emerald-800"
: "border-red-200 bg-red-50 text-red-700"
}`}
>
{responseMessage.text}
</div>
) : null}

<button
type="submit"
disabled={loading || !formIsReady}
className="w-full rounded-full bg-slate-950 px-6 py-4 text-sm font-black text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
>
{loading ? "Creating secure account..." : "Create Account & Continue"}
</button>
</form>

<p className="mt-6 text-sm font-semibold text-slate-600">
Already have an account?{" "}
<Link href="/login" className="font-black text-orange-600">
Sign in
</Link>
</p>
</section>
</div>
</main>
);
}

function StatusRow({ label, ready }: { label: string; ready: boolean }) {
return (
<div className="flex items-center justify-between rounded-2xl bg-white px-4 py-3">
<span className="text-xs font-bold text-slate-600">{label}</span>

<span
className={`rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-wide ${
ready ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-400"
}`}
>
{ready ? "Ready" : "Next"}
</span>
</div>
);
}

function CheckRow({ label, ready }: { label: string; ready: boolean }) {
return (
<div className="flex items-center justify-between text-xs font-bold">
<span className="text-slate-600">{label}</span>
<span className={ready ? "text-emerald-700" : "text-slate-400"}>
{ready ? "Ready" : "Pending"}
</span>
</div>
);
}