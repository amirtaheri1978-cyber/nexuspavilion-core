import type {
  ExecutiveAssessment,
  ExecutiveAssessmentFactor,
  ExecutiveAssessmentStatus,
} from "@/lib/analytics/executive/executive-assessment";

export type ExecutiveConfidenceLevel =
  | "high"
  | "moderate"
  | "low"
  | "insufficient";

export type ExecutiveConfidenceDriver = {
  dimension: ExecutiveAssessmentFactor["dimension"];
  label: string;
  score: number;
  level: ExecutiveConfidenceLevel;
  rationale: string;
  signalIds: string[];
};

export type ExecutiveConfidence = {
  score: number;
  level: ExecutiveConfidenceLevel;
  summary: string;
  drivers: ExecutiveConfidenceDriver[];
  limitingDrivers: ExecutiveConfidenceDriver[];
};

function clampScore(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.max(0, Math.min(100, Math.round(value)));
}

function resolveConfidenceLevel(
  score: number,
): ExecutiveConfidenceLevel {
  if (score >= 85) {
    return "high";
  }

  if (score >= 70) {
    return "moderate";
  }

  if (score >= 50) {
    return "low";
  }

  return "insufficient";
}

function buildDriverRationale(
  factor: ExecutiveAssessmentFactor,
): string {
  switch (factor.status) {
    case "strong":
      return `${factor.label} strongly supports executive decision confidence.`;

    case "stable":
      return `${factor.label} provides sufficient support, with selective validation recommended.`;

    case "watch":
      return `${factor.label} requires additional validation before material action.`;

    case "critical":
      return `${factor.label} materially limits executive decision confidence.`;
  }
}

function buildConfidenceDriver(
  factor: ExecutiveAssessmentFactor,
): ExecutiveConfidenceDriver {
  return {
    dimension: factor.dimension,
    label: factor.label,
    score: clampScore(factor.score),
    level: resolveConfidenceLevel(factor.score),
    rationale: buildDriverRationale(factor),
    signalIds: [...factor.signalIds],
  };
}

function calculateConfidenceScore(
  assessment: ExecutiveAssessment,
): number {
  if (assessment.factors.length === 0) {
    return 0;
  }

  const baseScore = assessment.score;

  const criticalPenalty = assessment.factors.filter(
    (factor) => factor.status === "critical",
  ).length * 8;

  const watchPenalty = assessment.factors.filter(
    (factor) => factor.status === "watch",
  ).length * 3;

  return clampScore(baseScore - criticalPenalty - watchPenalty);
}

function buildConfidenceSummary(
  level: ExecutiveConfidenceLevel,
): string {
  switch (level) {
    case "high":
      return "Decision confidence is high and executive action is well supported.";

    case "moderate":
      return "Decision confidence is sufficient, with selective validation recommended.";

    case "low":
      return "Decision confidence is limited and additional validation is recommended.";

    case "insufficient":
      return "Decision confidence is insufficient for material executive action.";
  }
}

function isLimitingAssessmentStatus(
  status: ExecutiveAssessmentStatus,
): boolean {
  return status === "watch" || status === "critical";
}

export function buildExecutiveConfidence(
  assessment: ExecutiveAssessment,
): ExecutiveConfidence {
  const drivers = assessment.factors.map(buildConfidenceDriver);

  const score = calculateConfidenceScore(assessment);
  const level = resolveConfidenceLevel(score);

  const limitingDrivers = assessment.factors
    .filter((factor) => isLimitingAssessmentStatus(factor.status))
    .map(buildConfidenceDriver)
    .sort((left, right) => left.score - right.score);

  return {
    score,
    level,
    summary: buildConfidenceSummary(level),
    drivers,
    limitingDrivers,
  };
}