import type {
  ExecutiveConfidenceLevel,
  ExecutiveDataAvailability,
  ExecutiveIntelligenceInput,
  ExecutivePriority,
  ExecutiveResult,
  ExecutiveRisk,
  ExecutiveSupplierRecommendation,
  ExecutiveSupplierRecommendationCandidate,
  ExecutiveSupplierRecommendationInput,
  ExecutiveSupplierRecommendationResult,
  ExecutiveSupplierSignal,
  ExecutiveTone,
} from "@/lib/executive/executive-types";

const MINIMUM_SUFFICIENT_DATA_COVERAGE = 50;

function tone(score: number): ExecutiveTone {
  if (score >= 85) return "success";
  if (score >= 70) return "info";
  if (score >= 55) return "warning";

  return "risk";
}

function priority(score: number): ExecutivePriority {
  if (score >= 85) return "low";
  if (score >= 70) return "medium";
  if (score >= 55) return "high";

  return "critical";
}

function confidenceFromScore(
  score: number | null,
  dataCoverage: number,
): ExecutiveConfidenceLevel {
  if (score === null || dataCoverage < MINIMUM_SUFFICIENT_DATA_COVERAGE) {
    return "low";
  }

  if (score >= 85 && dataCoverage >= 75) {
    return "high";
  }

  if (score >= 70 && dataCoverage >= 60) {
    return "medium";
  }

  return "low";
}

function availabilityFromCoverage(
  dataCoverage: number,
): ExecutiveDataAvailability {
  return dataCoverage >= MINIMUM_SUFFICIENT_DATA_COVERAGE
    ? "available"
    : "insufficient_data";
}

function calculateDataCoverage(signals: ExecutiveSupplierSignal[]) {
  if (signals.length === 0) {
    return 0;
  }

  const availableSignalCount = signals.filter(
    (signal) =>
      signal.availability === "available" &&
      signal.score !== null,
  ).length;

  return Math.round(
    (availableSignalCount / signals.length) * 100,
  );
}

function calculateSignalScore(signals: ExecutiveSupplierSignal[]) {
  const availableScores = signals
    .filter(
      (signal) =>
        signal.availability === "available" &&
        signal.score !== null,
    )
    .map((signal) => signal.score as number);

  if (availableScores.length === 0) {
    return null;
  }

  const totalScore = availableScores.reduce(
    (runningTotal, score) => runningTotal + score,
    0,
  );

  return Math.round(totalScore / availableScores.length);
}

function resolveCandidateScore(
  candidate: ExecutiveSupplierRecommendationCandidate,
) {
  /*
   * The current commercial quote score remains canonical whenever available.
   * Signal averages are only a fallback for candidates without a current
   * commercial evaluation.
   */
  if (candidate.currentQuote) {
    return candidate.currentQuote.totalScore;
  }

  return calculateSignalScore(candidate.signals);
}

function getCandidateStatus({
  score,
  availability,
  riskLevel,
}: {
  score: number | null;
  availability: ExecutiveDataAvailability;
  riskLevel: string | null;
}) {
  if (availability !== "available" || score === null) {
    return "Insufficient Decision Evidence";
  }

  if (
    score >= 85 &&
    riskLevel?.toLowerCase() === "low"
  ) {
    return "Preferred Award Candidate";
  }

  if (score >= 70) {
    return "Qualified Executive Review";
  }

  if (score >= 55) {
    return "Conditional Consideration";
  }

  return "Not Recommended";
}

function getCandidateRecommendation(status: string) {
  if (status === "Preferred Award Candidate") {
    return "Advance this supplier to authorized award validation, subject to final governance and commercial confirmation.";
  }

  if (status === "Qualified Executive Review") {
    return "Retain this supplier in the executive shortlist and validate the remaining commercial, delivery, and governance conditions.";
  }

  if (status === "Conditional Consideration") {
    return "Proceed only after targeted clarification, risk mitigation, and documented approval of the identified exceptions.";
  }

  if (status === "Not Recommended") {
    return "Do not advance this supplier without material improvement in commercial value, delivery confidence, or procurement risk.";
  }

  return "Collect additional supplier evidence before forming an award recommendation.";
}

function getSignalRationale(signals: ExecutiveSupplierSignal[]) {
  return [...signals]
    .filter(
      (signal) =>
        signal.availability === "available" &&
        signal.score !== null &&
        signal.score >= 70,
    )
    .sort(
      (firstSignal, secondSignal) =>
        (secondSignal.score ?? 0) -
        (firstSignal.score ?? 0),
    )
    .slice(0, 4)
    .map((signal) => signal.summary);
}

