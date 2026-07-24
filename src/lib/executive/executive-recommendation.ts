import {
  EXECUTIVE_EVIDENCE_THRESHOLDS,
} from "@/lib/executive/executive-config";
import {
  buildDecisionConfidenceAssessment,
  buildSupplierConfidenceAssessment,
  buildUnavailableConfidenceAssessment,
} from "@/lib/executive/executive-confidence";
import { buildExecutiveEvidenceAssessment } from "@/lib/executive/executive-evidence";
import { buildExecutiveSupplierDecisionProfile } from "@/lib/executive/executive-supplier-decision-profile";
import {
  resolveExecutiveAwardPolicy,
  resolveSupplierCandidatePolicy,
  resolveSupplierRecommendationResultPolicy,
} from "@/lib/executive/executive-recommendation-policy";

import type {
  ExecutiveDataAvailability,
  ExecutiveIntelligenceInput,
  ExecutiveResult,
  ExecutiveRisk,
  ExecutiveSupplierRecommendation,
  ExecutiveSupplierRecommendationCandidate,
  ExecutiveSupplierRecommendationInput,
  ExecutiveSupplierRecommendationResult,
  ExecutiveSupplierSignal,
} from "@/lib/executive/executive-types";

function availabilityFromCoverage(
  dataCoverage: number,
): ExecutiveDataAvailability {
  return dataCoverage >=
    EXECUTIVE_EVIDENCE_THRESHOLDS.minimumSufficientCoverage
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

  const evidenceAssessment =
    buildExecutiveEvidenceAssessment({
      signals: candidate.signals,
      hasCurrentQuote: candidate.currentQuote !== null,
      riskLevel:
        candidate.currentQuote?.riskLevel ?? null,
    });

  const score = resolveCandidateScore(candidate);

  const dataAvailability =
    availabilityFromCoverage(dataCoverage);

  const riskLevel =
    candidate.currentQuote?.riskLevel ?? null;

  const policy = resolveSupplierCandidatePolicy({
    score,
    availability: dataAvailability,
    riskLevel,
  });

  const confidenceAssessment =
    buildSupplierConfidenceAssessment({
      evidenceAssessment,
      signals: candidate.signals,
      submittedQuoteCount:
        candidate.submittedQuoteCount,
      awardedQuoteCount:
        candidate.awardedQuoteCount,
      riskLevel,
    });

  const rationale = buildCandidateRationale(candidate);
  const risks = buildCandidateRisks(candidate);

  const decisionProfile =
    buildExecutiveSupplierDecisionProfile({
      candidate,
      rank: 0,
      score,
      status: policy.status,
      tone: policy.tone,
      priority: policy.priority,
      dataAvailability,
      evidenceAssessment,
      confidenceAssessment,
      recommendation: policy.recommendation,
      rationale,
      risks,
    });

  return {
    supplierCompanyId: candidate.supplierCompanyId,
    supplierName: candidate.supplierName,
    rank: 0,
    score,
    status: policy.status,
    tone: policy.tone,
    priority: policy.priority,
    confidence: confidenceAssessment.level,
    confidenceAssessment,
    dataAvailability,
    dataCoverage,
    evidenceAssessment,
    decisionProfile,
    recommendation: policy.recommendation,
    rationale,
    risks,
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
    .map((supplier, index) => {
      const rank = index + 1;

      return {
        ...supplier,
        rank,
        decisionProfile: {
          ...supplier.decisionProfile,
          decision: {
            ...supplier.decisionProfile.decision,
            rank,
          },
          executiveNarrative:
            supplier.decisionProfile.executiveNarrative.replace(
              /ranked #\d+/,
              `ranked #${rank}`,
            ),
        },
      };
    });
}

export function buildExecutiveSupplierRecommendation({
  commercialEvaluationUnlocked,
  candidates,
}: ExecutiveSupplierRecommendationInput): ExecutiveSupplierRecommendationResult {
  if (!commercialEvaluationUnlocked) {
    const policy =
      resolveSupplierRecommendationResultPolicy({
        state: "commercial_protected",
      });

    return {
      status: policy.status,
      availability: "not_operational",
      confidence: "unavailable",
      confidenceAssessment:
        buildUnavailableConfidenceAssessment(
          "Decision confidence is unavailable while commercial evaluation remains protected.",
        ),
      recommendation: policy.recommendation,
      recommendedSupplier: null,
      rankedSuppliers: [],
      evaluatedSupplierCount: 0,
      suppliersWithSufficientData: 0,
    };
  }

  if (candidates.length === 0) {
    const policy =
      resolveSupplierRecommendationResultPolicy({
        state: "no_candidates",
      });

    return {
      status: policy.status,
      availability: "insufficient_data",
      confidence: "unavailable",
      confidenceAssessment:
        buildUnavailableConfidenceAssessment(
          "Decision confidence is unavailable because no eligible supplier candidates are available.",
        ),
      recommendation: policy.recommendation,
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

  const confidenceAssessment =
    buildDecisionConfidenceAssessment({
      recommendedSupplier,
      rankedSuppliers,
      suppliersWithSufficientData,
    });

  const policy =
    resolveSupplierRecommendationResultPolicy({
      state: recommendedSupplier
        ? "ranking_available"
        : "insufficient_evidence",
      supplierName:
        recommendedSupplier?.supplierName,
      supplierRecommendation:
        recommendedSupplier?.recommendation,
    });

  return {
    status: policy.status,
    availability: recommendedSupplier
      ? "available"
      : "insufficient_data",
    confidence: confidenceAssessment.level,
    confidenceAssessment,
    recommendation: policy.recommendation,
    recommendedSupplier,
    rankedSuppliers,
    evaluatedSupplierCount: rankedSuppliers.length,
    suppliersWithSufficientData,
  };
}

export function buildUnavailableSupplierRecommendation(): ExecutiveSupplierRecommendationResult {
  const policy =
    resolveSupplierRecommendationResultPolicy({
      state: "not_connected",
    });

  return {
    status: policy.status,
    availability: "not_operational",
    confidence: "unavailable",
    confidenceAssessment:
      buildUnavailableConfidenceAssessment(
        "Decision confidence is unavailable because supplier candidate intelligence is not connected.",
      ),
    recommendation: policy.recommendation,
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
    const policy = resolveExecutiveAwardPolicy({
      commercialEvaluationUnlocked: false,
      hasRecommendedQuote: false,
      score: 20,
      riskLevel: null,
    });

    return {
      score: 20,
      status: policy.status,
      tone: policy.tone,
      priority: policy.priority,
      recommendation: policy.recommendation,
    };
  }

  if (!recommendedQuote) {
    const policy = resolveExecutiveAwardPolicy({
      commercialEvaluationUnlocked: true,
      hasRecommendedQuote: false,
      score: 40,
      riskLevel: null,
    });

    return {
      score: 40,
      status: policy.status,
      tone: policy.tone,
      priority: policy.priority,
      recommendation: policy.recommendation,
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

  const policy = resolveExecutiveAwardPolicy({
    commercialEvaluationUnlocked: true,
    hasRecommendedQuote: true,
    score,
    riskLevel: recommendedQuote.riskLevel,
  });

  return {
    score,
    status: policy.status,
    tone: policy.tone,
    priority: policy.priority,
    recommendation: policy.recommendation,
  };
}