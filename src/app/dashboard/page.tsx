import Link from "next/link";
import { redirect } from "next/navigation";

import SignOutButton from "@/components/sign-out-button";
import { createClient } from "@/lib/supabase/server";

type Experience = "owner" | "vendor" | "consultant";

type ProcurementScope =
| "material"
| "subcontractor"
| "equipment"
| "professional_service";

type SourcingMethod = "open" | "invited" | "sealed_bid";

type ContractFramework = "project_specific" | "framework";

type RFQ = {
id: string;
slug: string | null;
title: string | null;
category: string | null;
location: string | null;
budget: number | string | null;
status: string | null;
created_at: string | null;
procurement_scope: ProcurementScope | null;
sourcing_method: SourcingMethod | null;
contract_framework: ContractFramework | null;
};

type Quote = {
id: string;
rfq_id: string;
amount: number | string | null;
decision: string | null;
created_at: string | null;
};

type Notification = {
id: string;
title: string | null;
message: string | null;
type: string | null;
created_at: string | null;
};

type Company = {
id: string;
name: string | null;
slug: string | null;
category: string | null;
location: string | null;
network_role: string | null;
status: string | null;
logo_url: string | null;
};

type ActivityEvent = {
id: string;
title: string;
description: string;
type: string;
severity: "success" | "info" | "warning" | "critical";
createdAt: string | null;
href: string;
};

type WorkspaceAlert = {
level: "healthy" | "opportunity" | "warning";
title: string;
message: string;
};

const PROCUREMENT_SCOPE_LABELS: Record<ProcurementScope, string> = {
material: "Material RFQs",
subcontractor: "Trade RFQs",
equipment: "Equipment RFQs",
professional_service: "Service RFQs",
};

const SOURCING_METHOD_LABELS: Record<SourcingMethod, string> = {
open: "Open RFQs",
invited: "Invited RFQs",
sealed_bid: "Sealed Bid RFQs",
};

const CONTRACT_FRAMEWORK_LABELS: Record<ContractFramework, string> = {
project_specific: "Project-Specific",
framework: "Framework Agreement",
};

function normalizeText(value: string | null | undefined) {
return String(value || "").trim().toLowerCase();
}

function getExperience(role: string | null, networkRole: string | null): Experience {
const normalizedRole = normalizeText(role);
const normalizedNetworkRole = normalizeText(networkRole);

if (
normalizedNetworkRole.includes("architect") ||
normalizedNetworkRole.includes("engineer") ||
normalizedNetworkRole.includes("consultant")
) {
return "consultant";
}

if (
normalizedRole === "vendor" ||
normalizedNetworkRole.includes("supplier") ||
normalizedNetworkRole.includes("vendor") ||
normalizedNetworkRole.includes("manufacturer") ||
normalizedNetworkRole.includes("distributor") ||
normalizedNetworkRole.includes("trade")
) {
return "vendor";
}

return "owner";
}

function getProcurementScope(value: ProcurementScope | null | undefined) {
if (value && PROCUREMENT_SCOPE_LABELS[value]) return value;
return "subcontractor";
}

function getSourcingMethod(value: SourcingMethod | null | undefined) {
if (value && SOURCING_METHOD_LABELS[value]) return value;
return "invited";
}

function getContractFramework(value: ContractFramework | null | undefined) {
if (value && CONTRACT_FRAMEWORK_LABELS[value]) return value;
return "project_specific";
}

function formatMoney(value: number | string | null | undefined) {
const amount = Number(value);

if (!Number.isFinite(amount)) {
return "$0";
}

return `$${amount.toLocaleString()}`;
}

function formatRelativeTime(value: string | null | undefined) {
if (!value) return "Recently";

const date = new Date(value);
const now = new Date();
const diff = now.getTime() - date.getTime();

if (Number.isNaN(diff)) return "Recently";

const minutes = Math.floor(diff / 60000);
const hours = Math.floor(minutes / 60);
const days = Math.floor(hours / 24);

if (minutes < 1) return "Just now";
if (minutes < 60) return `${minutes} min ago`;
if (hours < 24) return `${hours} hr ago`;
if (days < 7) return `${days} day${days === 1 ? "" : "s"} ago`;

return date.toLocaleDateString();
}