function getFallbackRationale(
  candidate: ExecutiveSupplierRecommendationCandidate,
) {
  const rationale: string[] = [];

  if (candidate.currentQuote) {
    rationale.push(
      `Commercial evaluation score is ${candidate.currentQuote.totalScore}/100 with ${candidate.currentQuote.awardConfidence}% award confidence.`,
    );

    rationale.push(
      `Current procurement risk classification is ${candidate.currentQuote.riskLevel}.`,
    );
  }

  if (candidate.submittedQuoteCount > 0) {
    rationale.push(
      `${candidate.submittedQuoteCount} submitted quote${
        candidate.submittedQuoteCount === 1 ? "" : "s"
      } provide historical response evidence.`,
    );
  }

  if (candidate.awardedQuoteCount > 0) {
    rationale.push(
      `${candidate.awardedQuoteCount} prior award${
        candidate.awardedQuoteCount === 1 ? "" : "s"
      } support demonstrated award experience.`,
    );
  }

  return rationale;
}

function buildCandidateRationale(
  candidate: ExecutiveSupplierRecommendationCandidate,
) {
  const signalRationale = getSignalRationale(
    candidate.signals,
  );

  if (signalRationale.length > 0) {
    return signalRationale;
  }

  const fallbackRationale = getFallbackRationale(candidate);

  if (fallbackRationale.length > 0) {
    return fallbackRationale;
  }

  return [
    "Supplier evidence is not yet sufficient to support an executive award rationale.",
  ];
}

function buildCandidateRisks(
  candidate: ExecutiveSupplierRecommendationCandidate,
): ExecutiveRisk[] {
  const signalRisks = candidate.signals
    .filter(
      (signal) =>
        signal.availability === "available" &&
        signal.score !== null &&
        signal.score < 55,
    )
    .map((signal) => ({
      title: signal.label,
      severity: signal.tone,
      summary: signal.summary,
    }));

  if (
    candidate.currentQuote &&
    candidate.currentQuote.riskLevel.toLowerCase() !== "low"
  ) {
    signalRisks.unshift({
      title: "Procurement Risk Exposure",
      severity:
        candidate.currentQuote.riskLevel
          .toLowerCase()
          .includes("high")
          ? "risk"
          : "warning",
      summary: `The current commercial evaluation classifies this supplier as ${candidate.currentQuote.riskLevel} risk.`,
    });
  }

  return signalRisks.slice(0, 4);
}

function buildSupplierRecommendation(
  candidate: ExecutiveSupplierRecommendationCandidate,
): ExecutiveSupplierRecommendation {
  const dataCoverage = calculateDataCoverage(
    candidate.signals,
  );

  const score = resolveCandidateScore(candidate);

  const dataAvailability =
    availabilityFromCoverage(dataCoverage);

  const riskLevel =
    candidate.currentQuote?.riskLevel ?? null;

  const status = getCandidateStatus({
    score,
    availability: dataAvailability,
    riskLevel,
  });

  const resolvedScore = score ?? 0;

  return {
    supplierCompanyId: candidate.supplierCompanyId,
    supplierName: candidate.supplierName,
    rank: 0,
    score,
    status,
    tone:
      dataAvailability === "available"
        ? tone(resolvedScore)
        : "neutral",
    priority:
      dataAvailability === "available"
        ? priority(resolvedScore)
        : "high",
    confidence: confidenceFromScore(
      score,
      dataCoverage,
    ),
    dataAvailability,
    dataCoverage,
    recommendation: getCandidateRecommendation(status),
    rationale: buildCandidateRationale(candidate),
    risks: buildCandidateRisks(candidate),
    signals: candidate.signals,
  };
}

function rankSupplierRecommendations(
  recommendations: ExecutiveSupplierRecommendation[],
) {
  return [...recommendations]
    .sort((firstSupplier, secondSupplier) => {
      const scoreDifference =
        (secondSupplier.score ?? -1) -
        (firstSupplier.score ?? -1);

      if (scoreDifference !== 0) {
        return scoreDifference;
      }

      return (
        secondSupplier.dataCoverage -
        firstSupplier.dataCoverage
      );
    })
    .map((supplier, index) => ({
      ...supplier,
      rank: index + 1,
    }));
}

