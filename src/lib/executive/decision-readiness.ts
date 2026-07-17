import {
  calculateWeightedScore,
  createExecutiveResult,
  EXECUTIVE_SCORE_THRESHOLDS,
  normalizeCount,
  type ExecutiveIntelligenceResult,
  type ExecutivePriority,
  type ExecutiveTone,
} from "@/lib/executive/executive-scoring";

export type DecisionReadinessTone = ExecutiveTone;

export type DecisionReadinessPriority = ExecutivePriority;

export type DecisionReadinessInput = {
  healthScore: number;
  quoteCount: number;
  documentCount: number;
  addendaCount: number;
  commercialEvaluationUnlocked: boolean;
  hasRecommendedQuote: boolean;
};

export type DecisionReadinessResult =
  ExecutiveIntelligenceResult;

const DECISION_READINESS_WEIGHTS = {
  health: 0.34,
  quoteCoverage: 0.22,
  documentCoverage: 0.18,
  governanceTrail: 0.1,
  commercialAccess: 0.08,
  recommendationAvailability: 0.08,
} as const;

export function calculateDecisionReadiness({
  healthScore,
  quoteCount,
  documentCount,
  addendaCount,
  commercialEvaluationUnlocked,
  hasRecommendedQuote,
}: DecisionReadinessInput): DecisionReadinessResult {
  const normalizedQuoteCount = normalizeCount(quoteCount);

  const normalizedDocumentCount =
    normalizeCount(documentCount);

  const normalizedAddendaCount =
    normalizeCount(addendaCount);

  const quoteCoverageScore = Math.min(
    100,
    normalizedQuoteCount * 28,
  );

  const documentCoverageScore = Math.min(
    100,
    normalizedDocumentCount * 24,
  );

  /*
   * Addenda are not mandatory for every RFQ. A controlled RFQ
   * therefore receives a neutral governance baseline rather than
   * being penalized solely because no addendum was required.
   */
  const governanceTrailScore = Math.min(
    100,
    55 + normalizedAddendaCount * 12,
  );

  const commercialAccessScore =
    commercialEvaluationUnlocked ? 100 : 45;

  const recommendationAvailabilityScore =
    hasRecommendedQuote ? 100 : 35;

  const score = calculateWeightedScore([
    {
      value: healthScore,
      weight: DECISION_READINESS_WEIGHTS.health,
    },
    {
      value: quoteCoverageScore,
      weight: DECISION_READINESS_WEIGHTS.quoteCoverage,
    },
    {
      value: documentCoverageScore,
      weight: DECISION_READINESS_WEIGHTS.documentCoverage,
    },
    {
      value: governanceTrailScore,
      weight: DECISION_READINESS_WEIGHTS.governanceTrail,
    },
    {
      value: commercialAccessScore,
      weight: DECISION_READINESS_WEIGHTS.commercialAccess,
    },
    {
      value: recommendationAvailabilityScore,
      weight:
        DECISION_READINESS_WEIGHTS.recommendationAvailability,
    },
  ]);

  const status =
    score >= EXECUTIVE_SCORE_THRESHOLDS.excellent
      ? "Ready for Decision Validation"
      : score >= EXECUTIVE_SCORE_THRESHOLDS.healthy
        ? "Ready for Structured Review"
        : "Decision Inputs Incomplete";

  const recommendation =
    score >= EXECUTIVE_SCORE_THRESHOLDS.excellent
      ? "The RFQ has sufficient operating evidence to proceed to authorized executive award validation."
      : score >= EXECUTIVE_SCORE_THRESHOLDS.healthy
        ? "Proceed with structured executive review while validating the remaining evidence gaps."
        : "Strengthen procurement documents, supplier participation, and commercial evidence before requesting an executive decision.";

  return createExecutiveResult({
    score,
    status,
    recommendation,
  });
}