function getNotificationSeverity(type: string | null): ActivityEvent["severity"] {
const normalized = String(type || "").toLowerCase();

if (normalized.includes("award")) return "success";
if (normalized.includes("risk")) return "warning";
if (normalized.includes("error")) return "critical";

return "info";
}

function buildActivityFeed({
notifications,
rfqs,
awardedQuotes,
}: {
notifications: Notification[];
rfqs: RFQ[];
awardedQuotes: Quote[];
}) {
const notificationEvents: ActivityEvent[] = notifications.map((item) => ({
id: `notification-${item.id}`,
title: item.title || "Platform Activity",
description: item.message || "A procurement activity was recorded.",
type: item.type || "event",
severity: getNotificationSeverity(item.type),
createdAt: item.created_at,
href: "/notifications",
}));

const rfqEvents: ActivityEvent[] = rfqs.slice(0, 5).map((rfq) => {
const scope = PROCUREMENT_SCOPE_LABELS[getProcurementScope(rfq.procurement_scope)];

return {
id: `rfq-${rfq.id}`,
title: rfq.status === "awarded" ? "RFQ Awarded" : "RFQ Activity",
description: `${rfq.title || "Untitled RFQ"} · ${scope} · ${
rfq.location || "Location N/A"
}`,
type: rfq.status || "rfq",
severity: rfq.status === "awarded" ? "success" : "info",
createdAt: rfq.created_at,
href: rfq.slug ? `/rfq/${rfq.slug}` : "/rfq",
};
});

const awardEvents: ActivityEvent[] = awardedQuotes.slice(0, 5).map((quote) => {
const rfq = rfqs.find((item) => item.id === quote.rfq_id);

return {
id: `award-${quote.id}`,
title: "Contract Awarded",
description: `${rfq?.title || "Awarded RFQ"} · ${formatMoney(
quote.amount
)}`,
type: "award",
severity: "success",
createdAt: quote.created_at,
href: rfq?.slug ? `/rfq/${rfq.slug}` : "/rfq",
};
});

return [...notificationEvents, ...awardEvents, ...rfqEvents]
.sort((a, b) => {
const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;

return dateB - dateA;
})
.slice(0, 8);
}

