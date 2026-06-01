"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";

import { createClient } from "@/lib/supabase/client";

export default function SignupPage() {
const router = useRouter();
const supabase = createClient();

const [email, setEmail] = useState("");
const [password, setPassword] = useState("");
const [confirmPassword, setConfirmPassword] = useState("");

const [loading, setLoading] = useState(false);
const [message, setMessage] = useState("");
const [error, setError] = useState("");

const passwordIsReady = password.length >= 8;
const passwordsMatch = password.length > 0 && password === confirmPassword;
const formIsReady = email.trim().length > 0 && passwordIsReady && passwordsMatch;

async function handleSignup(event: React.FormEvent<HTMLFormElement>) {
event.preventDefault();

setLoading(true);
setMessage("");
setError("");

const normalizedEmail = email.trim().toLowerCase();

if (!passwordIsReady) {
setLoading(false);
setError("Password must be at least 8 characters.");
return;
}

if (!passwordsMatch) {
setLoading(false);
setError("Passwords do not match.");
return;
}

const { data, error: signupError } = await supabase.auth.signUp({
email: normalizedEmail,
password,
});

if (signupError) {
setLoading(false);
setError(signupError.message);
return;
}

const user = data.user;

if (user) {
await supabase.from("profiles").upsert({
id: user.id,
email: normalizedEmail,
role: "buyer",
});
}

const { error: signInError } = await supabase.auth.signInWithPassword({
email: normalizedEmail,
password,
});

setLoading(false);

if (signInError) {
setMessage(
"Account created. Please confirm your email if required, then sign in."
);
return;
}

router.push("/dashboard");
router.refresh();
}

return (
<main className="flex min-h-screen items-center justify-center bg-[#f6f6f3] px-6 py-10">
<div className="w-full max-w-md rounded-[32px] border border-black/5 bg-white p-8 shadow-sm">
<p className="text-xs font-black uppercase tracking-[0.35em] text-orange-500">
Nexus Pavilion
</p>

<h1 className="mt-3 text-4xl font-black text-slate-950">
Create account
</h1>

<p className="mt-3 text-sm leading-6 text-slate-600">
Start your secure construction procurement workspace.
</p>

<form onSubmit={handleSignup} className="mt-8 space-y-5">
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
<span className="mb-2 block text-xs font-black uppercase tracking-[0.2em] text-slate-500">
Password
</span>

<input
type="password"
required
placeholder="At least 8 characters"
value={password}
onChange={(event) => setPassword(event.target.value)}
className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-950 outline-none transition focus:border-slate-950 focus:bg-white"
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
className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-950 outline-none transition focus:border-slate-950 focus:bg-white"
/>
</label>

<div className="rounded-2xl bg-slate-50 px-4 py-3">
<div className="flex items-center justify-between text-xs font-bold">
<span className="text-slate-600">Minimum 8 characters</span>
<span className={passwordIsReady ? "text-green-700" : "text-slate-400"}>
{passwordIsReady ? "Ready" : "Pending"}
</span>
</div>

<div className="mt-2 flex items-center justify-between text-xs font-bold">
<span className="text-slate-600">Passwords match</span>
<span className={passwordsMatch ? "text-green-700" : "text-slate-400"}>
{passwordsMatch ? "Ready" : "Pending"}
</span>
</div>
</div>

{message && (
<div className="rounded-2xl bg-green-50 px-4 py-3 text-sm font-bold leading-6 text-green-700">
{message}
</div>
)}

{error && (
<div className="rounded-2xl bg-red-50 px-4 py-3 text-sm font-bold leading-6 text-red-600">
{error}
</div>
)}

<button
type="submit"
disabled={loading || !formIsReady}
className="w-full rounded-full bg-slate-950 px-6 py-3 text-sm font-bold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
>
{loading ? "Creating account..." : "Create account"}
</button>
</form>

<p className="mt-6 text-sm font-semibold text-slate-600">
Already have an account?{" "}
<Link href="/login" className="font-black text-orange-600">
Sign in
</Link>
</p>
</div>
</main>
);
}