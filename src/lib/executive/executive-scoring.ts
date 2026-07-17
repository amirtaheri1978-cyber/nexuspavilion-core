export type ExecutiveTone =
  | "excellent"
  | "healthy"
  | "developing"
  | "attention";

export type ExecutivePriority =
  | "proceed"
  | "review"
  | "watch"
  | "hold";

export type ExecutiveIntelligenceResult = {
  score: number;
  status: string;
  tone: ExecutiveTone;
  priority: ExecutivePriority;
  recommendation: string;
};

export type WeightedScoreInput = {
  value: number;
  weight: number;
};

export const EXECUTIVE_SCORE_THRESHOLDS = {
  excellent: 85,
  healthy: 70,
  developing: 55,
} as const;

export function clampScore(score: number): number {
  if (!Number.isFinite(score)) {
    return 0;
  }

  return Math.max(0, Math.min(100, Math.round(score)));
}

export function normalizeCount(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.max(0, Math.floor(value));
}

export function normalizeAmount(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.max(0, value);
}

export function calculateWeightedScore(
  inputs: readonly WeightedScoreInput[],
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

export function mapScoreToTone(
  score: number,
): ExecutiveTone {
  const normalizedScore = clampScore(score);

  if (
    normalizedScore >=
    EXECUTIVE_SCORE_THRESHOLDS.excellent
  ) {
    return "excellent";
  }

  if (
    normalizedScore >=
    EXECUTIVE_SCORE_THRESHOLDS.healthy
  ) {
    return "healthy";
  }

  if (
    normalizedScore >=
    EXECUTIVE_SCORE_THRESHOLDS.developing
  ) {
    return "developing";
  }

  return "attention";
}

export function mapScoreToPriority(
  score: number,
): ExecutivePriority {
  const normalizedScore = clampScore(score);

  if (
    normalizedScore >=
    EXECUTIVE_SCORE_THRESHOLDS.excellent
  ) {
    return "proceed";
  }

  if (
    normalizedScore >=
    EXECUTIVE_SCORE_THRESHOLDS.healthy
  ) {
    return "review";
  }

  if (
    normalizedScore >=
    EXECUTIVE_SCORE_THRESHOLDS.developing
  ) {
    return "watch";
  }

  return "hold";
}

type CreateExecutiveResultInput = {
  score: number;
  status: string;
  recommendation: string;
};

export function createExecutiveResult({
  score,
  status,
  recommendation,
}: CreateExecutiveResultInput): ExecutiveIntelligenceResult {
  const normalizedScore = clampScore(score);

  return {
    score: normalizedScore,
    status,
    tone: mapScoreToTone(normalizedScore),
    priority: mapScoreToPriority(normalizedScore),
    recommendation,
  };
}