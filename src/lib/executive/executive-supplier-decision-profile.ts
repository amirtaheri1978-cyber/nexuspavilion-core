import type {
  ExecutiveEvidenceDomain,
  ExecutiveSupplierDecisionProfile,
  ExecutiveSupplierRecommendationCandidate,
  ExecutiveSupplierSignal,
  ExecutiveSupplierSignalKey,
} from "@/lib/executive/executive-types";

const SIGNAL_LABELS: Record<
  ExecutiveSupplierSignalKey,
  string
> = {
  category_alignment: "Category Alignment",
  geographic_alignment: "Geographic Alignment",
  avl_governance: "AVL Governance",
  commercial_competitiveness:
    "Commercial Competitiveness",
  delivery_reliability: "Delivery Reliability",
  quality_performance: "Quality Performance",
  historical_award_performance:
    "Historical Award Performance",
  response_reliability: "Response Reliability",
  compliance_readiness: "Compliance Readiness",
  capacity_confidence: "Capacity Confidence",
  procurement_risk: "Procurement Risk",
};

function buildStrengths(
  rationale: string[],
  signals: ExecutiveSupplierSignal[],
) {
  const signalStrengths = [...signals]
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
    .map((signal) => signal.summary);

  return [...new Set([...signalStrengths, ...rationale])].slice(
    0,
    5,
  );
}

function buildEvidenceGaps({
  missingSignalKeys,
  domains,
}: {
  missingSignalKeys: ExecutiveSupplierSignalKey[];
  domains: ExecutiveEvidenceDomain[];
}) {
  const signalGaps = missingSignalKeys.map(
    (signalKey) =>
      `${SIGNAL_LABELS[signalKey]} evidence is unavailable.`,
  );

  const domainGaps = domains
    .filter((domain) => domain.readiness !== "ready")
    .map((domain) =>
      domain.readiness === "missing"
        ? `${domain.label} evidence is missing.`
        : `${domain.label} evidence is incomplete.`,
    );

  return [...new Set([...signalGaps, ...domainGaps])].slice(
    0,
    6,
  );
}

function buildNextActions({
  recommendation,
  evidenceGaps,
  riskCount,
  decisionReadiness,
}: {
  recommendation: string;
  evidenceGaps: string[];
  riskCount: number;
  decisionReadiness:
    | "ready"
    | "review_required"
    | "insufficient_evidence";
}) {
  const actions: string[] = [recommendation];

  if (evidenceGaps.length > 0) {
    actions.push(
      "Close the highest-priority evidence gaps before final award authorization.",
    );
  }

  if (riskCount > 0) {
    actions.push(
      "Document risk ownership, mitigation, and approval conditions.",
    );
  }

  if (decisionReadiness === "ready") {
    actions.push(
      "Validate final commercial and governance conditions through the authorized approval workflow.",
    );
  } else if (decisionReadiness === "review_required") {
    actions.push(
      "Complete executive review of the remaining governance and risk conditions.",
    );
  } else {
    actions.push(
      "Do not form an award decision until foundational evidence is sufficient.",
    );
  }

  return [...new Set(actions)].slice(0, 4);
}

function buildExecutiveNarrative({
  supplierName,
  rank,
  score,
  status,
  decisionReadiness,
  confidence,
  confidenceScore,
  evidenceCoverage,
  riskCount,
}: {
  supplierName: string;
  rank: number;
  score: number | null;
  status: string;
  decisionReadiness: string;
  confidence: string;
  confidenceScore: number | null;
  evidenceCoverage: number;
  riskCount: number;
}) {
  const scoreText =
    score === null
      ? "has no canonical commercial score"
      : `holds a canonical score of ${score}/100`;

  const confidenceText =
    confidenceScore === null
      ? `${confidence} decision confidence`
      : `${confidence} decision confidence (${confidenceScore}/100)`;

  return `${supplierName} is ranked #${rank}, ${scoreText}, and is classified as ${status}. Evidence readiness is ${decisionReadiness.replaceAll("_", " ")}, with ${evidenceCoverage}% canonical evidence coverage and ${confidenceText}. ${riskCount === 0 ? "No material supplier risks are currently surfaced." : `${riskCount} material supplier risk${riskCount === 1 ? "" : "s"} require executive attention.`}`;
}

