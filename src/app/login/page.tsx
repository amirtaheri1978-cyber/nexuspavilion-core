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

const { data, error } = await supabase.auth.signInWithPassword({
email,
password,
});

if (error) {
setLoading(false);
setError(error.message);
return;
}

const user = data.user;

if (user) {
await supabase.from("profiles").upsert({
id: user.id,
email: user.email,
role: "buyer",
});
}

setLoading(false);

router.push("/dashboard");
router.refresh();
}

return (
<main className="flex min-h-screen items-center justify-center bg-slate-100 px-6">
<div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
<p className="text-xs font-black uppercase tracking-[0.35em] text-orange-500">
Nexus Pavilion
</p>

<h1 className="mt-3 text-4xl font-black text-slate-950">
Sign in
</h1>

<p className="mt-3 text-sm text-slate-600">
Access your secure construction procurement workspace.
</p>

<form onSubmit={handleLogin} className="mt-8 space-y-5">
<input
type="email"
required
placeholder="Email"
value={email}
onChange={(event) => setEmail(event.target.value)}
className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-slate-950"
/>

<input
type="password"
required
placeholder="Password"
value={password}
onChange={(event) => setPassword(event.target.value)}
className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-slate-950"
/>

{error && (
<div className="rounded-2xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-600">
{error}
</div>
)}

<button
type="submit"
disabled={loading}
className="w-full rounded-full bg-slate-950 px-6 py-3 text-sm font-bold text-white disabled:opacity-50"
>
{loading ? "Signing in..." : "Sign in"}
</button>
</form>
</div>
</main>
);
}