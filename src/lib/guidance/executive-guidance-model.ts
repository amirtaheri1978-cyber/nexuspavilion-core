export const EXECUTIVE_GUIDANCE_LEVEL_IDS = [
  "L0",
  "L1",
  "L2",
  "L3",
  "L4",
] as const;

export type ExecutiveGuidanceLevelId =
  (typeof EXECUTIVE_GUIDANCE_LEVEL_IDS)[number];

export const EXECUTIVE_GUIDANCE_INTERACTION_MODES = [
  "silent",
  "inline",
  "embedded",
  "anchored",
  "interactive",
] as const;

export type ExecutiveGuidanceInteractionMode =
  (typeof EXECUTIVE_GUIDANCE_INTERACTION_MODES)[number];

export const EXECUTIVE_GUIDANCE_INTERRUPTION_LEVELS = [
  "none",
  "non-blocking",
  "non-modal",
  "anchored",
  "user-requested",
] as const;

export type ExecutiveGuidanceInterruptionLevel =
  (typeof EXECUTIVE_GUIDANCE_INTERRUPTION_LEVELS)[number];

export type ExecutiveGuidanceLevel = {
  id: ExecutiveGuidanceLevelId;
  level: 0 | 1 | 2 | 3 | 4;
  name: string;
  purpose: string;
  interactionMode: ExecutiveGuidanceInteractionMode;
  proactiveEligible: boolean;
  interruptionLevel: ExecutiveGuidanceInterruptionLevel;
  persistenceExpectation: string;
  visibleTutorialSurface: boolean;
  modal: boolean;
  blocking: boolean;
  userRequested: boolean;
  inventsControls: false;
  performsConsequentialActions: false;
};

const EXECUTIVE_GUIDANCE_MODEL: Record<
  ExecutiveGuidanceLevelId,
  ExecutiveGuidanceLevel
> = {
  L0: {
    id: "L0",
    level: 0,
    name: "Silent Intelligence",
    purpose:
      "Offer contextual intelligence only, with no visible tutorial surface.",
    interactionMode: "silent",
    proactiveEligible: true,
    interruptionLevel: "none",
    persistenceExpectation:
      "Remains contextual and invisible. No tutorial surface is shown.",
    visibleTutorialSurface: false,
    modal: false,
    blocking: false,
    userRequested: false,
    inventsControls: false,
    performsConsequentialActions: false,
  },
  L1: {
    id: "L1",
    level: 1,
    name: "Inline Hint",
    purpose:
      "Explain the nearby content or control in a small contextual hint.",
    interactionMode: "inline",
    proactiveEligible: true,
    interruptionLevel: "non-blocking",
    persistenceExpectation:
      "Stays beside the relevant content or control while the caller keeps it visible.",
    visibleTutorialSurface: true,
    modal: false,
    blocking: false,
    userRequested: false,
    inventsControls: false,
    performsConsequentialActions: false,
  },
  L2: {
    id: "L2",
    level: 2,
    name: "Guidance Card",
    purpose:
      "Present embedded contextual guidance that the caller can review or dismiss.",
    interactionMode: "embedded",
    proactiveEligible: true,
    interruptionLevel: "non-modal",
    persistenceExpectation:
      "Stays embedded until the caller reviews or dismisses it.",
    visibleTutorialSurface: true,
    modal: false,
    blocking: false,
    userRequested: false,
    inventsControls: false,
    performsConsequentialActions: false,
  },
  L3: {
    id: "L3",
    level: 3,
    name: "Anchored Coachmark",
    purpose:
      "Attach first-time guidance to a real existing control without inventing a control or workflow.",
    interactionMode: "anchored",
    proactiveEligible: true,
    interruptionLevel: "anchored",
    persistenceExpectation:
      "Appears only on a real existing control. The caller owns when it is shown.",
    visibleTutorialSurface: true,
    modal: false,
    blocking: false,
    userRequested: false,
    inventsControls: false,
    performsConsequentialActions: false,
  },
  L4: {
    id: "L4",
    level: 4,
    name: "Interactive Nexus Guide",
    purpose:
      "Open interactive guidance only when the user requests it. Callers may supply contextual questions or destinations. It does not silently perform consequential actions.",
    interactionMode: "interactive",
    proactiveEligible: false,
    interruptionLevel: "user-requested",
    persistenceExpectation:
      "Appears only after the user requests interactive guidance.",
    visibleTutorialSurface: true,
    modal: false,
    blocking: false,
    userRequested: true,
    inventsControls: false,
    performsConsequentialActions: false,
  },
};

export function isExecutiveGuidanceLevelId(
  value: string,
): value is ExecutiveGuidanceLevelId {
  return (EXECUTIVE_GUIDANCE_LEVEL_IDS as readonly string[]).includes(value);
}

export function getExecutiveGuidanceLevel(
  id: ExecutiveGuidanceLevelId,
): ExecutiveGuidanceLevel {
  return EXECUTIVE_GUIDANCE_MODEL[id];
}

export function listExecutiveGuidanceLevels(): readonly ExecutiveGuidanceLevel[] {
  return EXECUTIVE_GUIDANCE_LEVEL_IDS.map((id) => EXECUTIVE_GUIDANCE_MODEL[id]);
}
