import { notFound } from "next/navigation";

import { RFQCommandCenter } from "@/components/rfq-workspace/rfq-command-center";
import { RFQExecutiveActions } from "@/components/rfq-workspace/rfq-executive-actions";
import { RfqQuoteComparison } from "@/components/rfq-workspace/rfq-quote-comparison";
import type { RfqQuoteComparisonItem } from "@/components/rfq-workspace/rfq-quote-comparison";
import { RFQQuoteWorkspace } from "@/components/rfq-workspace/rfq-quote-workspace";
import InviteVendorForm from "@/components/invite-vendor-form";
import { RFQDocumentWorkspace } from "@/components/rfq-workspace/rfq-document-workspace";
import {
  RfqInviteQuoteSubmission,
  RfqInviteQuoteUnavailable,
} from "@/components/rfq-workspace/rfq-invite-quote-submission";
import { ExecutiveOpportunityRanking } from "@/components/executive/executive-opportunity-ranking";
import { ExecutiveBadge } from "@/components/executive/executive-badge";
import { ExecutiveMetricCard } from "@/components/executive/executive-metric-card";
import { ExecutivePanel } from "@/components/executive/executive-panel";
import { ExecutiveCommandMetric } from "@/components/executive/workspace/executive-command-metric";
import { ExecutiveKpiRow } from "@/components/dashboard/executive-kpi-row";
import { EXECUTIVE_PAGE_CLASS } from "@/lib/design-system/executive-contract";
import { buildRfqExecutiveOpportunityIntelligence } from "@/lib/procurement/rfq-executive-opportunity-intelligence";

function quote(partial: Partial<RfqQuoteComparisonItem> & Pick<RfqQuoteComparisonItem, "id" | "rank" | "supplierLabel" | "amountLabel" | "amountNumber">): RfqQuoteComparisonItem {
  return {
    timeline: "16 months",
    validityDays: 90,
    decision: "pending",
    priceScore: 92,
    timelineScore: 84,
    performanceScore: 70,
    riskScore: 80,
    commercialScore: 88,
    technicalScore: 81,
    evaluationScore: 86,
    awardProbability: 78,
    riskLevel: "Low Risk",
    budgetVarianceLabel: "-$40,000",
    lowestBidVarianceLabel: "$0",
    isRecommended: false,
    isLowest: false,
    isHighest: false,
    isBelowAverage: true,
    canAward: true,
    ...partial,
  };
}

const populatedQuotes: RfqQuoteComparisonItem[] = [
  quote({
    id: "q1",
    rank: 1,
    supplierLabel: "Harbor Steel Co. North American Refrigeration Division",
    amountLabel: "$1,240,000",
    amountNumber: 1240000,
    isRecommended: true,
    isLowest: true,
    evaluationScore: 91,
    awardProbability: 88,
  }),
  quote({
    id: "q2",
    rank: 2,
    supplierLabel: "Atlas Trade Group",
    amountLabel: "$1,310,000",
    amountNumber: 1310000,
    evaluationScore: 84,
    awardProbability: 71,
    riskLevel: "Medium Risk",
    isBelowAverage: false,
    lowestBidVarianceLabel: "$70,000",
  }),
  quote({
    id: "q3",
    rank: 3,
    supplierLabel: "Northline Equipment",
    amountLabel: "$1,480,000",
    amountNumber: 1480000,
    isHighest: true,
    isBelowAverage: false,
    evaluationScore: 72,
    awardProbability: 54,
    riskLevel: "High Risk",
    lowestBidVarianceLabel: "$240,000",
  }),
];

const awardedQuotes: RfqQuoteComparisonItem[] = populatedQuotes.map((item, index) => ({
  ...item,
  canAward: false,
  decision: index === 0 ? "awarded" : "rejected",
  isRecommended: index === 0,
}));

