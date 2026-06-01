"use client";

import Link from "next/link";
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
<main className="flex min-h-screen items-center justify-center bg-[#f6f6f3] px-6 py-10">
<div className="w-full max-w-md rounded-[32px] border border-black/5 bg-white p-8 shadow-sm">
<p className="text-xs font-black uppercase tracking-[0.35em] text-orange-500">
Nexus Pavilion
</p>

<h1 className="mt-3 text-4xl font-black text-slate-950">Sign in</h1>

<p className="mt-3 text-sm leading-6 text-slate-600">
Access your secure construction procurement workspace.
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
className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-950 outline-none transition focus:border-slate-950 focus:bg-white"
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
className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-950 outline-none transition focus:border-slate-950 focus:bg-white"
/>
</label>

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
</div>
</main>
);
}