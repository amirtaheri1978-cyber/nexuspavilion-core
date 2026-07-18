import {
  calculateWeightedScore,
  clampScore,
  EXECUTIVE_SCORE_THRESHOLDS,
} from "@/lib/executive/executive-scoring";

export type ExecutiveScore = {
  score: number;
  status: string;
};

const EXECUTIVE_SCORE_WEIGHTS = {
  procurementHealth: 0.2,
  predictionAccuracy: 0.2,
  dataQuality: 0.2,
  controlledRisk: 0.2,
  classification: 0.2,
} as const;

function executiveStatus(score: number): string {
  const normalizedScore = clampScore(score);

  if (
    normalizedScore >= EXECUTIVE_SCORE_THRESHOLDS.excellent
  ) {
    return "Strong";
  }

  if (
    normalizedScore >= EXECUTIVE_SCORE_THRESHOLDS.healthy
  ) {
    return "Established";
  }

  if (
    normalizedScore >= EXECUTIVE_SCORE_THRESHOLDS.developing
  ) {
    return "Developing";
  }

  return "Needs Attention";
}

/**
 * Produces a derived internal executive score from existing operating
 * indicators. This is not an external industry benchmark or predictive
 * accuracy measure.
 */
export function calculateExecutiveScore(
  procurementHealthScore: number,
  predictionAccuracy: number,
  dataQualityScore: number,
  procurementRiskIndex: number,
  constructionClassificationScore: number,
): ExecutiveScore {
  const controlledRiskScore =
    100 - clampScore(procurementRiskIndex);

  const score = calculateWeightedScore([
    {
      value: procurementHealthScore,
      weight: EXECUTIVE_SCORE_WEIGHTS.procurementHealth,
    },
    {
      value: predictionAccuracy,
      weight: EXECUTIVE_SCORE_WEIGHTS.predictionAccuracy,
    },
    {
      value: dataQualityScore,
      weight: EXECUTIVE_SCORE_WEIGHTS.dataQuality,
    },
    {
      value: controlledRiskScore,
      weight: EXECUTIVE_SCORE_WEIGHTS.controlledRisk,
    },
    {
      value: constructionClassificationScore,
      weight: EXECUTIVE_SCORE_WEIGHTS.classification,
    },
  ]);

  return {
    score,
    status: executiveStatus(score),
  };
}