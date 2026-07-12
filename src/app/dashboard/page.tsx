import { redirect } from "next/navigation";
import { ExecutiveHero } from "@/components/dashboard/executive-hero";
import { ExecutiveDecisionWorkspace } from "@/components/dashboard/executive-decision-workspace";
import { GovernanceReferenceWorkspace } from "@/components/dashboard/governance-reference-workspace";
import { ProcurementOperationsWorkspace } from "@/components/dashboard/procurement-operations-workspace";
import { StrategicIntelligenceWorkspace } from "@/components/dashboard/strategic-intelligence-workspace";
import { ExecutivePanel } from "@/components/executive/executive-panel";
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

const executiveDecisionStatus = {
  label: hasProcurementData ? executiveStatus : "Insufficient Data",
  tone: hasProcurementData ? ("success" as const) : ("warning" as const),
};

const executiveDecisionMetrics =
  experience === "vendor"
    ? [
        {
          label: "Open Opportunities",
          value: String(openRfqs),
          tone: "blue" as const,
        },
        {
          label: "Submitted Quotes",
          value: String(submittedQuotes),
          tone: "neutral" as const,
        },
        {
          label: "Win Rate",
          value: `${vendorWinRate}%`,
          tone: "success" as const,
        },
        {
          label: "Pipeline Value",
          value: formatMoney(pipelineValue),
          tone: "gold" as const,
        },
      ]
    : experience === "consultant"
      ? [
          {
            label: "Service RFQs",
            value: String(serviceRfqs),
            tone: "neutral" as const,
          },
          {
            label: "Project Activity",
            value: String(openRfqs),
            tone: "blue" as const,
          },
          {
            label: "Service Visibility",
            value: executiveStatus,
            tone: "gold" as const,
          },
          {
            label: "Decision Data Confidence",
            value: forecastAccuracyLabel,
            tone: "blue" as const,
          },
        ]
      : [
          {
            label: "RFQ Maturity",
            value: rfqMaturityLabel,
            tone: "neutral" as const,
          },
          {
            label: "Procurement Health",
            value: `${procurementHealthScore}%`,
            tone: "blue" as const,
          },
          {
            label: "Supplier Concentration",
            value: supplierConcentration,
            tone: "gold" as const,
          },
          {
            label: "Executive Signals",
            value: String(alerts.length),
            tone: "gold" as const,
          },
        ];

const executiveDecisionSignals = alerts.slice(0, 4).map((alert, index) => ({
  id: `${alert.title}-${index}`,
  rank: index + 1,
  kind: alert.level,
  title: alert.title,
  description: alert.message,
  priorityLabel:
    alert.level === "warning"
      ? "Executive Review Required"
      : alert.level === "opportunity"
        ? "Opportunity Review"
        : "Monitoring",
  recommendedResponse:
    alert.level === "warning"
      ? "Review this signal before approving the next procurement decision."
      : alert.level === "opportunity"
        ? "Evaluate the commercial value and decide whether this opportunity should enter the next action cycle."
        : "Maintain current operating discipline and continue monitoring this signal.",
}));

const executiveDecisionHealth = {
  score: hasProcurementData ? procurementHealthScore : 0,
  status: executiveStatus,
  riskIndex: riskIndexLabel,
  decisionDataConfidence: forecastAccuracyLabel,
  awardRate: `${awardRate}%`,
  rfqMaturity: rfqMaturityLabel,
};

const boardNarrative = hasProcurementData
? `Current procurement activity shows ${totalRfqs} RFQs, ${submittedQuotes} supplier quotes, ${awardedRfqs} awarded RFQs, ${formatMoney(
totalAwardedSpend
)} in awarded spend, and ${forecastAccuracy}% forecast confidence. Supplier concentration is ${supplierConcentration.toLowerCase()}, and the current executive status is ${executiveStatus.toLowerCase()}.`
: "Status: Insufficient Data. Create RFQs, receive supplier quotes, and record award outcomes before presenting procurement recommendations to executives or the board.";

