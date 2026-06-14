"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";

import { createClient } from "@/lib/supabase/client";

type RfqStatus = {
title: string | null;
deadline: string | null;
status: string | null;
awarded_quote_id: string | null;
awarded_at: string | null;
};

function detectCurrencyFromSlug(slug: string) {
const value = slug.toLowerCase();

const canadaSignals = [
"toronto",
"ottawa",
"north-york",
"mississauga",
"vancouver",
"calgary",
"montreal",
"canada",
"ontario",
"on",
];

const usSignals = [
"new-york",
"chicago",
"los-angeles",
"miami",
"dallas",
"houston",
"seattle",
"boston",
"usa",
"united-states",
"us",
];

if (usSignals.some((signal) => value.includes(signal))) return "USD";
if (canadaSignals.some((signal) => value.includes(signal))) return "CAD";

return "CAD";
}

function normalizeAmount(value: string) {
return value.replace(/[^\d]/g, "");
}

function formatAmount(value: string) {
const normalized = normalizeAmount(value);
if (!normalized) return "";
return Number(normalized).toLocaleString("en-US");
}

function getAmountNumber(value: string) {
const normalized = normalizeAmount(value);
const amount = Number(normalized);
return Number.isFinite(amount) ? amount : 0;
}

function hasDeadlinePassed(deadline: string | null | undefined) {
if (!deadline) return false;

const deadlineDate = new Date(deadline);

if (Number.isNaN(deadlineDate.getTime())) {
return false;
}

return new Date().getTime() > deadlineDate.getTime();
}

function formatDeadline(deadline: string | null | undefined) {
if (!deadline) return "Not specified";

const deadlineDate = new Date(deadline);

if (Number.isNaN(deadlineDate.getTime())) {
return deadline;
}

return deadlineDate.toLocaleString("en-US", {
year: "numeric",
month: "long",
day: "numeric",
hour: "2-digit",
minute: "2-digit",
});
}

function isSubmissionClosed(rfq: RfqStatus | null) {
if (!rfq) return false;

const status = String(rfq.status || "open").toLowerCase();

if (status !== "open") return true;
if (rfq.awarded_quote_id) return true;
if (rfq.awarded_at) return true;
if (hasDeadlinePassed(rfq.deadline)) return true;

return false;
}

export default function SubmitQuotePage() {
const router = useRouter();
const params = useParams();
const supabase = useMemo(() => createClient(), []);

const slug = String(params.slug || "");
const currency = useMemo(() => detectCurrencyFromSlug(slug), [slug]);

const [rfq, setRfq] = useState<RfqStatus | null>(null);
const [rfqLoading, setRfqLoading] = useState(true);

const [amount, setAmount] = useState("");
const [timeline, setTimeline] = useState("");
const [message, setMessage] = useState("");

const [loading, setLoading] = useState(false);
const [error, setError] = useState("");

const amountNumber = getAmountNumber(amount);
const formattedAmount = formatAmount(amount);

const submissionClosed = isSubmissionClosed(rfq);
const deadlinePassed = hasDeadlinePassed(rfq?.deadline);

const amountPreview =
amountNumber > 0
? new Intl.NumberFormat("en-US", {
style: "currency",
currency,
maximumFractionDigits: 0,
}).format(amountNumber)
: `${currency} 0`;

useEffect(() => {
async function loadRfqStatus() {
setRfqLoading(true);

const { data } = await supabase
.from("rfqs")
.select("title, deadline, status, awarded_quote_id, awarded_at")
.eq("slug", slug)
.maybeSingle();

setRfq((data || null) as RfqStatus | null);
setRfqLoading(false);
}

if (slug) {
loadRfqStatus();
}
}, [slug, supabase]);

async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
event.preventDefault();

setLoading(true);
setError("");

if (submissionClosed) {
setLoading(false);
setError(
deadlinePassed
? "Submission closed. The RFQ deadline has passed and late bids are not accepted."
: "Submission closed. This RFQ is no longer accepting quotes."
);
return;
}

if (amountNumber < 1000) {
setLoading(false);
setError("Quote amount appears too low. Please enter the full contract value.");
return;
}

if (!timeline.trim()) {
setLoading(false);
setError("Please enter a delivery timeline.");
return;
}

if (!message.trim()) {
setLoading(false);
setError("Please include a proposal note.");
return;
}

const response = await fetch("/api/quotes", {
method: "POST",
headers: {
"Content-Type": "application/json",
},
body: JSON.stringify({
slug,
amount: amountNumber,
currency,
timeline: timeline.trim(),
message: message.trim(),
}),
});

const text = await response.text();
const data = text ? JSON.parse(text) : null;

setLoading(false);

if (!response.ok) {
setError(data?.error || "Failed to submit quote.");
return;
}

router.push(`/rfq/${slug}`);
router.refresh();
}

