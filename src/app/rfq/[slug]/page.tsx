import type { ReactNode } from "react";
import Link from "next/link";

import AwardContractButton from "@/components/award-contract-button";
import InviteVendorForm from "@/components/invite-vendor-form";
import RFQAddendaManager from "@/components/rfq-addenda-manager";
import RFQAddendumAcknowledgementCenter from "@/components/rfq-addendum-acknowledgement-center";
import RFQAIAdvisor from "@/components/rfq-ai-advisor";
import RFQDocumentLibrary from "@/components/rfq-document-library";
import RFQDocumentUpload from "@/components/rfq-document-upload";
import { createClient } from "@/lib/supabase/server";
import { ExecutiveOpportunityRanking } from "@/components/executive/executive-opportunity-ranking";
import { ExecutiveDecisionCenter } from "@/components/rfq-workspace/executive-decision-center";
import { ExecutiveActionQueue } from "@/components/rfq-workspace/executive-action-queue";
import { ExecutiveDecisionTimeline } from "@/components/rfq-workspace/executive-decision-timeline";
import { ExecutiveReadinessMeter } from "@/components/rfq-workspace/executive-readiness-meter";

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

function getDecisionClass(decision: string | null) {
if (decision === "awarded") return "bg-green-100 text-green-700";
if (decision === "rejected") return "bg-red-100 text-red-700";
return "bg-yellow-100 text-yellow-700";
}

function getScoreClass(score: number) {
if (score >= 90) return "text-green-700";
if (score >= 75) return "text-orange-700";
return "text-red-700";
}

function getHealthScore({
isOpen,
deadlinePassed,
quoteCount,
documentCount,
addendaCount,
hasBudget,
hasDescription,
blindBiddingEnabled,
commercialEvaluationUnlocked,
}: {
isOpen: boolean;
deadlinePassed: boolean;
quoteCount: number;
documentCount: number;
addendaCount: number;
hasBudget: boolean;
hasDescription: boolean;
blindBiddingEnabled: boolean;
commercialEvaluationUnlocked: boolean;
}) {
let score = 44;

if (isOpen) score += 8;
if (!deadlinePassed) score += 8;
if (quoteCount > 0) score += 12;
if (quoteCount >= 3) score += 8;
if (documentCount > 0) score += 12;
if (documentCount >= 3) score += 6;
if (addendaCount > 0) score += 4;
if (hasBudget) score += 6;
if (hasDescription) score += 6;
if (blindBiddingEnabled) score += 5;
if (commercialEvaluationUnlocked && quoteCount > 0) score += 5;

return Math.max(0, Math.min(score, 100));
}

function getHealthLabel(score: number) {
if (score >= 86) return "Launch-Ready";
if (score >= 72) return "Strong";
if (score >= 56) return "Needs Attention";
return "At Risk";
}

function getHealthTone(score: number) {
if (score >= 86) return "text-green-300";
if (score >= 72) return "text-cyan-300";
if (score >= 56) return "text-orange-300";
return "text-red-300";
}

function getScoreTone(score: number) {
if (score >= 85) return "Strong";
if (score >= 70) return "Healthy";
if (score >= 55) return "Watch";
return "Critical";
}

function getProcurementHealthBreakdown({
quoteCount,
documentCount,
addendaCount,
hasBudget,
hasDescription,
blindBiddingEnabled,
commercialEvaluationUnlocked,
}: {
quoteCount: number;
documentCount: number;
addendaCount: number;
hasBudget: boolean;
hasDescription: boolean;
blindBiddingEnabled: boolean;
commercialEvaluationUnlocked: boolean;
}) {
const competition = Math.min(100, quoteCount * 28 + (quoteCount >= 3 ? 16 : 0));
const documentation = Math.min(
100,
documentCount * 18 + (hasDescription ? 20 : 0) + (hasBudget ? 16 : 0)
);
const governance = Math.min(
100,
58 + (blindBiddingEnabled ? 18 : 8) + (addendaCount > 0 ? 10 : 0)
);
const decisionReadiness = Math.min(
100,
commercialEvaluationUnlocked && quoteCount > 0
? 62 + quoteCount * 8 + documentCount * 3
: 38 + quoteCount * 8 + documentCount * 4
);

return [
{
label: "Competition",
score: competition,
detail:
quoteCount >= 3
? "Healthy supplier coverage"
: "Supplier coverage can improve",
},
{
label: "Documentation",
score: documentation,
detail:
documentCount > 0
? "RFQ package is active"
: "Document package missing",
},
{
label: "Governance",
score: governance,
detail: blindBiddingEnabled
? "Controlled commercial process"
: "Standard RFQ controls",
},
{
label: "Decision Readiness",
score: decisionReadiness,
detail: commercialEvaluationUnlocked
? "Evaluation path is open"
: "Awaiting commercial opening",
},
];
}

