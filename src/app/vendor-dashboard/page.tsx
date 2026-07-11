import Link from "next/link";
import { ExecutiveMetricCard } from "@/components/executive/executive-metric-card";
import { SupplierCommandCenter } from "@/components/vendor-workspace/supplier-command-center";
import { SupplierScorecard } from "@/components/vendor-workspace/supplier-scorecard";
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

function getSupplierTier(score: number) {
if (score >= 95) return "Elite Supplier";
if (score >= 90) return "Platinum Supplier";
if (score >= 80) return "Gold Supplier";
if (score >= 70) return "Silver Supplier";
return "Developing Supplier";
}

function getSupplierRecommendation(score: number) {
if (score >= 90) return "Preferred Strategic Partner";
if (score >= 80) return "Approved High-Value Supplier";
if (score >= 70) return "Competitive Supplier";
return "Monitor and Develop";
}

function getRiskLevel(score: number) {
if (score >= 85) return "Low Risk";
if (score >= 65) return "Medium Risk";
return "High Risk";
}

function getHealthLabel(score: number) {
if (score >= 90) return "Excellent";
if (score >= 80) return "Strong";
if (score >= 70) return "Healthy";
if (score >= 60) return "Developing";
return "Limited Data";
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
const awardedQuotes = quoteList.filter((quote) => quote.decision === "awarded");
const lostQuotes = quoteList.filter((quote) => quote.decision === "rejected");
const pendingQuotes = quoteList.filter(
(quote) => !quote.decision || quote.decision === "pending"
);

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

const openRfqs = rfqList.filter((rfq) => !rfq.status || rfq.status === "open");

const pendingDecisionRfqs = openRfqs.filter((rfq) =>
quoteList.some((quote) => quote.rfq_id === rfq.id)
);

const pendingDecisions = pendingDecisionRfqs.length;

const participationScore = Math.min(100, submittedQuotes * 12);
const winScore = Math.min(100, winRate);
const revenueScore = Math.min(100, Math.round(awardedRevenue / 50000));
const awardVolumeScore = Math.min(100, awardedQuotes.length * 20);
const consistencyScore =
submittedQuotes > 0
? Math.max(25, 100 - Math.abs(submittedQuotes - awardedQuotes.length) * 8)
: 25;

const supplierScore = Math.min(
100,
Math.round(
participationScore * 0.2 +
winScore * 0.25 +
revenueScore * 0.2 +
awardVolumeScore * 0.2 +
consistencyScore * 0.15
)
);

const deliveryScore = Math.min(
100,
Math.round(65 + awardedQuotes.length * 8 + pendingQuotes.length * 2)
);

const qualityScore = Math.min(
100,
Math.round(60 + awardedQuotes.length * 9 + winRate * 0.25)
);

const commercialScore = Math.min(
100,
Math.round(winRate * 0.35 + revenueScore * 0.4 + participationScore * 0.25)
);

const riskScore = Math.min(
100,
Math.round(
100 -
Math.min(65, lostQuotes.length * 8 + (submittedQuotes <= 1 ? 20 : 0))
)
);

const supplierTier = getSupplierTier(supplierScore);
const supplierRisk = getRiskLevel(riskScore);
const supplierRecommendation = getSupplierRecommendation(supplierScore);
const supplierHealth = getHealthLabel(supplierScore);

const awardProbability = Math.min(
99,
Math.max(
25,
Math.round(
winRate * 0.45 +
awardedQuotes.length * 12 +
Math.min(awardedRevenue / 30000, 25) +
Math.min(submittedQuotes * 4, 18)
)
)
);

const executiveRecommendation =
supplierScore >= 90
? "This supplier profile demonstrates strong award performance, healthy commercial momentum, and low procurement risk. Maintain preferred supplier status and consider increased RFQ allocation."
: supplierScore >= 75
? "This supplier is performing well and should remain active in competitive procurement events while monitoring delivery, pricing, and award consistency."
: supplierScore >= 60
? "This supplier has a developing performance profile. Continue collecting quote history and monitor win rate, revenue conversion, and risk signals."
: "Supplier data is limited. Increase RFQ participation and award history before assigning strategic supplier status.";

const nextBestAction =
  submittedQuotes === 0
    ? "Explore active RFQ opportunities and submit the first competitive quotation."
    : winRate < 25
      ? "Review pricing competitiveness and proposal quality before the next quotation submission."
      : pendingDecisions > 0
        ? "Monitor pending award decisions and prepare for clarification or negotiation requests."
        : "Maintain quotation discipline and expand participation in strategically aligned RFQ opportunities.";
        
const pipelineRows = rfqList.map((rfq) => {
const rfqQuotes = quoteList.filter((quote) => quote.rfq_id === rfq.id);

const amounts = rfqQuotes
.map((quote) => Number(quote.amount))
.filter((amount) => Number.isFinite(amount));

const lowestQuote = amounts.length > 0 ? Math.min(...amounts) : null;

const awardedQuote = rfqQuotes.find((quote) => quote.decision === "awarded");

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
<SupplierCommandCenter
  supplierTier={supplierTier}
  supplierHealth={supplierHealth}
  supplierRisk={supplierRisk}
  supplierRecommendation={supplierRecommendation}
  supplierScore={supplierScore}
  awardProbability={awardProbability}
  winRate={winRate}
  executiveBrief={executiveRecommendation}
  nextBestAction={nextBestAction}
  commandMetrics={[
    {
      title: "Commercial Score",
      value: `${commercialScore}/100`,
      detail: "Award conversion, revenue, and quotation participation",
      accentClassName: "text-cyan-300",
    },
    {
      title: "Delivery Score",
      value: `${deliveryScore}/100`,
      detail: "Estimated schedule reliability",
      accentClassName: "text-[#F5D77B]",
    },
    {
      title: "Quality Score",
      value: `${qualityScore}/100`,
      detail: "Award consistency and proposal quality",
      accentClassName: "text-emerald-300",
    },
  ]}
  stripItems={[
    {
      title: "Submitted Quotes",
      value: String(submittedQuotes),
    },
    {
      title: "Awarded Revenue",
      value: formatMoney(awardedRevenue),
    },
    {
      title: "Pending Decisions",
      value: String(pendingDecisions),
    },
    {
      title: "Open RFQs",
      value: String(openRfqs.length),
    },
  ]}
/>

<section className="mt-8 grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
  <ExecutiveMetricCard
    label="Supplier Score"
    value={`${supplierScore}/100`}
    insight={supplierTier}
    tone={supplierScore >= 80 ? "success" : "gold"}
  />

  <ExecutiveMetricCard
    label="Commercial Score"
    value={`${commercialScore}/100`}
    insight="Win rate, awarded revenue, and quotation participation"
    tone="blue"
  />

  <ExecutiveMetricCard
    label="Delivery Score"
    value={`${deliveryScore}/100`}
    insight="Estimated schedule reliability"
    tone="blue"
  />

  <ExecutiveMetricCard
    label="Quality Score"
    value={`${qualityScore}/100`}
    insight="Award consistency and proposal quality"
    tone="success"
  />

  <ExecutiveMetricCard
    label="Submitted Quotes"
    value={String(submittedQuotes)}
    insight="Total supplier quotations submitted"
    tone="neutral"
  />

  <ExecutiveMetricCard
    label="Win Rate"
    value={`${winRate}%`}
    insight="Awards secured relative to submitted quotations"
    tone={winRate >= 50 ? "success" : "gold"}
  />

  <ExecutiveMetricCard
    label="Awarded Revenue"
    value={formatMoney(awardedRevenue)}
    insight={`${awardedQuotes.length} awarded quotation${
      awardedQuotes.length === 1 ? "" : "s"
    }`}
    tone="success"
    valueClassName="text-2xl"
  />

  <ExecutiveMetricCard
    label="Average Award"
    value={formatMoney(averageAward)}
    insight="Average awarded contract value"
    tone="gold"
    valueClassName="text-2xl"
  />

  <ExecutiveMetricCard
    label="Average Bid"
    value={formatMoney(averageBid)}
    insight="Average submitted quotation value"
    tone="blue"
    valueClassName="text-2xl"
  />

  <ExecutiveMetricCard
    label="Pending Decisions"
    value={String(pendingDecisions)}
    insight="Open RFQs with submitted quotations awaiting review"
    tone={pendingDecisions > 0 ? "gold" : "neutral"}
  />

  <ExecutiveMetricCard
    label="Unsuccessful Quotes"
    value={String(lostQuotes.length)}
    insight="Rejected or non-awarded quotations"
    tone={lostQuotes.length > 0 ? "risk" : "neutral"}
  />

  <ExecutiveMetricCard
    label="Open RFQs"
    value={String(openRfqs.length)}
    insight="Active opportunities accepting or reviewing quotations"
    tone="blue"
  />
</section>
<SupplierScorecard
  commercialScore={commercialScore}
  deliveryScore={deliveryScore}
  qualityScore={qualityScore}
  riskScore={riskScore}
  supplierTier={supplierTier}
  supplierRecommendation={supplierRecommendation}
  supplierRisk={supplierRisk}
  supplierHealth={supplierHealth}
  awardProbability={awardProbability}
  totalBidVolume={formatMoney(totalBidVolume)}
  awardedRevenue={formatMoney(awardedRevenue)}
  submittedQuotes={submittedQuotes}
/>

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
<EmptyState message="No company RFQs found. Create RFQs from the marketplace to start building supplier activity." />
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
const rfq = rfqList.find((item) => item.id === quote.rfq_id);

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
