import type { QuotationSubmissionRequirementKey } from "@/lib/procurement/quotation-submission-completeness";

export type QuotationReadinessGuidanceKind =
  | "addendum-acknowledgement"
  | "quotation-inputs"
  | "compliance"
  | "documents";

export type QuotationReadinessGuidanceInput = {
  missingRequirementKeys: readonly QuotationSubmissionRequirementKey[];
  hasOutstandingRequiredAcknowledgement: boolean;
  complianceIncomplete?: boolean;
  documentsIncomplete?: boolean;
};

export type QuotationReadinessGuidance = {
  kind: QuotationReadinessGuidanceKind;
  title: string;
  description: string;
};

const requirementLabels: Record<QuotationSubmissionRequirementKey, string> = {
  amount: "pricing and commercial value",
  timeline: "delivery timeline",
  proposal_note: "commercial note",
};

function uniqueRequirementKeys(
  keys: readonly QuotationSubmissionRequirementKey[],
) {
  return [...new Set(keys)];
}

function formatRequirementList(
  keys: readonly QuotationSubmissionRequirementKey[],
) {
  const labels = uniqueRequirementKeys(keys).map((key) => requirementLabels[key]);

  if (labels.length === 1) return labels[0];
  if (labels.length === 2) return `${labels[0]} and ${labels[1]}`;

  return `${labels.slice(0, -1).join(", ")}, and ${labels.at(-1)}`;
}

/** Resolves at most one truthful next action from caller-supplied readiness evidence. */
export function resolveQuotationReadinessGuidance(
  input: QuotationReadinessGuidanceInput,
): QuotationReadinessGuidance | null {
  if (input.hasOutstandingRequiredAcknowledgement) {
    return {
      kind: "addendum-acknowledgement",
      title: "Acknowledge required Addenda before submitting",
      description:
        "Return to the RFQ workspace and acknowledge every required Addendum before reconfirming or resubmitting this quotation.",
    };
  }

  const missingRequirementKeys = uniqueRequirementKeys(
    input.missingRequirementKeys,
  );

  if (missingRequirementKeys.length > 0) {
    return {
      kind: "quotation-inputs",
      title:
        missingRequirementKeys.length === 1
          ? `Complete the ${requirementLabels[missingRequirementKeys[0]]}`
          : "Complete the remaining quotation inputs",
      description: `Complete the ${formatRequirementList(
        missingRequirementKeys,
      )} before submitting the quotation.`,
    };
  }

  if (input.complianceIncomplete === true) {
    return {
      kind: "compliance",
      title: "Complete the required compliance review",
      description:
        "Review and complete the explicitly identified compliance requirements before submitting the quotation.",
    };
  }

  if (input.documentsIncomplete === true) {
    return {
      kind: "documents",
      title: "Complete the required quotation documents",
      description:
        "Review and provide the explicitly identified required documents before submitting the quotation.",
    };
  }

  return null;
}
