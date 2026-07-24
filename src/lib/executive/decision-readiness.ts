import {
  EXECUTIVE_DECISION_READINESS_SIGNALS,
  EXECUTIVE_DECISION_READINESS_WEIGHTS,
} from "@/lib/executive/executive-config";

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
    normalizedQuoteCount *
      EXECUTIVE_DECISION_READINESS_SIGNALS.quoteCoverageIncrement,
  );

  const documentCoverageScore = Math.min(
    100,
    normalizedDocumentCount *
      EXECUTIVE_DECISION_READINESS_SIGNALS.documentCoverageIncrement,
  );

  /*
   * Addenda are not mandatory for every RFQ. A controlled RFQ
   * therefore receives a neutral governance baseline rather than
   * being penalized solely because no addendum was required.
   */
  const governanceTrailScore = Math.min(
    100,
    EXECUTIVE_DECISION_READINESS_SIGNALS.governanceBaseline +
      normalizedAddendaCount *
        EXECUTIVE_DECISION_READINESS_SIGNALS.governanceIncrement,
  );

  const commercialAccessScore =
    commercialEvaluationUnlocked
      ? EXECUTIVE_DECISION_READINESS_SIGNALS.commercialAccessUnlockedScore
      : EXECUTIVE_DECISION_READINESS_SIGNALS.commercialAccessLockedScore;

  const recommendationAvailabilityScore =
    hasRecommendedQuote
      ? EXECUTIVE_DECISION_READINESS_SIGNALS.recommendationAvailableScore
      : EXECUTIVE_DECISION_READINESS_SIGNALS.recommendationUnavailableScore;

  const score = calculateWeightedScore([
    {
      value: healthScore,
      weight:
        EXECUTIVE_DECISION_READINESS_WEIGHTS.health,
    },
    {
      value: quoteCoverageScore,
      weight:
        EXECUTIVE_DECISION_READINESS_WEIGHTS.quoteCoverage,
    },
    {
      value: documentCoverageScore,
      weight:
        EXECUTIVE_DECISION_READINESS_WEIGHTS.documentCoverage,
    },
    {
      value: governanceTrailScore,
      weight:
        EXECUTIVE_DECISION_READINESS_WEIGHTS.governanceTrail,
    },
    {
      value: commercialAccessScore,
      weight:
        EXECUTIVE_DECISION_READINESS_WEIGHTS.commercialAccess,
    },
    {
      value: recommendationAvailabilityScore,
      weight:
        EXECUTIVE_DECISION_READINESS_WEIGHTS.recommendationAvailability,
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