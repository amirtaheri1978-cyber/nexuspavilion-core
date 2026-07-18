import {
  calculateWeightedScore,
} from "@/lib/executive/executive-scoring";

const BOARD_HEALTH_WEIGHTS = {
  procurementEfficiency: 0.25,
  executiveReadiness: 0.25,
  digitalMaturity: 0.25,
  procurementHealth: 0.25,
} as const;

export function calculateBoardHealth(
  procurementEfficiencyScore: number,
  executiveReadinessScore: number,
  digitalMaturityScore: number,
  procurementHealthScore: number,
): number {
  return calculateWeightedScore([
    {
      value: procurementEfficiencyScore,
      weight: BOARD_HEALTH_WEIGHTS.procurementEfficiency,
    },
    {
      value: executiveReadinessScore,
      weight: BOARD_HEALTH_WEIGHTS.executiveReadiness,
    },
    {
      value: digitalMaturityScore,
      weight: BOARD_HEALTH_WEIGHTS.digitalMaturity,
    },
    {
      value: procurementHealthScore,
      weight: BOARD_HEALTH_WEIGHTS.procurementHealth,
    },
  ]);
}