const strategicAvailability = {
  label: hasProcurementData
    ? "Board Intelligence Available"
    : "Insufficient Decision Data",
  tone: hasProcurementData ? ("board" as const) : ("warning" as const),
};

const strategicPortfolioSignals = [
  { title: "RFQs", value: String(totalRfqs) },
  { title: "Supplier Quotes", value: String(submittedQuotes) },
  { title: "Awarded RFQs", value: String(awardedRfqs) },
  { title: "Open RFQs", value: String(openRfqs) },
];

const strategicRecommendations = aiRecommendations.map((item, index) => ({
  id: `${item.title}-${index}`,
  rank: index + 1,
  title: item.title,
  value: item.value,
  detail: item.detail,
}));

const strategicPrimaryMetrics = [
  {
    label: "Awarded Spend",
    value: formatMoney(totalAwardedSpend),
    insight: "Awarded procurement spend recorded across current RFQs.",
    tone: "gold" as const,
  },
  {
    label: "Potential Budget Variance",
    value: hasProcurementData ? formatMoney(estimatedSavings) : "Pending",
    insight:
      "Current budget-to-award difference; not a validated savings measure.",
    tone: "gold" as const,
  },
];

const strategicOperatingMetrics = [
  {
    title: "Award Rate",
    value: `${awardRate}%`,
    detail: "Awarded RFQs relative to total RFQ activity.",
    accentClassName: "text-emerald-300",
  },
  {
    title: "Procurement Velocity",
    value: `${procurementVelocity}%`,
    detail: "Current award progression across the RFQ portfolio.",
    accentClassName: "text-[#9BE8F8]",
  },
  {
    title: "Budget Utilization",
    value: `${budgetUtilization}%`,
    detail: "Awarded spend relative to the current planned budget.",
    accentClassName: "text-[#F5D77B]",
  },
];

const strategicSupportingSignals = [
  { title: "Supplier Concentration", value: supplierConcentration },
  { title: "Open RFQs", value: String(openRfqs) },
];

const readinessTone =
readinessScore >= 85 ? "success" : readinessScore >= 55 ? "warning" : "blue";

const topRfqsByBudget = [...rfqList]
.sort((a, b) => Number(b.budget || 0) - Number(a.budget || 0))
.slice(0, 5);

const recentAwards = awardedQuotes.slice(0, 5);

const procurementOperationsClassification = {
  status: procurementMixStatus,
  description: `${procurementMixStatus}. Dominant procurement scope is ${
    hasProcurementData ? dominantScope : "Pending"
  }. Dominant sourcing method is ${
    hasProcurementData ? dominantSourcing : "Pending"
  }. Classification maturity score is ${constructionClassificationScore}/100.`,
  scopeMetrics: [
    { title: "Material RFQs", value: String(materialRfqs) },
    { title: "Trade RFQs", value: String(tradeRfqs) },
    { title: "Equipment RFQs", value: String(equipmentRfqs) },
    { title: "Service RFQs", value: String(serviceRfqs) },
  ],
  sourcingMetrics: [
    { title: "Open Market", value: String(openMarketRfqs) },
    { title: "Invited", value: String(invitedRfqs) },
    { title: "Sealed Bids", value: String(sealedBidRfqs) },
    { title: "Project Specific", value: String(projectSpecificRfqs) },
    { title: "Framework", value: String(frameworkRfqs) },
  ],
};

const recentAwardDecisions = recentAwards.map((quote) => {
  const relatedRfq = rfqList.find((rfq) => rfq.id === quote.rfq_id);

  return {
    id: quote.id,
    title: relatedRfq?.title || "Awarded RFQ",
    location: relatedRfq?.location || "Location N/A",
    amount: formatMoney(quote.amount),
    status: "Awarded",
  };
});

