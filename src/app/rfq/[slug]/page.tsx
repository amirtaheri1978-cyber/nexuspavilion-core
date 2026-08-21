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

import {
  getCopilotSuggestions,
  getExecutiveBrief,
  getNextBestAction,
  getPredictedTimeline,
} from "@/lib/procurement/rfq-executive-guidance";

import {
  buildCommercialIntelligence,
  type Quote,
} from "@/lib/procurement/rfq-commercial-intelligence";
import {
  buildRfqSupplierRecommendationInput,
  getRfqSupplierCompanyIds,
  type RfqSupplierCompany,
} from "@/lib/procurement/rfq-supplier-recommendation-input";
import {
  buildSupplierHistorySnapshots,
  type SupplierQuotePerformance,
} from "@/lib/procurement/supplier-intelligence";
import { buildRfqExecutiveOpportunityIntelligence } from "@/lib/procurement/rfq-executive-opportunity-intelligence";
import {
  getBlindBiddingMessage,
  getFrameworkLabel,
  getProcurementFitMessage,
  getRFQStatusLabel,
  getScopeLabel,
  getSourcingLabel,
  shouldEnforceBlindBidding,
  type ContractFramework,
  type ProcurementScope,
  type SourcingMethod,
} from "@/lib/procurement/rfq-metadata";

import { ExecutiveOpportunityRanking } from "@/components/executive/executive-opportunity-ranking";
import { ExecutivePanel } from "@/components/executive/executive-panel";
import { EXECUTIVE_FOCUS_CYAN, EXECUTIVE_PAGE_CLASS } from "@/lib/design-system/executive-contract";
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
type Profile = {
id: string;
email: string | null;
role: string | null;
company_id: string | null;
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
<div className="min-h-full bg-nexus-navy text-white">
<div className={EXECUTIVE_PAGE_CLASS}>
<ExecutivePanel padding="lg" tone="risk" className="text-center">
<p className="np-type-eyebrow">RFQ workspace</p>
<h1 className="np-type-h1 mt-3">This RFQ workspace could not be found.</h1>
<Link
href="/rfq"
className={`mt-6 inline-flex min-h-11 items-center text-sm font-black text-nexus-cyan-bright ${EXECUTIVE_FOCUS_CYAN}`}
>
Back to RFQ marketplace
</Link>
</ExecutivePanel>
</div>
</div>
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

const {
  scoredQuotes,
  recommendedQuote,
  awardedQuote,
  lowestAmount,
  highestAmount,
  averageBid,
  potentialSavings,
} = buildCommercialIntelligence({
  quoteList,
  budget,
  commercialEvaluationUnlocked,
  isOwner,
});

const supplierCompanyIds =
  getRfqSupplierCompanyIds(scoredQuotes);

const { data: supplierCompanyData } =
  isOwner && supplierCompanyIds.length > 0
    ? await supabase
        .from("company_directory")
        .select("id, name, category, location, network_role")
        .in("id", supplierCompanyIds)
    : { data: [] };

const supplierCompanies =
  (supplierCompanyData ?? []) as RfqSupplierCompany[];

const { data: priorBuyerRfqData } =
  isOwner &&
  rfq.company_id &&
  supplierCompanyIds.length > 0
    ? await supabase
        .from("rfqs")
        .select("id")
        .eq("company_id", rfq.company_id)
        .neq("id", rfq.id)
    : { data: [] };

const priorBuyerRfqIds = (priorBuyerRfqData ?? [])
  .map((priorRfq) => priorRfq.id)
  .filter(
    (priorRfqId): priorRfqId is string =>
      Boolean(priorRfqId),
  );

const { data: supplierHistoryQuoteData } =
  priorBuyerRfqIds.length > 0 &&
  supplierCompanyIds.length > 0
    ? await supabase
        .from("quotes")
        .select(
          "id, rfq_id, company_id, amount, decision, created_at, awarded_at",
        )
        .in("rfq_id", priorBuyerRfqIds)
        .in("company_id", supplierCompanyIds)
    : { data: [] };

const supplierHistorySnapshots =
  buildSupplierHistorySnapshots(
    (supplierHistoryQuoteData ??
      []) as SupplierQuotePerformance[],
  );

const supplierRecommendationInput =
  buildRfqSupplierRecommendationInput({
    rfqSlug: rfq.slug,
    rfqCategory: rfq.category,
    rfqLocation: rfq.location,
    procurementScope: rfq.procurement_scope,
    sourcingMethod: rfq.sourcing_method,
    commercialEvaluationUnlocked,
    scoredQuotes,
    companies: supplierCompanies,
    supplierHistorySnapshots,
  });

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

const {
  opportunities: executiveOpportunities,
  intelligence: executiveOpportunityIntelligence,
} = buildRfqExecutiveOpportunityIntelligence({
  isOwner,
  potentialSavings,
  commercialEvaluationUnlocked,
  quoteCount: quoteList.length,
  documentCount: rfqAttachments.length,
  recommendedAwardConfidence: recommendedQuote?.awardConfidence ?? null,
});

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
supplierRecommendationInput,
});

return (
<div
  className="min-h-full min-w-0 bg-nexus-navy text-white"
  data-rfq-detail-layout="true"
>
<div className={`${EXECUTIVE_PAGE_CLASS} min-w-0`}>
<RFQCommandCenter
  statusLabel={
    deadlinePassed
      ? "Submission Closed"
      : getRFQStatusLabel(rfq.status)
  }
  statusTone={
    rfqStatus === "awarded"
      ? "awarded"
      : deadlinePassed || rfqStatus === "closed"
        ? "locked"
        : "live"
  }
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
<section
  className="np-region-major grid min-w-0 gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,0.85fr)]"
  aria-label="Procurement health and executive guidance"
>
<RFQProcurementHealth
  healthScore={healthScore}
  healthLabel={getHealthLabel(healthScore)}
  healthBreakdown={healthBreakdown}
/>
<div className="grid min-w-0 gap-6">
  <RFQExecutiveRiskMatrix risks={executiveRiskMatrix} />

  <RFQExecutiveGuidance
    timeline={predictedTimeline}
    recommendations={copilotSuggestions}
  />
</div>
</section>

<div className="np-region-major min-w-0">
  <RFQProcurementContext
    description={getProcurementFitMessage(rfq)}
    sourcingLabel={getSourcingLabel(rfq.sourcing_method)}
    frameworkLabel={getFrameworkLabel(rfq.contract_framework)}
    blindBiddingEnabled={blindBiddingEnabled}
  />
</div>

{isOwner ? (
  <div className="np-region-major min-w-0">
    <ExecutiveOpportunityRanking
      opportunities={executiveOpportunities}
      intelligence={executiveOpportunityIntelligence}
    />
  </div>
) : null}

<div className="np-region-major min-w-0">
  <RFQExecutiveActions
    rfqSlug={rfq.slug}
    isOwner={isOwner}
    isOpen={isOpen}
    canSubmitQuote={canSubmitQuote}
    hasCompany={Boolean(rfq.company_id)}
    hasMyQuote={hasMyQuote}
    deadlinePassed={deadlinePassed}
    commercialEvaluationUnlocked={commercialEvaluationUnlocked}
  />
</div>

{capabilities.canViewBlindBiddingControl ? (
  <section className="np-region-major min-w-0">
    <RFQBlindBiddingNotice
      message={getBlindBiddingMessage(rfq)}
      quoteCount={quoteList.length}
    />
  </section>
) : null}

<section className="np-region-major min-w-0">
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
  rfqTitle={rfq.title || "Untitled RFQ"}
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
</div>
);
}
