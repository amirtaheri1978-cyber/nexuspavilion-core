import Link from "next/link";

import StatusBadge from "@/components/ui/StatusBadge";
import { createClient } from "@/lib/supabase/server";

type StatusBadgeValue = "SANDBOX" | "PENDING" | "APPROVED" | "REJECTED";

type Company = {
id: string;
name: string;
slug: string;
category: string | null;
location: string | null;
network_role: string | null;
status: string | null;
logo_url: string | null;
};

type RFQ = {
id: string;
slug: string | null;
title: string | null;
description: string | null;
category: string | null;
location: string | null;
budget: number | string | null;
status: string | null;
created_at: string | null;
};

type Quote = {
id: string;
rfq_id: string;
amount: number | string | null;
decision: string | null;
created_at: string | null;
};

type PageProps = {
params: Promise<{
slug: string;
}>;
};

function normalizeStatus(status: string | null): StatusBadgeValue {
const value = String(status || "").toLowerCase();

if (value === "verified" || value === "approved") return "APPROVED";
if (value === "pending") return "PENDING";
if (value === "rejected") return "REJECTED";

return "SANDBOX";
}

function getRFQStatusClass(status: string | null) {
if (status === "awarded") return "bg-green-100 text-green-700";
if (status === "closed") return "bg-slate-200 text-slate-600";
return "bg-orange-100 text-orange-700";
}

function getRFQStatusLabel(status: string | null) {
if (status === "awarded") return "Awarded";
if (status === "closed") return "Closed";
return "Open";
}

