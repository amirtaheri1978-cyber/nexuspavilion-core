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
company_id: string | null;
amount: number | string | null;
decision: string | null;
created_at: string | null;
};

type VendorPerformance = {
submittedQuotes: number;
awardedQuotes: number;
awardedRevenue: number;
totalBidValue: number;
averageBid: number;
winRate: number;
};

type ActivityLog = {
id: string;
action: string | null;
entity_type: string | null;
metadata: Record<string, unknown> | null;
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

function formatDate(value: string | null) {
if (!value) return "N/A";

return new Intl.DateTimeFormat("en", {
month: "short",
day: "numeric",
year: "numeric",
}).format(new Date(value));
}

function getActivityLabel(action: string | null) {
if (action === "CONTRACT_AWARDED") return "Contract Awarded";
if (action === "QUOTE_SUBMITTED") return "Quote Submitted";
if (action === "RFQ_CREATED") return "RFQ Created";
if (action === "INVITATION_CREATED") return "Invitation Created";
if (action === "INVITATION_REVOKED") return "Invitation Revoked";
if (action === "MEMBER_ROLE_UPDATED") return "Member Role Updated";
if (action === "MEMBER_REMOVED") return "Member Removed";

return action || "Activity";
}

function getActivityIcon(action: string | null) {
if (action === "CONTRACT_AWARDED") return "🏆";
if (action === "QUOTE_SUBMITTED") return "💰";
if (action === "RFQ_CREATED") return "📋";
if (action === "INVITATION_CREATED") return "📨";
if (action === "INVITATION_REVOKED") return "⛔";
if (action === "MEMBER_ROLE_UPDATED") return "👥";
if (action === "MEMBER_REMOVED") return "🗑️";

return "⚡";
}

function getActivityDetail(log: ActivityLog) {
const metadata = log.metadata || {};

if (log.action === "CONTRACT_AWARDED") {
const title = metadata.rfq_title || "Procurement contract";
const amount = Number(metadata.awarded_amount || 0);

return `${title} awarded at $${amount.toLocaleString()}.`;
}

if (log.action === "QUOTE_SUBMITTED") {
const title = metadata.rfq_title || "RFQ";
const amount = Number(metadata.amount || 0);

return `Quote submitted for ${title} at $${amount.toLocaleString()}.`;
}

if (log.action === "RFQ_CREATED") {
const title = metadata.title || metadata.rfq_title || "New RFQ";

return `${title} was created.`;
}

if (log.action === "INVITATION_CREATED") {
const email = metadata.email || "A user";
const role = metadata.role || "member";

return `${email} was invited as ${role}.`;
}

if (log.action === "INVITATION_REVOKED") {
const email = metadata.email || "An invitation";

return `${email} was revoked.`;
}

if (log.action === "MEMBER_ROLE_UPDATED") {
const email = metadata.email || "A member";
const role = metadata.role || metadata.new_role || "updated role";

return `${email} role updated to ${role}.`;
}

if (log.action === "MEMBER_REMOVED") {
const email = metadata.email || "A member";

return `${email} was removed from the workspace.`;
}

return log.entity_type
? `${log.entity_type} activity was recorded.`
: "Workspace activity was recorded.";
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

const { data: activityLogs } = await supabase
.from("audit_logs")
.select("id, action, entity_type, metadata, created_at")
.eq("company_id", company.id)
.order("created_at", { ascending: false })
.limit(10);

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
const activityList = (activityLogs ?? []) as ActivityLog[];

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

const vendorCompanyQuotes = quoteList.filter(
(quote) => quote.company_id === company.id
);

const vendorSubmittedQuotes = vendorCompanyQuotes.length;

const vendorAwardedQuotes = vendorCompanyQuotes.filter(
(quote) => quote.decision === "awarded"
);

const vendorAwardedRevenue = vendorAwardedQuotes.reduce((total, quote) => {
const amount = Number(quote.amount);
return total + (Number.isNaN(amount) ? 0 : amount);
}, 0);

const vendorTotalBidValue = vendorCompanyQuotes.reduce((total, quote) => {
const amount = Number(quote.amount);
return total + (Number.isNaN(amount) ? 0 : amount);
}, 0);

const vendorAverageBid =
vendorSubmittedQuotes > 0
? Math.round(vendorTotalBidValue / vendorSubmittedQuotes)
: 0;

const vendorWinRate =
vendorSubmittedQuotes > 0
? Math.round((vendorAwardedQuotes.length / vendorSubmittedQuotes) * 100)
: 0;

const isVendorProfile =
String(company.network_role || "").toLowerCase().includes("vendor") ||
String(company.network_role || "").toLowerCase().includes("supplier");

const supplierParticipationScore = Math.min(100, vendorSubmittedQuotes * 8);
const supplierRevenueScore = Math.min(100, vendorAwardedRevenue / 5000);

const supplierFinancialRisk = Math.max(
5,
Math.round(100 - vendorAwardedRevenue / 5000)
);

const supplierPerformanceRisk = Math.max(5, Math.round(100 - vendorWinRate));

const supplierCapacityRisk =
vendorSubmittedQuotes <= 1 ? 70 : vendorSubmittedQuotes <= 3 ? 45 : 20;

const supplierDependencyRisk = vendorAwardedRevenue > 100000 ? 35 : 70;

const supplierFinancialScore = Math.max(0, 100 - supplierFinancialRisk);
const supplierPerformanceScore = Math.max(0, 100 - supplierPerformanceRisk);
const supplierDependencyScore = Math.max(0, 100 - supplierDependencyRisk);

const supplierIntelligenceScore = Math.min(
100,
Math.round(
supplierFinancialScore * 0.15 +
supplierPerformanceScore * 0.25 +
supplierDependencyScore * 0.15 +
vendorWinRate * 0.25 +
supplierParticipationScore * 0.1 +
supplierRevenueScore * 0.1
)
);

const supplierTier =
supplierIntelligenceScore >= 90
? "Platinum Supplier"
: supplierIntelligenceScore >= 80
? "Gold Supplier"
: supplierIntelligenceScore >= 65
? "Silver Supplier"
: "Developing Supplier";

const supplierRecommendation =
supplierIntelligenceScore >= 90
? "Preferred Supplier"
: supplierIntelligenceScore >= 80
? "Strategic Supplier"
: supplierIntelligenceScore >= 65
? "Approved Supplier"
: "Monitor Supplier";

const supplierRiskLevel =
supplierIntelligenceScore >= 80
? "Low Risk"
: supplierIntelligenceScore >= 60
? "Medium Risk"
: "High Risk";

const procurementFitScore = Math.min(
100,
Math.round(
supplierIntelligenceScore * 0.5 +
vendorWinRate * 0.25 +
supplierParticipationScore * 0.25
)
);

const supplierExecutiveAction =
supplierIntelligenceScore >= 80
? "Increase RFQ allocation and consider this company for preferred supplier workflows."
: supplierIntelligenceScore >= 65
? "Continue inviting this supplier while monitoring pricing, delivery consistency, and quote activity."
: "Monitor this supplier closely and improve quote volume, win rate, and award performance before increasing dependency.";

const supplierStrength =
vendorWinRate >= 50
? "Strong award conversion"
: vendorSubmittedQuotes >= 3
? "Active procurement participation"
: "Early supplier engagement";

const supplierWeakness =
vendorSubmittedQuotes <= 1
? "Limited quote history"
: vendorWinRate < 25
? "Low award conversion"
: "Dependency and capacity should continue to be monitored.";

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
<div className="rounded-[32px] border border-black/5 bg-white p-8 lg:col-span-2">
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
{isVendorProfile ? (
<section className="mt-8 rounded-[36px] border border-slate-200 bg-slate-950 p-8 text-white">
<p className="text-xs font-black uppercase tracking-[0.3em] text-orange-400">
AI Supplier Profile Intelligence
</p>

<div className="mt-5 grid gap-8 lg:grid-cols-[1fr_0.9fr]">
<div>
<h2 className="text-4xl font-black">
Supplier Intelligence Profile
</h2>

<p className="mt-4 max-w-3xl text-sm leading-7 text-slate-300">
{supplierExecutiveAction}
</p>
</div>

<div className="grid gap-4 sm:grid-cols-2">
<div className="rounded-2xl bg-white/10 p-5">
<p className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">
Supplier Score
</p>
<p className="mt-2 text-3xl font-black">
{supplierIntelligenceScore}/100
</p>
</div>

<div className="rounded-2xl bg-white/10 p-5">
<p className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">
Supplier Tier
</p>
<p className="mt-2 text-3xl font-black">
{supplierTier}
</p>
</div>

<div className="rounded-2xl bg-white/10 p-5">
<p className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">
Procurement Fit
</p>
<p className="mt-2 text-3xl font-black">
{procurementFitScore}/100
</p>
</div>

<div className="rounded-2xl bg-white/10 p-5">
<p className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">
Recommendation
</p>
<p className="mt-2 text-2xl font-black">
{supplierRecommendation}
</p>
</div>
</div>
</div>

<div className="mt-8 grid gap-4 md:grid-cols-4">
<div className="rounded-2xl bg-white/5 p-5">
<p className="text-xs font-black uppercase tracking-[0.2em] text-orange-400">
Risk Level
</p>
<p className="mt-3 text-sm font-semibold text-slate-300">
{supplierRiskLevel}
</p>
</div>

<div className="rounded-2xl bg-white/5 p-5">
<p className="text-xs font-black uppercase tracking-[0.2em] text-orange-400">
Strength
</p>
<p className="mt-3 text-sm font-semibold text-slate-300">
{supplierStrength}
</p>
</div>

<div className="rounded-2xl bg-white/5 p-5">
<p className="text-xs font-black uppercase tracking-[0.2em] text-orange-400">
Watch Item
</p>
<p className="mt-3 text-sm font-semibold text-slate-300">
{supplierWeakness}
</p>
</div>

<div className="rounded-2xl bg-white/5 p-5">
<p className="text-xs font-black uppercase tracking-[0.2em] text-orange-400">
Win Probability
</p>
<p className="mt-3 text-sm font-semibold text-slate-300">
{vendorWinRate}%
</p>
</div>
</div>
</section>
) : null}

<section className="mt-8 rounded-[32px] border border-black/5 bg-white p-8">
<div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
<div>
<p className="text-xs font-black uppercase tracking-[0.3em] text-orange-500">
Procurement Activity
</p>

<h2 className="mt-3 text-3xl font-black text-slate-950">
Recent Procurement Activity
</h2>

<p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
Live company activity from RFQ creation, supplier submissions,
contract awards, invitations, and workspace management.
</p>
</div>

<Link
href="/analytics"
className="rounded-full bg-slate-950 px-5 py-3 text-sm font-bold text-white"
>
Open Analytics
</Link>
</div>

<div className="mt-6 space-y-4">
{activityList.length > 0 ? (
activityList.map((log) => (
<div
key={log.id}
className="rounded-3xl border border-slate-100 bg-slate-50 p-5"
>
<div className="flex items-start gap-4">
<div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white text-2xl shadow-sm">
{getActivityIcon(log.action)}
</div>

<div className="min-w-0 flex-1">
<div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
<div>
<p className="text-lg font-black text-slate-950">
{getActivityLabel(log.action)}
</p>

<p className="mt-1 text-sm leading-6 text-slate-600">
{getActivityDetail(log)}
</p>
</div>

<span className="rounded-full bg-white px-3 py-1 text-xs font-black text-slate-500 shadow-sm">
{formatDate(log.created_at)}
</span>
</div>

<p className="mt-3 text-xs font-black uppercase tracking-[0.2em] text-slate-400">
{log.entity_type || "activity"}
</p>
</div>
</div>
</div>
))
) : (
<EmptyState message="No procurement activity has been recorded yet." />
)}
</div>
</section>
{isVendorProfile ? (
<section className="mt-8 rounded-[32px] border border-black/5 bg-white p-8">
<p className="text-xs font-black uppercase tracking-[0.3em] text-orange-500">
Vendor Performance
</p>

<h2 className="mt-3 text-3xl font-black text-slate-950">
Supplier Scorecard
</h2>

<p className="mt-4 max-w-4xl text-sm leading-7 text-slate-600">
Performance summary based on submitted quotes, awarded contracts,
win rate, awarded revenue, and average bid value across the Nexus
Pavilion procurement network.
</p>

<div className="mt-8 grid gap-6 md:grid-cols-3 xl:grid-cols-6">
<MetricCard
title="Quotes"
value={String(vendorSubmittedQuotes)}
detail="Submitted bids"
/>

<MetricCard
title="Awards"
value={String(vendorAwardedQuotes.length)}
detail="Contracts won"
/>

<MetricCard
title="Win Rate"
value={`${vendorWinRate}%`}
detail="Awards vs quotes"
/>

<MetricCard
title="Awarded Revenue"
value={`$${vendorAwardedRevenue.toLocaleString()}`}
detail="Total won value"
/>

<MetricCard
title="Average Bid"
value={`$${vendorAverageBid.toLocaleString()}`}
detail="Average submitted quote"
/>

<MetricCard
title="Bid Volume"
value={`$${vendorTotalBidValue.toLocaleString()}`}
detail="Total quoted value"
/>
</div>

<div className="mt-8 rounded-3xl border border-slate-100 bg-slate-50 p-6">
<div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
<div>
<p className="text-xs font-black uppercase tracking-[0.25em] text-slate-400">
Vendor Ranking Signal
</p>

<h3 className="mt-2 text-2xl font-black text-slate-950">
{vendorWinRate >= 50
? "Preferred Vendor"
: vendorWinRate >= 25
? "Qualified Vendor"
: "Emerging Vendor"}
</h3>

<p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
This scorecard helps buyers evaluate supplier reliability,
pricing activity, and historical award performance.
</p>
</div>

<span className="rounded-full bg-white px-5 py-3 text-sm font-black text-slate-700 shadow-sm">
{vendorWinRate}% Win Rate
</span>
</div>
</div>
</section>
) : null}
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