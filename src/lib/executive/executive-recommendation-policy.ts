import type {
  ExecutiveAwardPolicy,
  ExecutiveAwardRecommendationStatus,
  ExecutiveDataAvailability,
  ExecutivePriority,
  ExecutiveSupplierCandidatePolicy,
  ExecutiveSupplierRecommendationResultPolicy,
  ExecutiveSupplierRecommendationResultStatus,
  ExecutiveSupplierRecommendationStatus,
  ExecutiveTone,
} from "@/lib/executive/executive-types";

type SupplierRecommendationResultState =
  | "commercial_protected"
  | "no_candidates"
  | "ranking_available"
  | "insufficient_evidence"
  | "not_connected";

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

function resolveSupplierCandidateRecommendation(
  status: ExecutiveSupplierRecommendationStatus,
): string {
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
}): ExecutiveSupplierCandidatePolicy {
  if (availability !== "available" || score === null) {
    const status: ExecutiveSupplierRecommendationStatus =
      "Insufficient Decision Evidence";

    return {
      status,
      tone: "neutral",
      priority: "high",
      recommendation:
        resolveSupplierCandidateRecommendation(status),
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
    recommendation:
      resolveSupplierCandidateRecommendation(status),
  };
}

function resolveSupplierResultRecommendation({
  status,
  supplierName,
  supplierRecommendation,
}: {
  status: ExecutiveSupplierRecommendationResultStatus;
  supplierName?: string;
  supplierRecommendation?: string;
}): string {
  if (status === "Commercial Evaluation Protected") {
    return "Supplier ranking remains protected until commercial evaluation is authorized.";
  }

  if (status === "No Supplier Candidates") {
    return "No eligible supplier candidates are available for executive ranking.";
  }

  if (status === "Executive Supplier Ranking Available") {
    const resolvedSupplierName =
      supplierName?.trim() || "The leading supplier";

    const resolvedSupplierRecommendation =
      supplierRecommendation?.trim() ||
      "Proceed with executive validation before award authorization.";

    return `${resolvedSupplierName} is the leading evaluated supplier. ${resolvedSupplierRecommendation}`;
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
  state: SupplierRecommendationResultState;
  supplierName?: string;
  supplierRecommendation?: string;
}): ExecutiveSupplierRecommendationResultPolicy {
  let status: ExecutiveSupplierRecommendationResultStatus;
  let tone: ExecutiveTone;
  let priority: ExecutivePriority;

  if (state === "commercial_protected") {
    status = "Commercial Evaluation Protected";
    tone = "warning";
    priority = "high";
  } else if (state === "no_candidates") {
    status = "No Supplier Candidates";
    tone = "neutral";
    priority = "high";
  } else if (state === "ranking_available") {
    status = "Executive Supplier Ranking Available";
    tone = "info";
    priority = "medium";
  } else if (state === "insufficient_evidence") {
    status = "Insufficient Supplier Evidence";
    tone = "neutral";
    priority = "high";
  } else {
    status = "Supplier Intelligence Not Connected";
    tone = "neutral";
    priority = "low";
  }

  return {
    status,
    tone,
    priority,
    recommendation: resolveSupplierResultRecommendation({
      status,
      supplierName,
      supplierRecommendation,
    }),
  };
}

function resolveExecutiveAwardRecommendation(
  status: ExecutiveAwardRecommendationStatus,
): string {
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
}): ExecutiveAwardPolicy {
  if (!commercialEvaluationUnlocked) {
    const status: ExecutiveAwardRecommendationStatus =
      "Commercial Locked";

    return {
      status,
      tone: "warning",
      priority: "high",
      recommendation:
        resolveExecutiveAwardRecommendation(status),
    };
  }

  if (!hasRecommendedQuote) {
    const status: ExecutiveAwardRecommendationStatus =
      "Awaiting Recommendation";

    return {
      status,
      tone: "warning",
      priority: "high",
      recommendation:
        resolveExecutiveAwardRecommendation(status),
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
    recommendation:
      resolveExecutiveAwardRecommendation(status),
  };
}