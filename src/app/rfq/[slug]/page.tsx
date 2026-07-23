import Link from "next/link";

import InviteVendorForm from "@/components/invite-vendor-form";
import RFQAIAdvisor from "@/components/rfq-ai-advisor";
import { createClient } from "@/lib/supabase/server";
import { ExecutiveDecisionCenter } from "@/components/rfq-workspace/executive-decision-center";
import { ExecutiveActionQueue } from "@/components/rfq-workspace/executive-action-queue";
import { ExecutiveDecisionTimeline } from "@/components/rfq-workspace/executive-decision-timeline";
import { ExecutiveReadinessMeter } from "@/components/rfq-workspace/executive-readiness-meter";
import { ExecutiveAIExplainability } from "@/components/rfq-workspace/executive-ai-explainability";
import { ExecutiveSupplierDNA } from "@/components/rfq-workspace/executive-supplier-dna";
import { ExecutiveNegotiationIntelligence } from "@/components/rfq-workspace/executive-negotiation-intelligence";
import { AwardScenarioSimulator } from "@/components/rfq-workspace/award-scenario-simulator";
import { ExecutiveIntelligenceProvider } from "@/components/rfq-workspace/shared/executive-intelligence-context";
import { buildExecutiveIntelligence } from "@/lib/executive/executive-engine";
import {
  buildRfqCapabilities,
  resolveRfqParticipantRole,
} from "@/lib/procurement/rfq-access-contract";
import {
  getExecutiveRiskMatrix,
  getHealthLabel,
  getHealthScore,
  getHealthTone,
  getProcurementHealthBreakdown,
} from "@/lib/procurement/rfq-procurement-health";

import { ExecutivePanel } from "@/components/executive/executive-panel";
import { RFQCommandCenter } from "@/components/rfq-workspace/rfq-command-center";
import { RFQProcurementHealth } from "@/components/rfq-workspace/rfq-procurement-health";
import { RFQExecutiveRiskMatrix } from "@/components/rfq-workspace/rfq-executive-risk-matrix";
import { RFQExecutiveGuidance } from "@/components/rfq-workspace/rfq-executive-guidance";
import { RFQExecutiveActions } from "@/components/rfq-workspace/rfq-executive-actions";
import { RFQProcurementContext } from "@/components/rfq-workspace/rfq-procurement-context";
import { RFQDocumentWorkspace } from "@/components/rfq-workspace/rfq-document-workspace";
import { RFQQuoteWorkspace } from "@/components/rfq-workspace/rfq-quote-workspace";
import { RFQRecommendedAwardPath } from "@/components/rfq-workspace/rfq-recommended-award-path";
import {
  RFQBlindBiddingNotice,
  RFQGovernanceNotice,
} from "@/components/rfq-workspace/rfq-governance-controls";

type PageProps = {
params: Promise<{ slug: string }>;
};
type ProcurementScope =
| "material"
| "subcontractor"
| "equipment"
| "professional_service";
type SourcingMethod = "open" | "invited" | "sealed_bid";
type ContractFramework = "project_specific" | "framework";
type Profile = {
id: string;
email: string | null;
role: string | null;
company_id: string | null;
};
type Quote = {
id: string;
company_id: string | null;
user_id: string | null;
amount: number | string | null;
timeline: string | null;
message: string | null;
decision: string | null;
validity_days?: number | null;
};
type RFQ = {
id: string;
slug: string;
title: string | null;
description: string | null;
category: string | null;
location: string | null;
budget: number | string | null;
deadline: string | null;
deadline_timezone?: string | null;
rfi_deadline?: string | null;
rfi_deadline_timezone?: string | null;
status: string | null;
company_id: string | null;
procurement_scope: ProcurementScope | null;
sourcing_method: SourcingMethod | null;
contract_framework: ContractFramework | null;
};
type ScoredQuote = Quote & {
amountNumber: number;
rank: number;
priceScore: number;
timelineScore: number;
riskScore: number;
performanceScore: number;
totalScore: number;
awardConfidence: number;
riskLevel: string;
budgetVariance: number;
lowestBidVariance: number;
};
const PROCUREMENT_SCOPE_LABELS: Record<ProcurementScope, string> = {
material: "Material / Product RFQ",
subcontractor: "Subcontractor / Trade RFQ",
equipment: "Equipment Rental RFQ",
professional_service: "Professional Service RFQ",
};
const SOURCING_METHOD_LABELS: Record<SourcingMethod, string> = {
open: "Open RFQ",
invited: "Invited / Selective RFQ",
sealed_bid: "Sealed Bid RFQ",
};
const CONTRACT_FRAMEWORK_LABELS: Record<ContractFramework, string> = {
project_specific: "Project-Specific RFQ",
framework: "Master / Framework RFQ",
};
const RIGHT_TO_REJECT_NOTICE =
"The Buyer reserves the right to accept or reject any or all submissions, request clarifications, negotiate commercial terms, or cancel the RFQ process at any time without liability or obligation to justify the decision.";
function formatMoney(value: number | string | null | undefined) {
const amount = Number(value);
if (!Number.isFinite(amount)) {
return "$0";
}
return `$${amount.toLocaleString()}`;
}
function formatDateTime(
value: string | null | undefined,
timeZone?: string | null
) {
if (!value) return "N/A";

const date = new Date(value);

if (Number.isNaN(date.getTime())) {
return value;
}

const resolvedTimeZone = timeZone || "America/Toronto";

try {
return `${date.toLocaleString("en-US", {
year: "numeric",
month: "long",
day: "numeric",
hour: "2-digit",
minute: "2-digit",
timeZone: resolvedTimeZone,
})} ${resolvedTimeZone}`;
} catch {
return date.toLocaleString("en-US", {
year: "numeric",
month: "long",
day: "numeric",
hour: "2-digit",
minute: "2-digit",
});
}
}

