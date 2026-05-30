"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";

export default function SubmitQuotePage() {
const router = useRouter();
const params = useParams();

const slug = String(params.slug);

const [amount, setAmount] = useState("");
const [timeline, setTimeline] = useState("");
const [message, setMessage] = useState("");

const [loading, setLoading] = useState(false);
const [error, setError] = useState("");

async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
event.preventDefault();

setLoading(true);
setError("");

const response = await fetch("/api/quotes", {
method: "POST",
headers: {
"Content-Type": "application/json",
},
body: JSON.stringify({
slug,
amount,
timeline,
message,
}),
});

const text = await response.text();
const data = text ? JSON.parse(text) : null;

setLoading(false);

if (!response.ok) {
setError(data?.error || "Failed to submit quote");
return;
}

router.push(`/rfq/${slug}`);
router.refresh();
}

return (
<main className="min-h-screen bg-[#f6f6f3] px-8 py-10">
<div className="mx-auto max-w-3xl">
<button
onClick={() => router.back()}
className="text-sm font-semibold text-slate-500 hover:text-slate-950"
>
← Back
</button>

<section className="mt-8 rounded-[32px] border border-black/5 bg-white p-10">
<p className="text-xs font-black uppercase tracking-[0.35em] text-orange-500">
Supplier Response
</p>

<h1 className="mt-3 text-5xl font-black text-slate-950">
Submit Quote
</h1>

<p className="mt-4 text-sm text-slate-600">
Submit your bid amount, delivery timeline, and procurement note.
</p>

<form onSubmit={handleSubmit} className="mt-8 space-y-5">
<input
required
type="number"
placeholder="Amount"
value={amount}
onChange={(event) => setAmount(event.target.value)}
className="w-full rounded-2xl border border-slate-200 px-5 py-4 text-sm font-semibold outline-none focus:border-slate-950"
/>

<input
required
type="text"
placeholder="Timeline, e.g. Q3 2026 or 6 weeks"
value={timeline}
onChange={(event) => setTimeline(event.target.value)}
className="w-full rounded-2xl border border-slate-200 px-5 py-4 text-sm font-semibold outline-none focus:border-slate-950"
/>

<textarea
required
placeholder="Message"
value={message}
onChange={(event) => setMessage(event.target.value)}
rows={5}
className="w-full rounded-2xl border border-slate-200 px-5 py-4 text-sm font-semibold outline-none focus:border-slate-950"
/>

{error && (
<div className="rounded-2xl bg-red-50 px-5 py-4 text-sm font-bold text-red-600">
{error}
</div>
)}

<button
type="submit"
disabled={loading}
className="w-full rounded-full bg-slate-950 px-6 py-4 text-sm font-black text-white disabled:opacity-50"
>
{loading ? "Submitting..." : "Submit Quote"}
</button>
</form>
</section>
</div>
</main>
);
}