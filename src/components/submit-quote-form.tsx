"use client";

import { useState } from "react";

import { createClient } from "@/lib/supabase/client";

type SubmitQuoteFormProps = {
rfqId: string;
};

export default function SubmitQuoteForm({ rfqId }: SubmitQuoteFormProps) {
const supabase = createClient();

const [amount, setAmount] = useState("");
const [timeline, setTimeline] = useState("");
const [message, setMessage] = useState("");

const [submitting, setSubmitting] = useState(false);
const [success, setSuccess] = useState("");
const [error, setError] = useState("");

async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
event.preventDefault();

setSubmitting(true);
setSuccess("");
setError("");

const {
data: { user },
} = await supabase.auth.getUser();

if (!user) {
setError("Please login before submitting a quote.");
setSubmitting(false);
return;
}

const { data: companies } = await supabase
.from("companies")
.select("id")
.eq("user_id", user.id)
.limit(1);

const companyId = companies?.[0]?.id ?? null;

const { error } = await supabase.from("quotes").insert({
rfq_id: rfqId,
company_id: companyId,
user_id: user.id,
amount,
timeline,
message,
status: "submitted",
});

if (error) {
console.error(error);
setError("Could not submit quote.");
setSubmitting(false);
return;
}

setAmount("");
setTimeline("");
setMessage("");
setSuccess("Quote submitted successfully.");
setSubmitting(false);
}

return (
<section className="mt-10 rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
<p className="text-sm font-semibold uppercase tracking-[0.2em] text-orange-500">
Supplier Response
</p>

<h2 className="mt-3 text-3xl font-black text-slate-900">
Submit Quote
</h2>

<form onSubmit={handleSubmit} className="mt-6 space-y-5">
<input
value={amount}
onChange={(event) => setAmount(event.target.value)}
placeholder="Quote amount"
required
className="w-full rounded-2xl border border-slate-200 px-5 py-4 outline-none focus:border-slate-900"
/>

<input
value={timeline}
onChange={(event) => setTimeline(event.target.value)}
placeholder="Timeline / delivery schedule"
required
className="w-full rounded-2xl border border-slate-200 px-5 py-4 outline-none focus:border-slate-900"
/>

<textarea
value={message}
onChange={(event) => setMessage(event.target.value)}
placeholder="Message / proposal notes"
required
rows={5}
className="w-full rounded-2xl border border-slate-200 px-5 py-4 outline-none focus:border-slate-900"
/>

{success && <p className="text-sm text-emerald-700">{success}</p>}
{error && <p className="text-sm text-red-600">{error}</p>}

<button
type="submit"
disabled={submitting}
className="w-full rounded-2xl bg-slate-900 px-6 py-4 text-sm font-bold text-white transition hover:bg-slate-800 disabled:opacity-50"
>
{submitting ? "Submitting..." : "Submit Quote"}
</button>
</form>
</section>
);
}