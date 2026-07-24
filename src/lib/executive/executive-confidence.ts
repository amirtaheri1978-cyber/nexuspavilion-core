import {
  EXECUTIVE_AWARD_SUPPORT,
  EXECUTIVE_COMPETITIVE_DEPTH,
  EXECUTIVE_CONFIDENCE_THRESHOLDS,
  EXECUTIVE_CONFIDENCE_WEIGHTS,
  EXECUTIVE_DECISION_MARGIN_SCORES,
  EXECUTIVE_DECISION_MARGIN_THRESHOLDS,
  EXECUTIVE_HISTORICAL_SAMPLE_SCORES,
  EXECUTIVE_HISTORICAL_SAMPLE_THRESHOLDS,
  EXECUTIVE_READINESS_SCORES,
  EXECUTIVE_RISK_SCORES,
  EXECUTIVE_SIGNAL_CONSISTENCY,
} from "@/lib/executive/executive-config";

import type {
  ExecutiveConfidenceAssessment,
  ExecutiveConfidenceFactor,
  ExecutiveConfidenceLevel,
  ExecutiveEvidenceAssessment,
  ExecutiveSupplierRecommendation,
  ExecutiveSupplierSignal,
} from "@/lib/executive/executive-types";

function clampScore(score: number) {
  return Math.max(0, Math.min(100, Math.round(score)));
}

function levelFromScore(
  score: number | null,
): ExecutiveConfidenceLevel {
  if (score === null) {
    return "unavailable";
  }

  if (score >= EXECUTIVE_CONFIDENCE_THRESHOLDS.high) {
    return "high";
  }

  if (score >= EXECUTIVE_CONFIDENCE_THRESHOLDS.medium) {
    return "medium";
  }

  return "low";
}

function calculateWeightedScore(
  factors: ExecutiveConfidenceFactor[],
) {
  const scoredFactors = factors.filter(
    (
      factor,
    ): factor is ExecutiveConfidenceFactor & {
      score: number;
    } => factor.score !== null,
  );

  if (scoredFactors.length === 0) {
    return null;
  }

  const totalWeight = scoredFactors.reduce(
    (runningTotal, factor) =>
      runningTotal + factor.weight,
    0,
  );

  if (totalWeight === 0) {
    return null;
  }

  const weightedTotal = scoredFactors.reduce(
    (runningTotal, factor) =>
      runningTotal + factor.score * factor.weight,
    0,
  );

  return clampScore(weightedTotal / totalWeight);
}

function readinessScore(
  readiness: ExecutiveEvidenceAssessment["decisionReadiness"],
) {
  if (readiness === "ready") {
    return EXECUTIVE_READINESS_SCORES.ready;
  }

  if (readiness === "review_required") {
    return EXECUTIVE_READINESS_SCORES.reviewRequired;
  }

  return EXECUTIVE_READINESS_SCORES.insufficientEvidence;
}

function historicalSampleScore({
  submittedQuoteCount,
  awardedQuoteCount,
}: {
  submittedQuoteCount: number;
  awardedQuoteCount: number;
}) {
  if (submittedQuoteCount <= 0) {
    return EXECUTIVE_HISTORICAL_SAMPLE_SCORES.unavailable;
  }

  const submissionScore =
    submittedQuoteCount >=
    EXECUTIVE_HISTORICAL_SAMPLE_THRESHOLDS.extensive
      ? EXECUTIVE_HISTORICAL_SAMPLE_SCORES.extensive
      : submittedQuoteCount >=
          EXECUTIVE_HISTORICAL_SAMPLE_THRESHOLDS.strong
        ? EXECUTIVE_HISTORICAL_SAMPLE_SCORES.strong
        : submittedQuoteCount >=
            EXECUTIVE_HISTORICAL_SAMPLE_THRESHOLDS.established
          ? EXECUTIVE_HISTORICAL_SAMPLE_SCORES.established
          : submittedQuoteCount ===
              EXECUTIVE_HISTORICAL_SAMPLE_THRESHOLDS.limited
            ? EXECUTIVE_HISTORICAL_SAMPLE_SCORES.limited
            : EXECUTIVE_HISTORICAL_SAMPLE_SCORES.minimal;

  const awardSupport =
    awardedQuoteCount >=
    EXECUTIVE_AWARD_SUPPORT.establishedAwardCount
      ? EXECUTIVE_AWARD_SUPPORT.establishedAwardScore
      : awardedQuoteCount >=
          EXECUTIVE_AWARD_SUPPORT.initialAwardCount
        ? EXECUTIVE_AWARD_SUPPORT.initialAwardScore
        : 0;

  return clampScore(submissionScore + awardSupport);
}

