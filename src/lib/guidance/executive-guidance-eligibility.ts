export const EXECUTIVE_GUIDANCE_CONTEXTS = [
  "FIRST_TIME",
  "CHANGE",
  "RISK",
  "INCOMPLETE",
  "REQUESTED",
] as const;

export type ExecutiveGuidanceContext =
  (typeof EXECUTIVE_GUIDANCE_CONTEXTS)[number];

export const EXECUTIVE_GUIDANCE_PROACTIVE_CONTEXTS = [
  "FIRST_TIME",
  "CHANGE",
  "RISK",
  "INCOMPLETE",
] as const satisfies readonly ExecutiveGuidanceContext[];

export type ExecutiveGuidanceEligibility = {
  context: ExecutiveGuidanceContext | null;
  eligible: boolean;
  proactive: boolean;
  userRequested: boolean;
};

type GuidanceClassification = {
  proactive: boolean;
  userRequested: boolean;
};

function classifyGuidanceContext(
  context: ExecutiveGuidanceContext,
): GuidanceClassification {
  switch (context) {
    case "FIRST_TIME":
    case "CHANGE":
    case "RISK":
    case "INCOMPLETE":
      return { proactive: true, userRequested: false };
    case "REQUESTED":
      return { proactive: false, userRequested: true };
    default: {
      const exhaustive: never = context;
      return exhaustive;
    }
  }
}

const ineligibleGuidance: ExecutiveGuidanceEligibility = {
  context: null,
  eligible: false,
  proactive: false,
  userRequested: false,
};

export function isExecutiveGuidanceContext(
  value: string,
): value is ExecutiveGuidanceContext {
  return (EXECUTIVE_GUIDANCE_CONTEXTS as readonly string[]).includes(value);
}

export function resolveExecutiveGuidanceEligibility(
  value: string,
): ExecutiveGuidanceEligibility {
  if (!isExecutiveGuidanceContext(value)) return ineligibleGuidance;

  const classification = classifyGuidanceContext(value);

  return {
    context: value,
    eligible: true,
    proactive: classification.proactive,
    userRequested: classification.userRequested,
  };
}

export function isProactiveGuidanceContext(value: string) {
  return resolveExecutiveGuidanceEligibility(value).proactive;
}

export function isUserRequestedGuidanceContext(value: string) {
  return resolveExecutiveGuidanceEligibility(value).userRequested;
}
