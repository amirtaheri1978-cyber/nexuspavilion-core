export type DecisionSupportReadinessDimension =
  | "data-quality"
  | "supplier-engagement"
  | "benchmark-readiness";

export type DecisionSupportReadinessStatus =
  | "board-ready"
  | "management-ready"
  | "review-required"
  | "limited";

export type DecisionSupportReadinessInput = {
  dataQualityScore: number;
  supplierEngagementScore: number;
  benchmarkReadinessScore: number;
};

export type DecisionSupportReadinessFactor = {
  dimension: DecisionSupportReadinessDimension;
  label: string;
  score: number;
  weight: number;
  weightedContribution: number;
};

export type DecisionSupportReadiness = {
  score: number;
  status: DecisionSupportReadinessStatus;
  label: string;
  summary: string;
  guidance: string;
  factors: DecisionSupportReadinessFactor[];
  limitingFactors: DecisionSupportReadinessFactor[];
};

type ReadinessFactorDefinition = {
  dimension: DecisionSupportReadinessDimension;
  label: string;
  weight: number;
  selectScore: (input: DecisionSupportReadinessInput) => number;
};

const READINESS_FACTOR_DEFINITIONS = [
  {
    dimension: "data-quality",
    label: "Data Quality",
    weight: 0.4,
    selectScore: (input) => input.dataQualityScore,
  },
  {
    dimension: "supplier-engagement",
    label: "Supplier Engagement",
    weight: 1 / 3,
    selectScore: (input) => input.supplierEngagementScore,
  },
  {
    dimension: "benchmark-readiness",
    label: "Benchmark Readiness",
    weight: 4 / 15,
    selectScore: (input) => input.benchmarkReadinessScore,
  },
] satisfies readonly ReadinessFactorDefinition[];

function clampScore(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.max(0, Math.min(100, Math.round(value)));
}

function resolveReadinessStatus(
  score: number,
): DecisionSupportReadinessStatus {
  if (score >= 85) {
    return "board-ready";
  }

  if (score >= 70) {
    return "management-ready";
  }

  if (score >= 55) {
    return "review-required";
  }

  return "limited";
}

function buildStatusLabel(
  status: DecisionSupportReadinessStatus,
): string {
  switch (status) {
    case "board-ready":
      return "Board-Ready";

    case "management-ready":
      return "Management-Ready";

    case "review-required":
      return "Review Required";

    case "limited":
      return "Limited Readiness";
  }
}

function buildSummary(
  status: DecisionSupportReadinessStatus,
): string {
  switch (status) {
    case "board-ready":
      return "Decision-support readiness is strong enough for board-level interpretation.";

    case "management-ready":
      return "Decision-support readiness is sufficient for management review, with executive validation retained.";

    case "review-required":
      return "Decision-support readiness remains usable, but material decisions require additional review.";

    case "limited":
      return "Decision-support readiness is currently too limited for material executive decisions.";
  }
}

function buildGuidance(
  status: DecisionSupportReadinessStatus,
): string {
  switch (status) {
    case "board-ready":
      return "Proceed with executive decision support while maintaining normal governance and validation controls.";

    case "management-ready":
      return "Proceed with management review and retain active validation for material executive decisions.";

    case "review-required":
      return "Strengthen the limiting readiness factors before relying on the output for material decisions.";

    case "limited":
      return "Prioritize foundational data, supplier engagement, and internal benchmark validation before using the output for executive action.";
  }
}

function buildFactor(
  definition: ReadinessFactorDefinition,
  input: DecisionSupportReadinessInput,
): DecisionSupportReadinessFactor {
  const score = clampScore(definition.selectScore(input));

  return {
    dimension: definition.dimension,
    label: definition.label,
    score,
    weight: definition.weight,
    weightedContribution: Number(
      (score * definition.weight).toFixed(2),
    ),
  };
}

function calculateReadinessScore(
  factors: DecisionSupportReadinessFactor[],
): number {
  return clampScore(
    factors.reduce(
      (total, factor) => total + factor.weightedContribution,
      0,
    ),
  );
}

function isLimitingFactor(
  factor: DecisionSupportReadinessFactor,
): boolean {
  return factor.score < 70;
}

export function buildDecisionSupportReadiness(
  input: DecisionSupportReadinessInput,
): DecisionSupportReadiness {
  const factors = READINESS_FACTOR_DEFINITIONS.map((definition) =>
    buildFactor(definition, input),
  );

  const score = calculateReadinessScore(factors);
  const status = resolveReadinessStatus(score);

  const limitingFactors = factors
    .filter(isLimitingFactor)
    .sort((left, right) => left.score - right.score);

  return {
    score,
    status,
    label: buildStatusLabel(status),
    summary: buildSummary(status),
    guidance: buildGuidance(status),
    factors,
    limitingFactors,
  };
}
