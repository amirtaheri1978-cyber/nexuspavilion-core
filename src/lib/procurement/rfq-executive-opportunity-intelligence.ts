export type RfqExecutiveOpportunityPriority = "High" | "Medium";

export type RfqExecutiveOpportunity = {
  title: string;
  priority: RfqExecutiveOpportunityPriority;
  impact: string;
  value: string;
  summary: string;
};

export type RfqExecutiveOpportunityIntelligence =
  RfqExecutiveOpportunity & {
    rank: number;
    businessImpact: string;
    executionHorizon: "Immediate" | "Short-Term";
    boardPriority: "Board-Level" | "Management-Level";
    ceoRecommendation: string;
  };

type BuildRfqExecutiveOpportunityIntelligenceInput = {
  isOwner: boolean;
  potentialSavings: number;
  commercialEvaluationUnlocked: boolean;
  quoteCount: number;
  documentCount: number;
  recommendedAwardConfidence: number | null;
};

function formatMoney(value: number) {
  if (!Number.isFinite(value)) {
    return "$0";
  }

  return `$${value.toLocaleString()}`;
}

export function buildRfqExecutiveOpportunityIntelligence({
  isOwner,
  potentialSavings,
  commercialEvaluationUnlocked,
  quoteCount,
  documentCount,
  recommendedAwardConfidence,
}: BuildRfqExecutiveOpportunityIntelligenceInput) {
  const opportunities: RfqExecutiveOpportunity[] = isOwner
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
          priority: quoteCount >= 3 ? "Medium" : "High",
          impact: "Market Coverage",
          value:
            quoteCount >= 3
              ? "Healthy coverage"
              : `${Math.max(3 - quoteCount, 1)}+ more suppliers`,
          summary:
            quoteCount >= 3
              ? "Supplier competition is currently healthy for executive review."
              : "Expanding supplier participation can improve bid quality, negotiation leverage, and award confidence.",
        },
        {
          title: "Documentation Readiness",
          priority: documentCount > 0 ? "Medium" : "High",
          impact: "Execution Risk",
          value: documentCount > 0 ? `${documentCount} files` : "Missing package",
          summary:
            documentCount > 0
              ? "The RFQ document package is active and available for supplier review."
              : "Uploading drawings, specifications, BOQ, or supporting documents will improve supplier clarity.",
        },
        {
          title: "Award Readiness",
          priority:
            commercialEvaluationUnlocked &&
            recommendedAwardConfidence !== null
              ? "High"
              : "Medium",
          impact: "Decision Speed",
          value:
            commercialEvaluationUnlocked &&
            recommendedAwardConfidence !== null
              ? `${recommendedAwardConfidence}% confidence`
              : "Not ready",
          summary:
            commercialEvaluationUnlocked &&
            recommendedAwardConfidence !== null
              ? "The RFQ has enough intelligence to support executive award validation."
              : "Award readiness will improve after commercial opening and supplier comparison.",
        },
      ]
    : [];

  const intelligence: RfqExecutiveOpportunityIntelligence[] =
    opportunities.map((opportunity, index) => ({
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
    }));

  return {
    opportunities,
    intelligence,
  };
}