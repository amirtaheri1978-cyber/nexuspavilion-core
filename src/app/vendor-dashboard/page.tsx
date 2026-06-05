import Link from "next/link";

import { createClient } from "@/lib/supabase/server";

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
timeline: string | null;
message: string | null;
decision: string | null;
created_at: string | null;
};

function formatMoney(value: number | string | null | undefined) {
const amount = Number(value);

if (!Number.isFinite(amount)) {
return "$0";
}

return `$${amount.toLocaleString()}`;
}

function getStatusClass(status: string | null) {
if (status === "awarded") return "bg-green-100 text-green-700";
if (status === "closed") return "bg-slate-200 text-slate-600";
return "bg-orange-100 text-orange-700";
}

function getStatusLabel(status: string | null) {
if (status === "awarded") return "Awarded";
if (status === "closed") return "Closed";
return "Open";
}

function getGrade(score: number) {
if (score >= 90) return "A+ Preferred Vendor";
if (score >= 80) return "A Qualified Vendor";
if (score >= 70) return "B Competitive Vendor";
if (score >= 60) return "C Developing Vendor";
return "Emerging Vendor";
}

function getStrength(score: number) {
if (score >= 90) return "Excellent";
if (score >= 80) return "Strong";
if (score >= 70) return "Competitive";
if (score >= 60) return "Developing";
return "Early Stage";
}

