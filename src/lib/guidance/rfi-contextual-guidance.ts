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
      title: "Use the formal Addendum workflow for shared clarifications",
      description:
        "When a clarification affects all respondents, issue it through the formal Addendum workflow. Private RFI answers remain limited to the originating respondent company and do not replace a shared Addendum.",
    };
  }

  if (input.ambiguityDetected === true) {
    if (input.isOwner) {
      return {
        kind: "ambiguity",
        title: "Clarify through the private RFI thread",
        description:
          "Respond to the reported ambiguity in this private RFI thread for the originating respondent company. If the clarification must apply to every respondent, use the formal Addendum workflow instead.",
      };
    }

    return {
      kind: "ambiguity",
      title: "Ask for private clarification",
      description:
        "Use this private RFI thread for company-specific clarification. Your inquiry remains confidential to your company and the issuing procurement team, and is not shared with competing respondents.",
    };
  }

  if (input.deadlineStatus === "approaching") {
    if (input.isOwner) {
      return {
        kind: "deadline-approaching",
        title: "Private RFI window is nearing close",
        description:
          openCount > 0
            ? "Review and respond to open private RFIs while the inquiry window remains open. Private answers stay with the originating respondent company."
            : "The private inquiry window is nearing close. Be ready to review any private RFIs before it ends.",
      };
    }

    return {
      kind: "deadline-approaching",
      title: "Private RFI window is nearing close",
      description:
        "Submit any remaining private clarification inquiries before the inquiry window closes. Your inquiries remain confidential to your company and the issuing procurement team.",
    };
  }

  if (input.isOwner && openCount > 0 && input.deadlineStatus === "open") {
    return {
      kind: "owner-open-rfis",
      title: "Open private RFIs need a response",
      description:
        "Review and respond to open private RFIs before the inquiry window closes. Responses remain confidential to the originating respondent company.",
    };
  }

  return null;
}