function getDashboardCopy(experience: Experience) {
if (experience === "vendor") {
return {
eyebrow: "Supplier Workspace",
title: "Supplier Opportunity Command Center",
subtitle:
"Track open RFQs, submitted quotes, award outcomes, customer activity, and supplier growth signals.",
heroLabel: "Supplier Growth Center",
heroTitle: "Construction Opportunity Pipeline",
heroDescription:
"Monitor RFQ access by material, trade, equipment, service, sourcing method, and contract framework.",
recommendation:
"Prioritize high-fit RFQs, improve quote coverage, and focus on opportunities that match your supplier category and delivery capacity.",
companyLabel: "My Supplier Company",
analyticsLabel: "Supplier Intelligence",
analyticsTitle: "Opportunity & Quote Analytics",
activityLabel: "Supplier Activity Center",
activityTitle: "Live Supplier Timeline",
};
}

if (experience === "consultant") {
return {
eyebrow: "Consultant Workspace",
title: "Project Advisory Command Center",
subtitle:
"Track project opportunities, advisory activity, client signals, and professional service visibility.",
heroLabel: "Advisory Command Center",
heroTitle: "Professional Services Intelligence",
heroDescription:
"Monitor project RFQs, advisory opportunities, professional service demand, and client engagement signals.",
recommendation:
"Strengthen company profile, monitor professional service opportunities, and support procurement workflows with advisory expertise.",
companyLabel: "My Advisory Company",
analyticsLabel: "Consultant Intelligence",
analyticsTitle: "Advisory Activity Analytics",
activityLabel: "Consultant Activity Center",
activityTitle: "Live Advisory Timeline",
};
}

return {
eyebrow: "Executive Workspace",
title: "Executive Procurement Command Center",
subtitle:
"Monitor RFQ mix, awards, supplier participation, sourcing method, framework agreements, procurement risk, and board-level intelligence.",
heroLabel: "CEO Command Center",
heroTitle: "Construction Procurement Control Tower",
heroDescription:
"Track procurement health, RFQ classification maturity, supplier concentration, award performance, and executive reporting confidence.",
recommendation:
"Prioritize competitive supplier participation, improve RFQ classification maturity, review award concentration, and scale construction procurement intelligence.",
companyLabel: "My Enterprise Company",
analyticsLabel: "Construction Procurement Intelligence",
analyticsTitle: "Executive Analytics",
activityLabel: "Activity Command Center",
activityTitle: "Live Procurement Timeline",
};
}
export default async function DashboardPage() {
const supabase = await createClient();

const {
data: { user },
} = await supabase.auth.getUser();

const { data: profile } = user
? await supabase
.from("profiles")
.select("id, email, role, company_id")
.eq("id", user.id)
.single()
: { data: null };

if (!profile?.company_id) {
redirect("/create-company");
}

const { data: company } = await supabase
.from("companies")
.select("id, name, slug, category, location, network_role, status, logo_url")
.eq("id", profile.company_id)
.single();

const currentCompany = company as Company | null;
const experience = getExperience(
profile.role,
currentCompany?.network_role || null
);
const dashboardCopy = getDashboardCopy(experience);

const { data: rfqs } = await supabase
.from("rfqs")
.select("*")
.eq("company_id", profile.company_id)
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

const { data: notifications } = await supabase
.from("notifications")
.select("*")
.eq("company_id", profile.company_id)
.order("created_at", { ascending: false })
.limit(8);

const notificationList = (notifications ?? []) as Notification[];

const totalRfqs = rfqList.length;

const openRfqs = rfqList.filter(
(rfq) => !rfq.status || rfq.status === "open"
).length;

const awardedRfqs = rfqList.filter((rfq) => rfq.status === "awarded").length;
const closedRfqs = rfqList.filter((rfq) => rfq.status === "closed").length;

const submittedQuotes = quoteList.length;

const awardedQuotes = quoteList.filter(
(quote) => quote.decision === "awarded"
);

const materialRfqs = rfqList.filter(
(rfq) => getProcurementScope(rfq.procurement_scope) === "material"
).length;

const tradeRfqs = rfqList.filter(
(rfq) => getProcurementScope(rfq.procurement_scope) === "subcontractor"
).length;

const equipmentRfqs = rfqList.filter(
(rfq) => getProcurementScope(rfq.procurement_scope) === "equipment"
).length;

const serviceRfqs = rfqList.filter(
(rfq) =>
getProcurementScope(rfq.procurement_scope) === "professional_service"
).length;

const openMarketRfqs = rfqList.filter(
(rfq) => getSourcingMethod(rfq.sourcing_method) === "open"
).length;

const invitedRfqs = rfqList.filter(
(rfq) => getSourcingMethod(rfq.sourcing_method) === "invited"
).length;

const sealedBidRfqs = rfqList.filter(
(rfq) => getSourcingMethod(rfq.sourcing_method) === "sealed_bid"
).length;

const frameworkRfqs = rfqList.filter(
(rfq) => getContractFramework(rfq.contract_framework) === "framework"
).length;

const projectSpecificRfqs = rfqList.filter(
(rfq) =>
getContractFramework(rfq.contract_framework) === "project_specific"
).length;

const constructionClassificationScore = Math.min(
100,
Math.round(
(totalRfqs > 0 ? 35 : 0) +
(materialRfqs > 0 ? 10 : 0) +
(tradeRfqs > 0 ? 10 : 0) +
(equipmentRfqs > 0 ? 10 : 0) +
(serviceRfqs > 0 ? 10 : 0) +
(openMarketRfqs > 0 ? 8 : 0) +
(invitedRfqs > 0 ? 8 : 0) +
(sealedBidRfqs > 0 ? 9 : 0)
)
);

const procurementMixStatus =
constructionClassificationScore >= 80
? "Mature RFQ Mix"
: constructionClassificationScore >= 60
? "Developing RFQ Mix"
: constructionClassificationScore >= 35
? "Early RFQ Mix"
: "No RFQ Mix Yet";

const dominantScope =
[
{ label: "Material", value: materialRfqs },
{ label: "Trade", value: tradeRfqs },
{ label: "Equipment", value: equipmentRfqs },
{ label: "Service", value: serviceRfqs },
].sort((a, b) => b.value - a.value)[0]?.label || "N/A";

const dominantSourcing =
[
{ label: "Open", value: openMarketRfqs },
{ label: "Invited", value: invitedRfqs },
{ label: "Sealed Bid", value: sealedBidRfqs },
].sort((a, b) => b.value - a.value)[0]?.label || "N/A";

const totalAwardedSpend = awardedQuotes.reduce((total, quote) => {
const amount = Number(quote.amount);
return total + (Number.isNaN(amount) ? 0 : amount);
}, 0);

const averageAward =
awardedQuotes.length > 0
? Math.round(totalAwardedSpend / awardedQuotes.length)
: 0;

const awardRate =
totalRfqs > 0 ? Math.round((awardedRfqs / totalRfqs) * 100) : 0;

const totalBudget = rfqList.reduce((total, rfq) => {
const budget = Number(rfq.budget);
return total + (Number.isNaN(budget) ? 0 : budget);
}, 0);

const estimatedSavings = Math.max(totalBudget - totalAwardedSpend, 0);

const procurementHealthScore = Math.min(
100,
Math.round(
awardRate * 0.3 +
Math.min(submittedQuotes * 8, 25) +
Math.min(awardedQuotes.length * 12, 20) +
(estimatedSavings > 0 ? 10 : 0) +
constructionClassificationScore * 0.15
)
);

const riskIndex = Math.max(0, 100 - procurementHealthScore);

const forecastAccuracy =
procurementHealthScore >= 80
? 92
: procurementHealthScore >= 65
? 84
: procurementHealthScore >= 50
? 76
: 65;

const supplierConcentration =
awardedQuotes.length <= 1
? "High"
: awardedQuotes.length <= 3
? "Medium"
: "Low";

const executiveStatus =
procurementHealthScore >= 85
? "Excellent"
: procurementHealthScore >= 70
? "Healthy"
: procurementHealthScore >= 55
? "Moderate"
: "Needs Attention";

const vendorWinRate =
submittedQuotes > 0
? Math.round((awardedQuotes.length / submittedQuotes) * 100)
: 0;

const pipelineValue = quoteList.reduce((total, quote) => {
const amount = Number(quote.amount);
return total + (Number.isNaN(amount) ? 0 : amount);
}, 0);

const activityFeed = buildActivityFeed({
notifications: notificationList,
rfqs: rfqList,
awardedQuotes,
});

const alerts: WorkspaceAlert[] = [];

if (constructionClassificationScore < 60 && experience === "owner") {
alerts.push({
level: "warning",
title: "RFQ Classification Maturity Is Low",
message:
"Improve material, trade, equipment, service, sourcing, and framework classification to strengthen analytics quality.",
});
}

if (experience === "vendor") {
if (openRfqs > 0) {
alerts.push({
level: "opportunity",
title: "Open RFQs Available",
message:
"Review active construction RFQs and prioritize high-fit opportunities.",
});
}

if (submittedQuotes < 3) {
alerts.push({
level: "warning",
title: "Quote Pipeline Is Early",
message:
"Submit more quotes to improve supplier visibility and award probability.",
});
}

if (vendorWinRate > 0) {
alerts.push({
level: "healthy",
title: "Award Conversion Active",
message: "Your submitted quotes are converting into award outcomes.",
});
}
} else if (experience === "consultant") {
alerts.push({
level: "healthy",
title: "Advisory Workspace Active",
message:
"Monitor professional service opportunities and strengthen advisory visibility.",
});

if (serviceRfqs > 0 || openRfqs > 0) {
alerts.push({
level: "opportunity",
title: "Project Activity Available",
message:
"Review active project opportunities and professional service workflows.",
});
}
} else {
if (riskIndex >= 55) {
alerts.push({
level: "warning",
title: "Procurement Risk Requires Attention",
message:
"Risk exposure is elevated. Review RFQ activity, sourcing method, and award conversion.",
});
}

if (estimatedSavings > 0) {
alerts.push({
level: "opportunity",
title: "Savings Opportunity Available",
message:
"Budget-to-award spread indicates potential procurement savings.",
});
}

if (submittedQuotes < 3) {
alerts.push({
level: "warning",
title: "Supplier Participation Is Limited",
message:
"Invite more vendors to improve competition and pricing quality.",
});
}

if (forecastAccuracy >= 75) {
alerts.push({
level: "healthy",
title: "Forecast Confidence Is Active",
message:
"Procurement data is sufficient for executive forecasting signals.",
});
}
}

const topRfqsByBudget = [...rfqList]
.sort((a, b) => Number(b.budget || 0) - Number(a.budget || 0))
.slice(0, 5);

const recentAwards = awardedQuotes.slice(0, 5);
return (
<main className="min-h-screen bg-[#f6f6f3]">
<div className="mx-auto max-w-7xl px-6 py-10">
<div className="flex items-start justify-between gap-6">
<div>
<p className="text-xs font-black uppercase tracking-[0.35em] text-orange-500">
{dashboardCopy.eyebrow}
</p>

<h1 className="mt-3 text-5xl font-black text-slate-950">
{dashboardCopy.title}
</h1>

<p className="mt-3 max-w-4xl text-lg leading-8 text-slate-600">
{dashboardCopy.subtitle}
</p>

<p className="mt-3 text-sm font-bold uppercase tracking-[0.2em] text-slate-400">
Signed in as {profile?.email || user?.email} · Role:{" "}
{profile?.role ? profile.role.toUpperCase() : "SETUP REQUIRED"}
</p>
</div>

<SignOutButton />
</div>

<section className="mt-10 rounded-[36px] border border-slate-200 bg-slate-950 p-8 text-white">
<p className="text-xs font-black uppercase tracking-[0.3em] text-orange-400">
{dashboardCopy.heroLabel}
</p>

<div className="mt-5 grid gap-8 lg:grid-cols-[1fr_0.9fr]">
<div>
<h2 className="text-4xl font-black">
{dashboardCopy.heroTitle}
</h2>

<p className="mt-4 max-w-3xl text-sm leading-7 text-slate-300">
{dashboardCopy.heroDescription}
</p>

<p className="mt-5 max-w-3xl text-sm font-semibold leading-7 text-slate-300">
{dashboardCopy.recommendation}
</p>
</div>

<div className="grid gap-4 sm:grid-cols-2">
{experience === "vendor" ? (
<>
<DarkMetric title="Open Opportunities" value={String(openRfqs)} />
<DarkMetric title="Submitted Quotes" value={String(submittedQuotes)} />
<DarkMetric title="Win Rate" value={`${vendorWinRate}%`} />
<DarkMetric title="Pipeline Value" value={formatMoney(pipelineValue)} />
</>
) : experience === "consultant" ? (
<>
<DarkMetric title="Service RFQs" value={String(serviceRfqs)} />
<DarkMetric title="Project Activity" value={String(openRfqs)} />
<DarkMetric title="Service Visibility" value={executiveStatus} />
<DarkMetric title="Forecast Confidence" value={`${forecastAccuracy}%`} />
</>
) : (
<>
<DarkMetric title="Enterprise Score" value={`${procurementHealthScore}/100`} />
<DarkMetric title="RFQ Maturity" value={`${constructionClassificationScore}/100`} />
<DarkMetric title="Risk Index" value={`${riskIndex}/100`} />
<DarkMetric title="Forecast Accuracy" value={`${forecastAccuracy}%`} />
</>
)}
</div>
</div>
</section>

<section className="mt-8 grid gap-6 md:grid-cols-2 xl:grid-cols-4">
<InsightCard title="Material RFQs" value={String(materialRfqs)} detail="Products, materials, and manufactured systems" />
<InsightCard title="Trade RFQs" value={String(tradeRfqs)} detail="Subcontractor and trade work packages" />
<InsightCard title="Equipment RFQs" value={String(equipmentRfqs)} detail="Rental equipment and site resources" />
<InsightCard title="Service RFQs" value={String(serviceRfqs)} detail="Professional and advisory services" />
</section>

<section className="mt-8 grid gap-6 md:grid-cols-2 xl:grid-cols-5">
<InsightCard title="Open Market" value={String(openMarketRfqs)} detail="Public or broadly visible RFQs" />
<InsightCard title="Invited RFQs" value={String(invitedRfqs)} detail="Selective qualified supplier workflows" />
<InsightCard title="Sealed Bids" value={String(sealedBidRfqs)} detail="Controlled bid submission workflows" />
<InsightCard title="Project Specific" value={String(projectSpecificRfqs)} detail="Single-project procurement requests" />
<InsightCard title="Framework RFQs" value={String(frameworkRfqs)} detail="Recurring or long-term agreements" />
</section>

<section className="mt-8 rounded-[32px] border border-black/5 bg-white p-8">
<p className="text-xs font-black uppercase tracking-[0.3em] text-orange-500">
Construction Procurement Mix
</p>

<h2 className="mt-3 text-3xl font-black text-slate-950">
RFQ Classification Intelligence
</h2>

<p className="mt-3 max-w-4xl text-sm leading-7 text-slate-600">
{procurementMixStatus}. Dominant procurement scope is {dominantScope}.
Dominant sourcing method is {dominantSourcing}. Classification
maturity score is {constructionClassificationScore}/100.
</p>
</section>

<section className="mt-8 rounded-[32px] border border-black/5 bg-white p-8">
<p className="text-xs font-black uppercase tracking-[0.3em] text-orange-500">
{experience === "vendor"
? "Supplier Signals"
: experience === "consultant"
? "Advisory Signals"
: "Executive Alerts"}
</p>

<h2 className="mt-3 text-3xl font-black text-slate-950">
Real-Time Workspace Signals
</h2>

<div className="mt-6 space-y-4">
{alerts.length > 0 ? (
alerts.map((alert, index) => (
<div
key={index}
className="rounded-2xl border border-slate-200 bg-slate-50 p-5"
>
<div className="flex items-center gap-3">
<div
className={`h-3 w-3 rounded-full ${
alert.level === "healthy"
? "bg-green-500"
: alert.level === "opportunity"
? "bg-yellow-500"
: "bg-red-500"
}`}
/>

<p className="font-black text-slate-950">{alert.title}</p>
</div>

<p className="mt-2 text-sm text-slate-600">{alert.message}</p>
</div>
))
) : (
<EmptyState message="No active workspace signals yet." />
)}
</div>
</section>
<section className="mt-8 rounded-[32px] border border-black/5 bg-white p-8">
<p className="text-xs font-black uppercase tracking-[0.3em] text-orange-500">
{dashboardCopy.companyLabel}
</p>

{currentCompany ? (
<div className="mt-6 flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
<div className="flex items-center gap-5">
{currentCompany.logo_url ? (
<img
src={currentCompany.logo_url}
alt={currentCompany.name || "Company"}
className="h-20 w-20 rounded-3xl border border-slate-200 object-contain p-2"
/>
) : (
<div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-slate-100 text-3xl">
🏗️
</div>
)}

<div>
<h2 className="text-3xl font-black text-slate-950">
{currentCompany.name}
</h2>

<p className="mt-1 text-sm font-semibold text-slate-500">
{currentCompany.category} · {currentCompany.location}
</p>

<p className="mt-2 text-sm text-slate-600">
{currentCompany.network_role || "Workspace"}
</p>
</div>
</div>

<Link
href={`/company/${currentCompany.slug}`}
className="rounded-full bg-slate-950 px-6 py-3 text-sm font-bold text-white transition hover:bg-slate-800"
>
Open Company
</Link>
</div>
) : (
<EmptyState message="No company connected." />
)}
</section>

<section className="mt-8 grid gap-6 md:grid-cols-4">
<WorkspaceCard
title="RFQ Marketplace"
description="Browse and manage procurement opportunities."
href="/rfq"
/>

<WorkspaceCard
title="Executive Analytics"
description="Procurement intelligence and board reporting."
href="/analytics"
/>

<WorkspaceCard
title="Company Hub"
description="Manage company profile and visibility."
href="/company/settings"
/>

<WorkspaceCard
title="Activity Center"
description="Review procurement and workflow activity."
href="/notifications"
/>
</section>

<section className="mt-8 rounded-[32px] border border-black/5 bg-white p-8">
<div className="flex items-end justify-between gap-6">
<div>
<p className="text-xs font-black uppercase tracking-[0.3em] text-orange-500">
{dashboardCopy.analyticsLabel}
</p>

<h2 className="mt-3 text-3xl font-black text-slate-950">
{dashboardCopy.analyticsTitle}
</h2>
</div>

<Link
href={experience === "owner" ? "/analytics" : "/rfq"}
className="rounded-full bg-slate-950 px-5 py-3 text-sm font-bold text-white"
>
{experience === "owner"
? "Open Intelligence"
: "Open Opportunities"}
</Link>
</div>

<div className="mt-6 grid gap-6 md:grid-cols-4">
<InsightCard
title="Total RFQs"
value={String(totalRfqs)}
detail={`${openRfqs} Open Opportunities`}
/>

<InsightCard
title="Award Rate"
value={`${awardRate}%`}
detail="RFQs converted into awards"
/>

<InsightCard
title="Awarded Spend"
value={formatMoney(totalAwardedSpend)}
detail="Executed procurement value"
/>

<InsightCard
title="Savings"
value={formatMoney(estimatedSavings)}
detail="Budget vs award delta"
/>

<InsightCard
title="RFQ Maturity"
value={`${constructionClassificationScore}/100`}
detail="Construction procurement classification quality"
/>

<InsightCard
title="Dominant Scope"
value={dominantScope}
detail="Most active procurement category"
/>

<InsightCard
title="Dominant Sourcing"
value={dominantSourcing}
detail="Primary sourcing methodology"
/>

<InsightCard
title="Forecast Accuracy"
value={`${forecastAccuracy}%`}
detail="Executive forecast confidence"
/>
</div>
</section>

<section className="mt-8 grid gap-8 lg:grid-cols-2">
<div className="rounded-[32px] border border-black/5 bg-white p-8">
<p className="text-xs font-black uppercase tracking-[0.3em] text-orange-500">
Award Activity
</p>

<h2 className="mt-3 text-3xl font-black text-slate-950">
Recent Award Decisions
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
{formatMoney(quote.amount)}
</p>
</div>
);
})
) : (
<EmptyState message="No awards have been recorded yet." />
)}
</div>
</div>
<div className="rounded-[32px] border border-black/5 bg-white p-8">
<p className="text-xs font-black uppercase tracking-[0.3em] text-orange-500">
Portfolio View
</p>

