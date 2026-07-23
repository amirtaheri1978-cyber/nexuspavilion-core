export type AnalyticsHealthBand =
  | "strong"
  | "healthy"
  | "developing"
  | "attention";

export const ANALYTICS_HEALTH_SCORE_THRESHOLDS = {
  strong: 85,
  healthy: 70,
  developing: 55,
} as const;

function normalizeAnalyticsScore(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.max(0, Math.min(100, Math.round(value)));
}

export function resolveAnalyticsHealthBand(
  score: number,
): AnalyticsHealthBand {
  const normalizedScore = normalizeAnalyticsScore(score);

  if (
    normalizedScore >=
    ANALYTICS_HEALTH_SCORE_THRESHOLDS.strong
  ) {
    return "strong";
  }

  if (
    normalizedScore >=
    ANALYTICS_HEALTH_SCORE_THRESHOLDS.healthy
  ) {
    return "healthy";
  }

  if (
    normalizedScore >=
    ANALYTICS_HEALTH_SCORE_THRESHOLDS.developing
  ) {
    return "developing";
  }

  return "attention";
}