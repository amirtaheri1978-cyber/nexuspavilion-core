export type AnalyticsNarrativeInput = {
  totalRfqs: number;
  procurementHealth: string;
  competitionIndex: string;
  dominantScope: string;
  dominantSourcing: string;
  awardRate: number;
  supplierQuotes: number;
  potentialSavings: number;
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
  potentialSavings,
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

  const normalizedPotentialSavings =
    normalizeAmount(potentialSavings);

  const executiveSummary =
    normalizedTotalRfqs === 0
      ? "No RFQ activity has been created yet. Publish the first construction procurement opportunity to activate portfolio intelligence."
      : `${procurementHealth} procurement health. ${competitionIndex}. Dominant RFQ scope is ${dominantScope}, dominant sourcing method is ${dominantSourcing}, award conversion is ${normalizedAwardRate}%, with ${normalizedSupplierQuotes} supplier quotes and ${normalizedPotentialSavings.toLocaleString()} dollars in estimated savings opportunity.`;

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

  if (normalizedPotentialSavings > 10_000) {
    strategicRecommendations.push(
      "Validate the estimated savings opportunity against scope alignment, commercial assumptions, and supplier suitability.",
    );
  }

  if (normalizedAwardRate < 30) {
    strategicRecommendations.push(
      "Review RFQ quality, supplier targeting, and award workflow completion to improve conversion.",
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