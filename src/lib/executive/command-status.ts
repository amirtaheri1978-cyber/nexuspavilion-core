import {
  clampScore,
  EXECUTIVE_SCORE_THRESHOLDS,
} from "@/lib/executive/executive-scoring";

export function commandStatus(score: number): string {
  const normalizedScore = clampScore(score);

  if (
    normalizedScore >= EXECUTIVE_SCORE_THRESHOLDS.excellent
  ) {
    return "Executive Ready";
  }

  if (
    normalizedScore >= EXECUTIVE_SCORE_THRESHOLDS.healthy
  ) {
    return "Operationally Established";
  }

  if (
    normalizedScore >= EXECUTIVE_SCORE_THRESHOLDS.developing
  ) {
    return "Capability Developing";
  }

  return "Immediate Review Required";
}