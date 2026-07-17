import {
  calculateWeightedScore,
  createExecutiveResult,
  EXECUTIVE_SCORE_THRESHOLDS,
  normalizeAmount,
  normalizeCount,
  type ExecutiveIntelligenceResult,
} from "@/lib/executive/executive-scoring";

export type CommercialHealthInput = {
  recommendedAmount: number;
  averageBid: number;
  budget: number;
  quoteCount: number;
};

export type CommercialHealthResult =
  ExecutiveIntelligenceResult;

const COMMERCIAL_HEALTH_WEIGHTS = {
  savings: 0.42,
  budget: 0.28,
  competition: 0.3,
} as const;

function calculatePercentageDifference(
  baseline: number,
  comparison: number,
): number {
  const normalizedBaseline = normalizeAmount(baseline);
  const normalizedComparison = normalizeAmount(comparison);

  if (
    normalizedBaseline <= 0 ||
    normalizedComparison <= 0
  ) {
    return 0;
  }

  return Math.max(
    0,
    ((normalizedBaseline - normalizedComparison) /
      normalizedBaseline) *
      100,
  );
}

export function calculateCommercialHealth({
  recommendedAmount,
  averageBid,
  budget,
  quoteCount,
}: CommercialHealthInput): CommercialHealthResult {
  const normalizedRecommendedAmount =
    normalizeAmount(recommendedAmount);

  const normalizedAverageBid = normalizeAmount(averageBid);
  const normalizedBudget = normalizeAmount(budget);
  const normalizedQuoteCount = normalizeCount(quoteCount);

  const savingsPercentage = calculatePercentageDifference(
    normalizedAverageBid,
    normalizedRecommendedAmount,
  );

  const savingsScore =
    normalizedAverageBid > 0 &&
    normalizedRecommendedAmount > 0
      ? Math.min(
          100,
          Math.max(35, savingsPercentage * 2.5 + 65),
        )
      : 45;

  const budgetScore =
    normalizedBudget > 0 &&
    normalizedRecommendedAmount > 0
      ? normalizedRecommendedAmount <= normalizedBudget
        ? 90
        : 55
      : 60;

  const competitionScore = Math.min(
    100,
    normalizedQuoteCount * 30 +
      (normalizedQuoteCount >= 3 ? 10 : 0),
  );

  const score = calculateWeightedScore([
    {
      value: savingsScore,
      weight: COMMERCIAL_HEALTH_WEIGHTS.savings,
    },
    {
      value: budgetScore,
      weight: COMMERCIAL_HEALTH_WEIGHTS.budget,
    },
    {
      value: competitionScore,
      weight: COMMERCIAL_HEALTH_WEIGHTS.competition,
    },
  ]);

  const status =
    score >= EXECUTIVE_SCORE_THRESHOLDS.excellent
      ? "Strong Commercial Position"
      : score >= EXECUTIVE_SCORE_THRESHOLDS.healthy
        ? "Commercial Position Established"
        : "Commercial Review Required";

  const recommendation =
    score >= EXECUTIVE_SCORE_THRESHOLDS.excellent
      ? "The current commercial position supports award review, subject to scope, compliance, and approval validation."
      : score >= EXECUTIVE_SCORE_THRESHOLDS.healthy
        ? "The commercial position is credible but should be validated against scope, budget, and supplier assumptions."
        : "Review pricing evidence, competition coverage, budget alignment, and scope assumptions before award.";

  return createExecutiveResult({
    score,
    status,
    recommendation,
  });
}