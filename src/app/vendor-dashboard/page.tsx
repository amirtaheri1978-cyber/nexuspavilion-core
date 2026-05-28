import Link from "next/link";

import { createClient } from "@/lib/supabase/server";

export default async function VendorDashboardPage() {
const supabase = await createClient();

const {
data: { user },
} = await supabase.auth.getUser();

const { data: profile } = await supabase
.from("profiles")
.select("company_id, role, email")
.eq("id", user?.id)
.single();

const companyId = profile?.company_id;

const { data: rfqs } = companyId
? await supabase
.from("rfqs")
.select("*")
.eq("company_id", companyId)
.order("created_at", { ascending: false })
: { data: [] };

const rfqList = rfqs ?? [];
const rfqIds = rfqList.map((rfq: any) => rfq.id);

const { data: quotes } =
rfqIds.length > 0
? await supabase.from("quotes").select("*").in("rfq_id", rfqIds)
: { data: [] };

const quoteList = quotes ?? [];

const submittedQuotes = quoteList.length;
const awardedQuotes = quoteList.filter(
(quote: any) => quote.decision === "awarded"
).length;
const pendingQuotes = quoteList.filter(
(quote: any) => !quote.decision || quote.decision === "pending"
).length;

const awardedRevenue = quoteList
.filter((quote: any) => quote.decision === "awarded")
.reduce((total: number, quote: any) => total + Number(quote.amount || 0), 0);

return (
<main className="min-h-screen bg-[#f6f6f3] px-8 py-10">
<div className="mx-auto max-w-7xl">
<section className="rounded-3xl border border-black/5 bg-white p-10">
<p className="text-xs font-black uppercase tracking-[0.35em] text-orange-500">
Vendor Intelligence
</p>

<h1 className="mt-3 text-5xl font-black text-slate-950">
Vendor Dashboard
</h1>

<p className="mt-4 max-w-3xl text-sm text-slate-600">
Track company RFQs, supplier quote activity, award decisions, and
procurement opportunities connected to your secure workspace.
</p>
</section>

<section className="mt-8 grid gap-6 md:grid-cols-4">
<MetricCard title="Company RFQs" value={String(rfqList.length)} />
<MetricCard title="Submitted Quotes" value={String(submittedQuotes)} />
<MetricCard title="Pending Decisions" value={String(pendingQuotes)} />
<MetricCard
title="Awarded Revenue"
value={`$${awardedRevenue.toLocaleString()}`}
/>
</section>

<section className="mt-8 rounded-3xl border border-black/5 bg-white p-8">
<div className="flex items-center justify-between">
<div>
<p className="text-xs font-black uppercase tracking-[0.25em] text-orange-500">
Live Opportunities
</p>

<h2 className="mt-3 text-3xl font-black text-slate-950">
Company RFQ Pipeline
</h2>
</div>

<Link
href="/rfq"
className="rounded-full bg-slate-950 px-5 py-3 text-sm font-bold text-white"
>
Open Marketplace
</Link>
</div>

<div className="mt-6 grid gap-5">
{rfqList.length > 0 ? (
rfqList.map((rfq: any) => {
const rfqQuotes = quoteList.filter(
(quote: any) => quote.rfq_id === rfq.id
);

const lowestQuote =
rfqQuotes.length > 0
? Math.min(
...rfqQuotes.map((quote: any) =>
Number(quote.amount || 0)
)
)
: 0;

return (
<div
key={rfq.id}
className="rounded-[28px] border border-slate-200 bg-slate-50 p-6"
>
<div className="flex items-start justify-between gap-6">
<div>
<p className="text-xs font-black uppercase tracking-[0.25em] text-orange-500">
{rfq.category || "Procurement"}
</p>

<h3 className="mt-2 text-2xl font-black text-slate-950">
{rfq.title}
</h3>

<p className="mt-2 max-w-2xl text-sm text-slate-600">
{rfq.description}
</p>

<div className="mt-5 flex flex-wrap gap-3">
<Badge>{rfq.status || "open"}</Badge>
<Badge>{rfq.location || "No location"}</Badge>
<Badge>
Budget ${Number(rfq.budget || 0).toLocaleString()}
</Badge>
<Badge>{rfqQuotes.length} quotes</Badge>
{lowestQuote > 0 && (
<Badge>
Lowest ${lowestQuote.toLocaleString()}
</Badge>
)}
</div>
</div>

<Link
href={`/rfq/${rfq.slug}`}
className="rounded-full bg-white px-5 py-3 text-sm font-black text-slate-950 shadow-sm"
>
Review →
</Link>
</div>
</div>
);
})
) : (
<div className="rounded-[28px] border border-dashed border-slate-300 bg-slate-50 p-12 text-center">
<h3 className="text-2xl font-black text-slate-950">
No company RFQs found
</h3>

<p className="mt-2 text-sm text-slate-600">
Create RFQs from the marketplace to start building vendor
activity.
</p>
</div>
)}
</div>
</section>
</div>
</main>
);
}

function MetricCard({ title, value }: { title: string; value: string }) {
return (
<div className="rounded-3xl border border-black/5 bg-white p-7">
<p className="text-xs font-black uppercase tracking-[0.2em] text-slate-500">
{title}
</p>

<p className="mt-3 text-3xl font-black text-slate-950">{value}</p>
</div>
);
}

function Badge({ children }: { children: React.ReactNode }) {
return (
<span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-slate-600 shadow-sm">
{children}
</span>
);
}