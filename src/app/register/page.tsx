"use client";

import { useState } from "react";

import Link from "next/link";
import { useRouter } from "next/navigation";

import { createClient } from "@/lib/supabase/client";

export default function RegisterPage() {
const router = useRouter();

const supabase = createClient();

const [email, setEmail] = useState("");
const [password, setPassword] = useState("");

const [loading, setLoading] = useState(false);

const [error, setError] = useState("");

async function handleRegister(e: React.FormEvent) {
e.preventDefault();

setLoading(true);

setError("");

const { error } = await supabase.auth.signUp({
email,
password,
});

if (error) {
setError(error.message);

setLoading(false);

return;
}

router.push("/dashboard");

router.refresh();
}

return (
<main className="flex min-h-screen items-center justify-center bg-slate-100 px-6">
<form
onSubmit={handleRegister}
className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-10 shadow-sm"
>
<div className="mb-8">
<p className="mb-2 text-sm font-semibold uppercase tracking-[0.2em] text-amber-700">
Nexus Pavilion
</p>

<h1 className="text-3xl font-bold text-slate-900">
Create account
</h1>
</div>

<div className="space-y-5">
<input
type="email"
value={email}
onChange={(e) => setEmail(e.target.value)}
placeholder="Email address"
required
className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none transition focus:border-slate-400"
/>

<input
type="password"
value={password}
onChange={(e) => setPassword(e.target.value)}
placeholder="Password"
required
className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none transition focus:border-slate-400"
/>
</div>

{error && (
<p className="mt-4 text-sm text-red-500">
{error}
</p>
)}

<button
type="submit"
disabled={loading}
className="mt-6 w-full rounded-xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-50"
>
{loading ? "Creating account..." : "Create account"}
</button>

<div className="mt-6 text-center text-sm text-slate-500">
Already have an account?{" "}
<Link
href="/login"
className="font-medium text-slate-900 hover:underline"
>
Login
</Link>
</div>
</form>
</main>
);
}