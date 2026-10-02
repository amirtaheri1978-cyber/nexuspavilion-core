import { resolveExecutiveGuidanceEligibility } from "@/lib/guidance/executive-guidance-eligibility";
import {
  getExecutiveGuidanceLevel,
  isExecutiveGuidanceLevelId,
} from "@/lib/guidance/executive-guidance-model";

/** One proactive guidance item may be shown for a page load. */
export const EXECUTIVE_GUIDANCE_PROACTIVE_PAGE_QUOTA = 1;

export type ExecutiveGuidanceFrequencyInput = {
  context: string;
  proactiveShownCount: number;
  dismissed?: boolean;
  completed?: boolean;
  levelId?: string;
};

export type ExecutiveGuidanceFrequencyBlockReason =
  | "ineligible"
  | "proactive-quota"
  | "dismissed-coachmark"
  | "completed-coachmark";

export type ExecutiveGuidanceFrequencyDecision = {
  showable: boolean;
  consumesProactiveQuota: boolean;
  blockReason: ExecutiveGuidanceFrequencyBlockReason | null;
};

function blocked(
  blockReason: ExecutiveGuidanceFrequencyBlockReason,
): ExecutiveGuidanceFrequencyDecision {
  return {
    showable: false,
    consumesProactiveQuota: false,
    blockReason,
  };
}

function shown(
  consumesProactiveQuota: boolean,
): ExecutiveGuidanceFrequencyDecision {
  return {
    showable: true,
    consumesProactiveQuota,
    blockReason: null,
  };
}

function isAnchoredCoachmark(levelId: string | undefined): boolean {
  if (!levelId || !isExecutiveGuidanceLevelId(levelId)) return false;
  return getExecutiveGuidanceLevel(levelId).interactionMode === "anchored";
}

function proactiveQuotaUsed(proactiveShownCount: number): boolean {
  return (
    !Number.isFinite(proactiveShownCount) ||
    proactiveShownCount >= EXECUTIVE_GUIDANCE_PROACTIVE_PAGE_QUOTA
  );
}

/**
 * Pure page-load frequency decision. Caller state is the only input.
 * Showing the item, and any later memory of that choice, stays with the caller.
 */
export function resolveExecutiveGuidanceFrequency(
  input: ExecutiveGuidanceFrequencyInput,
): ExecutiveGuidanceFrequencyDecision {
  const eligibility = resolveExecutiveGuidanceEligibility(input.context);

  if (!eligibility.eligible) return blocked("ineligible");

  if (isAnchoredCoachmark(input.levelId)) {
    if (input.dismissed === true) return blocked("dismissed-coachmark");
    if (input.completed === true) return blocked("completed-coachmark");
  }

  if (eligibility.proactive) {
    if (proactiveQuotaUsed(input.proactiveShownCount)) {
      return blocked("proactive-quota");
    }
    return shown(true);
  }

  if (eligibility.userRequested) return shown(false);

  return blocked("ineligible");
}
