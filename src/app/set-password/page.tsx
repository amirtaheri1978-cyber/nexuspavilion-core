"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";

import { createClient } from "@/lib/supabase/client";

export default function SetPasswordPage() {
const router = useRouter();
const supabase = createClient();

const [password, setPassword] = useState("");
const [confirmPassword, setConfirmPassword] = useState("");

const [loading, setLoading] = useState(false);
const [successMessage, setSuccessMessage] = useState("");
const [error, setError] = useState("");

const passwordIsLongEnough = password.length >= 8;
const passwordsMatch = password.length > 0 && password === confirmPassword;
const formIsReady = passwordIsLongEnough && passwordsMatch;

async function handleSetPassword(event: React.FormEvent<HTMLFormElement>) {
event.preventDefault();

setLoading(true);
setSuccessMessage("");
setError("");

if (!passwordIsLongEnough) {
setLoading(false);
setError("Password must be at least 8 characters.");
return;
}

if (!passwordsMatch) {
setLoading(false);
setError("Passwords do not match.");
return;
}

const { error } = await supabase.auth.updateUser({
password,
});

if (error) {
setLoading(false);
setError(error.message);
return;
}

setSuccessMessage("Password updated successfully. Redirecting to sign in...");

await supabase.auth.signOut();

setTimeout(() => {
router.push("/login");
router.refresh();
}, 1200);
}

return (
<main className="flex min-h-screen items-center justify-center bg-[#f6f6f3] px-6 py-10">
<div className="w-full max-w-md rounded-[32px] border border-black/5 bg-white p-8 shadow-sm">
<p className="text-xs font-black uppercase tracking-[0.35em] text-orange-500">
Nexus Pavilion
</p>

<h1 className="mt-3 text-4xl font-black text-slate-950">
Set new password
</h1>

<p className="mt-3 text-sm leading-6 text-slate-600">
Create a new secure password for your procurement workspace.
</p>

<form onSubmit={handleSetPassword} className="mt-8 space-y-5">
<label className="block">
<span className="mb-2 block text-xs font-black uppercase tracking-[0.2em] text-slate-500">
New password
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
placeholder="Confirm your new password"
value={confirmPassword}
onChange={(event) => setConfirmPassword(event.target.value)}
className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-950 outline-none transition focus:border-slate-950 focus:bg-white"
/>
</label>

<div className="rounded-2xl bg-slate-50 px-4 py-3">
<div className="flex items-center justify-between text-xs font-bold">
<span className="text-slate-600">Minimum 8 characters</span>
<span
className={
passwordIsLongEnough ? "text-green-700" : "text-slate-400"
}
>
{passwordIsLongEnough ? "Ready" : "Pending"}
</span>
</div>

<div className="mt-2 flex items-center justify-between text-xs font-bold">
<span className="text-slate-600">Passwords match</span>
<span className={passwordsMatch ? "text-green-700" : "text-slate-400"}>
{passwordsMatch ? "Ready" : "Pending"}
</span>
</div>
</div>

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
disabled={loading || !formIsReady}
className="w-full rounded-full bg-slate-950 px-6 py-3 text-sm font-bold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
>
{loading ? "Updating password..." : "Update password"}
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