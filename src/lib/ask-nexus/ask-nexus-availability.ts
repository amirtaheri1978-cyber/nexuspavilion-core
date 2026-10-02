/**
 * Ask Nexus availability — safe fallback when evidence or confidence is limited.
 *
 * Projects caller-supplied availability and confidence only. Never computes
 * confidence levels, never discovers evidence, and never fabricates certainty.
 */

export type AskNexusAvailabilityState =
  | "available"
  | "limited"
  | "unavailable";

export type AskNexusConfidenceState =
  | "high"
  | "medium"
  | "low"
  | "unavailable";

export type AskNexusAvailabilityInput = {
  availability: AskNexusAvailabilityState;
  confidence?: AskNexusConfidenceState | null;
  summary?: string | null;
  limitations?: readonly string[];
};

export type AskNexusAvailabilityFallback =
  | null
  | "limited_evidence"
  | "low_confidence"
  | "unavailable";

export type AskNexusAvailabilityResult = {
  availability: AskNexusAvailabilityState;
  confidence: AskNexusConfidenceState | null;
  canStateDefinitively: boolean;
  requiresCaveat: boolean;
  summary: string;
  limitations: readonly string[];
  fallback: AskNexusAvailabilityFallback;
  nonBinding: true;
};

const SUMMARY_AVAILABLE_HIGH =
  "Available evidence supports this explanation.";
const SUMMARY_AVAILABLE_MEDIUM =
  "Available evidence supports a qualified explanation, but material uncertainty remains.";
const SUMMARY_AVAILABLE_LOW =
  "Available evidence supports only a low-confidence explanation.";
const SUMMARY_LIMITED =
  "Available evidence is incomplete, so this explanation should be treated as limited.";
const SUMMARY_UNAVAILABLE =
  "Sufficient evidence is not available to support a reliable explanation.";

function normalizedText(value: string | null | undefined): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function normalizeAvailability(value: unknown): AskNexusAvailabilityState {
  switch (value) {
    case "available":
      return "available";
    case "limited":
      return "limited";
    case "unavailable":
      return "unavailable";
    default:
      return "unavailable";
  }
}

function normalizeConfidence(value: unknown): AskNexusConfidenceState | null {
  if (value === null || value === undefined) {
    return null;
  }

  switch (value) {
    case "high":
      return "high";
    case "medium":
      return "medium";
    case "low":
      return "low";
    case "unavailable":
      return "unavailable";
    default:
      return null;
  }
}

function normalizeLimitations(
  limitations: readonly string[] | undefined,
): string[] {
  if (!limitations) return [];

  const seen = new Set<string>();
  const normalized: string[] = [];

  for (const limitation of limitations) {
    const text = normalizedText(limitation);
    if (!text) continue;
    if (seen.has(text)) continue;
    seen.add(text);
    normalized.push(text);
  }

  return normalized;
}

function resolveFallback(
  availability: AskNexusAvailabilityState,
  confidence: AskNexusConfidenceState | null,
): {
  canStateDefinitively: boolean;
  requiresCaveat: boolean;
  fallback: AskNexusAvailabilityFallback;
} {
  switch (availability) {
    case "unavailable":
      return {
        canStateDefinitively: false,
        requiresCaveat: true,
        fallback: "unavailable",
      };
    case "limited":
      return {
        canStateDefinitively: false,
        requiresCaveat: true,
        fallback: "limited_evidence",
      };
    case "available": {
      switch (confidence) {
        case "high":
          return {
            canStateDefinitively: true,
            requiresCaveat: false,
            fallback: null,
          };
        case "medium":
          return {
            canStateDefinitively: false,
            requiresCaveat: true,
            fallback: "limited_evidence",
          };
        case "low":
          return {
            canStateDefinitively: false,
            requiresCaveat: true,
            fallback: "low_confidence",
          };
        case "unavailable":
        case null:
          return {
            canStateDefinitively: false,
            requiresCaveat: true,
            fallback: "unavailable",
          };
        default: {
          const exhaustive: never = confidence;
          return exhaustive;
        }
      }
    }
    default: {
      const exhaustive: never = availability;
      return exhaustive;
    }
  }
}

function defaultSummary(
  availability: AskNexusAvailabilityState,
  confidence: AskNexusConfidenceState | null,
): string {
  switch (availability) {
    case "unavailable":
      return SUMMARY_UNAVAILABLE;
    case "limited":
      return SUMMARY_LIMITED;
    case "available": {
      switch (confidence) {
        case "high":
          return SUMMARY_AVAILABLE_HIGH;
        case "medium":
          return SUMMARY_AVAILABLE_MEDIUM;
        case "low":
          return SUMMARY_AVAILABLE_LOW;
        case "unavailable":
        case null:
          return SUMMARY_UNAVAILABLE;
        default: {
          const exhaustive: never = confidence;
          return exhaustive;
        }
      }
    }
    default: {
      const exhaustive: never = availability;
      return exhaustive;
    }
  }
}

/**
 * Resolve safe Ask Nexus availability / confidence fallback posture.
 * Never invents evidence or definitive certainty.
 */
export function resolveAskNexusAvailability(
  input: AskNexusAvailabilityInput,
): AskNexusAvailabilityResult {
  const availability = normalizeAvailability(input.availability);
  const confidence = normalizeConfidence(input.confidence);
  const limitations = normalizeLimitations(input.limitations);
  const posture = resolveFallback(availability, confidence);
  const callerSummary = normalizedText(input.summary ?? null);

  return {
    availability,
    confidence,
    canStateDefinitively: posture.canStateDefinitively,
    requiresCaveat: posture.requiresCaveat,
    summary: callerSummary ?? defaultSummary(availability, confidence),
    limitations,
    fallback: posture.fallback,
    nonBinding: true,
  };
}
