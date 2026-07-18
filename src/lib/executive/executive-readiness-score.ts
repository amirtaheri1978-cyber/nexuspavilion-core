import {
  calculateWeightedScore,
} from "@/lib/executive/executive-scoring";

const EXECUTIVE_READINESS_WEIGHTS = {
  enterpriseScore: 0.4,
  predictionAccuracy: 0.3,
  dataQuality: 0.3,
} as const;

export function calculateExecutiveReadiness(
  enterpriseScore: number,
  predictionAccuracy: number,
  dataQualityScore: number,
): number {
  return calculateWeightedScore([
    {
      value: enterpriseScore,
      weight: EXECUTIVE_READINESS_WEIGHTS.enterpriseScore,
    },
    {
      value: predictionAccuracy,
      weight: EXECUTIVE_READINESS_WEIGHTS.predictionAccuracy,
    },
    {
      value: dataQualityScore,
      weight: EXECUTIVE_READINESS_WEIGHTS.dataQuality,
    },
  ]);
}