<h2 className="mt-3 text-3xl font-black text-slate-950">
Top RFQs by Budget
</h2>

<div className="mt-6 space-y-4">
{topRfqsByBudget.length > 0 ? (
topRfqsByBudget.map((rfq) => (
<Link
key={rfq.id}
href={rfq.slug ? `/rfq/${rfq.slug}` : "/rfq"}
className="block rounded-3xl border border-slate-100 bg-slate-50 p-5 transition hover:-translate-y-1 hover:shadow-lg"
>
<div className="flex items-start justify-between gap-4">
<div>
<p className="text-lg font-black text-slate-950">
{rfq.title || "Untitled RFQ"}
</p>

<p className="mt-1 text-sm font-semibold text-slate-500">
{PROCUREMENT_SCOPE_LABELS[
getProcurementScope(rfq.procurement_scope)
]}{" "}
· {rfq.location || "Location N/A"}
</p>
</div>

<span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-700">
{rfq.status || "open"}
</span>
</div>

<div className="mt-4 flex flex-wrap gap-2">
<SmallBadge>
{
SOURCING_METHOD_LABELS[
getSourcingMethod(rfq.sourcing_method)
]
}
</SmallBadge>

<SmallBadge>
{
CONTRACT_FRAMEWORK_LABELS[
getContractFramework(rfq.contract_framework)
]
}
</SmallBadge>
</div>

<p className="mt-4 text-2xl font-black text-slate-950">
{formatMoney(rfq.budget)}
</p>
</Link>
))
) : (
<EmptyState message="No RFQs have been created yet." />
)}
</div>
</div>
</section>

