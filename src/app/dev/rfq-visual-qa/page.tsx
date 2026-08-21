import { notFound } from "next/navigation";

import { RFQCommandCenter } from "@/components/rfq-workspace/rfq-command-center";
import { RFQExecutiveActions } from "@/components/rfq-workspace/rfq-executive-actions";
import { RfqQuoteComparison } from "@/components/rfq-workspace/rfq-quote-comparison";
import type { RfqQuoteComparisonItem } from "@/components/rfq-workspace/rfq-quote-comparison";
import { RFQQuoteWorkspace } from "@/components/rfq-workspace/rfq-quote-workspace";
import { RFQDocumentWorkspace } from "@/components/rfq-workspace/rfq-document-workspace";
import { ExecutiveOpportunityRanking } from "@/components/executive/executive-opportunity-ranking";
import { ExecutiveBadge } from "@/components/executive/executive-badge";
import { ExecutivePanel } from "@/components/executive/executive-panel";
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
            addenda={[]}
            acknowledgements={[]}
          />
        </div>

        <div className="np-region-major border-t border-white/10 pt-10">
          <p className="np-type-eyebrow">Visual QA · submit quote</p>
        </div>
        <ExecutivePanel variant="executive" padding="lg" tone="gold">
          <p className="np-type-eyebrow">Supplier response</p>
          <h1 className="np-type-h1 mt-4">Submit quote</h1>
          <p className="np-type-body mt-4">
            Commercial response for Air charter · DXB-LHR.
          </p>
        </ExecutivePanel>
        <ExecutivePanel variant="operational" padding="lg" className="np-region">
          <ExecutiveBadge tone="warning">Confidential submission</ExecutiveBadge>
          <form className="mt-6 space-y-6">
            <div>
              <label htmlFor="qa-amount" className="np-type-meta">
                Quote amount
              </label>
              <input
                id="qa-amount"
                defaultValue="1,240,000"
                className="mt-3 w-full rounded-executive border border-white/10 bg-black/20 px-5 py-4 text-white"
              />
            </div>
            <div>
              <label htmlFor="qa-timeline" className="np-type-meta">
                Delivery timeline
              </label>
              <input
                id="qa-timeline"
                defaultValue="16 months"
                className="mt-3 w-full rounded-executive border border-white/10 bg-black/20 px-5 py-4 text-white"
              />
            </div>
            <div>
              <label htmlFor="qa-note" className="np-type-meta">
                Proposal note
              </label>
              <textarea
                id="qa-note"
                defaultValue="Phased delivery with quality assurance and warranty coverage."
                rows={4}
                className="mt-3 w-full rounded-executive border border-white/10 bg-black/20 px-5 py-4 text-white"
              />
            </div>
            <p className="np-type-meta">Preview only. This fixture does not submit.</p>
          </form>
        </ExecutivePanel>
      </div>
    </div>
  );
}