return (
<main className="min-h-screen bg-[#f6f6f3] px-8 py-10">
<div className="mx-auto max-w-4xl">
<button
onClick={() => router.back()}
className="text-sm font-semibold text-slate-500 transition hover:text-slate-950"
>
← Back
</button>

<section className="mt-8 overflow-hidden rounded-[36px] border border-black/5 bg-white shadow-sm">
<div className="border-b border-slate-100 bg-slate-950 px-10 py-8 text-white">
<p className="text-xs font-black uppercase tracking-[0.35em] text-orange-400">
Supplier Response
</p>

<h1 className="mt-3 text-5xl font-black">Submit Quote</h1>

<p className="mt-4 max-w-2xl text-sm leading-6 text-slate-300">
Submit your commercial offer with a validated contract amount,
delivery timeline, and proposal note.
</p>
</div>

<div className="border-b border-slate-100 bg-slate-50 px-10 py-6">
<div className="grid gap-4 md:grid-cols-3">
<SummaryItem
title="RFQ Status"
value={
rfqLoading
? "Checking..."
: submissionClosed
? "Submission Closed"
: "Open for Quotes"
}
/>
<SummaryItem title="Deadline" value={formatDeadline(rfq?.deadline)} />
<SummaryItem
title="Governance"
value={deadlinePassed ? "Hard Lock Active" : "Deadline Enforced"}
/>
</div>

{submissionClosed ? (
<div className="mt-5 rounded-3xl border border-red-200 bg-red-50 p-5">
<p className="text-sm font-black text-red-700">
Submission Closed
</p>
<p className="mt-2 text-sm leading-6 text-red-600">
This RFQ is no longer accepting supplier submissions. Late bids
are automatically rejected by Nexus Pavilion governance controls.
</p>
</div>
) : (
<div className="mt-5 rounded-3xl border border-orange-200 bg-orange-50 p-5">
<p className="text-sm font-black text-orange-700">
Governance Notice
</p>
<p className="mt-2 text-sm leading-6 text-orange-700">
Your submission is confidential. Competing suppliers cannot view
your commercial response. Submissions after the RFQ deadline are
rejected automatically.
</p>
</div>
)}
</div>

<form onSubmit={handleSubmit} className="space-y-6 p-10">
<div>
<div className="flex items-center justify-between gap-4">
<label className="text-xs font-black uppercase tracking-[0.25em] text-slate-500">
Quote Amount
</label>

<span className="rounded-full bg-orange-100 px-3 py-1 text-xs font-black text-orange-700">
{currency}
</span>
</div>

<div className="mt-3 flex overflow-hidden rounded-2xl border border-slate-200 bg-white focus-within:border-slate-950">
<div className="flex items-center border-r border-slate-200 bg-slate-50 px-5 text-sm font-black text-slate-600">
{currency}
</div>

<input
required
inputMode="numeric"
placeholder="7,250,000"
value={formattedAmount}
onChange={(event) => setAmount(event.target.value)}
disabled={submissionClosed || loading}
className="w-full px-5 py-4 text-lg font-black text-slate-950 outline-none placeholder:text-slate-300 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
/>
</div>

<div className="mt-3 flex flex-wrap items-center justify-between gap-3">
<p className="text-xs font-semibold text-slate-500">
Enter the full contract value. Commas are added automatically.
</p>

<p className="text-xs font-black uppercase tracking-[0.15em] text-slate-500">
Preview: {amountPreview}
</p>
</div>
</div>

<div>
<label className="text-xs font-black uppercase tracking-[0.25em] text-slate-500">
Delivery Timeline
</label>

<input
required
type="text"
placeholder="e.g. 16 months, Q3 2027, or 24 weeks"
value={timeline}
onChange={(event) => setTimeline(event.target.value)}
disabled={submissionClosed || loading}
className="mt-3 w-full rounded-2xl border border-slate-200 px-5 py-4 text-sm font-semibold outline-none transition focus:border-slate-950 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
/>
</div>

<div>
<label className="text-xs font-black uppercase tracking-[0.25em] text-slate-500">
Proposal Note
</label>

<textarea
required
placeholder="Summarize scope, assumptions, delivery approach, experience, exclusions, and quote validity."
value={message}
onChange={(event) => setMessage(event.target.value)}
rows={7}
disabled={submissionClosed || loading}
className="mt-3 w-full rounded-2xl border border-slate-200 px-5 py-4 text-sm font-semibold leading-6 outline-none transition focus:border-slate-950 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
/>
</div>

{error ? (
<div className="rounded-2xl bg-red-50 px-5 py-4 text-sm font-bold text-red-600">
{error}
</div>
) : null}

<div className="rounded-3xl bg-slate-50 p-5">
<p className="text-xs font-black uppercase tracking-[0.25em] text-slate-400">
Submission Summary
</p>

<div className="mt-4 grid gap-4 md:grid-cols-3">
<SummaryItem title="Amount" value={amountPreview} />
<SummaryItem title="Currency" value={currency} />
<SummaryItem title="Timeline" value={timeline.trim() || "Pending"} />
</div>
</div>

<button
type="submit"
disabled={loading || submissionClosed || rfqLoading}
className="w-full rounded-full bg-slate-950 px-6 py-4 text-sm font-black text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
>
{submissionClosed
? "Submission Closed"
: loading
? "Submitting Quote..."
: "Submit Quote"}
</button>
</form>
</section>
</div>
</main>
);
}

function SummaryItem({ title, value }: { title: string; value: string }) {
return (
<div className="rounded-2xl bg-white p-4">
<p className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">
{title}
</p>

<p className="mt-2 text-lg font-black text-slate-950">{value}</p>
</div>
);
}