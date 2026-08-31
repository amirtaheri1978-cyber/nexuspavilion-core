import {
  calculateWeightedScore,
} from "@/lib/executive/executive-scoring";

const EXECUTIVE_READINESS_WEIGHTS = {
  enterpriseScore: 4 / 7,
  dataQuality: 3 / 7,
} as const;

export function calculateExecutiveReadiness(
  enterpriseScore: number,
  dataQualityScore: number,
): number {
  return calculateWeightedScore([
    {
      value: enterpriseScore,
      weight: EXECUTIVE_READINESS_WEIGHTS.enterpriseScore,
    },
    {
      value: dataQualityScore,
      weight: EXECUTIVE_READINESS_WEIGHTS.dataQuality,
    },
  ]);
}