function getExecutiveRiskMatrix({
isOpen,
deadlinePassed,
quoteCount,
documentCount,
addendaCount,
commercialEvaluationUnlocked,
}: {
isOpen: boolean;
deadlinePassed: boolean;
quoteCount: number;
documentCount: number;
addendaCount: number;
commercialEvaluationUnlocked: boolean;
}) {
return [
{
label: "Schedule",
level: deadlinePassed ? "Closed" : isOpen ? "Controlled" : "Watch",
detail: deadlinePassed
? "Submission window has closed"
: "Deadline is active and trackable",
},
{
label: "Competition",
level: quoteCount >= 3 ? "Strong" : quoteCount > 0 ? "Moderate" : "Low",
detail:
quoteCount >= 3
? "Bid coverage is healthy"
: "More supplier participation recommended",
},
{
label: "Documentation",
level: documentCount >= 3 ? "Strong" : documentCount > 0 ? "Moderate" : "Low",
detail:
documentCount > 0
? "RFQ package has supporting files"
: "Upload documents before supplier review",
},
{
label: "Commercial",
level: commercialEvaluationUnlocked ? "Open" : "Locked",
detail: commercialEvaluationUnlocked
? "Commercial comparison is available"
: "Commercial data remains protected",
},
{
label: "Clarifications",
level: addendaCount > 0 ? "Active" : "Quiet",
detail:
addendaCount > 0
? "Addenda history is present"
: "No issued addenda yet",
},
];
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
<main className="flex min-h-screen items-center justify-center bg-[#f6f6f3]">
<p className="text-xl font-bold text-slate-950">RFQ not found</p>
</main>
);
}

const isOwner = Boolean(
profile?.company_id && rfq.company_id === profile.company_id
);

const rfqStatus = String(rfq.status || "open");
const deadlinePassed = hasDeadlinePassed(rfq.deadline);
const daysUntilDeadline = getDaysUntilDeadline(rfq.deadline);
const blindBiddingEnabled = shouldEnforceBlindBidding(rfq);
const commercialEvaluationUnlocked = !blindBiddingEnabled || deadlinePassed;
const isOpen = (!rfq.status || rfqStatus === "open") && !deadlinePassed;

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

const hasMyQuote = !isOwner && quoteList.length > 0;
const canSubmitQuote = !isOwner && isOpen && !hasMyQuote;

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