function hasDeadlinePassed(deadline: string | null | undefined) {
if (!deadline) return false;

const deadlineDate = new Date(deadline);

if (Number.isNaN(deadlineDate.getTime())) {
return false;
}

return new Date().getTime() > deadlineDate.getTime();
}

function getDaysUntilDeadline(deadline: string | null | undefined) {
if (!deadline) return null;

const deadlineDate = new Date(deadline);

if (Number.isNaN(deadlineDate.getTime())) {
return null;
}

return Math.ceil(
(deadlineDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
);
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

function getScopeLabel(value: ProcurementScope | null | undefined) {
return PROCUREMENT_SCOPE_LABELS[getProcurementScope(value)];
}

function getSourcingLabel(value: SourcingMethod | null | undefined) {
return SOURCING_METHOD_LABELS[getSourcingMethod(value)];
}

function getFrameworkLabel(value: ContractFramework | null | undefined) {
return CONTRACT_FRAMEWORK_LABELS[getContractFramework(value)];
}

function shouldEnforceBlindBidding(rfq: RFQ) {
const sourcingMethod = getSourcingMethod(rfq.sourcing_method);
const contractFramework = getContractFramework(rfq.contract_framework);

return (
sourcingMethod === "invited" ||
sourcingMethod === "sealed_bid" ||
contractFramework === "framework"
);
}

function getBlindBiddingMessage(rfq: RFQ) {
const sourcingMethod = getSourcingMethod(rfq.sourcing_method);
const contractFramework = getContractFramework(rfq.contract_framework);

if (sourcingMethod === "sealed_bid") {
return "This sealed bid RFQ is under blind bidding control. Commercial submissions remain locked until the official closing deadline.";
}

if (contractFramework === "framework") {
return "This framework RFQ uses controlled commercial access. Supplier pricing remains hidden until the RFQ deadline has passed.";
}

return "This invited RFQ uses blind bidding controls. Buyer-side users can see participation counts, but commercial pricing is locked until closing.";
}

function getTimelineMonths(timeline: string | null) {
const value = String(timeline || "").toLowerCase();
const numberMatch = value.match(/\d+/);
const amount = numberMatch ? Number(numberMatch[0]) : null;

if (!amount) {
if (value.includes("q1")) return 3;
if (value.includes("q2")) return 6;
if (value.includes("q3")) return 9;
if (value.includes("q4")) return 12;
if (value.includes("fast") || value.includes("quick")) return 6;
return 18;
}

if (value.includes("week")) {
return Math.max(1, Math.round(amount / 4.345));
}

if (value.includes("month")) {
return amount;
}

return amount;
}

function getTimelineScore(timeline: string | null) {
const months = getTimelineMonths(timeline);

if (months <= 6) return 100;
if (months <= 9) return 92;
if (months <= 12) return 84;
if (months <= 16) return 74;
if (months <= 20) return 62;
if (months <= 24) return 52;

return 40;
}

function getPerformanceScore(message: string | null) {
const value = String(message || "").toLowerCase();

let score = 55;

const positiveSignals = [
"healthcare",
"hospital",
"infection control",
"phased",
"occupied",
"quality assurance",
"project management",
"firestopping",
"commissioning",
"warranty",
"experience",
"certified",
"cor",
"wsib",
];

positiveSignals.forEach((signal) => {
if (value.includes(signal)) score += 4;
});

if (value.length > 500) score += 5;
if (value.length > 900) score += 5;

return Math.min(score, 100);
}
function getRiskScore({
amountNumber,
budget,
timeline,
message,
}: {
amountNumber: number;
budget: number;
timeline: string | null;
message: string | null;
}) {
let score = 85;

const timelineMonths = getTimelineMonths(timeline);
const value = String(message || "").toLowerCase();

if (budget > 0 && amountNumber > budget) score -= 18;
if (budget > 0 && amountNumber < budget * 0.65) score -= 12;
if (timelineMonths > 24) score -= 15;
if (!value.includes("warranty")) score -= 5;
if (!value.includes("quality")) score -= 5;
if (!value.includes("project management")) score -= 5;

return Math.max(20, Math.min(score, 100));
}

function getRiskLevel(score: number) {
if (score >= 80) return "Low";
if (score >= 60) return "Medium";
return "High";
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

function getPredictedTimeline({
deadlinePassed,
daysUntilDeadline,
commercialEvaluationUnlocked,
recommendedQuote,
}: {
deadlinePassed: boolean;
daysUntilDeadline: number | null;
commercialEvaluationUnlocked: boolean;
recommendedQuote: ScoredQuote | null;
}) {
if (deadlinePassed || commercialEvaluationUnlocked) {
return [
{ label: "Commercial Opening", value: "Available Now" },
{
label: "Executive Review",
value: recommendedQuote ? "Ready Now" : "Pending Quotes",
},
{
label: "Award Path",
value: recommendedQuote ? "Ready for Validation" : "Not Ready",
},
];
}

const days = Math.max(daysUntilDeadline ?? 0, 0);

return [
{
label: "Commercial Opening",
value: days === 0 ? "Today" : `In ${days} day${days === 1 ? "" : "s"}`,
},
{
label: "Executive Review",
value: `~${days + 1} day${days + 1 === 1 ? "" : "s"}`,
},
{
label: "Award Path",
value: `~${days + 3} day${days + 3 === 1 ? "" : "s"}`,
},
];
}

function getCopilotSuggestions({
isOwner,
isOpen,
quoteCount,
documentCount,
addendaCount,
commercialEvaluationUnlocked,
recommendedQuote,
potentialSavings,
}: {
isOwner: boolean;
isOpen: boolean;
quoteCount: number;
documentCount: number;
addendaCount: number;
commercialEvaluationUnlocked: boolean;
recommendedQuote: ScoredQuote | null;
potentialSavings: number;
}) {
if (!isOwner) {
return [
"Review all active RFQ documents before submitting or revising internal pricing.",
"Confirm whether issued addenda require acknowledgement before the deadline.",
"Keep your commercial proposal aligned with timeline, validity, and scope requirements.",
];
}

const suggestions: string[] = [];

if (documentCount === 0) {
suggestions.push("Upload drawings, specifications, BOQ, or supporting files before inviting more suppliers.");
}

if (isOpen && quoteCount === 0) {
suggestions.push("Invite qualified suppliers now to create competitive bid coverage before the deadline.");
}

if (isOpen && quoteCount > 0 && quoteCount < 3) {
suggestions.push("Supplier competition is still light. Invite at least two more vendors if timing allows.");
}

if (addendaCount === 0 && documentCount > 0) {
suggestions.push("No addenda have been issued. Monitor supplier questions and clarify scope early if needed.");
}

if (!commercialEvaluationUnlocked) {
suggestions.push("Maintain blind bidding controls until commercial opening to protect procurement integrity.");
}

if (recommendedQuote) {
suggestions.push(
`Validate the recommended supplier with ${recommendedQuote.awardConfidence}% award confidence before final award.`
);
}

if (potentialSavings > 0) {
suggestions.push(
`Potential savings are currently estimated at ${formatMoney(potentialSavings)} versus average bid.`
);
}

return suggestions.slice(0, 4);
}


function getExecutiveBrief({
isOwner,
isOpen,
deadlinePassed,
blindBiddingEnabled,
commercialEvaluationUnlocked,
quoteCount,
documentCount,
addendaCount,
healthScore,
recommendedQuote,
}: {
isOwner: boolean;
isOpen: boolean;
deadlinePassed: boolean;
blindBiddingEnabled: boolean;
commercialEvaluationUnlocked: boolean;
quoteCount: number;
documentCount: number;
addendaCount: number;
healthScore: number;
recommendedQuote: ScoredQuote | null;
}) {
if (!isOwner) {
if (deadlinePassed) {
return "This RFQ is closed for supplier submissions. Your company can review its own submitted quote and available procurement documents, while competitor commercial data remains confidential.";
}

return "This supplier workspace provides controlled access to the RFQ package, addenda, acknowledgement requirements, and your company’s confidential submission status.";
}

if (blindBiddingEnabled && !commercialEvaluationUnlocked) {
return `This RFQ is operating under blind bidding control with ${quoteCount} supplier submission${
quoteCount === 1 ? "" : "s"
} received. Commercial pricing and AI ranking remain locked until the official deadline.`;
}

if (recommendedQuote) {
return `This workspace is ready for executive review. Nexus Pavilion currently ranks supplier #${recommendedQuote.rank} as the best-value option with ${recommendedQuote.awardConfidence}% award confidence based on price, timeline, performance, risk, and validity.`;
}

if (isOpen) {
return `This RFQ is active with ${documentCount} document${
documentCount === 1 ? "" : "s"
}, ${addendaCount} addendum item${
addendaCount === 1 ? "" : "s"
}, and a procurement health score of ${healthScore}/100. Next priority is supplier engagement and bid coverage.`;
}

return "This RFQ is no longer accepting submissions. Review documents, addenda, supplier responses, commercial evaluation status, and award readiness before closing the procurement record.";
}

function getNextBestAction({
isOwner,
isOpen,
canSubmitQuote,
quoteCount,
documentCount,
addendaCount,
commercialEvaluationUnlocked,
recommendedQuote,
}: {
isOwner: boolean;
isOpen: boolean;
canSubmitQuote: boolean;
quoteCount: number;
documentCount: number;
addendaCount: number;
commercialEvaluationUnlocked: boolean;
recommendedQuote: ScoredQuote | null;
}) {
if (!isOwner) {
if (canSubmitQuote) return "Submit your commercial proposal before deadline.";
return "Review the active RFQ package and monitor addenda acknowledgements.";
}

if (documentCount === 0) return "Upload drawings, specifications, BOQ, or supporting documents.";
if (isOpen && quoteCount === 0) return "Invite qualified suppliers to build competitive bid coverage.";
if (isOpen && quoteCount < 3) return "Increase supplier coverage before the deadline.";
if (addendaCount === 0 && documentCount > 0) return "Issue clarifications or addenda if scope questions arise.";
if (!commercialEvaluationUnlocked) return "Maintain blind bidding control until commercial opening.";
if (recommendedQuote) return "Open compare view and validate the recommended award path.";

return "Review RFQ governance, supplier activity, and award readiness.";
}

function getProcurementFitMessage(rfq: RFQ) {
const scope = getProcurementScope(rfq.procurement_scope);
const sourcing = getSourcingMethod(rfq.sourcing_method);
const framework = getContractFramework(rfq.contract_framework);

if (scope === "material" && framework === "framework") {
return "This RFQ is structured for recurring material pricing, supplier capacity review, and long-term procurement control.";
}

if (scope === "subcontractor") {
return "This RFQ is structured for trade package pricing, scope review, delivery capability, and subcontractor risk comparison.";
}

if (scope === "equipment") {
return "This RFQ is structured for rental duration, equipment availability, logistics, maintenance terms, and site-readiness evaluation.";
}

if (scope === "professional_service") {
return "This RFQ is structured for professional expertise, service capability, advisory fit, schedule alignment, and project requirements.";
}

if (sourcing === "sealed_bid") {
return "This RFQ is configured for controlled bid submission and deadline-based evaluation.";
}

return "This RFQ is classified for construction procurement intelligence, supplier matching, quote comparison, and executive reporting.";
}

export default async function RFQDetailPage({ params }: PageProps) {
const { slug } = await params;
const supabase = await createClient();

const {
data: { user },
} = await supabase.auth.getUser();

const { data: profileData } = user
? await supabase
.from("profiles")
.select("id, email, role, company_id")
.eq("id", user.id)
.single()
: { data: null };

const profile = profileData as Profile | null;

const { data: rfqData } = await supabase
.from("rfqs")
.select("*")
.eq("slug", slug)
.single();

const rfq = rfqData as RFQ | null;

if (!rfq) {
return (
<main className="flex min-h-screen items-center justify-center bg-[#061426] px-6 text-white">
<ExecutivePanel padding="lg" tone="risk" className="max-w-xl text-center">
<p className="text-xs font-black uppercase tracking-[0.25em] text-red-300">
RFQ Not Found
</p>

<h1 className="mt-3 text-3xl font-black text-nexus-white">
This RFQ workspace could not be found.
</h1>

<Link
href="/rfq"
className="mt-6 inline-flex rounded-full border border-white/10 bg-white/10 px-6 py-3 text-sm font-black text-white transition hover:bg-white/15"
>
Back to RFQ Marketplace
</Link>
</ExecutivePanel>
</main>
);
}

const participantRole = resolveRfqParticipantRole({
currentCompanyId: profile?.company_id ?? null,
rfqCompanyId: rfq.company_id,
});

const isOwner = participantRole === "issuer";

const rfqStatus = String(rfq.status || "open");
const deadlinePassed = hasDeadlinePassed(rfq.deadline);
const daysUntilDeadline = getDaysUntilDeadline(rfq.deadline);
const blindBiddingEnabled = shouldEnforceBlindBidding(rfq);
const commercialEvaluationUnlocked =
!blindBiddingEnabled || deadlinePassed;
const isOpen =
(!rfq.status || rfqStatus === "open") && !deadlinePassed;

const { data: quotes } = isOwner
? await supabase
.from("quotes")
.select("*")
.eq("rfq_id", rfq.id)
.order("amount", { ascending: true })
: profile?.company_id
? await supabase
.from("quotes")
.select("*")
.eq("rfq_id", rfq.id)
.eq("company_id", profile.company_id)
.order("created_at", { ascending: false })
: { data: [] };

const quoteList = (quotes ?? []) as Quote[];

const { data: attachmentData } = await supabase
.from("rfq_attachments")
.select("*")
.eq("rfq_id", rfq.id)
.order("created_at", { ascending: false });

const rfqAttachments = attachmentData ?? [];

const { data: addendaData } = await supabase
.from("rfq_addenda")
.select("*")
.eq("rfq_id", rfq.id)
.order("addendum_number", { ascending: false })
.order("created_at", { ascending: false });

const rfqAddenda = addendaData ?? [];

const { data: acknowledgementData } =
!isOwner && profile?.company_id
? await supabase
.from("rfq_addendum_acknowledgements")
.select("*")
.eq("rfq_id", rfq.id)
.eq("company_id", profile.company_id)
.order("acknowledged_at", { ascending: false })
: { data: [] };

const rfqAcknowledgements = acknowledgementData ?? [];

const { data: aiReviewData } = isOwner
? await supabase
.from("rfq_ai_reviews")
.select("*")
.eq("rfq_id", rfq.id)
.order("created_at", { ascending: false })
.limit(1)
.maybeSingle()
: { data: null };

const latestAiReview = aiReviewData ?? null;

const budget = Number(rfq.budget || 0);

const amounts = commercialEvaluationUnlocked
? quoteList
.map((quote) => Number(quote.amount))
.filter((amount) => Number.isFinite(amount))
: [];

const lowestAmount = amounts.length > 0 ? Math.min(...amounts) : null;
const highestAmount = amounts.length > 0 ? Math.max(...amounts) : null;

const averageBid =
amounts.length > 0
? Math.round(
amounts.reduce((total, amount) => total + amount, 0) / amounts.length
)
: 0;

const scoredQuotesUnranked = commercialEvaluationUnlocked
? quoteList.map((quote) => {
const amount = Number(quote.amount);
const amountNumber = Number.isFinite(amount) ? amount : 0;

const priceScore =
lowestAmount && amountNumber > 0
? Math.min(100, Math.round((lowestAmount / amountNumber) * 100))
: 0;

const timelineScore = getTimelineScore(quote.timeline);
const performanceScore = getPerformanceScore(quote.message);
const riskScore = getRiskScore({
amountNumber,
budget,
timeline: quote.timeline,
message: quote.message,
});

const validityDays = Number(quote.validity_days || 30);

const validityScore =
validityDays >= 120
? 100
: validityDays >= 90
? 92
: validityDays >= 60
? 84
: 72;

const totalScore = Math.min(
100,
Math.round(
priceScore * 0.38 +
timelineScore * 0.22 +
performanceScore * 0.18 +
riskScore * 0.14 +
validityScore * 0.08
)
);

const budgetVariance = budget > 0 ? amountNumber - budget : 0;
const lowestBidVariance =
lowestAmount && amountNumber > 0 ? amountNumber - lowestAmount : 0;

return {
...quote,
amountNumber,
rank: 0,
priceScore,
timelineScore,
riskScore,
performanceScore,
totalScore,
awardConfidence: Math.min(99, Math.max(35, totalScore)),
riskLevel: getRiskLevel(riskScore),
budgetVariance,
lowestBidVariance,
};
})
: [];

const scoredQuotes: ScoredQuote[] = scoredQuotesUnranked
.sort((a, b) => b.totalScore - a.totalScore)
.map((quote, index) => ({
...quote,
rank: index + 1,
}));

const recommendedQuote =
isOwner && scoredQuotes.length > 0 ? scoredQuotes[0] : null;

const awardedQuote = commercialEvaluationUnlocked
? scoredQuotes.find((quote) => quote.decision === "awarded")
: null;

const potentialSavings =
recommendedQuote && averageBid ? averageBid - recommendedQuote.amountNumber : 0;

const hasMyQuote =
participantRole === "respondent" &&
quoteList.length > 0;

const capabilities = buildRfqCapabilities({
participantRole,
isOpen,
blindBiddingEnabled,
commercialEvaluationUnlocked,
hasMyQuote,
hasRecommendedQuote: Boolean(recommendedQuote),
});

const canSubmitQuote = capabilities.canSubmitQuote;

const healthScore = getHealthScore({
isOpen,
deadlinePassed,
quoteCount: quoteList.length,
documentCount: rfqAttachments.length,
addendaCount: rfqAddenda.length,
hasBudget: budget > 0,
hasDescription: Boolean(rfq.description),
blindBiddingEnabled,
commercialEvaluationUnlocked,
});

const executiveBrief = getExecutiveBrief({
isOwner,
isOpen,
deadlinePassed,
blindBiddingEnabled,
commercialEvaluationUnlocked,
quoteCount: quoteList.length,
documentCount: rfqAttachments.length,
addendaCount: rfqAddenda.length,
healthScore,
recommendedQuote,
});

const nextBestAction = getNextBestAction({
isOwner,
isOpen,
canSubmitQuote,
quoteCount: quoteList.length,
documentCount: rfqAttachments.length,
addendaCount: rfqAddenda.length,
commercialEvaluationUnlocked,
recommendedQuote,
});

const healthBreakdown = getProcurementHealthBreakdown({
quoteCount: quoteList.length,
documentCount: rfqAttachments.length,
addendaCount: rfqAddenda.length,
hasBudget: budget > 0,
hasDescription: Boolean(rfq.description),
blindBiddingEnabled,
commercialEvaluationUnlocked,
});

const executiveRiskMatrix = getExecutiveRiskMatrix({
isOpen,
deadlinePassed,
quoteCount: quoteList.length,
documentCount: rfqAttachments.length,
addendaCount: rfqAddenda.length,
commercialEvaluationUnlocked,
});

const predictedTimeline = getPredictedTimeline({
deadlinePassed,
daysUntilDeadline,
commercialEvaluationUnlocked,
recommendedQuote,
});

const copilotSuggestions = getCopilotSuggestions({
isOwner,
isOpen,
quoteCount: quoteList.length,
documentCount: rfqAttachments.length,
addendaCount: rfqAddenda.length,
commercialEvaluationUnlocked,
recommendedQuote,
potentialSavings,
});

const executiveOpportunities = isOwner
? [
{
title: "Commercial Savings Opportunity",
priority: potentialSavings > 0 ? "High" : "Medium",
impact: commercialEvaluationUnlocked ? "Financial" : "Pending",
value:
potentialSavings > 0
? formatMoney(potentialSavings)
: "Awaiting bid spread",
summary:
potentialSavings > 0
? "Nexus Pavilion has identified a savings opportunity against the current average bid."
: "Savings opportunity will become clearer once supplier commercial submissions are available.",
},
{
title: "Supplier Competition Expansion",
priority: quoteList.length >= 3 ? "Medium" : "High",
impact: "Market Coverage",
value:
quoteList.length >= 3
? "Healthy coverage"
: `${Math.max(3 - quoteList.length, 1)}+ more suppliers`,
summary:
quoteList.length >= 3
? "Supplier competition is currently healthy for executive review."
: "Expanding supplier participation can improve bid quality, negotiation leverage, and award confidence.",
},
{
title: "Documentation Readiness",
priority: rfqAttachments.length > 0 ? "Medium" : "High",
impact: "Execution Risk",
value:
rfqAttachments.length > 0
? `${rfqAttachments.length} files`
: "Missing package",
summary:
rfqAttachments.length > 0
? "The RFQ document package is active and available for supplier review."
: "Uploading drawings, specifications, BOQ, or supporting documents will improve supplier clarity.",
},
{
title: "Award Readiness",
priority:
commercialEvaluationUnlocked && recommendedQuote ? "High" : "Medium",
impact: "Decision Speed",
value:
commercialEvaluationUnlocked && recommendedQuote
? `${recommendedQuote.awardConfidence}% confidence`
: "Not ready",
summary:
commercialEvaluationUnlocked && recommendedQuote
? "The RFQ has enough intelligence to support executive award validation."
: "Award readiness will improve after commercial opening and supplier comparison.",
},
]
: [];

const executiveOpportunityIntelligence = executiveOpportunities.map(
(opportunity, index) => ({
...opportunity,
rank: index + 1,
businessImpact:
opportunity.title === "Commercial Savings Opportunity"
? "Improves cost control, commercial leverage, and executive visibility into procurement value."
: opportunity.title === "Supplier Competition Expansion"
? "Improves market coverage, bid competitiveness, and confidence in supplier selection."
: opportunity.title === "Documentation Readiness"
? "Reduces scope ambiguity, supplier assumptions, pricing risk, and downstream change exposure."
: "Accelerates decision-making by aligning commercial intelligence, risk scoring, and award confidence.",
executionHorizon:
opportunity.priority === "High" ? "Immediate" : "Short-Term",
boardPriority:
opportunity.priority === "High" ? "Board-Level" : "Management-Level",
ceoRecommendation:
opportunity.title === "Commercial Savings Opportunity"
? "Validate the bid spread and prepare negotiation strategy before final award."
: opportunity.title === "Supplier Competition Expansion"
? "Increase supplier participation before deadline if timing allows."
: opportunity.title === "Documentation Readiness"
? "Strengthen the RFQ package before further supplier engagement."
: "Use compare view and AI ranking to validate the recommended award path.",
})
);

const executive = buildExecutiveIntelligence({
rfqSlug: rfq.slug,
isOwner,
isOpen,
commercialEvaluationUnlocked,
healthScore,
quoteCount: quoteList.length,
documentCount: rfqAttachments.length,
addendaCount: rfqAddenda.length,
averageBid,
lowestAmount,
budget,
potentialSavings,
recommendedQuote,
awardedQuote: awardedQuote
? {
amountNumber: awardedQuote.amountNumber,
}
: null,
});

return (
<main className="min-h-screen bg-[#061426] px-4 py-8 text-white sm:px-6 lg:px-8 lg:py-10">
<div className="mx-auto w-full max-w-[1680px]">
<RFQCommandCenter
  statusLabel={
    deadlinePassed
      ? "Submission Closed"
      : getRFQStatusLabel(rfq.status)
  }
  statusClassName={getRFQStatusClass(
    deadlinePassed ? "closed" : rfq.status
  )}
  classificationBadges={[
    getScopeLabel(rfq.procurement_scope),
    getSourcingLabel(rfq.sourcing_method),
    getFrameworkLabel(rfq.contract_framework),
    ...(blindBiddingEnabled ? ["Blind Bidding"] : []),
  ]}
  title={rfq.title || "Untitled RFQ"}
  description={rfq.description || "No description provided."}
  commandMetrics={[
    {
      title: "Procurement Health",
      value: `${healthScore}/100`,
      detail: getHealthLabel(healthScore),
      accentClassName: getHealthTone(healthScore),
    },
    {
      title: "Deadline",
      value: deadlinePassed
        ? "Closed"
        : daysUntilDeadline === null
          ? "N/A"
          : daysUntilDeadline <= 0
            ? "Due Today"
            : `${daysUntilDeadline} Days`,
      detail: formatDateTime(rfq.deadline, rfq.deadline_timezone),
      accentClassName: "text-cyan-300",
    },
    {
    title: isOwner ? "Commercial Status" : "Participation Status",
      value: isOwner
  ? commercialEvaluationUnlocked
    ? "Commercial Evaluation"
    : "Commercially Locked"
  : hasMyQuote
    ? "Quote Submitted"
    : canSubmitQuote
      ? "Ready for Submission"
      : "Awaiting Submission",
      detail: isOwner
  ? commercialEvaluationUnlocked
    ? "Comparative evaluation available"
    : "Commercial submissions protected"
  : "Organization-level confidential access",
      accentClassName: "text-[#C8A646]",
    },
  ]}
  executiveBrief={executiveBrief}
  nextBestAction={nextBestAction}
  award={
    isOwner &&
    rfqStatus === "awarded" &&
    awardedQuote &&
    commercialEvaluationUnlocked
      ? {
          label: "Award Complete",
          value: `Awarded at ${formatMoney(
            awardedQuote.amountNumber
          )}`,
        }
      : null
  }
  stripItems={[
    {
      title: "Category",
      value: rfq.category || "N/A",
    },
    {
      title: "Location",
      value: rfq.location || "N/A",
    },
    {
      title: "Budget",
      value: formatMoney(rfq.budget),
    },
    {
      title: "Quotes",
      value: String(quoteList.length),
    },
    {
      title: "Documents",
      value: String(rfqAttachments.length),
    },
    {
      title: "Addenda",
      value: String(rfqAddenda.length),
    },
  ]}
/>
<section className="mt-8 grid gap-6 xl:grid-cols-[1fr_0.85fr]">
<RFQProcurementHealth
  healthScore={healthScore}
  healthLabel={getHealthLabel(healthScore)}
  healthBreakdown={healthBreakdown}
/>
<div className="grid gap-6">
  <RFQExecutiveRiskMatrix risks={executiveRiskMatrix} />

  <RFQExecutiveGuidance
    timeline={predictedTimeline}
    recommendations={copilotSuggestions}
  />
</div>
</section>

<section className="mt-8 space-y-8">
  <RFQProcurementContext
    description={getProcurementFitMessage(rfq)}
    sourcingLabel={getSourcingLabel(rfq.sourcing_method)}
    frameworkLabel={getFrameworkLabel(rfq.contract_framework)}
    blindBiddingEnabled={blindBiddingEnabled}
  />

  <RFQExecutiveActions
    rfqSlug={rfq.slug}
    isOwner={isOwner}
    isOpen={isOpen}
    canSubmitQuote={canSubmitQuote}
    hasCompany={Boolean(rfq.company_id)}
    hasMyQuote={hasMyQuote}
    deadlinePassed={deadlinePassed}
    commercialEvaluationUnlocked={commercialEvaluationUnlocked}
    opportunities={executiveOpportunities}
    intelligence={executiveOpportunityIntelligence}
  />
</section>

{capabilities.canViewBlindBiddingControl ? (
  <section className="mt-8">
    <RFQBlindBiddingNotice
      message={getBlindBiddingMessage(rfq)}
      quoteCount={quoteList.length}
    />
  </section>
) : null}

<section className="mt-8">
  <RFQGovernanceNotice
    reservationNotice={RIGHT_TO_REJECT_NOTICE}
  />
</section>

{capabilities.canViewExecutiveIntelligence ? (
<RFQAIAdvisor rfqId={rfq.id} initialReview={latestAiReview} />
) : null}
<ExecutiveIntelligenceProvider executive={executive}>

<ExecutiveDecisionCenter
  rfqSlug={rfq.slug}
  isOwner={isOwner}
  isOpen={isOpen}
  commercialEvaluationUnlocked={commercialEvaluationUnlocked}
  healthScore={healthScore}
  quoteCount={quoteList.length}
  documentCount={rfqAttachments.length}
  addendaCount={rfqAddenda.length}
  potentialSavings={potentialSavings}
  recommendedQuote={recommendedQuote}
  executive={executive}
/>

<ExecutiveActionQueue
  executive={executive}
/>

<ExecutiveDecisionTimeline
  isOwner={isOwner}
  isOpen={isOpen}
  commercialEvaluationUnlocked={commercialEvaluationUnlocked}
  quoteCount={quoteList.length}
  documentCount={rfqAttachments.length}
  addendaCount={rfqAddenda.length}
  recommendedQuote={recommendedQuote}
  awardedQuote={
    awardedQuote
      ? {
          amountNumber: awardedQuote.amountNumber,
        }
      : null
  }
  executive={executive}
/>

<ExecutiveReadinessMeter
healthScore={healthScore}
quoteCount={quoteList.length}
documentCount={rfqAttachments.length}
addendaCount={rfqAddenda.length}
commercialEvaluationUnlocked={commercialEvaluationUnlocked}
recommendedQuote={recommendedQuote}
/>

<ExecutiveAIExplainability
    isOwner={isOwner}
    commercialEvaluationUnlocked={commercialEvaluationUnlocked}
    recommendedQuote={recommendedQuote}
       quoteCount={quoteList.length}
          executive={executive}
/>

<ExecutiveSupplierDNA
  isOwner={isOwner}
  commercialEvaluationUnlocked={commercialEvaluationUnlocked}
  recommendedQuote={recommendedQuote}
  averageBid={averageBid}
  lowestAmount={lowestAmount}
  quoteCount={quoteList.length}
  executive={executive}
/>

<ExecutiveNegotiationIntelligence
  isOwner={isOwner}
  commercialEvaluationUnlocked={commercialEvaluationUnlocked}
  recommendedQuote={recommendedQuote}
  averageBid={averageBid}
  lowestAmount={lowestAmount}
  quoteCount={quoteList.length}
  budget={budget}
  executive={executive}
/>

<AwardScenarioSimulator
  isOwner={isOwner}
  commercialEvaluationUnlocked={commercialEvaluationUnlocked}
  recommendedQuote={recommendedQuote}
  quoteCount={quoteList.length}
  executive={executive}
/>
</ExecutiveIntelligenceProvider>

{capabilities.canViewRecommendedAwardPath && recommendedQuote ? (
  <RFQRecommendedAwardPath
    recommendation={recommendedQuote}
    scopeLabel={getScopeLabel(rfq.procurement_scope)}
  />
) : null}

{capabilities.canInviteSuppliers ? (
<ExecutivePanel
id="supplier-invitations"
className="mt-8"
padding="lg"
tone="blue"
>
<p className="text-xs font-black uppercase tracking-[0.3em] text-[#9BE8F8]">
Supplier Invitation Center
</p>

<h2 className="mt-3 text-3xl font-black text-nexus-white">
Build Competitive Bid Coverage
</h2>

<p className="mt-3 max-w-3xl text-sm font-semibold leading-7 text-nexus-muted">
Invite qualified suppliers directly into this RFQ workspace while
preserving buyer-side control, commercial confidentiality, and the current
governance workflow.
</p>

<div className="mt-6">
<InviteVendorForm rfqId={rfq.id} />
</div>
</ExecutivePanel>
) : null}
<RFQDocumentWorkspace
  rfqId={rfq.id}
  companyId={rfq.company_id}
  isOwner={isOwner}
  documents={rfqAttachments}
  addenda={rfqAddenda}
  acknowledgements={rfqAcknowledgements}
/>

<RFQQuoteWorkspace
  rfqSlug={rfq.slug}
  isOwner={isOwner}
  isOpen={isOpen}
  canSubmitQuote={canSubmitQuote}
  commercialEvaluationUnlocked={commercialEvaluationUnlocked}
  quoteList={quoteList}
  scoredQuotes={scoredQuotes}
  recommendedQuoteId={recommendedQuote?.id ?? null}
  lowestAmount={lowestAmount}
  highestAmount={highestAmount}
  averageBid={averageBid}
/>


</div>
</main>
);
}
