"use client";

import Link from "next/link";
import { useState } from "react";
import { useParams, useRouter } from "next/navigation";

export default function SubmitQuotePage() {
const router = useRouter();
const params = useParams();

const slug = params.slug as string;

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
body: JSON.stringify({ slug, amount, timeline, message }),
});

const data = await response.json();

setLoading(false);

if (!response.ok) {
setError(data.error || "Could not submit quote.");
return;
}

router.push(`/rfq/${slug}/compare`);
router.refresh();
}

return (
<main className="min-h-screen bg-slate-100 px-8 py-10">
<div className="mx-auto max-w-4xl">
<Link
href={`/rfq/${slug}`}
className="text-sm font-semibold text-slate-600 hover:text-slate-950"
>
← Back to RFQ
</Link>

<section className="mt-8 rounded-3xl border border-slate-200 bg-white p-10">
<p className="text-xs font-black uppercase tracking-[0.35em] text-orange-500">
Supplier Response
</p>

<h1 className="mt-3 text-5xl font-black text-slate-950">
Submit Quote
</h1>

<p className="mt-4 max-w-2xl text-sm text-slate-600">
Submit your pricing, delivery timeline, and proposal notes for this
procurement opportunity.
</p>
</section>

<form
onSubmit={handleSubmit}
className="mt-8 rounded-3xl border border-slate-200 bg-white p-8"
>
<div className="grid gap-6">
<input
type="number"
required
placeholder="Quote amount"
value={amount}
onChange={(event) => setAmount(event.target.value)}
className="rounded-2xl border border-slate-300 px-4 py-3 outline-none"
/>

<input
required
placeholder="Timeline / delivery schedule"
value={timeline}
onChange={(event) => setTimeline(event.target.value)}
className="rounded-2xl border border-slate-300 px-4 py-3 outline-none"
/>

<textarea
required
rows={6}
placeholder="Message / proposal notes"
value={message}
onChange={(event) => setMessage(event.target.value)}
className="rounded-2xl border border-slate-300 px-4 py-3 outline-none"
/>
</div>

{error && (
<div className="mt-6 rounded-2xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-600">
{error}
</div>
)}

<button
type="submit"
disabled={loading}
className="mt-8 rounded-full bg-slate-950 px-6 py-3 text-sm font-bold text-white disabled:opacity-50"
>
{loading ? "Submitting..." : "Submit Quote"}
</button>
</form>
</div>
</main>
);
}