return (
<main className="min-h-screen bg-[#f6f6f3] px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
<div className="mx-auto max-w-7xl">
<Link
href="/rfq"
className="text-sm font-semibold text-slate-500 hover:text-slate-950"
>
← Back to RFQ Marketplace
</Link>

<section className="mt-8 overflow-hidden rounded-[40px] border border-white/10 bg-slate-950 text-white shadow-[0_30px_100px_rgba(2,6,23,0.28)]">
<div className="relative overflow-hidden p-6 sm:p-8 lg:p-10">
<div className="absolute right-0 top-0 h-72 w-72 rounded-full bg-cyan-400/10 blur-3xl" />
<div className="absolute bottom-0 left-0 h-72 w-72 rounded-full bg-orange-400/10 blur-3xl" />

<div className="relative grid gap-10 lg:grid-cols-[1.25fr_0.75fr]">
<div>
<p className="text-xs font-black uppercase tracking-[0.35em] text-[#C8A646]">
Procurement Command Center
</p>

<div className="mt-4 flex flex-wrap items-center gap-3">
<span
className={`rounded-full px-4 py-2 text-sm font-black ${getRFQStatusClass(
deadlinePassed ? "closed" : rfq.status
)}`}
>
{deadlinePassed
? "Submission Closed"
: getRFQStatusLabel(rfq.status)}
</span>

<DarkBadge>{getScopeLabel(rfq.procurement_scope)}</DarkBadge>
<DarkBadge>{getSourcingLabel(rfq.sourcing_method)}</DarkBadge>
<DarkBadge>{getFrameworkLabel(rfq.contract_framework)}</DarkBadge>
{blindBiddingEnabled ? <DarkBadge>Blind Bidding</DarkBadge> : null}
</div>

<h1 className="mt-6 text-4xl font-black leading-tight sm:text-5xl lg:text-6xl">
{rfq.title}
</h1>

<p className="mt-5 max-w-4xl text-sm font-semibold leading-7 text-slate-300">
{rfq.description || "No description provided."}
</p>

<div className="mt-8 grid gap-4 md:grid-cols-3">
<CommandMetric
title="Procurement Health"
value={`${healthScore}/100`}
detail={getHealthLabel(healthScore)}
accentClassName={getHealthTone(healthScore)}
/>

<CommandMetric
title="Deadline"
value={
deadlinePassed
? "Closed"
: daysUntilDeadline === null
? "N/A"
: daysUntilDeadline <= 0
? "Due Today"
: `${daysUntilDeadline} Days`
}
detail={formatDateTime(rfq.deadline, rfq.deadline_timezone)}
accentClassName="text-cyan-300"
/>

<CommandMetric
title={isOwner ? "Decision Status" : "Supplier Status"}
value={
isOwner
? commercialEvaluationUnlocked
? "Evaluation"
: "Locked"
: hasMyQuote
? "Submitted"
: canSubmitQuote
? "Open"
: "Pending"
}
detail={
isOwner
? commercialEvaluationUnlocked
? "Commercial review available"
: "Blind bidding active"
: "Company-level confidential access"
}
accentClassName="text-[#C8A646]"
/>
</div>
</div>

<div className="relative rounded-[32px] border border-white/10 bg-white/10 p-6 backdrop-blur">
<p className="text-xs font-black uppercase tracking-[0.3em] text-cyan-300">
Executive Brief
</p>

<h2 className="mt-4 text-2xl font-black text-white">
Current Procurement Readout
</h2>

<p className="mt-4 text-sm font-semibold leading-7 text-slate-300">
{executiveBrief}
</p>

<div className="mt-6 rounded-3xl border border-white/10 bg-slate-950/60 p-5">
<p className="text-xs font-black uppercase tracking-[0.25em] text-[#C8A646]">
Next Best Action
</p>

<p className="mt-3 text-sm font-bold leading-6 text-white">
{nextBestAction}
</p>
</div>

{isOwner &&
rfqStatus === "awarded" &&
awardedQuote &&
commercialEvaluationUnlocked ? (
<div className="mt-4 rounded-3xl border border-green-400/20 bg-green-400/10 p-5">
<p className="text-xs font-black uppercase tracking-[0.25em] text-green-300">
Award Complete
</p>

<p className="mt-3 text-sm font-bold text-white">
Awarded at {formatMoney(awardedQuote.amountNumber)}
</p>
</div>
) : null}
</div>
</div>
</div>

<div className="grid border-t border-white/10 bg-white/[0.03] md:grid-cols-2 xl:grid-cols-6">
<CommandStripCard title="Category" value={rfq.category || "N/A"} />
<CommandStripCard title="Location" value={rfq.location || "N/A"} />
<CommandStripCard title="Budget" value={formatMoney(rfq.budget)} />
<CommandStripCard title="Quotes" value={String(quoteList.length)} />
<CommandStripCard title="Documents" value={String(rfqAttachments.length)} />
<CommandStripCard title="Addenda" value={String(rfqAddenda.length)} />
</div>
</section>

<section className="mt-8 grid gap-6 xl:grid-cols-[1fr_0.85fr]">
<div className="rounded-[36px] border border-black/5 bg-white p-6 shadow-sm sm:p-8">
<div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
<div>
<p className="text-xs font-black uppercase tracking-[0.3em] text-orange-500">
Procurement Health Engine
</p>

<h2 className="mt-3 text-3xl font-black text-slate-950">
Health Breakdown
</h2>

<p className="mt-3 max-w-3xl text-sm font-semibold leading-7 text-slate-600">
Nexus Pavilion evaluates RFQ readiness across competition,
documentation, governance, and award decision readiness.
</p>
</div>

<div className="rounded-3xl bg-slate-950 px-6 py-5 text-white">
<p className="text-xs font-black uppercase tracking-[0.25em] text-slate-400">
Overall
</p>

<p className={`mt-2 text-4xl font-black ${getHealthTone(healthScore)}`}>
{healthScore}
</p>

<p className="mt-1 text-xs font-bold text-slate-300">
{getHealthLabel(healthScore)}
</p>
</div>
</div>

<div className="mt-8 grid gap-4">
{healthBreakdown.map((item) => (
<div
key={item.label}
className="rounded-3xl border border-slate-100 bg-slate-50 p-5"
>
<div className="flex items-start justify-between gap-4">
<div>
<p className="text-sm font-black text-slate-950">
{item.label}
</p>

<p className="mt-1 text-xs font-bold text-slate-500">
{item.detail}
</p>
</div>

<div className="text-right">
<p className="text-2xl font-black text-slate-950">
{item.score}
</p>

<p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">
{getScoreTone(item.score)}
</p>
</div>
</div>

<div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-200">
<div
className="h-full rounded-full bg-slate-950"
style={{ width: `${item.score}%` }}
/>
</div>
</div>
))}
</div>
</div>

<div className="grid gap-6">
<div className="rounded-[36px] border border-black/5 bg-slate-950 p-6 text-white shadow-sm sm:p-8">
<p className="text-xs font-black uppercase tracking-[0.3em] text-[#C8A646]">
Executive Risk Matrix
</p>

<h2 className="mt-3 text-3xl font-black text-white">
Risk Control Board
</h2>

<div className="mt-6 grid gap-3">
{executiveRiskMatrix.map((risk) => (
<div
key={risk.label}
className="rounded-3xl border border-white/10 bg-white/10 p-5"
>
<div className="flex items-start justify-between gap-4">
<div>
<p className="text-sm font-black text-white">
{risk.label}
</p>

<p className="mt-1 text-xs font-bold leading-5 text-slate-400">
{risk.detail}
</p>
</div>

<span className="rounded-full bg-white px-3 py-1 text-xs font-black text-slate-950">
{risk.level}
</span>
</div>
</div>
))}
</div>
</div>

<div className="rounded-[36px] border border-black/5 bg-white p-6 shadow-sm sm:p-8">
<p className="text-xs font-black uppercase tracking-[0.3em] text-orange-500">
Executive Timeline Prediction
</p>

<h2 className="mt-3 text-3xl font-black text-slate-950">
Forecasted Procurement Path
</h2>

<div className="mt-6 grid gap-3">
{predictedTimeline.map((item, index) => (
<div
key={item.label}
className="flex items-center gap-4 rounded-3xl border border-slate-100 bg-slate-50 p-5"
>
<div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-950 text-sm font-black text-white">
{index + 1}
</div>

<div>
<p className="text-sm font-black text-slate-950">
{item.label}
</p>

<p className="mt-1 text-sm font-bold text-slate-500">
{item.value}
</p>
</div>
</div>
))}
</div>
</div>

<div className="rounded-[36px] border border-cyan-200 bg-cyan-50 p-6 shadow-sm sm:p-8">
<p className="text-xs font-black uppercase tracking-[0.3em] text-cyan-700">
Procurement Copilot
</p>

<h2 className="mt-3 text-3xl font-black text-slate-950">
Smart Recommendations
</h2>

<div className="mt-6 grid gap-3">
{copilotSuggestions.map((suggestion) => (
<div
key={suggestion}
className="rounded-3xl border border-cyan-100 bg-white p-5"
>
<p className="text-sm font-bold leading-6 text-slate-700">
{suggestion}
</p>
</div>
))}
</div>
</div>
</div>
</section>


<section className="mt-8 grid gap-6 lg:grid-cols-[1fr_0.85fr]">
<div className="rounded-[36px] border border-black/5 bg-white p-6 shadow-sm sm:p-8">
<p className="text-xs font-black uppercase tracking-[0.3em] text-orange-500">
Procurement Intelligence Context
</p>

<h2 className="mt-3 text-3xl font-black text-slate-950">
RFQ Operating Model
</h2>

<p className="mt-4 max-w-4xl text-sm font-semibold leading-7 text-slate-700">
{getProcurementFitMessage(rfq)}
</p>

<div className="mt-6 grid gap-4 md:grid-cols-3">
<InfoCard title="Sourcing" value={getSourcingLabel(rfq.sourcing_method)} />
<InfoCard title="Framework" value={getFrameworkLabel(rfq.contract_framework)} />
<InfoCard
title="Commercial Control"
value={blindBiddingEnabled ? "Blind Bidding" : "Open Evaluation"}
/>
</div>
</div>

<div className="rounded-[36px] border border-black/5 bg-white p-6 shadow-sm sm:p-8">
<p className="text-xs font-black uppercase tracking-[0.3em] text-orange-500">
CEO Action Center
</p>

<h2 className="mt-3 text-3xl font-black text-slate-950">
Priority Actions
</h2>

<div className="mt-6 grid gap-3">
{canSubmitQuote ? (
<ActionLink href={`/rfq/${rfq.slug}/submit`} label="Submit Quote" />
) : null}

{isOwner ? (
<ExecutiveOpportunityRanking
opportunities={executiveOpportunities}
intelligence={executiveOpportunityIntelligence}
/>
) : null}

{isOwner && isOpen ? (
<ActionAnchor href="#supplier-invitations" label="Invite Suppliers" />
) : null}

{isOwner && rfq.company_id ? (
<ActionAnchor href="#document-center" label="Upload Documents" />
) : null}

<ActionAnchor href="#document-center" label="Review Document Center" />

{isOwner && commercialEvaluationUnlocked ? (
<ActionLink href={`/rfq/${rfq.slug}/compare`} label="Open Compare View" />
) : null}

{isOwner && !commercialEvaluationUnlocked ? (
<div className="rounded-2xl border border-orange-200 bg-orange-50 p-4">
<p className="text-sm font-black text-orange-800">
Commercial evaluation is locked until the deadline.
</p>
</div>
) : null}

{!isOwner && hasMyQuote ? (
<div className="rounded-2xl border border-green-200 bg-green-50 p-4">
<p className="text-sm font-black text-green-800">
Your company has submitted a quote.
</p>
</div>
) : null}

{!isOwner && deadlinePassed && !hasMyQuote ? (
<div className="rounded-2xl border border-red-200 bg-red-50 p-4">
<p className="text-sm font-black text-red-800">
RFQ deadline has passed.
</p>
</div>
) : null}
</div>
</div>
</section>

{isOwner && blindBiddingEnabled && !commercialEvaluationUnlocked ? (
<section className="mt-8">
<BlindBiddingNotice rfq={rfq} quoteCount={quoteList.length} />
</section>
) : null}

<section className="mt-8">
<GovernanceNotice />
</section>

{isOwner ? (
<RFQAIAdvisor rfqId={rfq.id} initialReview={latestAiReview} />
) : null}

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
/>

<ExecutiveActionQueue
rfqSlug={rfq.slug}
isOwner={isOwner}
isOpen={isOpen}
commercialEvaluationUnlocked={commercialEvaluationUnlocked}
quoteCount={quoteList.length}
documentCount={rfqAttachments.length}
addendaCount={rfqAddenda.length}
healthScore={healthScore}
recommendedQuote={recommendedQuote}
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
/>

<ExecutiveReadinessMeter
healthScore={healthScore}
quoteCount={quoteList.length}
documentCount={rfqAttachments.length}
addendaCount={rfqAddenda.length}
commercialEvaluationUnlocked={commercialEvaluationUnlocked}
recommendedQuote={recommendedQuote}
/>

{isOwner && recommendedQuote && commercialEvaluationUnlocked ? (
<section className="mt-8 rounded-[36px] bg-slate-950 p-6 text-white shadow-[0_24px_80px_rgba(2,6,23,0.24)] sm:p-8">
<p className="text-xs font-black uppercase tracking-[0.3em] text-[#C8A646]">
Decision Intelligence Layer
</p>

<div className="mt-5 grid gap-8 lg:grid-cols-[1fr_0.9fr]">
<div>
<h2 className="text-3xl font-black sm:text-4xl">
Recommended Award Path: Rank #{recommendedQuote.rank}
</h2>

<p className="mt-4 max-w-3xl text-sm leading-7 text-slate-300">
Nexus Pavilion recommends this supplier based on weighted
analysis of price competitiveness, delivery timeline, proposal
strength, procurement risk, proposal validity, and RFQ
classification.
</p>

<div className="mt-6 flex flex-wrap gap-3">
<DarkBadge>Overall {recommendedQuote.totalScore}/100</DarkBadge>
<DarkBadge>Risk {recommendedQuote.riskLevel}</DarkBadge>
<DarkBadge>Confidence {recommendedQuote.awardConfidence}%</DarkBadge>
<DarkBadge>{getScopeLabel(rfq.procurement_scope)}</DarkBadge>
</div>
</div>

<div className="grid gap-4 sm:grid-cols-2">
<DarkMetric
title="Price Score"
value={`${recommendedQuote.priceScore}/100`}
/>
<DarkMetric
title="Timeline Score"
value={`${recommendedQuote.timelineScore}/100`}
/>
<DarkMetric
title="Performance"
value={`${recommendedQuote.performanceScore}/100`}
/>
<DarkMetric
title="Risk Score"
value={`${recommendedQuote.riskScore}/100`}
/>
</div>
</div>
</section>
) : null}

{isOwner && isOpen ? (
<section
id="supplier-invitations"
className="mt-8 rounded-[36px] border border-black/5 bg-white p-6 shadow-sm sm:p-8"
>
<p className="text-xs font-black uppercase tracking-[0.3em] text-orange-500">
Supplier Invitation Center
</p>

<h2 className="mt-3 text-3xl font-black text-slate-950">
Build Competitive Bid Coverage
</h2>

<p className="mt-3 max-w-3xl text-sm font-semibold leading-7 text-slate-600">
Invite qualified suppliers directly into this RFQ workspace while
preserving buyer-side control, commercial confidentiality, and the
current governance workflow.
</p>

<div className="mt-6">
<InviteVendorForm rfqId={rfq.id} />
</div>
</section>
) : null}
<section
id="document-center"
className="mt-8 overflow-hidden rounded-[40px] border border-white/10 bg-[#061426] text-white shadow-[0_24px_80px_rgba(0,0,0,0.28)]"
>
<div className="border-b border-white/10 p-6 sm:p-8">
<div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
<div>
<p className="text-xs font-black uppercase tracking-[0.3em] text-[#C8A646]">
Executive Document Center
</p>

<h2 className="mt-3 text-3xl font-black text-white sm:text-4xl">
Procurement Package Control Room
</h2>

<p className="mt-3 max-w-4xl text-sm font-semibold leading-7 text-slate-400">
A single controlled environment for drawings, specifications,
BOQ files, photos, supporting documents, addenda, supplier
acknowledgements, and procurement package governance.
</p>
</div>

<div className="grid min-w-full gap-3 sm:grid-cols-3 lg:min-w-[420px]">
<DarkMetric title="Documents" value={String(rfqAttachments.length)} />
<DarkMetric title="Addenda" value={String(rfqAddenda.length)} />
<DarkMetric title="Access" value={isOwner ? "Buyer" : "Supplier"} />
</div>
</div>
</div>

{isOwner && rfq.company_id ? (
<div className="border-b border-white/10 p-6 sm:p-8">
<div className="mb-6">
<p className="text-xs font-black uppercase tracking-[0.25em] text-cyan-300">
Upload Center
</p>

<h3 className="mt-3 text-2xl font-black text-white">
Upload RFQ Documents
</h3>

<p className="mt-3 max-w-3xl text-sm font-semibold leading-7 text-slate-400">
Add drawings, specifications, BOQ files, site photos,
clarifications, and supporting documents to the live RFQ
workspace. Uploading here keeps the supplier-facing package
current without changing the RFQ creation wizard.
</p>
</div>

<div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
<RFQDocumentUpload
rfqId={rfq.id}
companyId={rfq.company_id}
attachmentType="drawing"
title="Upload Drawings"
description="Architectural, engineering, shop drawing, or PDF drawing packages."
/>

<RFQDocumentUpload
rfqId={rfq.id}
companyId={rfq.company_id}
attachmentType="specification"
title="Upload Specifications"
description="Technical specifications, MasterFormat sections, product requirements, or scope specs."
/>

<RFQDocumentUpload
rfqId={rfq.id}
companyId={rfq.company_id}
attachmentType="boq"
title="Upload BOQ"
description="Bill of quantities, bid forms, Excel pricing sheets, or quantity takeoff documents."
/>

<RFQDocumentUpload
rfqId={rfq.id}
companyId={rfq.company_id}
attachmentType="photo"
title="Upload Photos"
description="Site photos, existing conditions, reference images, or project context photos."
/>

<RFQDocumentUpload
rfqId={rfq.id}
companyId={rfq.company_id}
attachmentType="addenda"
title="Upload Addenda"
description="Clarifications, addenda, revisions, bulletins, or updated RFQ instructions."
/>

<RFQDocumentUpload
rfqId={rfq.id}
companyId={rfq.company_id}
attachmentType="supporting"
title="Upload Supporting Documents"
description="Schedules, reports, forms, calculations, compliance documents, or other files."
/>
</div>
</div>
) : null}

<div className="bg-white p-6 text-slate-950 sm:p-8">
<div className="mb-6">
<p className="text-xs font-black uppercase tracking-[0.25em] text-orange-500">
Document Library
</p>

<h3 className="mt-3 text-2xl font-black text-slate-950">
Active RFQ Package
</h3>

<p className="mt-3 max-w-3xl text-sm font-semibold leading-7 text-slate-600">
Review all available RFQ files, drawings, specifications, BOQ
documents, photos, and supporting materials connected to this
procurement workspace.
</p>
</div>

<RFQDocumentLibrary
rfqId={rfq.id}
initialDocuments={rfqAttachments}
canManage={isOwner}
/>
</div>

<div className="border-t border-slate-100 bg-slate-50 p-6 text-slate-950 sm:p-8">
<div className="mb-6">
<p className="text-xs font-black uppercase tracking-[0.25em] text-orange-500">
RFQ Addenda & Clarifications
</p>

<h3 className="mt-3 text-2xl font-black text-slate-950">
Revisions, Bulletins & Supplier Acknowledgements
</h3>

<p className="mt-3 max-w-3xl text-sm font-semibold leading-7 text-slate-600">
Manage issued addenda and supplier acknowledgements from the
same executive RFQ workspace without duplicating document
workflows.
</p>
</div>

{isOwner && rfq.company_id ? (
<RFQAddendaManager
rfqId={rfq.id}
companyId={rfq.company_id}
initialAddenda={rfqAddenda}
canManage
/>
) : (
<RFQAddendumAcknowledgementCenter
rfqId={rfq.id}
initialAddenda={rfqAddenda}
initialAcknowledgements={rfqAcknowledgements}
/>
)}
</div>
</section>

<section
id="quote-intelligence"
className="mt-8 rounded-[36px] border border-black/5 bg-white p-6 shadow-sm sm:p-8"
>

<div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
<div>
<p className="text-xs font-black uppercase tracking-[0.3em] text-orange-500">
{isOwner ? "Quote Intelligence" : "Supplier Submission"}
</p>

<h2 className="mt-3 text-3xl font-black text-slate-950">
{isOwner
? commercialEvaluationUnlocked
? "AI Supplier Ranking"
: "Blind Bid Lockbox"
: "Your Company Quote"}
</h2>

{!isOwner ? (
<p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
Supplier pricing is confidential. You can only view your own
submission. Competitor pricing and award controls are visible
only to authorized buyer-side users after the proper commercial
opening stage.
</p>
) : commercialEvaluationUnlocked ? (
<p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
Ranking uses weighted scoring: 38% price, 22% timeline, 18%
performance signals, 14% procurement risk, and 8% proposal
validity.
</p>
) : (
<p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
Commercial submissions are locked until the RFQ deadline.
Buyer-side users can monitor participation count, but pricing,
ranking, supplier comparison, and award actions are hidden.
</p>
)}
</div>

<div className="flex flex-wrap gap-3">
{canSubmitQuote ? (
<Link
href={`/rfq/${rfq.slug}/submit`}
className="rounded-full bg-slate-950 px-6 py-3 text-sm font-bold text-white transition hover:bg-slate-800"
>
Submit Quote
</Link>
) : null}

{isOwner && commercialEvaluationUnlocked ? (
<Link
href={`/rfq/${rfq.slug}/compare`}
className="rounded-full bg-slate-950 px-6 py-3 text-sm font-bold text-white transition hover:bg-slate-800"
>
Open Compare View
</Link>
) : null}
</div>
</div>

{isOwner && !commercialEvaluationUnlocked ? (
<div className="mt-6 overflow-hidden rounded-2xl border border-slate-200">
<div className="grid grid-cols-4 bg-slate-950 px-6 py-4 text-xs font-bold uppercase tracking-[0.15em] text-white">
<div>Submissions</div>
<div>Commercial Data</div>
<div>Evaluation</div>
<div>Status</div>
</div>

<div className="grid grid-cols-4 items-center border-t border-slate-100 px-6 py-6">
<div>
<p className="text-3xl font-black text-slate-950">
{quoteList.length}
</p>
<p className="mt-1 text-xs font-bold text-slate-500">
Quotes submitted
</p>
</div>

<div className="text-sm font-black text-slate-600">
Locked until deadline
</div>

<div className="text-sm font-black text-slate-600">
Not opened
</div>

<div>
<span className="rounded-full bg-orange-100 px-3 py-1 text-xs font-black text-orange-700">
Blind Bidding Active
</span>
</div>
</div>
</div>
) : isOwner ? (
<div className="mt-6 overflow-x-auto rounded-2xl border border-slate-200">
<div className="min-w-[1180px]">
<div className="grid grid-cols-9 bg-slate-950 px-6 py-4 text-xs font-bold uppercase tracking-[0.15em] text-white">
<div>Rank</div>
<div>Amount</div>
<div>Timeline</div>
<div>Validity</div>
<div>Decision</div>
<div>AI Score</div>
<div>Risk</div>
<div>Variance</div>
<div>Actions</div>
</div>

{scoredQuotes.map((quote) => {
const isRecommended = recommendedQuote?.id === quote.id;
const isLowest =
lowestAmount !== null && quote.amountNumber === lowestAmount;
const isHighest =
highestAmount !== null &&
highestAmount !== lowestAmount &&
quote.amountNumber === highestAmount;
const belowAverage =
averageBid > 0 && quote.amountNumber <= averageBid;
const canAward = isOpen && quote.decision !== "awarded";

return (
<div
key={quote.id}
className="grid grid-cols-9 items-center border-t border-slate-100 px-6 py-5"
>
<div>
<p className="text-2xl font-black text-slate-950">
#{quote.rank}
</p>
{isRecommended ? <Badge>Recommended</Badge> : null}
</div>

<div className="text-lg font-black text-slate-950">
{formatMoney(quote.amountNumber)}
</div>

<div className="text-sm font-semibold text-slate-600">
{quote.timeline || "N/A"}
</div>

<div className="text-sm font-semibold text-slate-600">
{quote.validity_days ? `${quote.validity_days} days` : "30 days"}
</div>

<div>
<span
className={`rounded-full px-3 py-1 text-xs font-bold ${getDecisionClass(
quote.decision
)}`}
>
{quote.decision || "pending"}
</span>
</div>

<div>
<p className={`text-lg font-black ${getScoreClass(quote.totalScore)}`}>
{quote.totalScore}/100
</p>

<p className="mt-1 text-xs text-slate-400">
P {quote.priceScore} · T {quote.timelineScore} · R{" "}
{quote.riskScore}
</p>
</div>

<div>
<p className="text-sm font-black text-slate-950">
{quote.riskLevel}
</p>
<p className="text-xs text-slate-400">
Confidence {quote.awardConfidence}%
</p>
</div>

<div>
<p className="text-xs font-bold text-slate-500">
Budget: {formatMoney(quote.budgetVariance)}
</p>
<p className="mt-1 text-xs font-bold text-slate-500">
Lowest: {formatMoney(quote.lowestBidVariance)}
</p>
</div>

<div className="space-y-3">
<div className="space-y-2">
{isLowest ? <Badge>Lowest Bid</Badge> : null}
{belowAverage ? <Badge>Below Average</Badge> : null}
{quote.timelineScore >= 84 ? <Badge>Strong Timeline</Badge> : null}
{isHighest ? <Badge>Highest Bid</Badge> : null}
</div>

{canAward ? <AwardContractButton quoteId={quote.id} /> : null}

{quote.decision === "awarded" ? (
<p className="text-xs font-black text-green-700">
Contract awarded
</p>
) : null}
</div>
</div>
);
})}

{scoredQuotes.length === 0 ? (
<EmptyQuoteState
isOpen={isOpen}
rfqSlug={rfq.slug}
canSubmitQuote={false}
/>
) : null}
</div>
</div>
) : (
<div className="mt-6 overflow-x-auto rounded-2xl border border-slate-200">
<div className="min-w-[860px]">
<div className="grid grid-cols-5 bg-slate-950 px-6 py-4 text-sm font-bold text-white">
<div>Your Amount</div>
<div>Timeline</div>
<div>Validity</div>
<div>Status</div>
<div>Message</div>
</div>

{quoteList.length > 0 ? (
quoteList.map((quote) => (
<div
key={quote.id}
className="grid grid-cols-5 items-center border-t border-slate-100 px-6 py-5"
>
<div className="text-xl font-black text-slate-950">
{formatMoney(quote.amount)}
</div>

<div className="text-sm font-semibold text-slate-600">
{quote.timeline || "N/A"}
</div>

<div className="text-sm font-semibold text-slate-600">
{quote.validity_days ? `${quote.validity_days} days` : "30 days"}
</div>

<div>
<span
className={`rounded-full px-3 py-1 text-xs font-bold ${getDecisionClass(
quote.decision
)}`}
>
{quote.decision || "submitted"}
</span>
</div>

<div className="text-sm text-slate-600">
{quote.message || "No message"}
</div>
</div>
))
) : (
<EmptyQuoteState
isOpen={isOpen}
rfqSlug={rfq.slug}
canSubmitQuote={canSubmitQuote}
/>
)}
</div>
</div>
)}
</section>

<section className="mt-8">
<GovernanceNotice />
</section>
</div>
</main>
);
}