const ownerIdentityQuotes = [
  {
    id: "q1",
    company_id: "harbor-steel",
    amountNumber: 1240000,
    timeline: "16 months",
    validity_days: 90,
    decision: "pending",
    rank: 1,
    priceScore: 92,
    timelineScore: 84,
    riskScore: 80,
    performanceScore: 70,
    totalScore: 91,
    awardConfidence: 88,
    riskLevel: "Low Risk",
    budgetVariance: -40000,
    lowestBidVariance: 0,
  },
  {
    id: "q2",
    company_id: "atlas-trade",
    amountNumber: 1310000,
    timeline: "18 months",
    validity_days: 60,
    decision: "pending",
    rank: 2,
    priceScore: 87,
    timelineScore: 78,
    riskScore: 72,
    performanceScore: 68,
    totalScore: 84,
    awardConfidence: 71,
    riskLevel: "Medium Risk",
    budgetVariance: 30000,
    lowestBidVariance: 70000,
  },
  {
    id: "q3",
    company_id: "northline",
    amountNumber: 1480000,
    timeline: "14 months",
    validity_days: 45,
    decision: "pending",
    rank: 3,
    priceScore: 76,
    timelineScore: 88,
    riskScore: 58,
    performanceScore: 64,
    totalScore: 72,
    awardConfidence: 54,
    riskLevel: "High Risk",
    budgetVariance: 200000,
    lowestBidVariance: 240000,
  },
];

const ownerSupplierCompanies = [
  {
    id: "harbor-steel",
    name: "Harbor Steel Co. North American Refrigeration Division",
  },
  { id: "atlas-trade", name: "Atlas Trade Group" },
  { id: "northline", name: "Northline Equipment" },
];

const respondentQuotes = [
  {
    id: "supplier-q1",
    amount: 1240000,
    timeline:
      "16-month phased commissioning across North Harbor bonded warehouse operations",
    validity_days: 90,
    decision: "Submitted",
    message:
      "Phased delivery for the North Harbor distribution campus, including redundant compressor commissioning, bonded warehouse continuity, and quality-assurance coverage through the full cutover window.",
  },
];

const awardedRespondentQuotes = [
  {
    ...respondentQuotes[0],
    id: "supplier-q1-awarded",
    decision: "awarded",
  },
];

const visualQaAddenda = [
  {
    id: "addendum-2",
    title:
      "North Harbor refrigeration sequence revision and bonded warehouse commissioning bulletin",
    description:
      "Revise compressor staging, keep bonded warehouse operations continuous through the cutover window, and confirm redundant plant coverage before the next supplier submission deadline.",
    addendum_number: 2,
    affected_documents:
      "North-Harbor-Refrigeration-Replacement-Commissioning-Drawings-Package-Rev-C.pdf\nBonded Warehouse Cold Chain Technical Specifications MasterFormat Division 23.docx\nBOQ Rev 2 — North Harbor Cold Chain Plant",
    requires_acknowledgement: true,
    created_at: "2026-08-12T12:00:00.000Z",
  },
  {
    id: "addendum-1",
    title:
      "Informational site-access reminder for the North Harbor logistics corridor",
    description:
      "Supplier deliveries remain limited to the bonded warehouse receiving hours already stated in the original RFQ package.",
    addendum_number: 1,
    affected_documents: "RFQ Instructions to Bidders — Site Access",
    requires_acknowledgement: false,
    created_at: "2026-08-04T12:00:00.000Z",
  },
];

const visualQaAcknowledgements = [
  {
    id: "ack-addendum-1",
    addendum_id: "addendum-1",
    rfq_id: "visual-qa-rfq",
    company_id: "visual-qa-supplier",
    acknowledged_at: "2026-08-05T14:00:00.000Z",
  },
];

const visualQaDocuments = [
  {
    id: "doc-drawing-1",
    file_name:
      "North-Harbor-Refrigeration-Replacement-Commissioning-Drawings-Package-Rev-C.pdf",
    file_url: "#document-preview-drawing",
    file_path: "visual-qa/drawing-rev-c.pdf",
    file_size: 2457600,
    attachment_type: "drawing",
    revision_label: "Rev C",
    created_at: "2026-08-01T12:00:00.000Z",
  },
  {
    id: "doc-spec-1",
    file_name:
      "Bonded Warehouse Cold Chain Technical Specifications MasterFormat Division 23.docx",
    file_url: "#document-preview-spec",
    file_path: "visual-qa/spec-div-23.docx",
    file_size: 812000,
    attachment_type: "specification",
    revision_label: "Rev B",
    created_at: "2026-07-28T12:00:00.000Z",
  },
];

const opportunityIntelligence = buildRfqExecutiveOpportunityIntelligence({
  isOwner: true,
  potentialSavings: 40000,
  commercialEvaluationUnlocked: true,
  quoteCount: 3,
  documentCount: 4,
  recommendedAwardConfidence: 88,
});

