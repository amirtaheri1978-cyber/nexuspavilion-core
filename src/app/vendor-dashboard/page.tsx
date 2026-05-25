import Link from "next/link";

import { createClient } from "@/lib/supabase/server";

export default async function VendorDashboardPage() {
const supabase = await createClient();

const { data: quotes } = await supabase
.from("quotes")
.select(`
*,
rfqs (
title,
slug,
location,
budget,
category
)
`)
.order("created_at", { ascending: false });

return (
<main className="min-h-screen bg-[#f5f7fb] p-10">
<div className="mx-auto max-w-7xl">
<div className="mb-10 flex items-center justify-between">
<div>
<p className="text-sm uppercase tracking-[0.3em] text-orange-500">
Vendor Portal
</p>

<h1 className="mt-2 text-5xl font-black text-black">
Vendor Dashboard
</h1>
</div>

<Link
href="/rfq"
className="rounded-full bg-black px-6 py-3 text-sm font-semibold text-white transition hover:opacity-90"
>
Browse RFQs
</Link>
</div>

{!quotes || quotes.length === 0 ? (
<div className="rounded-[32px] bg-white p-10 shadow-sm">
<h2 className="text-2xl font-black text-black">
No quotes submitted yet
</h2>

<p className="mt-3 text-slate-600">
Browse RFQs and submit your first quote.
</p>
</div>
) : (
<div className="grid gap-6">
{quotes.map((quote: any) => (
<div
key={quote.id}
className="rounded-[32px] bg-white p-8 shadow-sm"
>
<div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
<div>
<p className="text-sm uppercase tracking-[0.25em] text-orange-500">
RFQ Project
</p>

<h2 className="mt-2 text-4xl font-black text-black">
{quote.rfqs?.title || "Untitled RFQ"}
</h2>

<p className="mt-3 text-lg text-slate-600">
{quote.rfqs?.location}
</p>
</div>

<DecisionBadge decision={quote.decision} />
</div>

<div className="mt-10 grid gap-6 md:grid-cols-5">
<Metric
label="Quote Amount"
value={`$${quote.amount}`}
/>

<Metric
label="Timeline"
value={quote.timeline}
/>

<Metric
label="RFQ Budget"
value={`$${quote.rfqs?.budget}`}
/>

<Metric
label="Category"
value={quote.rfqs?.category}
/>

<Metric
label="Message"
value={quote.message}
/>
</div>

<div className="mt-10">
<Link
href={`/rfq/${quote.rfqs?.slug}`}
className="inline-flex items-center text-lg font-bold text-black transition hover:translate-x-1"
>
Open RFQ →
</Link>
</div>
</div>
))}
</div>
)}
</div>
</main>
);
}

function DecisionBadge({
decision,
}: {
decision: string | null;
}) {
if (decision === "approved") {
return (
<div className="rounded-full bg-green-100 px-5 py-2 text-sm font-bold text-green-700">
Approved
</div>
);
}

if (decision === "rejected") {
return (
<div className="rounded-full bg-red-100 px-5 py-2 text-sm font-bold text-red-700">
Rejected
</div>
);
}

return (
<div className="rounded-full bg-yellow-100 px-5 py-2 text-sm font-bold text-yellow-700">
Pending
</div>
);
}

function Metric({
label,
value,
}: {
label: string;
value: string | null | undefined;
}) {
return (
<div>
<p className="text-sm uppercase text-slate-400">
{label}
</p>

<p className="mt-2 text-lg font-semibold text-black">
{value || "Not specified"}
</p>
</div>
);
}