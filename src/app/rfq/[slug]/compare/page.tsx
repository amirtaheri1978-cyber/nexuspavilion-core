import Link from "next/link";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

type PageProps = {
params: Promise<{
slug: string;
}>;
};

export default async function CompareQuotesPage({ params }: PageProps) {
const { slug } = await params;
const supabase = await createClient();

const { data: rfq } = await supabase
.from("rfqs")
.select("*")
.eq("slug", slug)
.single();

if (!rfq) {
return (
<main className="flex min-h-screen items-center justify-center bg-[#f6f6f3]">
<p className="text-xl font-semibold text-black">RFQ not found</p>
</main>
);
}

const { data: quotes } = await supabase
.from("quotes")
.select("*")
.eq("rfq_id", rfq.id)
.order("created_at", { ascending: false });

async function awardQuote(formData: FormData) {
"use server";

const supabase = await createClient();
const quoteId = formData.get("quoteId");

if (!quoteId) return;

const { data: quote } = await supabase
.from("quotes")
.select("*")
.eq("id", quoteId)
.single();

if (!quote) return;

await supabase
.from("rfqs")
.update({
status: "awarded",
awarded_quote_id: quote.id,
awarded_at: new Date().toISOString(),
})
.eq("id", quote.rfq_id);

await supabase
.from("quotes")
.update({ decision: "approved" })
.eq("id", quote.id);

redirect("/dashboard");
}

return (
<main className="min-h-screen bg-[#f6f6f3] px-6 py-16">
<div className="mx-auto max-w-5xl">
<Link href={`/rfq/${rfq.slug}`} className="text-sm text-black/60">
← Back to RFQ
</Link>

<section className="mt-6 rounded-[32px] border border-black/5 bg-white p-10">
<p className="text-[12px] font-semibold uppercase tracking-[0.3em] text-[#d97745]">
Quote Comparison
</p>

<h1 className="mt-3 text-5xl font-black tracking-tight text-black">
{rfq.title}
</h1>

<p className="mt-3 text-lg text-black/60">
Compare supplier quotes side-by-side before making a procurement decision.
</p>
</section>

<div className="mt-8 overflow-hidden rounded-[28px] border border-black/5 bg-white">
<div className="grid grid-cols-5 bg-[#111111] px-6 py-4 text-sm font-semibold text-white">
<div>Amount</div>
<div>Timeline</div>
<div>Decision</div>
<div>Message</div>
<div>Action</div>
</div>

{quotes?.map((quote) => (
<div
key={quote.id}
className="grid grid-cols-5 items-center border-t border-black/5 px-6 py-6"
>
<div className="text-2xl font-bold text-black">
${quote.amount}
</div>

<div className="font-medium text-black/70">
{quote.timeline}
</div>

<div>
<span className="inline-flex rounded-full bg-green-100 px-3 py-1 text-sm font-semibold text-green-700">
{quote.decision || "pending"}
</span>
</div>

<div className="text-black/60">{quote.message}</div>

<form action={awardQuote}>
<input type="hidden" name="quoteId" value={quote.id} />

<button
type="submit"
className="rounded-full bg-black px-5 py-3 text-sm font-semibold text-white"
>
Award Contract
</button>
</form>
</div>
))}
</div>
</div>
</main>
);
}