export type DecisionReadinessTone =
  | "excellent"
  | "healthy"
  | "developing"
  | "attention";

export type DecisionReadinessPriority =
  | "proceed"
  | "review"
  | "watch"
  | "hold";

export type DecisionReadinessInput = {
  healthScore: number;
  quoteCount: number;
  documentCount: number;
  addendaCount: number;
  commercialEvaluationUnlocked: boolean;
  hasRecommendedQuote: boolean;
};

export type DecisionReadinessResult = {
  score: number;
  status: string;
  tone: DecisionReadinessTone;
  priority: DecisionReadinessPriority;
  recommendation: string;
};

type WeightedScoreInput = {
  value: number;
  weight: number;
};

const SCORE_THRESHOLDS = {
  excellent: 85,
  healthy: 70,
  developing: 55,
} as const;

const DECISION_READINESS_WEIGHTS = {
  health: 0.34,
  quoteCoverage: 0.22,
  documentCoverage: 0.18,
  governanceTrail: 0.1,
  commercialAccess: 0.08,
  recommendationAvailability: 0.08,
} as const;

function clampScore(score: number): number {
  if (!Number.isFinite(score)) {
    return 0;
  }

  return Math.max(0, Math.min(100, Math.round(score)));
}

function normalizeCount(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.max(0, Math.floor(value));
}

function calculateWeightedScore(
  inputs: WeightedScoreInput[],
): number {
  const totalWeight = inputs.reduce(
    (total, input) => total + Math.max(0, input.weight),
    0,
  );

  if (totalWeight <= 0) {
    return 0;
  }

  const weightedValue = inputs.reduce((total, input) => {
    const normalizedValue = clampScore(input.value);
    const normalizedWeight = Math.max(0, input.weight);

    return total + normalizedValue * normalizedWeight;
  }, 0);

  return clampScore(weightedValue / totalWeight);
}

function mapScoreToTone(
  score: number,
): DecisionReadinessTone {
  const normalizedScore = clampScore(score);

  if (normalizedScore >= SCORE_THRESHOLDS.excellent) {
    return "excellent";
  }

  if (normalizedScore >= SCORE_THRESHOLDS.healthy) {
    return "healthy";
  }

  if (normalizedScore >= SCORE_THRESHOLDS.developing) {
    return "developing";
  }

  return "attention";
}

function mapScoreToPriority(
  score: number,
): DecisionReadinessPriority {
  const normalizedScore = clampScore(score);

  if (normalizedScore >= SCORE_THRESHOLDS.excellent) {
    return "proceed";
  }

  if (normalizedScore >= SCORE_THRESHOLDS.healthy) {
    return "review";
  }

  if (normalizedScore >= SCORE_THRESHOLDS.developing) {
    return "watch";
  }

  return "hold";
}

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
    score >= SCORE_THRESHOLDS.excellent
      ? "Ready for Decision Validation"
      : score >= SCORE_THRESHOLDS.healthy
        ? "Ready for Structured Review"
        : "Decision Inputs Incomplete";

  const recommendation =
    score >= SCORE_THRESHOLDS.excellent
      ? "The RFQ has sufficient operating evidence to proceed to authorized executive award validation."
      : score >= SCORE_THRESHOLDS.healthy
        ? "Proceed with structured executive review while validating the remaining evidence gaps."
        : "Strengthen procurement documents, supplier participation, and commercial evidence before requesting an executive decision.";

  return {
    score,
    status,
    tone: mapScoreToTone(score),
    priority: mapScoreToPriority(score),
    recommendation,
  };
}
