"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { createClient } from "@/lib/supabase/client";

type SignupResponseMessage = {
type: "success" | "error";
text: string;
};

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
setResponseMessage({
type: "error",
text: signupError.message,
});
setLoading(false);
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

setResponseMessage({
type: "error",
text: "Request failed. Please try again.",
});

setLoading(false);
}
}

return (
<main className="min-h-screen bg-[#f6f6f3] px-6 py-10">
<div className="mx-auto grid min-h-[calc(100vh-5rem)] max-w-6xl items-center gap-8 lg:grid-cols-[1fr_440px]">
<section className="rounded-[44px] bg-slate-950 p-10 text-white shadow-sm">
<p className="text-xs font-black uppercase tracking-[0.35em] text-orange-400">
Nexus Pavilion
</p>

<h1 className="mt-5 max-w-3xl text-5xl font-black leading-tight">
Build your procurement workspace from the right foundation.
</h1>

<p className="mt-5 max-w-2xl text-sm leading-7 text-slate-300">
Create your secure account first. Next, you will set up your company
workspace, choose your account type, and activate the correct role
for your organization.
</p>

<div className="mt-8 grid gap-4 md:grid-cols-2">
<FeatureCard
title="No default roles"
description="Your role is assigned only after company setup and account type selection."
/>

<FeatureCard
title="Buyer or supplier ready"
description="Owners, GCs, vendors, suppliers, and consultants follow the right onboarding path."
/>

<FeatureCard
title="Enterprise governance"
description="Workspace ownership and permissions are connected to company identity."
/>

<FeatureCard
title="Soft launch ready"
description="Every account is connected to a real company workspace before entering the platform."
/>
</div>
</section>

<section className="rounded-[40px] border border-black/5 bg-white p-8 shadow-sm">
<Link
href="/"
className="text-sm font-bold text-slate-500 transition hover:text-slate-950"
>
← Back to home
</Link>

<div className="mt-8">
<p className="text-xs font-black uppercase tracking-[0.3em] text-orange-500">
Secure Account
</p>

<h2 className="mt-3 text-4xl font-black text-slate-950">
Create account
</h2>

<p className="mt-3 text-sm leading-6 text-slate-600">
After creating your account, you will be guided to company setup
where your account type and workspace role are assigned.
</p>
</div>

<form onSubmit={handleSignup} className="mt-8 space-y-5">
<label className="block">
<span className="mb-2 block text-xs font-black uppercase tracking-[0.2em] text-slate-500">
Work Email
</span>

<input
type="email"
required
placeholder="you@company.com"
value={email}
onChange={(event) => setEmail(event.target.value)}
disabled={loading}
className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-950 outline-none transition focus:border-slate-950 focus:bg-white disabled:cursor-not-allowed disabled:opacity-60"
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
className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-950 outline-none transition focus:border-slate-950 focus:bg-white disabled:cursor-not-allowed disabled:opacity-60"
/>
</label>

<label className="block">
<span className="mb-2 block text-xs font-black uppercase tracking-[0.2em] text-slate-500">
Confirm Password
</span>

<input
type="password"
required
placeholder="Confirm your password"
value={confirmPassword}
onChange={(event) => setConfirmPassword(event.target.value)}
disabled={loading}
className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-950 outline-none transition focus:border-slate-950 focus:bg-white disabled:cursor-not-allowed disabled:opacity-60"
/>
</label>

<div className="rounded-3xl bg-slate-50 p-5">
<p className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">
Setup Sequence
</p>

<div className="mt-4 space-y-3">
<StatusRow label="Create secure account" ready={formIsReady} />
<StatusRow label="Complete company workspace" ready={false} />
<StatusRow label="Choose account type" ready={false} />
<StatusRow label="Activate correct permissions" ready={false} />
</div>
</div>

<div className="rounded-3xl bg-slate-50 px-4 py-3">
<div className="flex items-center justify-between text-xs font-bold">
<span className="text-slate-600">Minimum 8 characters</span>
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

{responseMessage ? (
<div
className={`rounded-2xl px-4 py-3 text-sm font-bold leading-6 ${
responseMessage.type === "success"
? "bg-green-50 text-green-700"
: "bg-red-50 text-red-600"
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
{loading ? "Creating account..." : "Create Account & Continue"}
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

function FeatureCard({
title,
description,
}: {
title: string;
description: string;
}) {
return (
<div className="rounded-3xl bg-white/10 p-5">
<p className="text-sm font-black text-white">{title}</p>

<p className="mt-2 text-xs font-semibold leading-5 text-slate-400">
{description}
</p>
</div>
);
}

function StatusRow({ label, ready }: { label: string; ready: boolean }) {
return (
<div className="flex items-center justify-between rounded-2xl bg-white px-4 py-3">
<span className="text-xs font-bold text-slate-600">{label}</span>

<span
className={`rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-wide ${
ready ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-400"
}`}
>
{ready ? "Ready" : "Next"}
</span>
</div>
);
}