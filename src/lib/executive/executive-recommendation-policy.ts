import type {
  ExecutiveAwardRecommendationStatus,
  ExecutiveDataAvailability,
  ExecutivePriority,
  ExecutiveRecommendationPolicy,
  ExecutiveSupplierRecommendationResultStatus,
  ExecutiveSupplierRecommendationStatus,
  ExecutiveTone,
} from "@/lib/executive/executive-types";

export function resolveExecutiveScoreTone(
  score: number,
): ExecutiveTone {
  if (score >= 85) {
    return "success";
  }

  if (score >= 70) {
    return "info";
  }

  if (score >= 55) {
    return "warning";
  }

  return "risk";
}

export function resolveExecutiveScorePriority(
  score: number,
): ExecutivePriority {
  if (score >= 85) {
    return "low";
  }

  if (score >= 70) {
    return "medium";
  }

  if (score >= 55) {
    return "high";
  }

  return "critical";
}

function candidateRecommendation(
  status: ExecutiveSupplierRecommendationStatus,
) {
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

export function resolveSupplierCandidatePolicy({
  score,
  availability,
  riskLevel,
}: {
  score: number | null;
  availability: ExecutiveDataAvailability;
  riskLevel: string | null;
}): ExecutiveRecommendationPolicy {
  if (availability !== "available" || score === null) {
    return {
      status: "Insufficient Decision Evidence",
      tone: "neutral",
      priority: "high",
      recommendation: candidateRecommendation(
        "Insufficient Decision Evidence",
      ),
    };
  }

  let status: ExecutiveSupplierRecommendationStatus;

  if (
    score >= 85 &&
    riskLevel?.trim().toLowerCase() === "low"
  ) {
    status = "Preferred Award Candidate";
  } else if (score >= 70) {
    status = "Qualified Executive Review";
  } else if (score >= 55) {
    status = "Conditional Consideration";
  } else {
    status = "Not Recommended";
  }

  return {
    status,
    tone: resolveExecutiveScoreTone(score),
    priority: resolveExecutiveScorePriority(score),
    recommendation: candidateRecommendation(status),
  };
}

function supplierResultRecommendation({
  status,
  supplierName,
  supplierRecommendation,
}: {
  status: ExecutiveSupplierRecommendationResultStatus;
  supplierName?: string;
  supplierRecommendation?: string;
}) {
  if (status === "Commercial Evaluation Protected") {
    return "Supplier ranking remains protected until commercial evaluation is authorized.";
  }

  if (status === "No Supplier Candidates") {
    return "No eligible supplier candidates are available for executive ranking.";
  }

  if (status === "Executive Supplier Ranking Available") {
    return `${supplierName} is the leading evaluated supplier. ${supplierRecommendation}`;
  }

  if (status === "Insufficient Supplier Evidence") {
    return "Strengthen supplier, commercial, and governance evidence before requesting an executive award recommendation.";
  }

  return "Supplier candidate intelligence has not yet been connected to this RFQ evaluation.";
}

export function resolveSupplierRecommendationResultPolicy({
  state,
  supplierName,
  supplierRecommendation,
}: {
  state:
    | "commercial_protected"
    | "no_candidates"
    | "ranking_available"
    | "insufficient_evidence"
    | "not_connected";
  supplierName?: string;
  supplierRecommendation?: string;
}): ExecutiveRecommendationPolicy {
  const statusByState: Record<
    typeof state,
    ExecutiveSupplierRecommendationResultStatus
  > = {
    commercial_protected:
      "Commercial Evaluation Protected",
    no_candidates: "No Supplier Candidates",
    ranking_available:
      "Executive Supplier Ranking Available",
    insufficient_evidence:
      "Insufficient Supplier Evidence",
    not_connected:
      "Supplier Intelligence Not Connected",
  };

  const status = statusByState[state];

  return {
    status,
    tone:
      state === "ranking_available"
        ? "info"
        : state === "commercial_protected"
          ? "warning"
          : "neutral",
    priority:
      state === "ranking_available"
        ? "medium"
        : state === "not_connected"
          ? "low"
          : "high",
    recommendation: supplierResultRecommendation({
      status,
      supplierName,
      supplierRecommendation,
    }),
  };
}

function awardRecommendation(
  status: ExecutiveAwardRecommendationStatus,
) {
  if (status === "Commercial Locked") {
    return "Commercial evaluation is still protected. Wait until commercial opening before making an award decision.";
  }

  if (status === "Awaiting Recommendation") {
    return "More supplier intelligence is required before Nexus Pavilion can recommend an award.";
  }

  if (status === "Award Ready") {
    return "Proceed with executive validation and award approval.";
  }

  if (status === "Needs Validation") {
    return "Strengthen procurement readiness before proceeding.";
  }

  return "Review supplier recommendation and validate governance before award.";
}

export function resolveExecutiveAwardPolicy({
  commercialEvaluationUnlocked,
  hasRecommendedQuote,
  score,
  riskLevel,
}: {
  commercialEvaluationUnlocked: boolean;
  hasRecommendedQuote: boolean;
  score: number;
  riskLevel: string | null;
}): ExecutiveRecommendationPolicy {
  if (!commercialEvaluationUnlocked) {
    return {
      status: "Commercial Locked",
      tone: "warning",
      priority: "high",
      recommendation: awardRecommendation(
        "Commercial Locked",
      ),
    };
  }

  if (!hasRecommendedQuote) {
    return {
      status: "Awaiting Recommendation",
      tone: "warning",
      priority: "high",
      recommendation: awardRecommendation(
        "Awaiting Recommendation",
      ),
    };
  }

  let status: ExecutiveAwardRecommendationStatus =
    "Executive Review";

  if (
    score >= 85 &&
    riskLevel?.trim().toLowerCase() === "low"
  ) {
    status = "Award Ready";
  } else if (score < 55) {
    status = "Needs Validation";
  }

  return {
    status,
    tone: resolveExecutiveScoreTone(score),
    priority: resolveExecutiveScorePriority(score),
    recommendation: awardRecommendation(status),
  };
}