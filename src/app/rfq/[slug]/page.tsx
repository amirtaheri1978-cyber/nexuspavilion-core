import Link from "next/link";
import { notFound } from "next/navigation";

import InviteVendorForm from "@/components/invite-vendor-form";
import QuoteDecisionButtons from "@/components/quote-decision-buttons";
import SubmitQuoteForm from "@/components/submit-quote-form";
import { createClient } from "@/lib/supabase/server";

export default async function RFQDetailPage({
params,
}: {
params: Promise<{ slug: string }>;
}) {
const { slug } = await params;

const supabase = await createClient();

const { data: rfq, error } = await supabase
.from("rfqs")
.select("*")
.eq("slug", slug)
.single();

if (error || !rfq) {
notFound();
}

const { data: quotes } = await supabase
.from("quotes")
.select("*")
.eq("rfq_id", rfq.id)
.order("created_at", { ascending: false });

return (
<main className="min-h-screen bg-slate-100 px-6 py-12">
<div className="mx-auto max-w-4xl">
<Link
href="/rfq"
className="mb-6 inline-block text-sm font-semibold text-slate-600"
>
← Back to RFQ Marketplace
</Link>

<section className="rounded-3xl border border-slate-200 bg-white p-10 shadow-sm">
<p className="text-sm font-semibold uppercase tracking-[0.2em] text-orange-500">
Procurement RFQ
</p>

<h1 className="mt-3 text-4xl font-black text-slate-900">
{rfq.title}
</h1>

<p className="mt-4 text-lg leading-8 text-slate-600">
{rfq.description}
</p>

<div className="mt-10 grid gap-6 md:grid-cols-2">
<Info title="Category" value={rfq.category} />
<Info title="Location" value={rfq.location} />
<Info title="Budget" value={rfq.budget} />
<Info title="Deadline" value={rfq.deadline} />
</div>
</section>

<InviteVendorForm rfqId={rfq.id} />

<section className="mt-10 rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
<p className="text-sm font-semibold uppercase tracking-[0.2em] text-orange-500">
Supplier Quotes
</p>

<h2 className="mt-3 text-3xl font-black text-slate-900">
Submitted Quotes
</h2>

{!quotes || quotes.length === 0 ? (
<p className="mt-6 text-slate-500">No quotes submitted yet.</p>
) : (
<div className="mt-8 space-y-6">
{quotes.map((quote) => (
<div
key={quote.id}
className="rounded-2xl border border-slate-200 p-6"
>
<p className="text-sm uppercase text-slate-500">
Quote Amount
</p>

<p className="mt-1 text-3xl font-black text-slate-900">
{quote.amount}
</p>

<p className="mt-6 text-sm uppercase text-slate-500">
Timeline
</p>

<p className="mt-1 text-lg text-slate-900">
{quote.timeline}
</p>

<p className="mt-6 text-sm uppercase text-slate-500">
Message
</p>

<p className="mt-1 leading-7 text-slate-700">
{quote.message}
</p>

<p className="mt-6 text-sm uppercase text-slate-500">
Decision
</p>

<div className="mt-4">
<QuoteDecisionButtons
quoteId={quote.id}
currentDecision={quote.decision}
/>
</div>
</div>
))}
</div>
)}
</section>

<SubmitQuoteForm rfqId={rfq.id} />
</div>
</main>
);
}

function Info({ title, value }: { title: string; value: string }) {
return (
<div className="rounded-2xl bg-slate-50 p-6">
<p className="text-sm font-semibold uppercase text-slate-500">
{title}
</p>

<p className="mt-2 text-2xl font-bold text-slate-900">
{value || "Not specified"}
</p>
</div>
);
}