const highestValueRfqs = topRfqsByBudget.map((rfq) => ({
  id: rfq.id,
  title: rfq.title || "Untitled RFQ",
  href: rfq.slug ? `/rfq/${rfq.slug}` : "/rfq",
  location: rfq.location || "Location N/A",
  scope:
    PROCUREMENT_SCOPE_LABELS[getProcurementScope(rfq.procurement_scope)],
  sourcingMethod:
    SOURCING_METHOD_LABELS[getSourcingMethod(rfq.sourcing_method)],
  contractFramework:
    CONTRACT_FRAMEWORK_LABELS[
      getContractFramework(rfq.contract_framework)
    ],
  status: rfq.status || "open",
  budget: formatMoney(rfq.budget),
}));

const governanceCompany = {
  label: dashboardCopy.companyLabel,
  name: currentCompany?.name || "Company Workspace",
  logoUrl: currentCompany?.logo_url || null,
  category: currentCompany?.category || "Category N/A",
  location: currentCompany?.location || "Location N/A",
  networkRole: currentCompany?.network_role || "Enterprise Workspace",
  href: currentCompany?.slug
    ? `/company/${currentCompany.slug}`
    : "/company/settings",
};

const incompleteGovernanceTasks = readinessItems
  .filter((item) => !item.completed)
  .map((item, index) => ({
    id: `${item.href}-${index}`,
    title: item.title,
    description: item.description,
    href: item.href,
  }));

const governanceReadiness = {
  score: readinessScore,
  status:
    incompleteGovernanceTasks.length === 0
      ? "Workspace Setup Complete"
      : `${incompleteGovernanceTasks.length} Setup Requirement${
          incompleteGovernanceTasks.length === 1 ? "" : "s"
        }`,
  incompleteTasksCount: incompleteGovernanceTasks.length,
  tasks: incompleteGovernanceTasks,
};

const governanceActivity = {
  label: dashboardCopy.activityLabel,
  title: dashboardCopy.activityTitle,
  items: activityFeed.map((event) => ({
    id: event.id,
    title: event.title,
    description: event.description,
    type: event.type,
    severity: event.severity,
    relativeTime: formatRelativeTime(event.createdAt),
    href: event.href,
  })),
};

const governanceNavigation = [
  {
    title: "RFQ Workspace",
    description: "Create, manage, and review procurement opportunities.",
    href: "/rfq",
  },
  {
    title: "Executive Analytics",
    description: "Review board reporting, risk, and procurement intelligence.",
    href: "/analytics",
  },
  {
    title: "Company Workspace",
    description: "Manage company governance, access, and visibility.",
    href: "/company/settings",
  },
  {
    title: "Activity Center",
    description: "Review alerts, workflow signals, and procurement events.",
    href: "/notifications",
  },
];

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

<ExecutiveDecisionWorkspace
  title={dashboardCopy.briefTitle}
  summary={executiveBriefSummary}
  recommendedAction={dashboardCopy.recommendation}
  status={executiveDecisionStatus}
  metrics={executiveDecisionMetrics}
  signals={executiveDecisionSignals}
  health={executiveDecisionHealth}
/>

<StrategicIntelligenceWorkspace
  narrative={boardNarrative}
  availability={strategicAvailability}
  portfolioSignals={strategicPortfolioSignals}
  recommendations={strategicRecommendations}
  primaryMetrics={strategicPrimaryMetrics}
  operatingMetrics={strategicOperatingMetrics}
  supportingSignals={strategicSupportingSignals}
/>

<ProcurementOperationsWorkspace
  classification={procurementOperationsClassification}
  recentAwards={recentAwardDecisions}
  highestValueRfqs={highestValueRfqs}
/>

<GovernanceReferenceWorkspace
  company={governanceCompany}
  readiness={governanceReadiness}
  activity={governanceActivity}
  navigation={governanceNavigation}
/>
</div>
</main>
);
}