function BlindBiddingNotice({
rfq,
quoteCount,
}: {
rfq: RFQ;
quoteCount: number;
}) {
return (
<div className="overflow-hidden rounded-[36px] border border-orange-200 bg-orange-50">
<div className="p-6 sm:p-8">
<p className="text-xs font-black uppercase tracking-[0.25em] text-orange-600">
Blind Bidding Enforcement
</p>

<h3 className="mt-3 text-2xl font-black text-slate-950">
Commercial bids are locked until closing
</h3>

<p className="mt-3 max-w-4xl text-sm font-bold leading-7 text-slate-700">
{getBlindBiddingMessage(rfq)}
</p>

<div className="mt-5 grid gap-4 md:grid-cols-3">
<MiniLockCard title="Submissions" value={`${quoteCount} received`} />
<MiniLockCard title="Commercial Pricing" value="Locked" />
<MiniLockCard title="Evaluation Room" value="Closed" />
</div>
</div>
</div>
);
}

function MiniLockCard({ title, value }: { title: string; value: string }) {
return (
<div className="rounded-2xl bg-white p-4">
<p className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">
{title}
</p>

<p className="mt-2 text-lg font-black text-slate-950">{value}</p>
</div>
);
}

function GovernanceNotice() {
return (
<div className="rounded-[36px] border border-black/5 bg-white p-6 shadow-sm sm:p-8">
<div className="rounded-3xl border border-red-200 bg-red-50 p-6">
<p className="text-xs font-black uppercase tracking-[0.25em] text-red-600">
Buyer Reservation Rights
</p>

<p className="mt-3 max-w-4xl text-sm font-bold leading-7 text-red-800">
{RIGHT_TO_REJECT_NOTICE}
</p>
</div>

<div className="mt-4 rounded-3xl border border-orange-200 bg-orange-50 p-6">
<p className="text-xs font-black uppercase tracking-[0.25em] text-orange-600">
Confidentiality & Anti-Collusion
</p>

<p className="mt-3 max-w-4xl text-sm font-bold leading-7 text-orange-800">
Supplier submissions are confidential. Competing suppliers cannot view
each other’s pricing, proposal notes, validity periods, or commercial
submission data.
</p>
</div>
</div>
);
}

