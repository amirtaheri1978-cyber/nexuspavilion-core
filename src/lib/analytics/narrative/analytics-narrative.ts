import type { CommercialInsights } from "@/lib/analytics/commercial/commercial-insights";

export type AnalyticsNarrativeInput = {
  totalRfqs: number;
  procurementHealth: string;
  competitionIndex: string;
  dominantScope: string;
  dominantSourcing: string;
  awardRate: number;
  supplierQuotes: number;
  commercialInsights: CommercialInsights;
  constructionClassificationScore: number;
  avgQuotesPerRfq: number;
  sealedBidRfqs: number;
  frameworkRfqs: number;
  budgetUtilization: number;
  topCategory: string;
};

export type AnalyticsNarrativeResult = {
  executiveSummary: string;
  strategicRecommendations: string[];
};

function normalizeCount(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.max(0, Math.floor(value));
}

function normalizePercentage(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.max(0, Math.min(100, Math.round(value)));
}

function normalizeAmount(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.max(0, value);
}

export function buildAnalyticsNarrative({
  totalRfqs,
  procurementHealth,
  competitionIndex,
  dominantScope,
  dominantSourcing,
  awardRate,
  supplierQuotes,
  commercialInsights,
  constructionClassificationScore,
  avgQuotesPerRfq,
  sealedBidRfqs,
  frameworkRfqs,
  budgetUtilization,
  topCategory,
}: AnalyticsNarrativeInput): AnalyticsNarrativeResult {
  const normalizedTotalRfqs = normalizeCount(totalRfqs);
  const normalizedSupplierQuotes = normalizeCount(supplierQuotes);
  const normalizedSealedBidRfqs = normalizeCount(sealedBidRfqs);
  const normalizedFrameworkRfqs = normalizeCount(frameworkRfqs);

  const normalizedAwardRate = normalizePercentage(awardRate);
  const normalizedBudgetUtilization =
    normalizePercentage(budgetUtilization);

  const normalizedClassificationScore =
    normalizePercentage(constructionClassificationScore);

  const normalizedAverageQuotes = Number.isFinite(avgQuotesPerRfq)
    ? Math.max(0, avgQuotesPerRfq)
    : 0;

  const normalizedCommercialOpportunity = normalizeAmount(
    commercialInsights.estimatedOpportunity ?? 0,
  );

  const commercialSummary =
    commercialInsights.state === "available"
      ? `Commercial evidence identifies ${normalizedCommercialOpportunity.toLocaleString()} dollars in estimated within-RFQ quotation opportunity across ${commercialInsights.comparableRfqCount} comparable RFQ${commercialInsights.comparableRfqCount === 1 ? "" : "s"}.`
      : commercialInsights.state === "access-restricted"
        ? "Commercial opportunity evidence is access restricted for the current workspace membership."
        : commercialInsights.state === "policy-locked"
          ? "Commercial pricing remains policy locked under the current RFQ sourcing and deadline controls."
          : "Commercial opportunity is Insufficient Data because comparable within-RFQ quotation evidence is not yet available.";

  const executiveSummary =
    normalizedTotalRfqs === 0
      ? "No RFQ activity has been created yet. Publish the first construction procurement opportunity to activate portfolio intelligence."
      : `${procurementHealth} procurement health. ${competitionIndex}. Dominant RFQ scope is ${dominantScope}, dominant sourcing method is ${dominantSourcing}, quotation award rate is ${normalizedAwardRate}%, with ${normalizedSupplierQuotes} supplier quotes. ${commercialSummary}`;

  const strategicRecommendations: string[] = [];

  if (normalizedClassificationScore < 60) {
    strategicRecommendations.push(
      "Complete missing RFQ scope, sourcing, and framework classifications to strengthen portfolio intelligence.",
    );
  }

  if (normalizedAverageQuotes < 2) {
    strategicRecommendations.push(
      "Increase qualified supplier participation to strengthen competitive coverage.",
    );
  }

  if (
    normalizedSealedBidRfqs === 0 &&
    normalizedTotalRfqs > 3
  ) {
    strategicRecommendations.push(
      "Evaluate sealed-bid controls for high-value or governance-sensitive procurement packages.",
    );
  }

  if (
    normalizedFrameworkRfqs === 0 &&
    normalizedTotalRfqs > 3
  ) {
    strategicRecommendations.push(
      "Evaluate framework agreements for recurring materials, trades, equipment, or professional services.",
    );
  }

  if (normalizedBudgetUtilization > 85) {
    strategicRecommendations.push(
      "Review budget exposure and competitive coverage before additional award commitments.",
    );
  }

  if (
    commercialInsights.state === "available" &&
    normalizedCommercialOpportunity > 10_000
  ) {
    strategicRecommendations.push(
      "Validate the estimated within-RFQ quotation opportunity against scope alignment, commercial assumptions, and supplier suitability before financial treatment.",
    );
  } else if (commercialInsights.state === "policy-locked") {
    strategicRecommendations.push(
      "Wait for the applicable RFQ commercial unlock before interpreting supplier pricing.",
    );
  } else if (commercialInsights.state === "access-restricted") {
    strategicRecommendations.push(
      "Use an authorized owner, administrator, or buyer context when commercial analytics access is required.",
    );
  } else if (
    commercialInsights.state === "insufficient-data" &&
    normalizedTotalRfqs > 0
  ) {
    strategicRecommendations.push(
      "Increase comparable quotation coverage within individual RFQs before interpreting commercial opportunity.",
    );
  }

  if (normalizedAwardRate < 30) {
    strategicRecommendations.push(
      "Review RFQ quality, supplier targeting, and quotation decision follow-through to improve award execution.",
    );
  }

  if (topCategory && topCategory !== "N/A") {
    strategicRecommendations.push(
      `Review qualified supplier coverage within the ${topCategory} procurement category.`,
    );
  }

  if (strategicRecommendations.length === 0) {
    strategicRecommendations.push(
      "Current portfolio signals are stable. Continue monitoring competition, supplier participation, classification coverage, and award execution.",
    );
  }

  return {
    executiveSummary,
    strategicRecommendations,
  };
}