export default async function VendorDashboardPage() {
const supabase = await createClient();

const {
data: { user },
} = await supabase.auth.getUser();

const { data: profile } = user
? await supabase
.from("profiles")
.select("company_id, role, email")
.eq("id", user.id)
.single()
: { data: null };

const companyId = profile?.company_id;

const { data: rfqs } = companyId
? await supabase
.from("rfqs")
.select("*")
.eq("company_id", companyId)
.order("created_at", { ascending: false })
: { data: [] };

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

const submittedQuotes = quoteList.length;

const awardedQuotes = quoteList.filter(
(quote) => quote.decision === "awarded"
);

const lostQuotes = quoteList.filter((quote) => quote.decision === "rejected");

const awardedRevenue = awardedQuotes.reduce((total, quote) => {
const amount = Number(quote.amount);
return total + (Number.isFinite(amount) ? amount : 0);
}, 0);

const totalBidVolume = quoteList.reduce((total, quote) => {
const amount = Number(quote.amount);
return total + (Number.isFinite(amount) ? amount : 0);
}, 0);

const averageBid =
submittedQuotes > 0 ? Math.round(totalBidVolume / submittedQuotes) : 0;

const averageAward =
awardedQuotes.length > 0
? Math.round(awardedRevenue / awardedQuotes.length)
: 0;

const winRate =
submittedQuotes > 0
? Math.round((awardedQuotes.length / submittedQuotes) * 100)
: 0;

const procurementScore = Math.min(
100,
Math.round(
winRate * 0.45 +
awardedQuotes.length * 12 +
Math.min(awardedRevenue / 25000, 25) +
Math.min(submittedQuotes * 2, 15)
)
);

const performanceGrade = getGrade(procurementScore);
const competitiveStrength = getStrength(procurementScore);

const vendorRank =
procurementScore >= 90
? "Top Tier"
: procurementScore >= 75
? "Preferred"
: procurementScore >= 60
? "Qualified"
: "Developing";
const supplierTier =
procurementScore >= 90
? "Platinum Supplier"
: procurementScore >= 80
? "Gold Supplier"
: procurementScore >= 65
? "Silver Supplier"
: "Developing Supplier";

const awardProbability = Math.min(
98,
Math.max(
25,
Math.round(
winRate * 0.5 +
awardedQuotes.length * 10 +
Math.min(awardedRevenue / 20000, 25) +
Math.min(submittedQuotes * 3, 15)
)
)
);

const supplierRisk =
procurementScore >= 85
? "Low Risk"
: procurementScore >= 65
? "Medium Risk"
: "High Risk";

const marketplaceReputation =
procurementScore >= 90
? "Excellent"
: procurementScore >= 75
? "Strong"
: procurementScore >= 60
? "Reliable"
: "Limited Data";

const quoteCompetitiveness =
averageBid > 0 && awardedRevenue > 0
? "Competitive"
: submittedQuotes > 0
? "Developing"
: "No Activity";

const recentActivitySignal =
submittedQuotes >= 5
? "Active"
: submittedQuotes >= 2
? "Moderate"
: "Low";

const openRfqs = rfqList.filter(
(rfq) => !rfq.status || rfq.status === "open"
);

const pendingDecisionRfqs = openRfqs.filter((rfq) =>
quoteList.some((quote) => quote.rfq_id === rfq.id)
);

const pendingDecisions = pendingDecisionRfqs.length;

const pipelineRows = rfqList.map((rfq) => {
const rfqQuotes = quoteList.filter((quote) => quote.rfq_id === rfq.id);

const amounts = rfqQuotes
.map((quote) => Number(quote.amount))
.filter((amount) => Number.isFinite(amount));

const lowestQuote = amounts.length > 0 ? Math.min(...amounts) : null;

const awardedQuote = rfqQuotes.find(
(quote) => quote.decision === "awarded"
);

const isPendingDecision =
(!rfq.status || rfq.status === "open") && rfqQuotes.length > 0;

return {
rfq,
rfqQuotes,
lowestQuote,
awardedQuote,
isPendingDecision,
};
});

const recentAwards = awardedQuotes.slice(0, 5);

return (
<main className="min-h-screen bg-[#f6f6f3] px-8 py-10">
<div className="mx-auto max-w-7xl">
<section className="rounded-[36px] border border-black/5 bg-white p-10">
<div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
<div>
<p className="text-xs font-black uppercase tracking-[0.35em] text-orange-500">
Vendor Intelligence
</p>

<h1 className="mt-3 text-5xl font-black text-slate-950">
Vendor Dashboard
</h1>

<p className="mt-4 max-w-3xl text-sm leading-6 text-slate-600">
Track company RFQs, supplier quote activity, award decisions,
pending bid reviews, procurement revenue, and vendor performance
intelligence connected to your secure workspace.
</p>
</div>

<Link
href="/rfq"
className="rounded-full bg-slate-950 px-6 py-3 text-sm font-bold text-white transition hover:bg-slate-800"
>
Open Marketplace
</Link>
</div>
</section>

<section className="mt-8 grid gap-6 md:grid-cols-4">
<MetricCard
title="Procurement Score"
value={`${procurementScore}/100`}
detail={performanceGrade}
highlight={procurementScore >= 80}
/>

<MetricCard
title="Vendor Rank"
value={vendorRank}
detail={`${competitiveStrength} competitive position`}
/>

<MetricCard
title="Win Rate"
value={`${winRate}%`}
detail="Awarded quotes vs submitted"
/>

<MetricCard
title="Awarded Revenue"
value={formatMoney(awardedRevenue)}
detail={`${awardedQuotes.length} awarded quotes`}
/>

<MetricCard
title="Submitted Quotes"
value={String(submittedQuotes)}
detail="Total supplier bids"
/>

<MetricCard
title="Lost Quotes"
value={String(lostQuotes.length)}
detail="Rejected or non-awarded bids"
/>

<MetricCard
title="Average Bid"
value={formatMoney(averageBid)}
detail="Average submitted quote"
/>

<MetricCard
title="Average Award"
value={formatMoney(averageAward)}
detail="Average awarded contract"
/>

<MetricCard
title="Company RFQs"
value={String(rfqList.length)}
detail={`${openRfqs.length} open opportunities`}
/>

<MetricCard
title="Pending Decisions"
value={String(pendingDecisions)}
detail="Open RFQs with quotes"
highlight={pendingDecisions > 0}
/>

<MetricCard
title="Open RFQs"
value={String(openRfqs.length)}
detail="Still accepting or reviewing bids"
/>

<MetricCard
title="Awards"
value={String(awardedQuotes.length)}
detail="Completed procurement wins"
/>
</section>

<section className="mt-8 rounded-[32px] border border-black/5 bg-white p-8">
<p className="text-xs font-black uppercase tracking-[0.3em] text-orange-500">
AI Supplier Ranking Engine
</p>

<div className="mt-4 grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
<div>
<h2 className="text-3xl font-black text-slate-950">
Supplier Performance Intelligence
</h2>

<p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
Nexus AI evaluates supplier quote activity, awarded contracts,
awarded revenue, procurement engagement, and marketplace
competitiveness to generate a supplier ranking profile.
</p>

<div className="mt-8 grid gap-4 md:grid-cols-3">
<MetricCard
title="Supplier Score"
value={'${procurementStore}/100'}
detail="AI weighted performance score"
/>

<MetricCard
title="Performance Grade"
value={performanceGrade}
detail="Overall supplier classification"
/>

<MetricCard
title="Marketplace Rank"
value={vendorRank}
detail="Position within supplier ecosystem"
/>
</div>
</div>

<div className="rounded-3xl bg-slate-50 p-6">
<p className="text-xs font-black uppercase tracking-[0.25em] text-slate-400">
Ranking Signals
</p>

<div className="mt-4 space-y-3">
<SignalRow
label="Win Rate"
value={`${winRate}%`}
/>
<SignalRow
label="Awarded Revenue"
value={formatMoney(awardedRevenue)}
/>
<SignalRow
label="Quote Volume"
value={String(submittedQuotes)}
/>

<SignalRow
label="Average Bid"
value={formatMoney(averageBid)}
/>

<SignalRow
label="Supplier Tier"
value={supplierTier}
/>

<SignalRow
label="Award Probability"
value={`${awardProbability}%`}
/>

<SignalRow
label="Risk Level"
value={supplierRisk}
/>

<SignalRow
label="Reputation"
value={marketplaceReputation}
/>

<SignalRow
label="Quote Competitiveness"
value={quoteCompetitiveness}
/>

<SignalRow
label="Recent Activity"
value={recentActivitySignal}
/>
n
<SignalRow
label="Award Count"
value={String(awardedQuotes.length)}
/>

<SignalRow
label="Award Revenue"
value={formatMoney(awardedRevenue)}
/>

<SignalRow
label="Quote Volume"
value={String(submittedQuotes)}
/>

<SignalRow
label="Average Bid"
value={formatMoney(averageBid)}
/>

<SignalRow
label="Competitive Strength"
value={competitiveStrength}
/>
</div>
</div>
</div>
</section>

<section className="mt-8 grid gap-8 lg:grid-cols-[1.5fr_0.8fr]">
<div className="rounded-[32px] border border-black/5 bg-white p-8">
<div className="flex items-center justify-between gap-6">
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
{pipelineRows.length > 0 ? (
pipelineRows.map(
({
rfq,
rfqQuotes,
lowestQuote,
awardedQuote,
isPendingDecision,
}) => (
<div
key={rfq.id}
className="rounded-[28px] border border-slate-200 bg-slate-50 p-6"
>
<div className="flex items-start justify-between gap-6">
<div>
<div className="flex flex-wrap items-center gap-3">
<p className="text-xs font-black uppercase tracking-[0.25em] text-orange-500">
{rfq.category || "Procurement"}
</p>

{isPendingDecision ? (
<span className="rounded-full bg-yellow-100 px-3 py-1 text-xs font-black text-yellow-700">
Decision Needed
</span>
) : null}
</div>

<h3 className="mt-2 text-2xl font-black text-slate-950">
{rfq.title || "Untitled RFQ"}
</h3>

<p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
{rfq.description || "No description provided."}
</p>

<div className="mt-5 flex flex-wrap gap-3">
<Badge className={getStatusClass(rfq.status)}>
{getStatusLabel(rfq.status)}
</Badge>

<Badge>{rfq.location || "No location"}</Badge>

<Badge>Budget {formatMoney(rfq.budget)}</Badge>

<Badge>{rfqQuotes.length} quotes</Badge>

{lowestQuote !== null ? (
<Badge>Lowest {formatMoney(lowestQuote)}</Badge>
) : null}

{awardedQuote ? (
<Badge className="bg-green-100 text-green-700">
Awarded {formatMoney(awardedQuote.amount)}
</Badge>
) : null}
</div>
</div>

<Link
href={`/rfq/${rfq.slug}`}
className="rounded-full bg-white px-5 py-3 text-sm font-black text-slate-950 shadow-sm transition hover:shadow-md"
>
Review →
</Link>
</div>
</div>
)
)
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
</div>

<aside className="space-y-8">
<section className="rounded-[32px] border border-black/5 bg-white p-8">
<p className="text-xs font-black uppercase tracking-[0.3em] text-orange-500">
Decision Queue
</p>

<h2 className="mt-3 text-3xl font-black text-slate-950">
Pending Reviews
</h2>

<div className="mt-6 space-y-4">
{pendingDecisionRfqs.length > 0 ? (
pendingDecisionRfqs.slice(0, 5).map((rfq) => {
const rfqQuotes = quoteList.filter(
(quote) => quote.rfq_id === rfq.id
);

return (
<Link
key={rfq.id}
href={`/rfq/${rfq.slug}/compare`}
className="block rounded-3xl border border-yellow-100 bg-yellow-50 p-5 transition hover:-translate-y-1 hover:shadow-lg"
>
<p className="text-lg font-black text-slate-950">
{rfq.title || "Untitled RFQ"}
</p>

<p className="mt-1 text-sm font-semibold text-yellow-700">
{rfqQuotes.length} quote
{rfqQuotes.length === 1 ? "" : "s"} ready for review
</p>

<p className="mt-4 text-sm font-black text-slate-950">
Open Compare →
</p>
</Link>
);
})
) : (
<EmptyState message="No RFQs are waiting for award decisions." />
)}
</div>
</section>

<section className="rounded-[32px] border border-black/5 bg-white p-8">
<p className="text-xs font-black uppercase tracking-[0.3em] text-orange-500">
Award Activity
</p>

<h2 className="mt-3 text-3xl font-black text-slate-950">
Recent Awards
</h2>

<div className="mt-6 space-y-4">
{recentAwards.length > 0 ? (
recentAwards.map((quote) => {
const rfq = rfqList.find(
(item) => item.id === quote.rfq_id
);

return (
<div
key={quote.id}
className="rounded-3xl border border-slate-100 bg-slate-50 p-5"
>
<div className="flex items-start justify-between gap-4">
<div>
<p className="text-lg font-black text-slate-950">
{rfq?.title || "Awarded RFQ"}
</p>

<p className="mt-1 text-sm font-semibold text-slate-500">
{rfq?.location || "Location N/A"}
</p>
</div>

<span className="rounded-full bg-green-100 px-3 py-1 text-xs font-black text-green-700">
Awarded
</span>
</div>

<p className="mt-4 text-2xl font-black text-slate-950">
{formatMoney(quote.amount)}
</p>
</div>
);
})
) : (
<EmptyState message="No awards have been recorded yet." />
)}
</div>
</section>
</aside>
</section>
</div>
</main>
);
}

function MetricCard({
title,
value,
detail,
highlight,
}: {
title: string;
value: string;
detail: string;
highlight?: boolean;
}) {
return (
<div
className={`rounded-3xl border p-7 ${
highlight ? "border-yellow-200 bg-yellow-50" : "border-black/5 bg-white"
}`}
>
<p className="text-xs font-black uppercase tracking-[0.2em] text-slate-500">
{title}
</p>

<p className="mt-3 text-3xl font-black text-slate-950">{value}</p>

<p className="mt-2 text-sm font-semibold text-slate-500">{detail}</p>
</div>
);
}

function MiniCard({ title, value }: { title: string; value: string }) {
return (
<div className="rounded-3xl bg-white p-5 shadow-sm">
<p className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">
{title}
</p>

<p className="mt-2 text-2xl font-black text-slate-950">{value}</p>
</div>
);
}

function SignalRow({ label, value }: { label: string; value: string }) {
return (
<div className="flex items-center justify-between rounded-2xl bg-white px-4 py-3 shadow-sm">
<p className="text-sm font-black text-slate-600">{label}</p>
<p className="text-sm font-black text-slate-950">{value}</p>
</div>
);
}

function Badge({
children,
className = "bg-white text-slate-600",
}: {
children: React.ReactNode;
className?: string;
}) {
return (
<span
className={`rounded-full px-3 py-1 text-xs font-bold shadow-sm ${className}`}
>
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