export function buildExecutiveSupplierDecisionProfile({
  candidate,
  rank,
  score,
  status,
  tone,
  priority,
  dataAvailability,
  evidenceAssessment,
  confidenceAssessment,
  recommendation,
  rationale,
  risks,
}: {
  candidate: ExecutiveSupplierRecommendationCandidate;
  rank: number;
  score: number | null;
  status:
    | "Preferred Award Candidate"
    | "Qualified Executive Review"
    | "Conditional Consideration"
    | "Not Recommended"
    | "Insufficient Decision Evidence";
  tone: "success" | "info" | "warning" | "risk" | "neutral";
  priority: "critical" | "high" | "medium" | "low";
  dataAvailability:
    | "available"
    | "insufficient_data"
    | "not_operational";
  evidenceAssessment: {
    coverage: number;
    decisionReadiness:
      | "ready"
      | "review_required"
      | "insufficient_evidence";
    domains: ExecutiveEvidenceDomain[];
    missingSignalKeys: ExecutiveSupplierSignalKey[];
  };
  confidenceAssessment: {
    score: number | null;
    level: "high" | "medium" | "low" | "unavailable";
  };
  recommendation: string;
  rationale: string[];
  risks: ExecutiveSupplierDecisionProfile["risks"];
}): ExecutiveSupplierDecisionProfile {
  const strengths = buildStrengths(
    rationale,
    candidate.signals,
  );

  const evidenceGaps = buildEvidenceGaps({
    missingSignalKeys:
      evidenceAssessment.missingSignalKeys,
    domains: evidenceAssessment.domains,
  });

  const nextActions = buildNextActions({
    recommendation,
    evidenceGaps,
    riskCount: risks.length,
    decisionReadiness:
      evidenceAssessment.decisionReadiness,
  });

  return {
    identity: {
      supplierCompanyId: candidate.supplierCompanyId,
      supplierName: candidate.supplierName,
      category: candidate.category,
      location: candidate.location,
      networkRole: candidate.networkRole,
      avlStatus: candidate.avlStatus,
      avlRating: candidate.avlRating,
    },
    commercialPosition: {
      score,
      currentQuoteAvailable:
        candidate.currentQuote !== null,
      quotedAmount:
        candidate.currentQuote?.amountNumber ?? null,
      awardConfidence:
        candidate.currentQuote?.awardConfidence ?? null,
      riskLevel:
        candidate.currentQuote?.riskLevel ?? null,
      submittedQuoteCount:
        candidate.submittedQuoteCount,
      awardedQuoteCount: candidate.awardedQuoteCount,
      unsuccessfulQuoteCount:
        candidate.unsuccessfulQuoteCount,
      totalQuotedValue: candidate.totalQuotedValue,
      totalAwardedValue: candidate.totalAwardedValue,
    },
    decision: {
      rank,
      status,
      tone,
      priority,
      dataAvailability,
      decisionReadiness:
        evidenceAssessment.decisionReadiness,
      confidence: confidenceAssessment.level,
      confidenceScore: confidenceAssessment.score,
      evidenceCoverage: evidenceAssessment.coverage,
      recommendation,
    },
    strengths,
    risks,
    evidenceGaps,
    nextActions,
    executiveNarrative: buildExecutiveNarrative({
      supplierName: candidate.supplierName,
      rank,
      score,
      status,
      decisionReadiness:
        evidenceAssessment.decisionReadiness,
      confidence: confidenceAssessment.level,
      confidenceScore: confidenceAssessment.score,
      evidenceCoverage: evidenceAssessment.coverage,
      riskCount: risks.length,
    }),
  };
}