export type ActivityAttentionGuidanceKind =
  | "addendum_action_required"
  | "rfi"
  | "rfi_response"
  | "quote";

export type ActivityAttentionGuidanceInput = {
  type: string | null;
  sourceHref: string | null;
};

export type ActivityAttentionGuidance = {
  kind: ActivityAttentionGuidanceKind;
  description: string;
  actionLabel: string | null;
  sourceHref: string | null;
};

function authorizedSourceHref(sourceHref: string | null) {
  if (typeof sourceHref !== "string") return null;

  const trimmed = sourceHref.trim();
  return trimmed.length > 0 ? trimmed : null;
}

/**
 * Concise Needs Attention rationale from explicit event type + authorized href.
 * Does not inspect notification copy fields or invent RFQ routes.
 */
export function resolveActivityAttentionGuidance(
  input: ActivityAttentionGuidanceInput,
): ActivityAttentionGuidance | null {
  const type = String(input.type || "");
  const sourceHref = authorizedSourceHref(input.sourceHref);

  switch (type) {
    case "addendum_action_required":
      return {
        kind: "addendum_action_required",
        description:
          "Required Addendum acknowledgement may affect quotation readiness and governance until it is completed in the RFQ workspace.",
        actionLabel: sourceHref ? "Open RFQ Workspace" : null,
        sourceHref,
      };
    case "rfi":
      return {
        kind: "rfi",
        description:
          "A private RFI needs issuer review and response in its source RFQ workflow. Private correspondence remains limited to the originating respondent company.",
        actionLabel: sourceHref ? "Open RFQ Workspace" : null,
        sourceHref,
      };
    case "rfi_response":
      return {
        kind: "rfi_response",
        description:
          "An RFI response has changed the clarification state. Review the response in its source RFQ workflow for the originating respondent company.",
        actionLabel: sourceHref ? "Open RFQ Workspace" : null,
        sourceHref,
      };
    case "quote":
      return {
        kind: "quote",
        description:
          "New quotation activity requires review in the current RFQ workflow. Commercial evaluation evidence remains governed by that RFQ workspace.",
        actionLabel: sourceHref ? "Open RFQ Workspace" : null,
        sourceHref,
      };
    default:
      return null;
  }
}