function signalConsistencyScore(
  signals: ExecutiveSupplierSignal[],
) {
  const scores = signals
    .filter(
      (signal) =>
        signal.availability === "available" &&
        signal.score !== null,
    )
    .map((signal) => signal.score as number);

  if (
    scores.length <
    EXECUTIVE_SIGNAL_CONSISTENCY.minimumSignalCount
  ) {
    return EXECUTIVE_SIGNAL_CONSISTENCY.insufficientScore;
  }

  const average =
    scores.reduce(
      (runningTotal, score) =>
        runningTotal + score,
      0,
    ) / scores.length;

  const variance =
    scores.reduce(
      (runningTotal, score) =>
        runningTotal + (score - average) ** 2,
      0,
    ) / scores.length;

  const standardDeviation = Math.sqrt(variance);

  return clampScore(
    100 -
      standardDeviation *
        EXECUTIVE_SIGNAL_CONSISTENCY.standardDeviationMultiplier,
  );
}

function procurementRiskScore(
  riskLevel: string | null,
) {
  if (!riskLevel) {
    return null;
  }

  const normalizedRiskLevel =
    riskLevel.trim().toLowerCase();

  if (normalizedRiskLevel === "low") {
    return EXECUTIVE_RISK_SCORES.low;
  }

  if (normalizedRiskLevel.includes("high")) {
    return EXECUTIVE_RISK_SCORES.high;
  }

  return EXECUTIVE_RISK_SCORES.medium;
}

function buildAssessment({
  factors,
  unavailableSummary,
}: {
  factors: ExecutiveConfidenceFactor[];
  unavailableSummary: string;
}): ExecutiveConfidenceAssessment {
  const score = calculateWeightedScore(factors);
  const level = levelFromScore(score);

  return {
    score,
    level,
    factors,
    summary:
      score === null
        ? unavailableSummary
        : level === "high"
          ? "Decision confidence is supported by strong evidence coverage, stable signals, and sufficient validation depth."
          : level === "medium"
            ? "Decision confidence is usable for executive review, with remaining evidence or comparison limitations."
            : "Decision confidence is constrained by limited evidence, validation depth, signal stability, or procurement risk.",
  };
}

export function buildSupplierConfidenceAssessment({
  evidenceAssessment,
  signals,
  submittedQuoteCount,
  awardedQuoteCount,
  riskLevel,
}: {
  evidenceAssessment: ExecutiveEvidenceAssessment;
  signals: ExecutiveSupplierSignal[];
  submittedQuoteCount: number;
  awardedQuoteCount: number;
  riskLevel: string | null;
}): ExecutiveConfidenceAssessment {
  const riskScore =
    procurementRiskScore(riskLevel);

  const factors: ExecutiveConfidenceFactor[] = [
    {
      key: "evidence_coverage",
      label: "Evidence Coverage",
      score: evidenceAssessment.coverage,
      weight:
        EXECUTIVE_CONFIDENCE_WEIGHTS.supplier
          .evidenceCoverage,
      availability: "available",
      summary: `${evidenceAssessment.availableSignalCount} of ${evidenceAssessment.totalSignalCount} canonical evidence signals are available.`,
    },
    {
      key: "decision_readiness",
      label: "Decision Readiness",
      score: readinessScore(
        evidenceAssessment.decisionReadiness,
      ),
      weight:
        EXECUTIVE_CONFIDENCE_WEIGHTS.supplier
          .decisionReadiness,
      availability: "available",
      summary: `Evidence readiness is ${evidenceAssessment.decisionReadiness.replaceAll("_", " ")}.`,
    },
    {
      key: "historical_sample",
      label: "Historical Validation Depth",
      score: historicalSampleScore({
        submittedQuoteCount,
        awardedQuoteCount,
      }),
      weight:
        EXECUTIVE_CONFIDENCE_WEIGHTS.supplier
          .historicalSample,
      availability:
        submittedQuoteCount > 0
          ? "available"
          : "insufficient_data",
      summary:
        submittedQuoteCount > 0
          ? `${submittedQuoteCount} submitted quote${submittedQuoteCount === 1 ? "" : "s"} and ${awardedQuoteCount} prior award${awardedQuoteCount === 1 ? "" : "s"} support the historical sample.`
          : "No submitted quote history is available for confidence validation.",
    },
    {
      key: "signal_consistency",
      label: "Signal Consistency",
      score: signalConsistencyScore(signals),
      weight:
        EXECUTIVE_CONFIDENCE_WEIGHTS.supplier
          .signalConsistency,
      availability:
        signals.filter(
          (signal) =>
            signal.availability === "available" &&
            signal.score !== null,
        ).length >=
        EXECUTIVE_SIGNAL_CONSISTENCY.minimumSignalCount
          ? "available"
          : "insufficient_data",
      summary:
        "Confidence increases when independently available supplier signals are directionally consistent.",
    },
    {
      key: "procurement_risk",
      label: "Procurement Risk Confidence",
      score: riskScore,
      weight:
        EXECUTIVE_CONFIDENCE_WEIGHTS.supplier
          .procurementRisk,
      availability:
        riskScore === null
          ? "insufficient_data"
          : "available",
      summary:
        riskScore === null
          ? "Procurement risk classification is unavailable."
          : `Current procurement risk classification is ${riskLevel}.`,
    },
  ];

  return buildAssessment({
    factors,
    unavailableSummary:
      "Supplier confidence is unavailable because no confidence factors can be evaluated.",
  });
}

