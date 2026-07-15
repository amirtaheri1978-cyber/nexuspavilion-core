export type ExecutiveTrendDirection =
  | "improving"
  | "stable"
  | "declining"
  | "unknown";

export type ExecutiveTrend = {
  direction: ExecutiveTrendDirection;
  delta?: number;
  summary: string;
};

export function createUnknownTrend(
  summary = "Historical trend data is not yet available.",
): ExecutiveTrend {
  return {
    direction: "unknown",
    summary,
  };
}