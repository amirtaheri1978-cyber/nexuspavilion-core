"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";

import { createClient } from "@/lib/supabase/client";

const PLATFORM_SIGNALS = [
"RFQ Management",
"Approved Vendor Lists",
"Blind Bidding",
"Supplier Intelligence",
"Award Analytics",
"Executive Governance",
];

const TRUST_ITEMS = [
{
title: "Procurement Governance",
description:
"Control RFQ access, supplier invitations, commercial visibility, and award decisions through structured workflows.",
},
{
title: "Supplier Network Intelligence",
description:
"Evaluate companies using quote activity, award history, approved vendor status, and procurement performance signals.",
},
{
title: "Executive Decision Layer",
description:
"Transform RFQ activity into board-ready insights for risk, savings, award confidence, and supplier strategy.",
},
];

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

setLoading(true);
setError("");

const normalizedEmail = email.trim().toLowerCase();

const { data, error } = await supabase.auth.signInWithPassword({
email: normalizedEmail,
password,
});

if (error) {
setLoading(false);
setError(error.message);
return;
}

const user = data.user;

if (user) {
await syncUserProfile(user.id, user.email ?? null);
}

setLoading(false);

router.push("/dashboard");
router.refresh();
}

return (
<main className="min-h-screen bg-[#f6f6f3] px-6 py-10">
<div className="mx-auto grid min-h-[calc(100vh-5rem)] max-w-7xl items-center gap-10 lg:grid-cols-[1.15fr_0.85fr]">
<section className="rounded-[42px] border border-black/5 bg-slate-950 p-8 text-white shadow-sm lg:p-12">
<p className="text-xs font-black uppercase tracking-[0.35em] text-orange-400">
Enterprise Procurement Intelligence
</p>

<h1 className="mt-5 max-w-4xl text-5xl font-black leading-tight lg:text-6xl">
Secure access to the Nexus Pavilion command center.
</h1>

<p className="mt-6 max-w-3xl text-sm font-semibold leading-7 text-slate-300">
Manage RFQs, approved vendor lists, supplier invitations, blind
bidding controls, quote intelligence, award decisions, and executive
procurement reporting from one secure workspace.
</p>

<div className="mt-8 flex flex-wrap gap-2">
{PLATFORM_SIGNALS.map((signal) => (
<span
key={signal}
className="rounded-full border border-white/10 bg-white/10 px-4 py-2 text-xs font-black uppercase tracking-[0.15em] text-slate-200"
>
{signal}
</span>
))}
</div>

<div className="mt-10 grid gap-4 md:grid-cols-3">
<SignalMetric title="RFQs" value="Controlled" />
<SignalMetric title="Suppliers" value="Qualified" />
<SignalMetric title="Awards" value="Governed" />
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
Sign in
</h2>

<p className="mt-3 text-sm font-semibold leading-6 text-slate-600">
Access your secure construction and professional services
procurement workspace.
</p>

<form onSubmit={handleLogin} className="mt-8 space-y-5">
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

<label className="block">
<div className="mb-2 flex items-center justify-between gap-4">
<span className="block text-xs font-black uppercase tracking-[0.2em] text-slate-500">
Password
</span>

<Link
href="/forgot-password"
className="text-xs font-black text-orange-600 hover:text-orange-700"
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
className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm font-semibold text-slate-950 outline-none transition focus:border-slate-950 focus:bg-white"
/>
</label>

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
{loading ? "Signing in..." : "Sign in"}
</button>
</form>

<div className="mt-6 rounded-3xl bg-slate-50 p-5">
<p className="text-sm font-semibold leading-6 text-slate-600">
New to Nexus Pavilion?{" "}
<Link href="/signup" className="font-black text-orange-600">
Create an account
</Link>{" "}
or use your company invitation link to join a workspace.
</p>
</div>

<div className="mt-6 grid gap-3 sm:grid-cols-2">
<AuthTrustCard title="Secure Workspace" value="Role-based access" />
<AuthTrustCard title="Procurement Ready" value="RFQ governance" />
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