"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
const router = useRouter();
const supabase = createClient();

const [email, setEmail] = useState("");
const [password, setPassword] = useState("");
const [loading, setLoading] = useState(false);
const [error, setError] = useState("");

async function handleLogin(event: React.FormEvent<HTMLFormElement>) {
event.preventDefault();

setLoading(true);
setError("");

const { error } = await supabase.auth.signInWithPassword({
email,
password,
});

setLoading(false);

if (error) {
setError(error.message);
return;
}

router.push("/dashboard");
router.refresh();
}

return (
<main className="flex min-h-screen items-center justify-center bg-slate-100 p-8">
<section className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
<p className="text-sm font-semibold uppercase tracking-wide text-amber-700">
Nexus Pavilion
</p>

<h1 className="mt-3 text-3xl font-bold text-slate-900">Login</h1>

{error && (
<p className="mt-6 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
{error}
</p>
)}

<form onSubmit={handleLogin} className="mt-8 space-y-5">
<input
type="email"
value={email}
onChange={(event) => setEmail(event.target.value)}
placeholder="Email address"
required
className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-slate-900"
/>

<input
type="password"
value={password}
onChange={(event) => setPassword(event.target.value)}
placeholder="Password"
required
className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-slate-900"
/>

<button
type="submit"
disabled={loading}
className="w-full rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-60"
>
{loading ? "Signing in..." : "Login"}
</button>
</form>
</section>
</main>
);
}