function decisionMarginScore(
  rankedSuppliers: ExecutiveSupplierRecommendation[],
) {
  const firstScore =
    rankedSuppliers[0]?.score ?? null;

  const secondScore =
    rankedSuppliers[1]?.score ?? null;

  if (firstScore === null) {
    return {
      score: null,
      availability: "insufficient_data" as const,
      summary:
        "No leading supplier score is available for comparative confidence.",
    };
  }

  if (secondScore === null) {
    return {
      score:
        EXECUTIVE_DECISION_MARGIN_SCORES.singleSupplier,
      availability: "insufficient_data" as const,
      summary:
        "Only one sufficiently scored supplier is available, so decision separation cannot be validated.",
    };
  }

  const margin = Math.max(
    0,
    firstScore - secondScore,
  );

  const score =
    margin >=
    EXECUTIVE_DECISION_MARGIN_THRESHOLDS.decisive
      ? EXECUTIVE_DECISION_MARGIN_SCORES.decisive
      : margin >=
          EXECUTIVE_DECISION_MARGIN_THRESHOLDS.strong
        ? EXECUTIVE_DECISION_MARGIN_SCORES.strong
        : margin >=
            EXECUTIVE_DECISION_MARGIN_THRESHOLDS.meaningful
          ? EXECUTIVE_DECISION_MARGIN_SCORES.meaningful
          : margin >=
              EXECUTIVE_DECISION_MARGIN_THRESHOLDS.narrow
            ? EXECUTIVE_DECISION_MARGIN_SCORES.narrow
            : EXECUTIVE_DECISION_MARGIN_SCORES.minimal;

  return {
    score,
    availability: "available" as const,
    summary: `The leading supplier is separated from the next ranked supplier by ${margin} point${margin === 1 ? "" : "s"}.`,
  };
}

function competitiveDepthScore(
  suppliersWithSufficientData: number,
) {
  if (suppliersWithSufficientData <= 0) {
    return null;
  }

  if (
    suppliersWithSufficientData >=
    EXECUTIVE_COMPETITIVE_DEPTH.strongSupplierCount
  ) {
    return EXECUTIVE_COMPETITIVE_DEPTH.strongScore;
  }

  if (
    suppliersWithSufficientData ===
    EXECUTIVE_COMPETITIVE_DEPTH.establishedSupplierCount
  ) {
    return EXECUTIVE_COMPETITIVE_DEPTH.establishedScore;
  }

  if (
    suppliersWithSufficientData ===
    EXECUTIVE_COMPETITIVE_DEPTH.minimumComparableSupplierCount
  ) {
    return EXECUTIVE_COMPETITIVE_DEPTH.comparableScore;
  }

  return EXECUTIVE_COMPETITIVE_DEPTH.limitedScore;
}

export function buildDecisionConfidenceAssessment({
  recommendedSupplier,
  rankedSuppliers,
  suppliersWithSufficientData,
}: {
  recommendedSupplier: ExecutiveSupplierRecommendation | null;
  rankedSuppliers: ExecutiveSupplierRecommendation[];
  suppliersWithSufficientData: number;
}): ExecutiveConfidenceAssessment {
  if (!recommendedSupplier) {
    return buildUnavailableConfidenceAssessment(
      "Decision confidence is unavailable because no supplier has sufficient decision evidence.",
    );
  }

  const margin = decisionMarginScore(
    rankedSuppliers.filter(
      (supplier) =>
        supplier.dataAvailability === "available",
    ),
  );

  const depthScore = competitiveDepthScore(
    suppliersWithSufficientData,
  );

  return buildAssessment({
    factors: [
      {
        key: "supplier_confidence",
        label: "Leading Supplier Confidence",
        score:
          recommendedSupplier.confidenceAssessment
            .score,
        weight:
          EXECUTIVE_CONFIDENCE_WEIGHTS.decision
            .supplierConfidence,
        availability:
          recommendedSupplier.confidenceAssessment
            .score === null
            ? "insufficient_data"
            : "available",
        summary:
          recommendedSupplier.confidenceAssessment
            .summary,
      },
      {
        key: "decision_margin",
        label: "Decision Margin",
        score: margin.score,
        weight:
          EXECUTIVE_CONFIDENCE_WEIGHTS.decision
            .decisionMargin,
        availability: margin.availability,
        summary: margin.summary,
      },
      {
        key: "competitive_depth",
        label: "Competitive Depth",
        score: depthScore,
        weight:
          EXECUTIVE_CONFIDENCE_WEIGHTS.decision
            .competitiveDepth,
        availability:
          depthScore === null
            ? "insufficient_data"
            : suppliersWithSufficientData >=
                EXECUTIVE_COMPETITIVE_DEPTH.minimumComparableSupplierCount
              ? "available"
              : "insufficient_data",
        summary: `${suppliersWithSufficientData} supplier${suppliersWithSufficientData === 1 ? "" : "s"} have sufficient evidence for executive comparison.`,
      },
    ],
    unavailableSummary:
      "Decision confidence is unavailable because comparative supplier evidence cannot be evaluated.",
  });
}

export function buildUnavailableConfidenceAssessment(
  summary: string,
): ExecutiveConfidenceAssessment {
  return {
    score: null,
    level: "unavailable",
    factors: [],
    summary,
  };
}
