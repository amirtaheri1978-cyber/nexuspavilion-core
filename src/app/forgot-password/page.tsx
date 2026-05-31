"use client";

import Link from "next/link";
import { useState } from "react";

import { createClient } from "@/lib/supabase/client";

const SITE_URL =
"https://scaling-invention-5g7q4p5rwrwj3vwq7-3000.app.github.dev";

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
<main className="flex min-h-screen items-center justify-center bg-[#f6f6f3] px-6 py-10">
<div className="w-full max-w-md rounded-[32px] border border-black/5 bg-white p-8 shadow-sm">
<p className="text-xs font-black uppercase tracking-[0.35em] text-orange-500">
Nexus Pavilion
</p>

<h1 className="mt-3 text-4xl font-black text-slate-950">
Forgot password?
</h1>

<p className="mt-3 text-sm leading-6 text-slate-600">
Enter your email address and we will send you a secure password reset
link.
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
className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-950 outline-none transition focus:border-slate-950 focus:bg-white"
/>
</label>

{successMessage && (
<div className="rounded-2xl bg-green-50 px-4 py-3 text-sm font-bold text-green-700">
{successMessage}
</div>
)}

{error && (
<div className="rounded-2xl bg-red-50 px-4 py-3 text-sm font-bold text-red-600">
{error}
</div>
)}

<button
type="submit"
disabled={loading}
className="w-full rounded-full bg-slate-950 px-6 py-3 text-sm font-bold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
>
{loading ? "Sending reset link..." : "Send reset link"}
</button>
</form>

<Link
href="/login"
className="mt-6 inline-block text-sm font-bold text-slate-500 hover:text-slate-950"
>
← Back to sign in
</Link>
</div>
</main>
);
}