<section className="mt-8 rounded-[32px] border border-black/5 bg-white p-8">
<div className="flex items-end justify-between gap-6">
<div>
<p className="text-xs font-black uppercase tracking-[0.3em] text-orange-500">
{dashboardCopy.activityLabel}
</p>

<h2 className="mt-3 text-3xl font-black text-slate-950">
{dashboardCopy.activityTitle}
</h2>
</div>

<span className="rounded-full bg-slate-950 px-4 py-2 text-xs font-black uppercase tracking-[0.2em] text-white">
{activityFeed.length} Signals
</span>
</div>

<div className="mt-6 space-y-4">
{activityFeed.length > 0 ? (
activityFeed.map((event) => (
<ActivityFeedItem key={event.id} event={event} />
))
) : (
<EmptyState message="No workspace activity has been recorded yet." />
)}
</div>
</section>
</div>
</main>
);
}

function WorkspaceCard({
title,
description,
href,
}: {
title: string;
description: string;
href: string;
}) {
return (
<Link
href={href}
className="rounded-[28px] border border-black/5 bg-white p-7 transition hover:-translate-y-1 hover:shadow-xl"
>
<h3 className="text-2xl font-black text-slate-950">{title}</h3>

<p className="mt-3 text-sm leading-relaxed text-slate-600">
{description}
</p>

<div className="mt-6 text-sm font-black text-slate-950">Open →</div>
</Link>
);
}