function EmptyQuoteState({
isOpen,
rfqSlug,
canSubmitQuote,
}: {
isOpen: boolean;
rfqSlug: string;
canSubmitQuote: boolean;
}) {
return (
<div className="px-6 py-12 text-center">
<p className="text-lg font-black text-slate-950">No quote submitted yet.</p>

<p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-slate-500">
{isOpen
? "This RFQ is open and ready for supplier pricing."
: "This RFQ is no longer accepting quotes."}
</p>

{canSubmitQuote ? (
<Link
href={`/rfq/${rfqSlug}/submit`}
className="mt-6 inline-flex rounded-full bg-slate-950 px-6 py-3 text-sm font-bold text-white transition hover:bg-slate-800"
>
Submit Quote
</Link>
) : null}
</div>
);
}

function InfoCard({ title, value }: { title: string; value: string }) {
return (
<div className="rounded-3xl bg-slate-50 p-5">
<p className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">
{title}
</p>

<p className="mt-2 text-lg font-black text-slate-950">{value}</p>
</div>
);
}

function CommandMetric({
title,
value,
detail,
accentClassName,
}: {
title: string;
value: string;
detail: string;
accentClassName: string;
}) {
return (
<div className="rounded-3xl border border-white/10 bg-white/10 p-5 backdrop-blur">
<p className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">
{title}
</p>

<p className={`mt-3 text-3xl font-black ${accentClassName}`}>{value}</p>

<p className="mt-2 text-xs font-bold leading-5 text-slate-300">{detail}</p>
</div>
);
}