function getResultConfidence(
  recommendedSupplier: ExecutiveSupplierRecommendation | null,
  suppliersWithSufficientData: number,
): ExecutiveConfidenceLevel {
  if (
    !recommendedSupplier ||
    suppliersWithSufficientData === 0
  ) {
    return "unavailable";
  }

  if (
    recommendedSupplier.confidence === "high" &&
    suppliersWithSufficientData >= 3
  ) {
    return "high";
  }

  if (
    recommendedSupplier.confidence !== "low" &&
    suppliersWithSufficientData >= 2
  ) {
    return "medium";
  }

  return "low";
}

export function buildExecutiveSupplierRecommendation({
  commercialEvaluationUnlocked,
  candidates,
}: ExecutiveSupplierRecommendationInput): ExecutiveSupplierRecommendationResult {
  if (!commercialEvaluationUnlocked) {
    return {
      status: "Commercial Evaluation Protected",
      availability: "not_operational",
      confidence: "unavailable",
      recommendation:
        "Supplier ranking remains protected until commercial evaluation is authorized.",
      recommendedSupplier: null,
      rankedSuppliers: [],
      evaluatedSupplierCount: 0,
      suppliersWithSufficientData: 0,
    };
  }

  if (candidates.length === 0) {
    return {
      status: "No Supplier Candidates",
      availability: "insufficient_data",
      confidence: "unavailable",
      recommendation:
        "No eligible supplier candidates are available for executive ranking.",
      recommendedSupplier: null,
      rankedSuppliers: [],
      evaluatedSupplierCount: 0,
      suppliersWithSufficientData: 0,
    };
  }

  const rankedSuppliers = rankSupplierRecommendations(
    candidates.map(buildSupplierRecommendation),
  );

  const suppliersWithSufficientData =
    rankedSuppliers.filter(
      (supplier) =>
        supplier.dataAvailability === "available",
    ).length;

  const recommendedSupplier =
    rankedSuppliers.find(
      (supplier) =>
        supplier.dataAvailability === "available",
    ) ?? null;

  const confidence = getResultConfidence(
    recommendedSupplier,
    suppliersWithSufficientData,
  );

  return {
    status: recommendedSupplier
      ? "Executive Supplier Ranking Available"
      : "Insufficient Supplier Evidence",
    availability: recommendedSupplier
      ? "available"
      : "insufficient_data",
    confidence,
    recommendation: recommendedSupplier
      ? `${recommendedSupplier.supplierName} is the leading evaluated supplier. ${recommendedSupplier.recommendation}`
      : "Strengthen supplier, commercial, and governance evidence before requesting an executive award recommendation.",
    recommendedSupplier,
    rankedSuppliers,
    evaluatedSupplierCount: rankedSuppliers.length,
    suppliersWithSufficientData,
  };
}

export function buildUnavailableSupplierRecommendation(): ExecutiveSupplierRecommendationResult {
  return {
    status: "Supplier Intelligence Not Connected",
    availability: "not_operational",
    confidence: "unavailable",
    recommendation:
      "Supplier candidate intelligence has not yet been connected to this RFQ evaluation.",
    recommendedSupplier: null,
    rankedSuppliers: [],
    evaluatedSupplierCount: 0,
    suppliersWithSufficientData: 0,
  };
}

export function buildExecutiveRecommendation({
  commercialEvaluationUnlocked,
  recommendedQuote,
  quoteCount,
  healthScore,
  documentCount,
}: ExecutiveIntelligenceInput): ExecutiveResult {
  if (!commercialEvaluationUnlocked) {
    return {
      score: 20,
      status: "Commercial Locked",
      tone: "warning",
      priority: "high",
      recommendation:
        "Commercial evaluation is still protected. Wait until commercial opening before making an award decision.",
    };
  }

  if (!recommendedQuote) {
    return {
      score: 40,
      status: "Awaiting Recommendation",
      tone: "warning",
      priority: "high",
      recommendation:
        "More supplier intelligence is required before Nexus Pavilion can recommend an award.",
    };
  }

  const score = Math.round(
    (
      recommendedQuote.awardConfidence +
      healthScore +
      Math.min(100, quoteCount * 25) +
      Math.min(100, documentCount * 20)
    ) / 4,
  );

  let status = "Executive Review";

  if (
    score >= 85 &&
    recommendedQuote.riskLevel.toLowerCase() === "low"
  ) {
    status = "Award Ready";
  } else if (score < 55) {
    status = "Needs Validation";
  }

  return {
    score,
    status,
    tone: tone(score),
    priority: priority(score),
    recommendation:
      status === "Award Ready"
        ? "Proceed with executive validation and award approval."
        : status === "Needs Validation"
          ? "Strengthen procurement readiness before proceeding."
          : "Review supplier recommendation and validate governance before award.",
  };
}