function InsightCard({
title,
value,
detail,
}: {
title: string;
value: string;
detail: string;
}) {
return (
<div className="rounded-3xl border border-black/5 bg-slate-50 p-6">
<p className="text-xs font-black uppercase tracking-[0.25em] text-slate-500">
{title}
</p>

<p className="mt-3 text-4xl font-black text-slate-950">{value}</p>

<p className="mt-2 text-sm text-slate-600">{detail}</p>
</div>
);
}

function DarkMetric({ title, value }: { title: string; value: string }) {
return (
<div className="rounded-2xl bg-white/10 p-5">
<p className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">
{title}
</p>

<p className="mt-2 text-3xl font-black text-white">{value}</p>
</div>
);
}

function SmallBadge({ children }: { children: React.ReactNode }) {
return (
<span className="rounded-full bg-white px-3 py-1 text-xs font-black text-slate-600 shadow-sm">
{children}
</span>
);
}

function ActivityFeedItem({ event }: { event: ActivityEvent }) {
const severityClass =
event.severity === "success"
? "bg-green-100 text-green-700"
: event.severity === "warning"
? "bg-yellow-100 text-yellow-800"
: event.severity === "critical"
? "bg-red-100 text-red-700"
: "bg-blue-100 text-blue-700";

const dotClass =
event.severity === "success"
? "bg-green-500"
: event.severity === "warning"
? "bg-yellow-500"
: event.severity === "critical"
? "bg-red-500"
: "bg-blue-500";

return (
<Link
href={event.href}
className="group block rounded-3xl border border-slate-100 bg-slate-50 p-5 transition hover:-translate-y-1 hover:bg-white hover:shadow-lg"
>
<div className="flex items-start gap-4">
<div className={`mt-2 h-3 w-3 rounded-full ${dotClass}`} />

<div className="min-w-0 flex-1">
<div className="flex flex-wrap items-center justify-between gap-3">
<p className="text-lg font-black text-slate-950">{event.title}</p>

<div className="flex items-center gap-2">
<span
className={`rounded-full px-3 py-1 text-xs font-black uppercase ${severityClass}`}
>
{event.type}
</span>

<span className="text-xs font-bold text-slate-400">
{formatRelativeTime(event.createdAt)}
</span>
</div>
</div>

<p className="mt-2 text-sm leading-relaxed text-slate-600">
{event.description}
</p>

<p className="mt-3 text-xs font-black uppercase tracking-[0.2em] text-slate-400 transition group-hover:text-slate-950">
Open event →
</p>
</div>
</div>
</Link>
);
}

function EmptyState({ message }: { message: string }) {
return (
<div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
<p className="text-sm font-bold text-slate-500">{message}</p>
</div>
);
}
