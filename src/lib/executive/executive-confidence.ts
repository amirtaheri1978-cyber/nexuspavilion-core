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

  if (score >= 80) {
    return "high";
  }

  if (score >= 65) {
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
    return 100;
  }

  if (readiness === "review_required") {
    return 60;
  }

  return 20;
}

function historicalSampleScore({
  submittedQuoteCount,
  awardedQuoteCount,
}: {
  submittedQuoteCount: number;
  awardedQuoteCount: number;
}) {
  if (submittedQuoteCount <= 0) {
    return 0;
  }

  const submissionScore =
    submittedQuoteCount >= 8
      ? 100
      : submittedQuoteCount >= 5
        ? 85
        : submittedQuoteCount >= 3
          ? 70
          : submittedQuoteCount === 2
            ? 55
            : 35;

  const awardSupport =
    awardedQuoteCount >= 3
      ? 10
      : awardedQuoteCount >= 1
        ? 5
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

  if (scores.length < 2) {
    return 25;
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

  return clampScore(100 - standardDeviation * 3);
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
    return 100;
  }

  if (normalizedRiskLevel.includes("high")) {
    return 20;
  }

  return 60;
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
      weight: 35,
      availability: "available",
      summary: `${evidenceAssessment.availableSignalCount} of ${evidenceAssessment.totalSignalCount} canonical evidence signals are available.`,
    },
    {
      key: "decision_readiness",
      label: "Decision Readiness",
      score: readinessScore(
        evidenceAssessment.decisionReadiness,
      ),
      weight: 25,
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
      weight: 15,
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
      weight: 15,
      availability:
        signals.filter(
          (signal) =>
            signal.availability === "available" &&
            signal.score !== null,
        ).length >= 2
          ? "available"
          : "insufficient_data",
      summary:
        "Confidence increases when independently available supplier signals are directionally consistent.",
    },
    {
      key: "procurement_risk",
      label: "Procurement Risk Confidence",
      score: riskScore,
      weight: 10,
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
      score: 25,
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
    margin >= 15
      ? 100
      : margin >= 10
        ? 85
        : margin >= 5
          ? 70
          : margin >= 2
            ? 55
            : 35;

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

  if (suppliersWithSufficientData >= 4) {
    return 100;
  }

  if (suppliersWithSufficientData === 3) {
    return 85;
  }

  if (suppliersWithSufficientData === 2) {
    return 65;
  }

  return 35;
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
        weight: 55,
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
        weight: 25,
        availability: margin.availability,
        summary: margin.summary,
      },
      {
        key: "competitive_depth",
        label: "Competitive Depth",
        score: depthScore,
        weight: 20,
        availability:
          depthScore === null
            ? "insufficient_data"
            : suppliersWithSufficientData >= 2
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