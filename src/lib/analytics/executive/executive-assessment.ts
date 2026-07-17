import type {
  ExecutiveSignal,
  ExecutiveSignalCategory,
} from "@/lib/analytics/executive/executive-signal";
import type { ExecutiveEvidenceStatus } from "@/lib/analytics/executive/executive-insight";

export type ExecutiveAssessmentStatus =
  | "strong"
  | "stable"
  | "watch"
  | "critical";

export type ExecutiveAssessmentDimension =
  | "portfolio-health"
  | "supplier-resilience"
  | "commercial-readiness"
  | "evidence-quality";

export type ExecutiveAssessmentFactor = {
  dimension: ExecutiveAssessmentDimension;
  label: string;
  score: number;
  status: ExecutiveAssessmentStatus;
  rationale: string;
  signalIds: string[];
};

export type ExecutiveAssessment = {
  score: number;
  status: ExecutiveAssessmentStatus;
  summary: string;
  factors: ExecutiveAssessmentFactor[];
};

const STATUS_SCORES: Record<ExecutiveEvidenceStatus, number> = {
  critical: 20,
  limited: 40,
  moderate: 60,
  neutral: 70,
  healthy: 85,
  strong: 95,
};

const DIMENSION_CATEGORIES: Record<
  ExecutiveAssessmentDimension,
  ExecutiveSignalCategory[]
> = {
  "portfolio-health": [
    "commercial",
    "competition",
    "supplier",
    "risk",
    "governance",
  ],
  "supplier-resilience": ["supplier", "competition", "risk"],
  "commercial-readiness": [
    "commercial",
    "competition",
    "classification",
    "governance",
  ],
  "evidence-quality": ["classification", "confidence", "governance"],
};

function clampScore(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.max(0, Math.min(100, Math.round(value)));
}

function resolveAssessmentStatus(
  score: number,
): ExecutiveAssessmentStatus {
  if (score >= 85) {
    return "strong";
  }

  if (score >= 70) {
    return "stable";
  }

  if (score >= 50) {
    return "watch";
  }

  return "critical";
}

function calculateWeightedSignalScore(
  signals: ExecutiveSignal[],
): number {
  if (signals.length === 0) {
    return 0;
  }

  const weightedTotal = signals.reduce((total, signal) => {
    const weight = Math.max(1, signal.importance);
    const statusScore = STATUS_SCORES[signal.status];

    return total + statusScore * weight;
  }, 0);

  const totalWeight = signals.reduce(
    (total, signal) => total + Math.max(1, signal.importance),
    0,
  );

  return clampScore(weightedTotal / totalWeight);
}

function buildFactorRationale(
  signals: ExecutiveSignal[],
  status: ExecutiveAssessmentStatus,
): string {
  if (signals.length === 0) {
    return "No executive signals are currently available for this assessment dimension.";
  }

  const criticalSignals = signals.filter(
    (signal) =>
      signal.status === "critical" || signal.status === "limited",
  );

  if (criticalSignals.length > 0) {
    const labels = criticalSignals
      .slice(0, 2)
      .map((signal) => signal.label)
      .join(", ");

    return `${criticalSignals.length} constrained signal${
      criticalSignals.length === 1 ? "" : "s"
    } require attention: ${labels}.`;
  }

  if (status === "strong") {
    return `Assessment is strongly supported by ${signals.length} executive signal${
      signals.length === 1 ? "" : "s"
    }.`;
  }

  if (status === "stable") {
    return `Assessment is supported by ${signals.length} generally healthy executive signal${
      signals.length === 1 ? "" : "s"
    }.`;
  }

  return `Assessment requires further validation across ${signals.length} executive signal${
    signals.length === 1 ? "" : "s"
  }.`;
}

function createAssessmentFactor(
  dimension: ExecutiveAssessmentDimension,
  label: string,
  signals: ExecutiveSignal[],
): ExecutiveAssessmentFactor {
  const categories = DIMENSION_CATEGORIES[dimension];

  const supportingSignals = signals.filter((signal) =>
    categories.includes(signal.category),
  );

  const score = calculateWeightedSignalScore(supportingSignals);
  const status = resolveAssessmentStatus(score);

  return {
    dimension,
    label,
    score,
    status,
    rationale: buildFactorRationale(supportingSignals, status),
    signalIds: supportingSignals.map((signal) => signal.id),
  };
}

function calculateOverallScore(
  factors: ExecutiveAssessmentFactor[],
): number {
  if (factors.length === 0) {
    return 0;
  }

  const total = factors.reduce(
    (sum, factor) => sum + factor.score,
    0,
  );

  return clampScore(total / factors.length);
}

function buildAssessmentSummary(
  status: ExecutiveAssessmentStatus,
): string {
  switch (status) {
    case "strong":
      return "Executive conditions are strongly supported for confident action.";

    case "stable":
      return "Executive conditions are sufficiently supported, with selective validation recommended.";

    case "watch":
      return "Executive conditions require additional validation before material action.";

    case "critical":
      return "Executive conditions are not sufficiently supported for confident action.";
  }
}

export function buildExecutiveAssessment(
  signals: ExecutiveSignal[],
): ExecutiveAssessment {
  const factors: ExecutiveAssessmentFactor[] = [
    createAssessmentFactor(
      "portfolio-health",
      "Portfolio Health",
      signals,
    ),
    createAssessmentFactor(
      "supplier-resilience",
      "Supplier Resilience",
      signals,
    ),
    createAssessmentFactor(
      "commercial-readiness",
      "Commercial Readiness",
      signals,
    ),
    createAssessmentFactor(
      "evidence-quality",
      "Evidence Quality",
      signals,
    ),
  ];

  const score = calculateOverallScore(factors);
  const status = resolveAssessmentStatus(score);

  return {
    score,
    status,
    summary: buildAssessmentSummary(status),
    factors,
  };
}