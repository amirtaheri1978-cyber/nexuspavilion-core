import type { RfiDeadlineAwarenessStatus } from "@/lib/datetime/rfi-deadline-awareness";

export type RfiContextualGuidanceKind =
  | "deadline-approaching"
  | "owner-open-rfis"
  | "ambiguity"
  | "addendum-impact";

export type RfiContextualGuidanceInput = {
  isOwner: boolean;
  deadlineStatus: RfiDeadlineAwarenessStatus;
  openRfiCount: number;
  ambiguityDetected?: boolean;
  addendumImpactDetected?: boolean;
};

export type RfiContextualGuidance = {
  kind: RfiContextualGuidanceKind;
  title: string;
  description: string;
};

function normalizedOpenCount(openRfiCount: number) {
  return Number.isFinite(openRfiCount) && openRfiCount > 0
    ? Math.floor(openRfiCount)
    : 0;
}

/**
 * Resolves at most one truthful Private RFI guidance item.
 * Ambiguity and addendum impact require explicit caller signals — never inferred.
 */
export function resolveRfiContextualGuidance(
  input: RfiContextualGuidanceInput,
): RfiContextualGuidance | null {
  const openCount = normalizedOpenCount(input.openRfiCount);

  if (input.addendumImpactDetected === true) {
    return {
      kind: "addendum-impact",
      title: "Issue shared clarifications through Addendum",
      description:
        "Clarifications that affect all respondents belong in the formal Addendum workflow. Private RFI responses remain limited to the originating respondent company.",
    };
  }

  if (input.ambiguityDetected === true) {
    if (input.isOwner) {
      return {
        kind: "ambiguity",
        title: "Respond in the Private RFI thread",
        description:
          "Address the reported ambiguity for the originating respondent company in this Private RFI thread. Use the formal Addendum workflow when the clarification must apply to all respondents.",
      };
    }

    return {
      kind: "ambiguity",
      title: "Submit Private RFI clarification",
      description:
        "Use this Private RFI thread for company-specific clarification. The inquiry remains confidential to your company and the issuing procurement team.",
    };
  }

  if (input.deadlineStatus === "approaching") {
    if (input.isOwner) {
      return {
        kind: "deadline-approaching",
        title: "Private RFI window closing soon",
        description:
          openCount > 0
            ? "Review and respond to open Private RFIs while the inquiry window remains open. Responses remain confidential to the originating respondent company."
            : "Review Private RFIs that arrive before the inquiry window closes.",
      };
    }

    return {
      kind: "deadline-approaching",
      title: "Private RFI window closing soon",
      description:
        "Submit remaining Private RFI clarifications before the inquiry window closes. Inquiries remain confidential to your company and the issuing procurement team.",
    };
  }

  if (input.isOwner && openCount > 0 && input.deadlineStatus === "open") {
    return {
      kind: "owner-open-rfis",
      title: "Respond to open Private RFIs",
      description:
        "Review and respond to open Private RFIs before the inquiry window closes. Responses remain confidential to the originating respondent company.",
    };
  }

  return null;
}
