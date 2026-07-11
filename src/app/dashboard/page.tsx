import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ExecutiveHero } from "@/components/dashboard/executive-hero";
import { ExecutiveBadge } from "@/components/executive/executive-badge";
import { ExecutiveMetricCard } from "@/components/executive/executive-metric-card";
import { ExecutivePanel } from "@/components/executive/executive-panel";
import { ExecutiveCommandMetric } from "@/components/executive/workspace/executive-command-metric";
import { ExecutiveCommandStripCard } from "@/components/executive/workspace/executive-command-strip-card";
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

type ReadinessItem = {
title: string;
description: string;
completed: boolean;
href: string;
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

function getExperience(
role: string | null,
networkRole: string | null
): Experience {
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

function getNotificationSeverity(
type: string | null
): ActivityEvent["severity"] {
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
const scope =
PROCUREMENT_SCOPE_LABELS[getProcurementScope(rfq.procurement_scope)];

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
"Track open RFQs, submitted quotes, award outcomes, customer activity, supplier growth signals, and executive opportunity readiness.",
briefTitle: "Executive Supplier Brief",
briefLabel: "Supplier Growth Center",
recommendation:
"Prioritize high-fit RFQs, improve quote coverage, and focus on opportunities aligned with supplier category, delivery capacity, and buyer demand.",
companyLabel: "Supplier Company",
activityLabel: "Supplier Activity Center",
activityTitle: "Live Supplier Timeline",
};
}

if (experience === "consultant") {
return {
eyebrow: "Consultant Workspace",
title: "Project Advisory Command Center",
subtitle:
"Track project opportunities, advisory activity, client signals, professional service visibility, and board-level advisory readiness.",
briefTitle: "Executive Advisory Brief",
briefLabel: "Advisory Command Center",
recommendation:
"Monitor professional service opportunities, strengthen company positioning, and support procurement workflows with advisory expertise.",
companyLabel: "Advisory Company",
activityLabel: "Consultant Activity Center",
activityTitle: "Live Advisory Timeline",
};
}

return {
eyebrow: "Executive Workspace",
title: "Executive Procurement Command Center",
subtitle:
"Monitor RFQ mix, awards, supplier participation, sourcing method, framework agreements, procurement risk, savings potential, and board-level intelligence.",
briefTitle: "Executive Procurement Brief",
briefLabel: "CEO Command Center",
recommendation:
"Review supplier participation, award concentration, RFQ classification maturity, savings signals, and risk exposure before scaling procurement decisions.",
companyLabel: "Enterprise Company",
activityLabel: "Activity Command Center",
activityTitle: "Live Procurement Timeline",
};
}

function buildReadinessItems({
company,
totalRfqs,
submittedQuotes,
}: {
company: Company | null;
totalRfqs: number;
submittedQuotes: number;
}): ReadinessItem[] {
return [
{
title: "Company Created",
description: "Your enterprise workspace has been activated.",
completed: Boolean(company?.id),
href: "/company/settings",
},
{
title: "Company Logo",
description: "Upload an official company logo for marketplace trust.",
completed: Boolean(company?.logo_url),
href: "/company/settings",
},
{
title: "Regional Hub",
description: "Confirm market presence and regional context.",
completed: Boolean(company?.location),
href: "/company/settings",
},
{
title: "Organization Role",
description: "Confirm the company role used for workspace behavior.",
completed: Boolean(company?.network_role),
href: "/company/settings",
},
{
title: "First RFQ",
description: "Create the first procurement opportunity.",
completed: totalRfqs > 0,
href: "/rfq/new",
},
{
title: "Supplier Activity",
description: "Receive or submit quote activity to activate intelligence.",
completed: submittedQuotes > 0,
href: "/rfq",
},
];
}

