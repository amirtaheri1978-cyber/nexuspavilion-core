"use client";

import Link from "next/link";
import { useState } from "react";

import { createClient } from "@/lib/supabase/client";

const SITE_URL =
process.env.NEXT_PUBLIC_SITE_URL ||
"https://scaling-invention-5g7q4p5rwrwj3vwq7-3000.app.github.dev";

const SECURITY_SIGNALS = [
"Secure Reset Links",
"Time-Limited Recovery",
"Workspace Protection",
"Role-Based Access",
"Procurement Data Security",
"Identity Governance",
];

const TRUST_ITEMS = [
{
title: "Secure Recovery",
description:
"Password reset links are routed through the platform identity flow and return users to a protected password setup page.",
},
{
title: "Workspace Protection",
description:
"Access recovery protects procurement workspaces, supplier invitations, RFQ data, award controls, and executive intelligence.",
},
{
title: "Enterprise Access Control",
description:
"Nexus Pavilion keeps account recovery aligned with secure workspace access, company roles, and procurement governance.",
},
];

export default function ForgotPasswordPage() {
const supabase = createClient();

const [email, setEmail] = useState("");
const [loading, setLoading] = useState(false);
const [successMessage, setSuccessMessage] = useState("");
const [error, setError] = useState("");

async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
event.preventDefault();

setLoading(true);
setSuccessMessage("");
setError("");

const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
redirectTo: `${SITE_URL}/auth/callback?next=/set-password`,
});

setLoading(false);

if (error) {
setError(error.message);
return;
}

setSuccessMessage(
"Reset link sent. Please check your email and use the newest link only."
);
}

return (
<main className="min-h-screen bg-[#f6f6f3] px-6 py-10">
<div className="mx-auto grid min-h-[calc(100vh-5rem)] max-w-7xl items-center gap-10 lg:grid-cols-[1.15fr_0.85fr]">
<section className="rounded-[42px] border border-black/5 bg-slate-950 p-8 text-white shadow-sm lg:p-12">
<p className="text-xs font-black uppercase tracking-[0.35em] text-orange-400">
Enterprise Identity Recovery
</p>

<h1 className="mt-5 max-w-4xl text-5xl font-black leading-tight lg:text-6xl">
Recover secure access to your procurement workspace.
</h1>

<p className="mt-6 max-w-3xl text-sm font-semibold leading-7 text-slate-300">
Reset your password through a protected identity flow designed for
RFQ management, supplier governance, approved vendor controls, award
intelligence, and executive procurement reporting.
</p>

<div className="mt-8 flex flex-wrap gap-2">
{SECURITY_SIGNALS.map((signal) => (
<span
key={signal}
className="rounded-full border border-white/10 bg-white/10 px-4 py-2 text-xs font-black uppercase tracking-[0.15em] text-slate-200"
>
{signal}
</span>
))}
</div>

<div className="mt-10 grid gap-4 md:grid-cols-3">
<SignalMetric title="Identity" value="Protected" />
<SignalMetric title="Workspace" value="Secured" />
<SignalMetric title="Access" value="Governed" />
</div>

<div className="mt-8 grid gap-4">
{TRUST_ITEMS.map((item) => (
<div
key={item.title}
className="rounded-3xl border border-white/10 bg-white/5 p-5"
>
<p className="text-sm font-black text-white">{item.title}</p>

<p className="mt-2 text-sm font-semibold leading-6 text-slate-400">
{item.description}
</p>
</div>
))}
</div>
</section>

<section className="rounded-[40px] border border-black/5 bg-white p-8 shadow-sm lg:p-10">
<p className="text-xs font-black uppercase tracking-[0.35em] text-orange-500">
Nexus Pavilion
</p>

<h2 className="mt-3 text-4xl font-black text-slate-950">
Forgot password?
</h2>

<p className="mt-3 text-sm font-semibold leading-6 text-slate-600">
Enter your email address and we will send you a secure password
reset link for your procurement workspace.
</p>

<form onSubmit={handleSubmit} className="mt-8 space-y-5">
<label className="block">
<span className="mb-2 block text-xs font-black uppercase tracking-[0.2em] text-slate-500">
Email
</span>

<input
type="email"
required
placeholder="you@company.com"
value={email}
onChange={(event) => setEmail(event.target.value)}
className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm font-semibold text-slate-950 outline-none transition focus:border-slate-950 focus:bg-white"
/>
</label>

{successMessage ? (
<div className="rounded-2xl bg-green-50 px-4 py-3 text-sm font-bold text-green-700">
{successMessage}
</div>
) : null}

{error ? (
<div className="rounded-2xl bg-red-50 px-4 py-3 text-sm font-bold text-red-600">
{error}
</div>
) : null}

<button
type="submit"
disabled={loading}
className="w-full rounded-full bg-slate-950 px-6 py-4 text-sm font-black text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
>
{loading ? "Sending reset link..." : "Send reset link"}
</button>
</form>

<div className="mt-6 rounded-3xl bg-slate-50 p-5">
<p className="text-sm font-semibold leading-6 text-slate-600">
Remember your password?{" "}
<Link href="/login" className="font-black text-orange-600">
Back to sign in
</Link>
.
</p>
</div>

<div className="mt-6 grid gap-3 sm:grid-cols-2">
<AuthTrustCard title="Secure Recovery" value="Protected flow" />
<AuthTrustCard title="Access Control" value="Workspace aware" />
</div>
</section>
</div>
</main>
);
}

function SignalMetric({ title, value }: { title: string; value: string }) {
return (
<div className="rounded-3xl bg-white/10 p-5">
<p className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">
{title}
</p>

<p className="mt-2 text-2xl font-black text-white">{value}</p>
</div>
);
}

function AuthTrustCard({ title, value }: { title: string; value: string }) {
return (
<div className="rounded-2xl border border-slate-200 bg-white p-4">
<p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">
{title}
</p>

<p className="mt-2 text-sm font-black text-slate-950">{value}</p>
</div>
);
}