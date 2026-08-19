import { notFound } from "next/navigation";

import { RFQCommandCenter } from "@/components/rfq-workspace/rfq-command-center";
import { RfqQuoteComparison } from "@/components/rfq-workspace/rfq-quote-comparison";
import type { RfqQuoteComparisonItem } from "@/components/rfq-workspace/rfq-quote-comparison";
import { ExecutiveBadge } from "@/components/executive/executive-badge";
import { ExecutivePanel } from "@/components/executive/executive-panel";
import { EXECUTIVE_PAGE_CLASS } from "@/lib/design-system/executive-contract";

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
    supplierLabel: "Harbor Steel Co.",
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
          <p className="np-type-eyebrow">Visual QA · compare multiple quotes</p>
        </div>
        <RfqQuoteComparison
          rfqTitle="Air charter · DXB-LHR"
          quotes={populatedQuotes}
          awarded={false}
        />

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
