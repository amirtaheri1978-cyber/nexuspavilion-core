export type SupplierRiskLevel = "Low" | "Medium" | "High";

export type RiskScoreInput = {
  amountNumber: number;
  budget: number;
  timeline: string | null;
  message: string | null;
};

export type SupplierEvaluationScoreInput = {
  priceScore: number;
  timelineScore: number;
  performanceScore: number;
  riskScore: number;
  validityScore: number;
};

/**
 * Canonical supplier evaluation weights currently used by the RFQ commercial
 * intelligence engine.
 *
 * These values represent procurement decision policy. Changes must be reviewed
 * as business-rule changes and validated against ranking regression fixtures.
 */
export const SUPPLIER_EVALUATION_WEIGHTS = {
  price: 0.38,
  timeline: 0.22,
  performance: 0.18,
  riskReadiness: 0.14,
  validity: 0.08,
} as const;

function clampScore(score: number) {
  return Math.max(0, Math.min(Math.round(score), 100));
}

export function getTimelineMonths(timeline: string | null) {
  const value = String(timeline || "").toLowerCase();

  /**
   * Quarter references must be resolved before generic numeric parsing.
   *
   * Without this ordering, values such as "Q1" are interpreted as one month
   * because the numeric matcher extracts the quarter number.
   */
  if (value.includes("q1")) return 3;
  if (value.includes("q2")) return 6;
  if (value.includes("q3")) return 9;
  if (value.includes("q4")) return 12;

  if (value.includes("fast") || value.includes("quick")) {
    return 6;
  }

  const numberMatch = value.match(/\d+/);
  const amount = numberMatch ? Number(numberMatch[0]) : null;

  if (!amount) {
    return 18;
  }

  if (value.includes("week")) {
    return Math.max(1, Math.round(amount / 4.345));
  }

  return amount;
}

export function getTimelineScore(timeline: string | null) {
  const months = getTimelineMonths(timeline);

  if (months <= 6) return 100;
  if (months <= 9) return 92;
  if (months <= 12) return 84;
  if (months <= 16) return 74;
  if (months <= 20) return 62;
  if (months <= 24) return 52;

  return 40;
}

export function getPerformanceScore(message: string | null) {
  const value = String(message || "").toLowerCase();

  let score = 55;

  const positiveSignals = [
    "healthcare",
    "hospital",
    "infection control",
    "phased",
    "occupied",
    "quality assurance",
    "project management",
    "firestopping",
    "commissioning",
    "warranty",
    "experience",
    "certified",
    "cor",
    "wsib",
  ];

  positiveSignals.forEach((signal) => {
    if (value.includes(signal)) {
      score += 4;
    }
  });

  if (value.length > 500) score += 5;
  if (value.length > 900) score += 5;

  return clampScore(score);
}

/**
 * Higher values represent a stronger, lower-risk supplier position.
 *
 * The existing public property remains `riskScore` for compatibility, but its
 * semantic direction is risk readiness rather than risk exposure.
 */
export function getRiskScore({
  amountNumber,
  budget,
  timeline,
  message,
}: RiskScoreInput) {
  let score = 85;

  const timelineMonths = getTimelineMonths(timeline);
  const value = String(message || "").toLowerCase();

  if (budget > 0 && amountNumber > budget) score -= 18;
  if (budget > 0 && amountNumber < budget * 0.65) score -= 12;
  if (timelineMonths > 24) score -= 15;
  if (!value.includes("warranty")) score -= 5;
  if (!value.includes("quality")) score -= 5;
  if (!value.includes("project management")) score -= 5;

  return Math.max(20, Math.min(score, 100));
}

export function getRiskLevel(score: number): SupplierRiskLevel {
  if (score >= 80) return "Low";
  if (score >= 60) return "Medium";

  return "High";
}

export function getValidityScore(validityDays: number) {
  if (validityDays >= 120) return 100;
  if (validityDays >= 90) return 92;
  if (validityDays >= 60) return 84;

  return 72;
}

export function getPriceScore({
  amountNumber,
  lowestAmount,
}: {
  amountNumber: number;
  lowestAmount: number | null;
}) {
  if (!lowestAmount || lowestAmount <= 0 || amountNumber <= 0) {
    return 0;
  }

  return clampScore((lowestAmount / amountNumber) * 100);
}

export function getSupplierEvaluationScore({
  priceScore,
  timelineScore,
  performanceScore,
  riskScore,
  validityScore,
}: SupplierEvaluationScoreInput) {
  return clampScore(
    priceScore * SUPPLIER_EVALUATION_WEIGHTS.price +
      timelineScore * SUPPLIER_EVALUATION_WEIGHTS.timeline +
      performanceScore * SUPPLIER_EVALUATION_WEIGHTS.performance +
      riskScore * SUPPLIER_EVALUATION_WEIGHTS.riskReadiness +
      validityScore * SUPPLIER_EVALUATION_WEIGHTS.validity,
  );
}

export function getAwardConfidence(evaluationScore: number) {
  return Math.min(99, Math.max(35, evaluationScore));
}