function calculateReadinessScore(items: ReadinessItem[]) {
if (items.length === 0) return 0;

const completed = items.filter((item) => item.completed).length;

return Math.round((completed / items.length) * 100);
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
const submittedQuotes = quoteList.length;
const awardedQuotes = quoteList.filter((quote) => quote.decision === "awarded");

const readinessItems = buildReadinessItems({
company: currentCompany,
totalRfqs,
submittedQuotes,
});
const readinessScore = calculateReadinessScore(readinessItems);
const completedTasks = readinessItems.filter((item) => item.completed).length;

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
(rfq) => getProcurementScope(rfq.procurement_scope) === "professional_service"
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
: "Insufficient Data";

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

const awardRate =
totalRfqs > 0 ? Math.round((awardedRfqs / totalRfqs) * 100) : 0;

const totalBudget = rfqList.reduce((total, rfq) => {
const budget = Number(rfq.budget);
return total + (Number.isNaN(budget) ? 0 : budget);
}, 0);

const estimatedSavings = Math.max(totalBudget - totalAwardedSpend, 0);

const procurementVelocity =
totalRfqs > 0 ? Math.round((awardedRfqs / totalRfqs) * 100) : 0;

const budgetUtilization =
totalBudget > 0 ? Math.round((totalAwardedSpend / totalBudget) * 100) : 0;

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

const hasProcurementData =
totalRfqs > 0 || submittedQuotes > 0 || awardedQuotes.length > 0;

const riskIndex = hasProcurementData
? Math.max(0, 100 - procurementHealthScore)
: 0;

const forecastAccuracy = hasProcurementData
? procurementHealthScore >= 80
? 92
: procurementHealthScore >= 65
? 84
: procurementHealthScore >= 50
? 76
: 65
: 0;

const supplierConcentration =
!hasProcurementData || awardedQuotes.length === 0
? "Insufficient Data"
: awardedQuotes.length <= 1
? "High"
: awardedQuotes.length <= 3
? "Medium"
: "Low";

const executiveStatus =
!hasProcurementData
? "Insufficient Data"
: procurementHealthScore >= 85
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

const enterpriseScoreLabel = hasProcurementData
? `${procurementHealthScore}/100`
: "Insufficient Data";

const riskIndexLabel = hasProcurementData ? `${riskIndex}/100` : "Pending";

const forecastAccuracyLabel = hasProcurementData
? `${forecastAccuracy}%`
: "Insufficient Data";

const rfqMaturityLabel = hasProcurementData
? `${Math.min(100, Math.round((totalRfqs + submittedQuotes) * 12))}/100`
: "Setup Required";

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

if (!hasProcurementData) {
alerts.push({
level: "warning",
title: "Insufficient Procurement Data",
message:
"Create RFQs, receive supplier quotes, or record award outcomes before relying on executive recommendations.",
});
}

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
message: "Submitted quotes are converting into award outcomes.",
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

const aiRecommendations = [
{
title: "Strengthen Supplier Competition",
value: submittedQuotes < 3 ? "High Priority" : "Monitoring",
detail:
submittedQuotes < 3
? "Supplier participation is below executive-grade confidence threshold."
: "Supplier participation is active and should continue to be monitored.",
},
{
title: "Improve RFQ Classification",
value:
constructionClassificationScore >= 80
? "Mature"
: constructionClassificationScore >= 60
? "Developing"
: "Needs Work",
detail:
"Classification quality directly affects forecasting, benchmarking, and board reporting confidence.",
},
{
title: "Review Savings Opportunity",
value: estimatedSavings > 0 ? formatMoney(estimatedSavings) : "Pending",
detail:
estimatedSavings > 0
? "Budget-to-award spread indicates measurable procurement value."
: "Savings intelligence will activate after budget and award data mature.",
},
];

const executiveBriefSummary =
experience === "vendor"
? `${submittedQuotes} submitted quotes, ${openRfqs} open opportunities, and ${vendorWinRate}% win rate are currently shaping supplier growth.`
: experience === "consultant"
? `${serviceRfqs} service RFQs and ${openRfqs} active project opportunities are shaping advisory visibility.`
: hasProcurementData
? `${totalRfqs} RFQs, ${submittedQuotes} supplier quotes, ${awardRate}% award rate, and ${formatMoney(
estimatedSavings
)} in estimated savings are shaping procurement performance.`
: "Procurement intelligence is available, but more RFQ, quote, and award data is required before board-ready recommendations can be trusted.";

const boardNarrative = hasProcurementData
? `Current procurement activity shows ${totalRfqs} RFQs, ${submittedQuotes} supplier quotes, ${awardedRfqs} awarded RFQs, ${formatMoney(
totalAwardedSpend
)} in awarded spend, and ${forecastAccuracy}% forecast confidence. Supplier concentration is ${supplierConcentration.toLowerCase()}, and the current executive status is ${executiveStatus.toLowerCase()}.`
: "Status: Insufficient Data. Create RFQs, receive supplier quotes, and record award outcomes before presenting procurement recommendations to executives or the board.";

const readinessTone =
readinessScore >= 85 ? "success" : readinessScore >= 55 ? "warning" : "blue";

const topRfqsByBudget = [...rfqList]
.sort((a, b) => Number(b.budget || 0) - Number(a.budget || 0))
.slice(0, 5);

const recentAwards = awardedQuotes.slice(0, 5);

return (
<main className="min-h-screen bg-[#030712] text-white">

<div className="w-full max-w-none px-5 py-6 sm:px-8 lg:px-10 lg:py-8">
<ExecutiveHero
welcomeTitle={dashboardCopy.title}
welcomeDescription={dashboardCopy.subtitle}
briefLabel={dashboardCopy.briefLabel}
companyName={currentCompany?.name || "Company Workspace"}
readinessScore={readinessScore}
readinessTone={readinessTone}
readinessItems={readinessItems}
incompleteTasksCount={readinessItems.length - completedTasks}
continueHref="/company/settings"
continueLabel="Continue Setup"
/>

<ExecutivePanel
variant="operational"
padding="sm"
className="mt-6"
>
<div className="grid sm:grid-cols-3">
<ExecutiveCommandStripCard
  title="Enterprise Score"
  value={enterpriseScoreLabel}
/>
<ExecutiveCommandStripCard title="Risk Index" value={riskIndexLabel} />
<ExecutiveCommandStripCard
  title="Decision Data Confidence"
  value={forecastAccuracyLabel}
/>
</div>
</ExecutivePanel>

<section className="mt-6 grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
<div className="rounded-[32px] border border-white/10 bg-white/[0.045] p-6 shadow-inner-executive sm:p-7">
<div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
<div>
<p className="text-[10px] font-black uppercase tracking-[0.28em] text-[#C8A646]">
Procurement Health
</p>

<h2 className="mt-3 text-2xl font-black text-white">
Executive Operating Score
</h2>
</div>

<ExecutiveBadge
  tone={hasProcurementData ? "success" : "warning"}
  size="sm"
>
  {executiveStatus}
</ExecutiveBadge>
</div>

<div className="mt-6 rounded-[28px] border border-[#C8A646]/20 bg-[#C8A646]/10 p-6">
<p className="text-[11px] font-black uppercase tracking-[0.28em] text-[#F5D77B]">
Overall Health
</p>

<p className="mt-3 text-6xl font-black text-white">
{hasProcurementData ? procurementHealthScore : 0}
<span className="text-2xl text-slate-500">/100</span>
</p>

<p className="mt-4 text-sm font-semibold leading-7 text-slate-300">
This score combines award rate, supplier activity, awarded
outcomes, savings signal, and RFQ classification maturity.
</p>
</div>

<div className="mt-5 grid gap-3 sm:grid-cols-2">
<SignalTile label="Risk Index" value={riskIndexLabel} />
<SignalTile label="Forecast Trust" value={forecastAccuracyLabel} />
<SignalTile label="Award Rate" value={`${awardRate}%`} />
<SignalTile label="RFQ Maturity" value={rfqMaturityLabel} />
</div>
</div>

<div className="rounded-[32px] border border-white/10 bg-[#061426]/80 p-6 shadow-inner-executive sm:p-7">
<div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
<div>
<p className="text-[10px] font-black uppercase tracking-[0.28em] text-[#C8A646]">
CEO Action Center
</p>

<h2 className="mt-3 text-2xl font-black text-white">
Executive Decision Signals
</h2>
</div>

<span className="rounded-full border border-white/10 bg-white/[0.055] px-4 py-2 text-xs font-black uppercase tracking-[0.2em] text-slate-300">
{alerts.length} Signals
</span>
</div>

<div className="mt-6 grid gap-4 lg:grid-cols-2">
{alerts.length > 0 ? (
alerts.slice(0, 4).map((alert, index) => (
<CeoActionCard
key={`${alert.title}-${index}`}
alert={alert}
index={index}
/>
))
) : (
<div className="lg:col-span-2">
<EmptyState message="No active executive decision signals yet." />
</div>
)}
</div>
</div>
</section>

<section className="mt-6 rounded-[34px] border border-[#2CC4E8]/15 bg-gradient-to-br from-[#0B3D91]/35 via-[#07111F]/92 to-[#061426] p-6 shadow-[0_0_70px_rgba(44,196,232,0.10)] sm:p-8">
<div className="grid gap-8 xl:grid-cols-[1.15fr_0.85fr]">
<div>
<p className="text-[11px] font-black uppercase tracking-[0.34em] text-[#C8A646]">
Executive Brief
</p>

<h2 className="mt-4 text-3xl font-black leading-tight text-white sm:text-4xl">
{dashboardCopy.briefTitle}
</h2>

<p className="mt-4 max-w-4xl text-sm font-semibold leading-7 text-slate-300 sm:text-base sm:leading-8">
{executiveBriefSummary}
</p>

<div className="mt-6 rounded-[26px] border border-white/10 bg-white/[0.045] p-5">
<p className="text-[10px] font-black uppercase tracking-[0.24em] text-[#C8A646]">
Recommended Executive Action
</p>

<p className="mt-3 text-sm font-semibold leading-7 text-slate-300">
{dashboardCopy.recommendation}
</p>
</div>
</div>

<div className="grid gap-4 sm:grid-cols-2">
{experience === "vendor" ? (
<>
<ExecutiveMetricCard
label="Open Opportunities"
value={String(openRfqs)}
tone="blue"
/>
<ExecutiveMetricCard
label="Submitted Quotes"
value={String(submittedQuotes)}
tone="neutral"
/>
<ExecutiveMetricCard
label="Win Rate"
value={`${vendorWinRate}%`}
tone="success"
/>
<ExecutiveMetricCard
label="Pipeline Value"
value={formatMoney(pipelineValue)}
tone="gold"
/>
</>
) : experience === "consultant" ? (
<>
<ExecutiveMetricCard
label="Service RFQs"
value={String(serviceRfqs)}
tone="neutral"
/>
<ExecutiveMetricCard
label="Project Activity"
value={String(openRfqs)}
tone="blue"
/>
<ExecutiveMetricCard
label="Service Visibility"
value={executiveStatus}
tone="gold"
/>
<ExecutiveMetricCard
label="Decision Data Confidence"
value={forecastAccuracyLabel}
tone="blue"
/>
</>
) : (
<>
<ExecutiveMetricCard
label="RFQ Maturity"
value={rfqMaturityLabel}
tone="neutral"
/>
<ExecutiveMetricCard
label="Procurement Health"
value={`${procurementHealthScore}%`}
tone="blue"
/>
<ExecutiveMetricCard
label="Supplier Concentration"
value={supplierConcentration}
tone="gold"
/>
<ExecutiveMetricCard
label="Executive Signals"
value={String(alerts.length)}
tone="gold"
/>
</>
)}
</div>
</div>
</section>

<section className="mt-6 grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
<div className="rounded-[32px] border border-white/10 bg-white/[0.045] p-6 shadow-inner-executive sm:p-7">
<div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
<div>
<p className="text-[10px] font-black uppercase tracking-[0.28em] text-[#C8A646]">
Boardroom Intelligence
</p>

<h2 className="mt-3 text-2xl font-black text-white">
Board Summary Narrative
</h2>
</div>

<ExecutiveBadge
  tone={hasProcurementData ? "success" : "warning"}
  size="sm"
>
  {hasProcurementData ? "Available" : "Insufficient Data"}
</ExecutiveBadge>
</div>

<p className="mt-5 text-sm font-semibold leading-7 text-slate-300">
{boardNarrative}
</p>

<div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
<SignalTile label="RFQs" value={String(totalRfqs)} />
<SignalTile label="Supplier Quotes" value={String(submittedQuotes)} />
<SignalTile label="Awarded RFQs" value={String(awardedRfqs)} />
<SignalTile label="Open RFQs" value={String(openRfqs)} />
</div>
</div>

<div className="rounded-[32px] border border-[#2CC4E8]/15 bg-[#061426]/80 p-6 shadow-inner-executive sm:p-7">
<p className="text-[10px] font-black uppercase tracking-[0.28em] text-[#C8A646]">
AI Executive Recommendations
</p>

<h2 className="mt-3 text-2xl font-black text-white">
Procurement Action Suggestions
</h2>

<div className="mt-6 space-y-4">
{aiRecommendations.map((item) => (
<div
key={item.title}
className="rounded-[24px] border border-white/10 bg-white/[0.045] p-5"
>
<div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
<h3 className="text-lg font-black text-white">
{item.title}
</h3>

<ExecutiveBadge tone="blue" size="sm">
  {item.value}
</ExecutiveBadge>
</div>

<p className="mt-3 text-sm font-semibold leading-7 text-slate-400">
{item.detail}
</p>
</div>
))}
</div>
</div>
</section>

<ExecutivePanel
variant="operational"
padding="md"
tone="blue"
className="mt-6"
>
<div>
<p className="text-[10px] font-black uppercase tracking-[0.28em] text-[#C8A646]">
Executive Command Metrics
</p>

<h2 className="mt-3 text-2xl font-black text-white">
Procurement Performance Position
</h2>

<p className="mt-3 max-w-4xl text-sm font-semibold leading-7 text-slate-400">
Verified portfolio metrics summarizing awarded spend, budget variance,
conversion, operating movement, budget utilization, supplier concentration,
and current RFQ activity.
</p>
</div>

<div className="mt-6 grid gap-4 lg:grid-cols-2">
<ExecutiveMetricCard
label="Awarded Spend"
value={formatMoney(totalAwardedSpend)}
insight="Awarded procurement spend recorded across current RFQs."
tone="gold"
/>

<ExecutiveMetricCard
label="Potential Budget Variance"
value={hasProcurementData ? formatMoney(estimatedSavings) : "Pending"}
insight="Current budget-to-award difference; not a validated savings measure."
tone="gold"
/>
</div>

<div className="mt-4 grid gap-4 md:grid-cols-3">
<ExecutiveCommandMetric
title="Award Rate"
value={`${awardRate}%`}
detail="Awarded RFQs relative to total RFQ activity."
accentClassName="text-emerald-300"
/>

<ExecutiveCommandMetric
title="Procurement Velocity"
value={`${procurementVelocity}%`}
detail="Current award progression across the RFQ portfolio."
accentClassName="text-[#9BE8F8]"
/>

<ExecutiveCommandMetric
title="Budget Utilization"
value={`${budgetUtilization}%`}
detail="Awarded spend relative to the current planned budget."
accentClassName="text-[#F5D77B]"
/>
</div>

<div className="mt-4 grid sm:grid-cols-2">
<ExecutiveCommandStripCard
 title="Supplier Concentration"
 value={supplierConcentration}
/>
<ExecutiveCommandStripCard
 title="Open RFQs"
 value={String(openRfqs)}
/>
</div>
</ExecutivePanel>

<section className="mt-6 grid gap-6 xl:grid-cols-[1fr_0.85fr]">
<div className="rounded-[32px] border border-white/10 bg-white/[0.045] p-6 shadow-inner-executive sm:p-7">
<p className="text-[10px] font-black uppercase tracking-[0.28em] text-[#C8A646]">
Procurement Command Center
</p>

<h2 className="mt-3 text-2xl font-black text-white">
RFQ Classification Intelligence
</h2>

<p className="mt-3 max-w-4xl text-sm font-semibold leading-7 text-slate-400">
{procurementMixStatus}. Dominant procurement scope is{" "}
{hasProcurementData ? dominantScope : "Pending"}. Dominant
sourcing method is {hasProcurementData ? dominantSourcing : "Pending"}.
Classification maturity score is {constructionClassificationScore}/100.
</p>

<div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
<SignalTile label="Material RFQs" value={String(materialRfqs)} />
<SignalTile label="Trade RFQs" value={String(tradeRfqs)} />
<SignalTile label="Equipment RFQs" value={String(equipmentRfqs)} />
<SignalTile label="Service RFQs" value={String(serviceRfqs)} />
</div>

<div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
<SignalTile label="Open Market" value={String(openMarketRfqs)} />
<SignalTile label="Invited" value={String(invitedRfqs)} />
<SignalTile label="Sealed Bids" value={String(sealedBidRfqs)} />
<SignalTile
label="Project Specific"
value={String(projectSpecificRfqs)}
/>
<SignalTile label="Framework" value={String(frameworkRfqs)} />
</div>
</div>

<div className="rounded-[32px] border border-white/10 bg-[#061426]/80 p-6 shadow-inner-executive sm:p-7">
<p className="text-[10px] font-black uppercase tracking-[0.28em] text-[#C8A646]">
{dashboardCopy.companyLabel}
</p>

<h2 className="mt-3 text-2xl font-black text-white">
Workspace Governance
</h2>

{currentCompany ? (
<div className="mt-6">
<div className="flex items-center gap-4">
{currentCompany.logo_url ? (
<Image
src={currentCompany.logo_url}
alt={currentCompany.name || "Company"}
width={64}
height={64}
className="h-16 w-16 rounded-2xl border border-white/10 bg-white p-2 object-contain"
/>
) : (
<div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.055] text-2xl">
◈
</div>
)}

<div className="min-w-0">
<h3 className="truncate text-xl font-black text-white">
{currentCompany.name}
</h3>

<p className="mt-1 text-sm font-semibold text-slate-400">
{currentCompany.category || "Category N/A"} ·{" "}
{currentCompany.location || "Location N/A"}
</p>

<p className="mt-1 text-xs font-bold uppercase tracking-wide text-slate-500">
{currentCompany.network_role || "Workspace"}
</p>
</div>
</div>

<Link
href={
currentCompany.slug
? `/company/${currentCompany.slug}`
: "/company/settings"
}
className="mt-6 inline-flex rounded-full border border-[#2CC4E8]/25 bg-[#2CC4E8]/10 px-5 py-3 text-sm font-black text-[#9BE8F8] transition hover:bg-[#2CC4E8]/15"
>
Open Company →
</Link>
</div>
) : (
<div className="mt-6">
<EmptyState message="No company connected." />
</div>
)}
</div>
</section>

<section className="mt-6 grid gap-6 xl:grid-cols-2">
<div className="rounded-[32px] border border-white/10 bg-white/[0.045] p-6 shadow-inner-executive sm:p-7">
<p className="text-[10px] font-black uppercase tracking-[0.28em] text-[#C8A646]">
Award Activity
</p>

<h2 className="mt-3 text-2xl font-black text-white">
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
className="rounded-[24px] border border-white/10 bg-[#061426]/70 p-5"
>
<div className="flex items-start justify-between gap-4">
<div>
<p className="text-lg font-black text-white">
{relatedRfq?.title || "Awarded RFQ"}
</p>

<p className="mt-1 text-sm font-semibold text-slate-500">
{relatedRfq?.location || "Location N/A"}
</p>
</div>

<ExecutiveBadge tone="success" size="sm">
  Awarded
</ExecutiveBadge>
</div>

<p className="mt-4 text-2xl font-black text-[#C8A646]">
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

<div className="rounded-[32px] border border-white/10 bg-white/[0.045] p-6 shadow-inner-executive sm:p-7">
<p className="text-[10px] font-black uppercase tracking-[0.28em] text-[#C8A646]">
Opportunity Ranking
</p>

<h2 className="mt-3 text-2xl font-black text-white">
Top RFQs by Budget
</h2>

<div className="mt-6 space-y-4">
{topRfqsByBudget.length > 0 ? (
topRfqsByBudget.map((rfq) => (
<Link
key={rfq.id}
href={rfq.slug ? `/rfq/${rfq.slug}` : "/rfq"}
className="block rounded-[24px] border border-white/10 bg-[#061426]/70 p-5 transition hover:-translate-y-1 hover:border-[#2CC4E8]/25 hover:bg-[#07111F]"
>
<div className="flex items-start justify-between gap-4">
<div>
<p className="text-lg font-black text-white">
{rfq.title || "Untitled RFQ"}
</p>

<p className="mt-1 text-sm font-semibold text-slate-500">
{
PROCUREMENT_SCOPE_LABELS[
getProcurementScope(rfq.procurement_scope)
]
}{" "}
· {rfq.location || "Location N/A"}
</p>
</div>

<ExecutiveBadge tone="neutral" size="sm">
  {rfq.status || "open"}
</ExecutiveBadge>
</div>

<div className="mt-4 flex flex-wrap gap-2">
<ExecutiveBadge tone="neutral" size="sm">
  {
    SOURCING_METHOD_LABELS[
      getSourcingMethod(rfq.sourcing_method)
    ]
  }
</ExecutiveBadge>

<ExecutiveBadge tone="neutral" size="sm">
  {
    CONTRACT_FRAMEWORK_LABELS[
      getContractFramework(rfq.contract_framework)
    ]
  }
</ExecutiveBadge>
</div>

<p className="mt-4 text-2xl font-black text-[#C8A646]">
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

<section className="mt-6 rounded-[32px] border border-white/10 bg-[#061426]/80 p-6 shadow-inner-executive sm:p-7">
<div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
<div>
<p className="text-[10px] font-black uppercase tracking-[0.28em] text-[#C8A646]">
{dashboardCopy.activityLabel}
</p>

<h2 className="mt-3 text-2xl font-black text-white">
{dashboardCopy.activityTitle}
</h2>
</div>

<span className="rounded-full border border-white/10 bg-white/[0.055] px-4 py-2 text-xs font-black uppercase tracking-[0.2em] text-slate-300">
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

<section className="mt-6 grid gap-4 md:grid-cols-4">
<WorkspaceCard
title="RFQ Marketplace"
description="Create, manage, and review procurement opportunities."
href="/rfq"
/>

<WorkspaceCard
title="Executive Analytics"
description="Board reporting, risk signals, and procurement intelligence."
href="/analytics"
/>

<WorkspaceCard
title="Company Command"
description="Manage company governance, access, and visibility."
href="/company/settings"
/>

<WorkspaceCard
title="Activity Center"
description="Review alerts, workflow signals, and procurement events."
href="/notifications"
/>
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
className="rounded-[26px] border border-white/10 bg-white/[0.045] p-6 transition hover:-translate-y-1 hover:border-[#2CC4E8]/25 hover:bg-white/[0.06]"
>
<h3 className="text-xl font-black text-white">{title}</h3>

<p className="mt-3 text-sm font-semibold leading-6 text-slate-400">
{description}
</p>

<div className="mt-5 text-sm font-black text-[#9BE8F8]">Open →</div>
</Link>
);
}

function SignalTile({ label, value }: { label: string; value: string }) {
return (
<div className="rounded-[20px] border border-white/10 bg-white/[0.045] p-4">
<p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">
{label}
</p>

<p className="mt-2 text-xl font-black text-white">{value}</p>
</div>
);
}


function CeoActionCard({
alert,
index,
}: {
alert: WorkspaceAlert;
index: number;
}) {
const priority =
alert.level === "warning"
? "High Priority"
: alert.level === "opportunity"
? "Opportunity"
: "Healthy";

const dotClass =
alert.level === "healthy"
? "bg-emerald-400"
: alert.level === "opportunity"
? "bg-yellow-400"
: "bg-red-400";

return (
<div className="rounded-[24px] border border-white/10 bg-white/[0.045] p-5">
<div className="flex items-start justify-between gap-4">
<div className="flex items-center gap-3">
<span className={`h-3 w-3 rounded-full ${dotClass}`} />

<ExecutiveBadge
  tone={
    alert.level === "healthy"
      ? "success"
      : alert.level === "opportunity"
        ? "warning"
        : "warning"
  }
  size="sm"
>
  {priority}
</ExecutiveBadge>
</div>

<span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">
#{index + 1}
</span>
</div>

<h3 className="mt-5 text-lg font-black leading-tight text-white">
{alert.title}
</h3>

<p className="mt-3 text-sm font-semibold leading-7 text-slate-400">
{alert.message}
</p>

<div className="mt-5 rounded-2xl border border-white/10 bg-black/20 p-4">
<p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#C8A646]">
Recommended Next Step
</p>

<p className="mt-2 text-sm font-bold leading-6 text-slate-300">
{alert.level === "warning"
? "Review this signal before approving the next procurement decision."
: alert.level === "opportunity"
? "Evaluate this opportunity and decide whether it should move into the next action cycle."
: "Maintain current operating discipline and continue monitoring this signal."}
</p>
</div>
</div>
);
}

function ActivityFeedItem({ event }: { event: ActivityEvent }) {
const severityClass =
event.severity === "success"
? "border-emerald-300/20 bg-emerald-400/10 text-emerald-300"
: event.severity === "warning"
? "border-yellow-300/20 bg-yellow-400/10 text-yellow-300"
: event.severity === "critical"
? "border-red-300/20 bg-red-400/10 text-red-300"
: "border-[#2CC4E8]/20 bg-[#2CC4E8]/10 text-[#9BE8F8]";

const dotClass =
event.severity === "success"
? "bg-emerald-400"
: event.severity === "warning"
? "bg-yellow-400"
: event.severity === "critical"
? "bg-red-400"
: "bg-[#2CC4E8]";

return (
<Link
href={event.href}
className="group block rounded-[24px] border border-white/10 bg-white/[0.045] p-5 transition hover:-translate-y-1 hover:border-[#2CC4E8]/25 hover:bg-white/[0.06]"
>
<div className="flex items-start gap-4">
<div className={`mt-2 h-3 w-3 rounded-full ${dotClass}`} />

<div className="min-w-0 flex-1">
<div className="flex flex-wrap items-center justify-between gap-3">
<p className="text-lg font-black text-white">{event.title}</p>

<div className="flex items-center gap-2">
<span
className={`rounded-full border px-3 py-1 text-xs font-black uppercase ${severityClass}`}
>
{event.type}
</span>

<span className="text-xs font-bold text-slate-500">
{formatRelativeTime(event.createdAt)}
</span>
</div>
</div>

<p className="mt-2 text-sm font-semibold leading-6 text-slate-400">
{event.description}
</p>

<p className="mt-3 text-xs font-black uppercase tracking-[0.2em] text-slate-500 transition group-hover:text-[#9BE8F8]">
Open event →
</p>
</div>
</div>
</Link>
);
}

function EmptyState({ message }: { message: string }) {
return (
<div className="rounded-[24px] border border-dashed border-white/15 bg-white/[0.035] p-8 text-center">
<p className="text-sm font-bold text-slate-500">{message}</p>
</div>
);
}