export default async function PublicCompanyPage({ params }: PageProps) {
const { slug } = await params;
const supabase = await createClient();

const { data } = await supabase
.from("companies")
.select("*")
.eq("slug", slug)
.in("status", ["approved", "verified"])
.limit(1);

const company = data?.[0] as Company | undefined;

if (!company) {
return (
<main className="min-h-screen bg-[#f6f6f3] p-8">
<div className="mx-auto max-w-3xl rounded-[32px] border border-black/5 bg-white p-8">
<h1 className="text-2xl font-black text-slate-950">
Public company not found
</h1>

<Link
href="/directory"
className="mt-6 inline-block text-sm font-bold text-slate-700 hover:text-slate-950"
>
← Back to Public Directory
</Link>
</div>
</main>
);
}

const { data: rfqs } = await supabase
.from("rfqs")
.select("*")
.eq("company_id", company.id)
.order("created_at", { ascending: false });

const rfqList = (rfqs ?? []) as RFQ[];
const rfqIds = rfqList.map((rfq) => rfq.id);

const { data: quotes } =
rfqIds.length > 0
? await supabase
.from("quotes")
.select("*")
.in("rfq_id", rfqIds)
.order("created_at", { ascending: false })
: { data: [] };

const quoteList = (quotes ?? []) as Quote[];

const totalRfqs = rfqList.length;
const openRfqs = rfqList.filter(
(rfq) => !rfq.status || rfq.status === "open"
).length;
const awardedRfqs = rfqList.filter((rfq) => rfq.status === "awarded").length;

const totalBudget = rfqList.reduce((total, rfq) => {
const budget = Number(rfq.budget);
return total + (Number.isNaN(budget) ? 0 : budget);
}, 0);

const awardedQuotes = quoteList.filter(
(quote) => quote.decision === "awarded"
);

const awardedSpend = awardedQuotes.reduce((total, quote) => {
const amount = Number(quote.amount);
return total + (Number.isNaN(amount) ? 0 : amount);
}, 0);

const estimatedSavings = Math.max(totalBudget - awardedSpend, 0);
const awardRate =
totalRfqs > 0 ? Math.round((awardedRfqs / totalRfqs) * 100) : 0;

const recentRfqs = rfqList.slice(0, 6);
const recentAwards = awardedQuotes.slice(0, 5);

return (
<main className="min-h-screen bg-[#f6f6f3] p-8">
<div className="mx-auto max-w-7xl">
<div className="flex items-center justify-between gap-6">
<Link
href="/directory"
className="text-sm font-bold text-slate-500 hover:text-slate-950"
>
← Back to Public Directory
</Link>

<div className="flex items-center gap-3">
<Link
href="/rfq/new"
className="rounded-full bg-white px-5 py-3 text-sm font-bold text-slate-950 shadow-sm transition hover:shadow-md"
>
Create RFQ
</Link>

<Link
href="/rfq"
className="rounded-full bg-slate-950 px-5 py-3 text-sm font-bold text-white transition hover:bg-slate-800"
>
View Marketplace
</Link>
</div>
</div>

<section className="mt-8 rounded-[36px] border border-black/5 bg-white p-10">
<div className="flex flex-col gap-8 lg:flex-row lg:items-start lg:justify-between">
<div className="flex items-start gap-6">
{company.logo_url ? (
<img
src={company.logo_url}
alt={company.name}
className="h-24 w-24 rounded-3xl border border-slate-200 object-contain p-2"
/>
) : (
<div className="flex h-24 w-24 items-center justify-center rounded-3xl bg-slate-100 text-4xl font-black text-slate-600">
{company.name.charAt(0)}
</div>
)}

<div>
<p className="text-xs font-black uppercase tracking-[0.35em] text-orange-500">
Enterprise Company Profile
</p>

<div className="mt-3 flex flex-wrap items-center gap-3">
<h1 className="text-5xl font-black text-slate-950">
{company.name}
</h1>

<StatusBadge status={normalizeStatus(company.status)} />
</div>

<p className="mt-4 text-lg font-semibold text-slate-600">
{company.category || "Enterprise"} ·{" "}
{company.location || "Location N/A"}
</p>

<p className="mt-2 text-sm font-bold uppercase tracking-[0.2em] text-slate-400">
{company.network_role || "Enterprise Workspace"}
</p>
</div>
</div>

<div className="grid min-w-[280px] grid-cols-2 gap-4">
<MiniMetric title="Active RFQs" value={openRfqs} />
<MiniMetric title="Awards" value={awardedRfqs} />
<MiniMetric title="Quotes" value={quoteList.length} />
<MiniMetric title="Award Rate" value={`${awardRate}%`} />
</div>
</div>
</section>

<section className="mt-8 grid gap-6 md:grid-cols-4">
<MetricCard
title="Procurement Volume"
value={`$${totalBudget.toLocaleString()}`}
detail="Total RFQ budget portfolio"
/>

<MetricCard
title="Awarded Spend"
value={`$${awardedSpend.toLocaleString()}`}
detail="Total awarded contract value"
/>

<MetricCard
title="Estimated Savings"
value={`$${estimatedSavings.toLocaleString()}`}
detail="Budget less awarded value"
/>

<MetricCard
title="Award Rate"
value={`${awardRate}%`}
detail={`${awardedRfqs} of ${totalRfqs} RFQs awarded`}
/>
</section>

<section className="mt-8 grid gap-8 lg:grid-cols-3">
<div className="lg:col-span-2 rounded-[32px] border border-black/5 bg-white p-8">
<div className="flex items-end justify-between gap-6">
<div>
<p className="text-xs font-black uppercase tracking-[0.3em] text-orange-500">
Procurement Portfolio
</p>

<h2 className="mt-3 text-3xl font-black text-slate-950">
Company RFQs
</h2>
</div>

<Link
href="/rfq"
className="rounded-full bg-slate-950 px-5 py-3 text-sm font-bold text-white"
>
Open Marketplace
</Link>
</div>

<div className="mt-6 space-y-4">
{recentRfqs.length > 0 ? (
recentRfqs.map((rfq) => {
const relatedQuotes = quoteList.filter(
(quote) => quote.rfq_id === rfq.id
);

const lowestQuote =
relatedQuotes.length > 0
? Math.min(
...relatedQuotes
.map((quote) => Number(quote.amount))
.filter((amount) => !Number.isNaN(amount))
)
: null;

return (
<Link
key={rfq.id}
href={rfq.slug ? `/rfq/${rfq.slug}` : "/rfq"}
className="block rounded-3xl border border-slate-100 bg-slate-50 p-5 transition hover:-translate-y-1 hover:shadow-lg"
>
<div className="flex items-start justify-between gap-4">
<div>
<p className="text-xs font-black uppercase tracking-[0.25em] text-orange-500">
{rfq.category || "Procurement"}
</p>

<h3 className="mt-2 text-2xl font-black text-slate-950">
{rfq.title || "Untitled RFQ"}
</h3>

<p className="mt-2 max-w-2xl text-sm text-slate-600">
{rfq.description || "No description provided."}
</p>
</div>

<span
className={`rounded-full px-3 py-1 text-xs font-black ${getRFQStatusClass(
rfq.status
)}`}
>
{getRFQStatusLabel(rfq.status)}
</span>
</div>

<div className="mt-5 flex flex-wrap gap-3 text-xs font-black text-slate-600">
<Pill>{rfq.location || "Location N/A"}</Pill>
<Pill>
Budget ${Number(rfq.budget || 0).toLocaleString()}
</Pill>
<Pill>{relatedQuotes.length} quotes</Pill>
{lowestQuote !== null && Number.isFinite(lowestQuote) && (
<Pill>Lowest ${lowestQuote.toLocaleString()}</Pill>
)}
</div>
</Link>
);
})
) : (
<EmptyState message="No RFQs have been created for this company yet." />
)}
</div>
</div>

<aside className="rounded-[32px] border border-black/5 bg-white p-8">
<p className="text-xs font-black uppercase tracking-[0.3em] text-orange-500">
Award History
</p>

<h2 className="mt-3 text-3xl font-black text-slate-950">
Recent Awards
</h2>

<div className="mt-6 space-y-4">
{recentAwards.length > 0 ? (
recentAwards.map((quote) => {
const relatedRfq = rfqList.find(
(rfq) => rfq.id === quote.rfq_id
);

return (
<div
key={quote.id}
className="rounded-3xl border border-slate-100 bg-slate-50 p-5"
>
<div className="flex items-start justify-between gap-4">
<div>
<p className="text-lg font-black text-slate-950">
{relatedRfq?.title || "Awarded RFQ"}
</p>

<p className="mt-1 text-sm font-semibold text-slate-500">
{relatedRfq?.location || "Location N/A"}
</p>
</div>

<span className="rounded-full bg-green-100 px-3 py-1 text-xs font-black text-green-700">
Awarded
</span>
</div>

<p className="mt-4 text-2xl font-black text-slate-950">
${Number(quote.amount || 0).toLocaleString()}
</p>
</div>
);
})
) : (
<EmptyState message="No awards have been recorded yet." />
)}
</div>
</aside>
</section>

<section className="mt-8 rounded-[32px] border border-black/5 bg-white p-8">
<p className="text-xs font-black uppercase tracking-[0.3em] text-orange-500">
Public Procurement Profile
</p>

<h2 className="mt-3 text-3xl font-black text-slate-950">
Network Visibility
</h2>

<p className="mt-4 max-w-4xl text-sm leading-7 text-slate-600">
This verified enterprise profile is publicly visible in the Nexus
Pavilion supply network. RFQ portfolio metrics, awarded spend, and
procurement activity are summarized for executive visibility.
Detailed compliance documents, private supplier submissions, and
workspace administration require authenticated access.
</p>
</section>
</div>
</main>
);
}

function MiniMetric({ title, value }: { title: string; value: number | string }) {
return (
<div className="rounded-3xl bg-slate-50 p-5">
<p className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">
{title}
</p>

<p className="mt-2 text-3xl font-black text-slate-950">{value}</p>
</div>
);
}

function MetricCard({
title,
value,
detail,
}: {
title: string;
value: string;
detail: string;
}) {
return (
<div className="rounded-3xl border border-black/5 bg-white p-7">
<p className="text-xs font-black uppercase tracking-[0.2em] text-slate-500">
{title}
</p>

<p className="mt-3 text-3xl font-black text-slate-950">{value}</p>

<p className="mt-2 text-sm text-slate-600">{detail}</p>
</div>
);
}

function Pill({ children }: { children: React.ReactNode }) {
return (
<span className="rounded-full bg-white px-3 py-1 shadow-sm">
{children}
</span>
);
}

function EmptyState({ message }: { message: string }) {
return (
<div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
<p className="text-sm font-bold text-slate-500">{message}</p>
</div>
);
}