import {
  clampScore,
  createExecutiveResult,
  EXECUTIVE_SCORE_THRESHOLDS,
  normalizeAmount,
  normalizeCount,
  type ExecutiveIntelligenceResult,
} from "@/lib/executive/executive-scoring";

const NEGOTIATION_MAX_IMPROVEMENT_PERCENT = 12;
const NEGOTIATION_SCORE_IMPROVEMENT_FACTOR = 0.12;

export type NegotiationStrengthInput = {
  recommendedAmount: number;
  averageBid: number;
  quoteCount: number;
  riskLevel: string;
};

export type NegotiationStrengthResult =
  ExecutiveIntelligenceResult;

export type NegotiationCommercialTargetInput = {
  recommendedAmount: number;
  averageBid: number;
  negotiationScore: number;
};

export type NegotiationCommercialTargetResult = {
  targetPrice: number;
  targetImprovement: number;
  expectedSavings: number;
};

function calculatePercentageDifference(
  baseline: number,
  comparison: number,
): number {
  const normalizedBaseline = normalizeAmount(baseline);
  const normalizedComparison =
    normalizeAmount(comparison);

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

function normalizeRiskLevel(value: string): string {
  return String(value || "").trim().toLowerCase();
}

function isLowRisk(value: string): boolean {
  return normalizeRiskLevel(value) === "low";
}

export function calculateNegotiationStrength({
  recommendedAmount,
  averageBid,
  quoteCount,
  riskLevel,
}: NegotiationStrengthInput): NegotiationStrengthResult {
  const normalizedRecommendedAmount =
    normalizeAmount(recommendedAmount);

  const normalizedAverageBid =
    normalizeAmount(averageBid);

  const normalizedQuoteCount =
    normalizeCount(quoteCount);

  const spread = calculatePercentageDifference(
    normalizedAverageBid,
    normalizedRecommendedAmount,
  );

  const competitionBoost =
    normalizedQuoteCount >= 3
      ? 22
      : normalizedQuoteCount >= 2
        ? 12
        : 4;

  const riskBoost = isLowRisk(riskLevel) ? 14 : 4;

  const score = clampScore(
    spread * 4 +
      competitionBoost +
      riskBoost +
      38,
  );

  const status =
    score >= EXECUTIVE_SCORE_THRESHOLDS.excellent
      ? "Strong Negotiation Position"
      : score >= EXECUTIVE_SCORE_THRESHOLDS.healthy
        ? "Targeted Negotiation Available"
        : "Limited Negotiation Leverage";

  const recommendation =
    score >= EXECUTIVE_SCORE_THRESHOLDS.excellent
      ? "Use verified competitive tension to request best-and-final pricing without weakening scope, quality, or schedule requirements."
      : score >= EXECUTIVE_SCORE_THRESHOLDS.healthy
        ? "Pursue targeted commercial improvement while preserving execution requirements and supplier accountability."
        : "Use a controlled negotiation focused on commercial terms, clarifications, and execution readiness.";

  return createExecutiveResult({
    score,
    status,
    recommendation,
  });
}

export function calculateNegotiationCommercialTargets({
  recommendedAmount,
  averageBid,
  negotiationScore,
}: NegotiationCommercialTargetInput): NegotiationCommercialTargetResult {
  const normalizedRecommendedAmount =
    normalizeAmount(recommendedAmount);

  const normalizedAverageBid =
    normalizeAmount(averageBid);

  const normalizedNegotiationScore =
    clampScore(negotiationScore);

  const potentialImprovementPercent = Math.min(
    NEGOTIATION_MAX_IMPROVEMENT_PERCENT,
    Math.round(
      normalizedNegotiationScore *
        NEGOTIATION_SCORE_IMPROVEMENT_FACTOR,
    ),
  );

  const targetImprovement = Math.round(
    normalizedRecommendedAmount *
      (potentialImprovementPercent / 100),
  );

  const targetPrice =
    normalizedRecommendedAmount -
    targetImprovement;

  const expectedSavings =
    normalizedAverageBid > 0
      ? normalizedAverageBid -
        normalizedRecommendedAmount
      : 0;

  return {
    targetPrice,
    targetImprovement,
    expectedSavings,
  };
}