function CommandStripCard({ title, value }: { title: string; value: string }) {
return (
<div className="border-t border-white/10 p-5 md:border-r md:border-t-0">
<p className="text-xs font-black uppercase tracking-[0.2em] text-slate-500">
{title}
</p>

<p className="mt-2 text-lg font-black text-white">{value}</p>
</div>
);
}

function ActionLink({ href, label }: { href: string; label: string }) {
return (
<Link
href={href}
className="flex items-center justify-between rounded-2xl bg-slate-950 px-5 py-4 text-sm font-black text-white transition hover:bg-slate-800"
>
<span>{label}</span>
<span>→</span>
</Link>
);
}

function ActionAnchor({ href, label }: { href: string; label: string }) {
return (
<a
href={href}
className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4 text-sm font-black text-slate-950 transition hover:bg-white hover:shadow-sm"
>
<span>{label}</span>
<span>↓</span>
</a>
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

function DarkBadge({ children }: { children: ReactNode }) {
return (
<span className="rounded-full bg-white/10 px-4 py-2 text-xs font-black uppercase tracking-[0.15em] text-white">
{children}
</span>
);
}

function Badge({ children }: { children: ReactNode }) {
return (
<span className="block rounded-full bg-orange-100 px-3 py-1 text-xs font-bold text-orange-700">
{children}
</span>
);
}