export default function RfqVisualQaPage() {
  if (process.env.NODE_ENV === "production") {
    notFound();
  }

  return (
    <div className="min-h-full bg-nexus-navy text-white">
      <div className={EXECUTIVE_PAGE_CLASS}>
        <p className="np-type-eyebrow">Visual QA · RFQ detail</p>
        <RFQCommandCenter
          statusLabel="Open"
          statusTone="live"
          classificationBadges={["Trade RFQ", "Invited RFQ", "Project-Specific"]}
          title="Air charter · DXB-LHR"
          description="Compare supplier coverage, award the recommended quote, or return to the RFQ workspace."
          commandMetrics={[
            {
              title: "Procurement Health",
              value: "81/100",
              detail: "Healthy",
              accentClassName: "text-nexus-cyan-bright",
            },
            {
              title: "Deadline",
              value: "4 Days",
              detail: "Closes Friday 18:00",
              accentClassName: "text-nexus-cyan-bright",
            },
            {
              title: "Commercial Status",
              value: "Commercial Evaluation",
              detail: "Comparative evaluation available",
              accentClassName: "text-nexus-gold-bright",
            },
          ]}
          executiveBrief="Three quotes are in. Harbor Steel holds the strongest evaluation score with a low-risk commercial profile."
          nextBestAction="Open comparison and confirm the Harbor Steel award if the commercial evidence remains acceptable."
          stripItems={[
            { title: "Category", value: "Logistics" },
            { title: "Location", value: "Dubai" },
            { title: "Budget", value: "$1,280,000" },
            { title: "Quotes", value: "3" },
            { title: "Documents", value: "4" },
            { title: "Addenda", value: "1" },
          ]}
        />

        <div className="np-region-major border-t border-white/10 pt-10">
          <p className="np-type-eyebrow">
            Visual QA · command center long copy
          </p>
          <p className="np-type-meta mt-3 max-w-3xl">
            Chromeless fixture. Authenticated RFQ detail sits beside the 330px
            application sidebar, so a 1440 viewport yields about 1110px of
            content width. Long titles and recommendations must wrap on word
            boundaries without mid-word breaks.
          </p>
        </div>
        <RFQCommandCenter
          statusLabel="Awarded"
          statusTone="awarded"
          classificationBadges={[
            "Trade RFQ",
            "Invited RFQ",
            "Project-Specific",
            "Blind Bidding",
          ]}
          title="Long-cycle industrial refrigeration replacement and commissioning for the North Harbor distribution campus"
          description="Replace the primary cold-chain plant, commission redundant compressors, and keep bonded warehouse operations continuous through the cutover window."
          commandMetrics={[
            {
              title: "Procurement Health",
              value: "81/100",
              detail: "Healthy",
              accentClassName: "text-nexus-cyan-bright",
            },
            {
              title: "Deadline",
              value: "Closed",
              detail: "Closed Friday 18:00 America/Toronto",
              accentClassName: "text-nexus-cyan-bright",
            },
            {
              title: "Commercial Status",
              value: "Commercial Evaluation",
              detail: "Comparative evaluation available",
              accentClassName: "text-nexus-gold-bright",
            },
          ]}
          executiveBrief="Harbor Steel holds the strongest evaluation score with a low-risk commercial profile, and the board brief still needs a final award confirmation before supplier notification."
          nextBestAction="Open comparison and confirm the Harbor Steel award if the commercial evidence remains acceptable for this refrigerated campus replacement program."
          award={{
            label: "Award Complete",
            value: "Awarded at $1,240,000",
          }}
          stripItems={[
            { title: "Category", value: "Industrial refrigeration" },
            { title: "Location", value: "North Harbor, Dubai Logistics Corridor" },
            { title: "Budget", value: "$1,280,000" },
            { title: "Quotes", value: "3" },
            { title: "Documents", value: "4" },
            { title: "Addenda", value: "1" },
          ]}
        />

        <div className="np-region-major border-t border-white/10 pt-10">
          <p className="np-type-eyebrow">
            Visual QA · executive metric wrapping
          </p>
          <p className="np-type-meta mt-3 max-w-3xl">
            Chromeless fixture. Authenticated RFQ detail sits beside the 330px
            application sidebar, so a 1440 viewport yields about 1110px of
            content width. Metric labels, dates, currencies, percentages,
            status, rank, and long human-readable values must wrap on word
            boundaries without mid-word breaks. Compact numeric values stay
            intact. The 1110px constraint below simulates shell-adjusted
            content width.
          </p>
        </div>
        <div
          className="w-full max-w-[1110px] space-y-8"
          data-rfq-metric-wrapping-shell-width="1110"
        >
          <div
            className="@container min-w-0"
            data-rfq-metric-wrapping="true"
          >
            <div
              className="grid min-w-0 gap-4 @sm:grid-cols-2 @4xl:grid-cols-3"
              data-rfq-metric-card-grid="true"
              aria-label="RFQ metric wrapping cards"
            >
              <ExecutiveMetricCard
                label="Harbor Steel Co. North American Refrigeration Division"
                value="$1,280,000"
                insight="Highest current evaluation score for the North Harbor distribution campus"
                tone="gold"
              />
              <ExecutiveMetricCard
                label="RFQ deadline"
                value="August 21, 2026, 06:00 PM"
                insight="Closes Friday 18:00 America/Toronto"
                tone="blue"
              />
              <ExecutiveMetricCard
                label="Award confidence"
                value="88%"
                insight="Recommended award path confidence"
                tone="success"
              />
              <ExecutiveMetricCard
                label="Procurement Health"
                value="Healthy"
                insight="81/100 recorded operating score"
                tone="success"
              />
              <ExecutiveMetricCard
                label="Recommended rank"
                value="#1"
                insight="Harbor Steel holds the strongest evaluation score"
                tone="gold"
              />
              <ExecutiveMetricCard
                label="Commercial Status"
                value="Commercial Evaluation"
                insight="Comparative evaluation available"
                tone="gold"
              />
            </div>

            <div
              className="mt-6 grid min-w-0 gap-4 @sm:grid-cols-2 @4xl:grid-cols-3"
              data-rfq-command-metric-grid="true"
              aria-label="RFQ command metric wrapping"
            >
              <ExecutiveCommandMetric
                title="Procurement Health"
                value="81/100"
                detail="Healthy"
                accentClassName="text-nexus-cyan-bright"
              />
              <ExecutiveCommandMetric
                title="Deadline"
                value="August 21, 2026"
                detail="Closes Friday 18:00 America/Toronto"
                accentClassName="text-nexus-cyan-bright"
              />
              <ExecutiveCommandMetric
                title="Commercial Status"
                value="Commercial Evaluation"
                detail="Comparative evaluation available"
                accentClassName="text-nexus-gold-bright"
              />
            </div>
          </div>

          <div data-non-rfq-kpi-row="true">
            <ExecutiveKpiRow
              insufficientData={false}
              metrics={[
                {
                  label: "Open Opportunities",
                  value: "12",
                  tone: "blue",
                  insight:
                    "Recorded open RFQs for the current company workspace",
                },
                {
                  label: "Submitted Quotes",
                  value: "8",
                  tone: "gold",
                },
                {
                  label: "Win Rate",
                  value: "42%",
                  tone: "success",
                },
                {
                  label: "Pipeline Value",
                  value: "$1,280,000",
                  tone: "gold",
                  insight:
                    "Highest current evaluation score for the North Harbor distribution campus",
                },
              ]}
            />
          </div>
        </div>

        <div className="np-region-major border-t border-white/10 pt-10">
          <p className="np-type-eyebrow">Visual QA · business impact and executive direction</p>
        </div>
        <div className="min-w-0" data-rfq-detail-composition="true">
          <ExecutiveOpportunityRanking
            opportunities={opportunityIntelligence.opportunities}
            intelligence={opportunityIntelligence.intelligence}
          />
          <div className="np-region-major min-w-0">
            <RFQExecutiveActions
              rfqSlug="air-charter-dxb-lhr"
              isOwner
              isOpen
              canSubmitQuote={false}
              hasCompany
              hasMyQuote={false}
              deadlinePassed={false}
              commercialEvaluationUnlocked
            />
          </div>
        </div>

        <div className="np-region-major border-t border-white/10 pt-10">
          <p className="np-type-eyebrow">
            Visual QA · owner quote identity wrapping
          </p>
          <p className="np-type-meta mt-3 max-w-3xl">
            Chromeless fixture. Authenticated RFQ detail sits beside the 330px
            application sidebar, so a 1440 viewport yields about 1110px of
            content width. Owner quote identity must use the canonical
            company_directory name already loaded for this RFQ, wrap that name
            on word boundaries, and keep rank as secondary comparison
            information. This fixture mounts the live owner quotes workspace
            and does not award a contract.
          </p>
        </div>
        <div
          className="w-full max-w-[1110px]"
          data-rfq-owner-quote-identity-shell-width="1110"
        >
          <RFQQuoteWorkspace
            rfqSlug="air-charter-dxb-lhr"
            rfqTitle="Air charter · DXB-LHR"
            isOwner
            isOpen
            canSubmitQuote={false}
            commercialEvaluationUnlocked
            quoteList={[]}
            scoredQuotes={ownerIdentityQuotes}
            recommendedQuoteId="q1"
            lowestAmount={1240000}
            highestAmount={1480000}
            averageBid={1343333}
            supplierCompanies={ownerSupplierCompanies}
          />
        </div>

        <div className="np-region-major border-t border-white/10 pt-10">
          <p className="np-type-eyebrow">Visual QA · compare multiple quotes</p>
          <p className="np-type-meta mt-3 max-w-3xl">
            Chromeless fixture. Authenticated RFQ detail sits beside the 330px
            application sidebar, so a 1440 viewport yields about 1110px of
            content width. Owner quote comparison must not rely on a
            seven-column lg table or horizontal scrolling at that width. The
            1110px constraint below simulates that shell-adjusted content
            width; awarded/empty/one-quote fixtures remain unconstrained.
          </p>
        </div>
        <div
          className="w-full max-w-[1110px]"
          data-rfq-quote-shell-width="1110"
        >
          <RfqQuoteComparison
            rfqTitle="Air charter · DXB-LHR"
            quotes={populatedQuotes}
            awarded={false}
          />
        </div>

        <div className="np-region-major border-t border-white/10 pt-10">
          <p className="np-type-eyebrow">Visual QA · awarded state</p>
        </div>
        <RfqQuoteComparison
          rfqTitle="Air charter · DXB-LHR"
          quotes={awardedQuotes}
          awarded
        />

        <div className="np-region-major border-t border-white/10 pt-10">
          <p className="np-type-eyebrow">Visual QA · no quotes</p>
        </div>
        <RfqQuoteComparison rfqTitle="New Workspace RFQ" quotes={[]} awarded={false} />

        <div className="np-region-major border-t border-white/10 pt-10">
          <p className="np-type-eyebrow">Visual QA · one quote</p>
        </div>
        <RfqQuoteComparison
          rfqTitle="Single submission RFQ"
          quotes={[populatedQuotes[0]]}
          awarded={false}
        />

        <div className="np-region-major border-t border-white/10 pt-10">
          <p className="np-type-eyebrow">
            Visual QA · respondent supplier quotes
          </p>
          <p className="np-type-meta mt-3 max-w-3xl">
            Chromeless fixture. Authenticated RFQ detail sits beside the 330px
            application sidebar, so a 1440 viewport yields about 1110px of
            content width. Respondent quotes must not use a min-width 920px
            table or horizontal scrolling at that width. The 1110px constraint
            below simulates shell-adjusted content width; awarded and empty
            respondent fixtures remain unconstrained.
          </p>
        </div>
        <div
          className="w-full max-w-[1110px]"
          data-rfq-supplier-quote-shell-width="1110"
        >
          <RFQQuoteWorkspace
            rfqSlug="air-charter-dxb-lhr"
            rfqTitle="Air charter · DXB-LHR"
            isOwner={false}
            isOpen
            canSubmitQuote={false}
            commercialEvaluationUnlocked={false}
            quoteList={respondentQuotes}
            scoredQuotes={[]}
            recommendedQuoteId={null}
            lowestAmount={null}
            highestAmount={null}
            averageBid={0}
          />
        </div>

        <div className="np-region-major border-t border-white/10 pt-10">
          <p className="np-type-eyebrow">
            Visual QA · respondent awarded submission
          </p>
        </div>
        <RFQQuoteWorkspace
          rfqSlug="air-charter-dxb-lhr"
          rfqTitle="Air charter · DXB-LHR"
          isOwner={false}
          isOpen={false}
          canSubmitQuote={false}
          commercialEvaluationUnlocked={false}
          quoteList={awardedRespondentQuotes}
          scoredQuotes={[]}
          recommendedQuoteId={null}
          lowestAmount={null}
          highestAmount={null}
          averageBid={0}
        />

        <div className="np-region-major border-t border-white/10 pt-10">
          <p className="np-type-eyebrow">
            Visual QA · respondent empty submission
          </p>
        </div>
        <RFQQuoteWorkspace
          rfqSlug="air-charter-dxb-lhr"
          rfqTitle="Air charter · DXB-LHR"
          isOwner={false}
          isOpen
          canSubmitQuote
          commercialEvaluationUnlocked={false}
          quoteList={[]}
          scoredQuotes={[]}
          recommendedQuoteId={null}
          lowestAmount={null}
          highestAmount={null}
          averageBid={0}
        />

        <div className="np-region-major border-t border-white/10 pt-10">
          <p className="np-type-eyebrow">Visual QA · document workspace</p>
          <p className="np-type-meta mt-3 max-w-3xl">
            Chromeless fixture. Authenticated RFQ detail sits beside the 330px
            application sidebar, so a 1440 viewport yields about 1110px of
            content width. Document workspace must not nest extra panels or
            fire a three-column xl upload grid at that width. Long file names
            must wrap on word boundaries instead of truncating.
          </p>
        </div>
        <div
          className="w-full max-w-[1110px]"
          data-rfq-document-shell-width="1110"
        >
          <RFQDocumentWorkspace
            rfqId="visual-qa-rfq"
            companyId="visual-qa-company"
            isOwner
            documents={visualQaDocuments}
            addenda={visualQaAddenda}
            acknowledgements={[]}
          />
        </div>

        <div className="np-region-major border-t border-white/10 pt-10">
          <p className="np-type-eyebrow">
            Visual QA · addenda acknowledgement
          </p>
          <p className="np-type-meta mt-3 max-w-3xl">
            Chromeless fixture. Authenticated RFQ detail sits beside the 330px
            application sidebar, so a 1440 viewport yields about 1110px of
            content width. Addenda management must not nest a second card
            surface or fire viewport lg/md grids at that width. Long titles
            and affected-document lists must wrap on word boundaries. These
            fixtures mount the live addenda components and do not create or
            acknowledge addenda.
          </p>
        </div>
        <div
          className="w-full max-w-[1110px]"
          data-rfq-addenda-shell-width="1110"
        >
          <RFQDocumentWorkspace
            rfqId="visual-qa-rfq"
            companyId="visual-qa-company"
            isOwner={false}
            documents={visualQaDocuments}
            addenda={visualQaAddenda}
            acknowledgements={visualQaAcknowledgements}
          />
        </div>

        <div className="np-region-major border-t border-white/10 pt-10">
          <p className="np-type-eyebrow">Visual QA · supplier invitation</p>
          <p className="np-type-meta mt-3 max-w-3xl">
            Chromeless fixture. Authenticated RFQ detail sits beside the 330px
            application sidebar, so a 1440 viewport yields about 1110px of
            content width. Supplier invitation must not nest a second
            ExecutivePanel or fire an xl access-control row at that width.
            Long AVL and invitation copy must wrap on word boundaries. This
            fixture mounts the live invitation form and does not submit.
          </p>
        </div>
        <div
          className="w-full max-w-[1110px]"
          data-rfq-invitation-shell-width="1110"
        >
          <ExecutivePanel
            id="supplier-invitations"
            className="mt-8 min-w-0 @container"
            padding="lg"
            tone="blue"
            data-rfq-supplier-invitations="true"
          >
            <p className="text-xs font-black uppercase tracking-[0.3em] text-nexus-gold">
              Supplier Invitation
            </p>
            <h2
              id="rfq-supplier-invitation-heading"
              className="mt-3 min-w-0 text-pretty text-2xl font-black tracking-tight text-nexus-white sm:text-3xl"
            >
              Build Competitive Bid Coverage for the North Harbor refrigeration
              replacement and bonded warehouse commissioning program
            </h2>
            <p className="mt-3 max-w-3xl min-w-0 text-pretty text-sm font-semibold leading-7 text-nexus-muted">
              Invite qualified suppliers directly into this RFQ workspace while
              preserving buyer-side control, commercial confidentiality, and the
              current governance workflow for authorized vendor contacts across
              the North Harbor distribution campus.
            </p>
            <div className="mt-6 min-w-0">
              <InviteVendorForm embedded rfqId="visual-qa-rfq" />
            </div>
          </ExecutivePanel>
        </div>

        <div className="np-region-major border-t border-white/10 pt-10">
          <p className="np-type-eyebrow">Visual QA · submit quote</p>
          <p className="np-type-meta mt-3 max-w-3xl">
            Chromeless fixture. Authenticated RFQ detail sits beside the 330px
            application sidebar, so a 1440 viewport yields about 1110px of
            content width. Submit must not nest metric-card panels or fire a
            three-column md grid at that width. Long RFQ titles, commercial
            terms, and helper copy must wrap on word boundaries. This fixture
            mirrors the live submit workspace and does not post a quote.
          </p>
        </div>
        <div
          className="w-full max-w-[1110px]"
          data-rfq-submit-shell-width="1110"
        >
          <ExecutivePanel
            variant="executive"
            padding="lg"
            tone="gold"
            className="np-region min-w-0 @container"
            data-rfq-submit-workspace="true"
          >
            <p className="np-type-eyebrow">Supplier response</p>
            <h1 className="np-type-h1 mt-4 min-w-0 text-pretty">Submit quote</h1>
            <p className="np-type-body mt-4 max-w-3xl min-w-0 text-pretty">
              Commercial response for long-cycle industrial refrigeration
              replacement and commissioning for the North Harbor distribution
              campus.
            </p>
            <dl
              className="mt-8 grid min-w-0 grid-cols-1 gap-4 border-t border-white/10 pt-6 @lg:grid-cols-3"
              data-rfq-submit-status="true"
            >
              <div className="min-w-0">
                <dt className="np-type-meta">RFQ status</dt>
                <dd className="mt-2 min-w-0 text-pretty text-lg font-black text-nexus-white">
                  Open for quotes
                </dd>
              </div>
              <div className="min-w-0">
                <dt className="np-type-meta">Deadline</dt>
                <dd className="mt-2 min-w-0 text-pretty text-lg font-black text-nexus-white">
                  August 21, 2026, 06:00 PM
                </dd>
              </div>
              <div className="min-w-0">
                <dt className="np-type-meta">Governance</dt>
                <dd className="mt-2 min-w-0 text-pretty text-lg font-black text-nexus-white">
                  Deadline enforced
                </dd>
              </div>
            </dl>
            <div className="mt-8 min-w-0 rounded-executive border border-nexus-gold/20 bg-nexus-gold/[0.08] p-5">
              <ExecutiveBadge tone="warning">Confidential submission</ExecutiveBadge>
              <p className="np-type-body mt-3 min-w-0 text-pretty">
                Your submission is confidential. Competing suppliers cannot view
                your commercial response. Submissions after the RFQ deadline are
                rejected automatically.
              </p>
            </div>
            <div className="mt-8 min-w-0 space-y-8">
              <section aria-labelledby="qa-submit-commercial-heading">
                <h2 id="qa-submit-commercial-heading" className="np-type-h3">
                  Commercial offer
                </h2>
                <div className="mt-5 min-w-0">
                  <div className="flex min-w-0 flex-wrap items-center justify-between gap-3">
                    <label htmlFor="qa-amount" className="np-type-meta">
                      Quote amount
                    </label>
                    <ExecutiveBadge tone="neutral">USD</ExecutiveBadge>
                  </div>
                  <div className="mt-3 flex min-w-0 overflow-hidden rounded-executive border border-white/10 bg-black/20">
                    <div className="flex shrink-0 items-center border-r border-white/10 px-4 np-type-meta sm:px-5">
                      USD
                    </div>
                    <input
                      id="qa-amount"
                      defaultValue="1,240,000"
                      className="min-h-14 min-w-0 w-full bg-transparent px-4 py-4 text-lg font-black text-white outline-none sm:px-5"
                    />
                  </div>
                  <p className="np-type-meta mt-3 min-w-0 text-pretty">
                    Enter the full contract value. Commas are added
                    automatically. Preview: $1,240,000
                  </p>
                </div>
                <div className="mt-6 min-w-0">
                  <label htmlFor="qa-timeline" className="np-type-meta">
                    Delivery timeline
                  </label>
                  <input
                    id="qa-timeline"
                    defaultValue="16-month phased commissioning"
                    className="mt-3 min-h-14 min-w-0 w-full rounded-executive border border-white/10 bg-black/20 px-5 py-4 text-sm font-semibold text-white"
                  />
                </div>
                <div className="mt-6 min-w-0">
                  <label htmlFor="qa-note" className="np-type-meta">
                    Proposal note
                  </label>
                  <textarea
                    id="qa-note"
                    defaultValue="Phased delivery for the North Harbor distribution campus, including redundant compressor commissioning, bonded warehouse continuity, and quality-assurance coverage through the full cutover window."
                    rows={7}
                    className="mt-3 min-h-14 min-w-0 w-full rounded-executive border border-white/10 bg-black/20 px-5 py-4 text-sm font-semibold text-white"
                  />
                </div>
              </section>
              <p
                className="min-w-0 rounded-executive border border-red-400/20 bg-red-500/10 px-5 py-4 text-pretty text-sm font-bold text-red-300"
                data-rfq-submit-error-preview="true"
              >
                Preview error placement. Quote amount appears too low. Please
                enter the full contract value.
              </p>
              <div
                className="min-w-0 border-t border-white/10 pt-6"
                data-rfq-submit-summary="true"
              >
                <h3 className="np-type-meta">Submission summary</h3>
                <dl className="mt-4 grid min-w-0 grid-cols-1 gap-4 @sm:grid-cols-3">
                  <div className="min-w-0">
                    <dt className="np-type-meta">Amount</dt>
                    <dd className="mt-2 min-w-0 text-pretty text-lg font-black text-nexus-white">
                      $1,240,000
                    </dd>
                  </div>
                  <div className="min-w-0">
                    <dt className="np-type-meta">Currency</dt>
                    <dd className="mt-2 min-w-0 text-pretty text-lg font-black text-nexus-white">
                      USD
                    </dd>
                  </div>
                  <div className="min-w-0">
                    <dt className="np-type-meta">Timeline</dt>
                    <dd className="mt-2 min-w-0 text-pretty text-lg font-black text-nexus-white">
                      16-month phased commissioning across North Harbor bonded
                      warehouse operations
                    </dd>
                  </div>
                </dl>
              </div>
              <div className="sticky bottom-4 z-10 flex min-w-0 flex-col gap-3 rounded-executive bg-nexus-navy/90 p-3 @sm:flex-row">
                <button
                  type="button"
                  className="inline-flex min-h-14 w-full items-center justify-center rounded-2xl bg-nexus-gold px-6 text-sm font-black uppercase tracking-[0.12em] text-nexus-navy @sm:w-auto"
                >
                  Submit quote
                </button>
                <button
                  type="button"
                  className="inline-flex min-h-14 w-full items-center justify-center rounded-2xl border border-white/10 bg-white/[0.045] px-6 text-sm font-black text-white @sm:w-auto"
                >
                  Cancel
                </button>
              </div>
              <p className="np-type-meta">Preview only. This fixture does not submit.</p>
            </div>
          </ExecutivePanel>
        </div>

        <div className="np-region-major border-t border-white/10 pt-10">
          <p className="np-type-eyebrow">
            Visual QA · invite-token quote submission
          </p>
          <p className="np-type-meta mt-3 max-w-3xl">
            Chromeless route. `/rfq/invite/[token]` does not use the 330px
            application sidebar, so 1440 and 1110 are full content widths for
            this surface. Long RFQ titles, emails, and helper copy must wrap on
            word boundaries. This fixture mounts the live invitation
            continuation surface and does not submit a quote.
          </p>
        </div>
        <div
          className="w-full max-w-[1110px]"
          data-rfq-invite-quote-shell-width="1110"
        >
          <RfqInviteQuoteSubmission
            invitation={{
              invite_email:
                "procurement.director.north.harbor@harbor-steel-co.example.com",
              rfq_id: "visual-qa-invite-rfq",
              rfq_title:
                "North Harbor refrigeration replacement and bonded warehouse commissioning for the distribution campus",
              rfq_slug: "air-charter-dxb-lhr",
              rfq_description:
                "Long-cycle industrial refrigeration replacement and commissioning for the North Harbor distribution campus, including redundant compressor coverage and bonded warehouse continuity.",
              rfq_category: "Industrial refrigeration",
              rfq_location: "North Harbor bonded warehouse corridor",
              rfq_budget: "$1,280,000",
              rfq_deadline: "2026-08-21T22:00:00.000Z",
              rfq_deadline_timezone: "America/Toronto",
            }}
          />
        </div>

        <div className="np-region-major border-t border-white/10 pt-10">
          <p className="np-type-eyebrow">
            Visual QA · invite-token unavailable
          </p>
        </div>
        <RfqInviteQuoteUnavailable />
      </div>
    </div>
  );
}
