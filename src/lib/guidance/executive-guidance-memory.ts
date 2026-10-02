export const EXECUTIVE_GUIDANCE_MEMORY_STATES = [
  "unseen",
  "seen",
  "dismissed",
  "snoozed",
  "completed",
] as const;

export type ExecutiveGuidanceMemoryState =
  (typeof EXECUTIVE_GUIDANCE_MEMORY_STATES)[number];

/**
 * Caller-owned durable guidance memory. Persistence stays outside this module.
 * Time fields are opaque numeric instants supplied by the caller.
 */
export type ExecutiveGuidanceMemoryRecord = {
  readonly state: ExecutiveGuidanceMemoryState;
  readonly snoozedUntil: number | null;
};

export type ExecutiveGuidanceMemorySuppressionReason =
  | "dismissed"
  | "completed"
  | "snoozed";

export type ExecutiveGuidanceMemorySuppression = {
  readonly suppressed: boolean;
  readonly reason: ExecutiveGuidanceMemorySuppressionReason | null;
};

const unseenMemory: ExecutiveGuidanceMemoryRecord = {
  state: "unseen",
  snoozedUntil: null,
};

function memory(
  state: ExecutiveGuidanceMemoryState,
  snoozedUntil: number | null = null,
): ExecutiveGuidanceMemoryRecord {
  return { state, snoozedUntil };
}

function isFiniteInstant(value: number): boolean {
  return Number.isFinite(value);
}

/**
 * Valid snooze deadlines are finite numeric instants.
 * Missing or non-finite values must not invent indefinite suppression.
 */
export function isValidGuidanceSnoozeDeadline(
  value: number | null | undefined,
): value is number {
  return typeof value === "number" && isFiniteInstant(value);
}

export function isExecutiveGuidanceMemoryState(
  value: string,
): value is ExecutiveGuidanceMemoryState {
  return (EXECUTIVE_GUIDANCE_MEMORY_STATES as readonly string[]).includes(value);
}

export function createUnseenGuidanceMemory(): ExecutiveGuidanceMemoryRecord {
  return unseenMemory;
}

/** Records prior exposure without permanently suppressing guidance. */
export function markGuidanceSeen(
  current: ExecutiveGuidanceMemoryRecord = unseenMemory,
): ExecutiveGuidanceMemoryRecord {
  void current;
  return memory("seen");
}

/** Suppresses repeat tutorial guidance. */
export function dismissGuidance(
  current: ExecutiveGuidanceMemoryRecord = unseenMemory,
): ExecutiveGuidanceMemoryRecord {
  void current;
  return memory("dismissed");
}

/** Suppresses repeat tutorial guidance after the caller marks completion. */
export function completeGuidance(
  current: ExecutiveGuidanceMemoryRecord = unseenMemory,
): ExecutiveGuidanceMemoryRecord {
  void current;
  return memory("completed");
}

/**
 * "Remind Me Later" maps to snoozed, never dismissed.
 * Invalid deadlines fail safely into seen so suppression cannot stick forever.
 */
export function snoozeGuidance(
  current: ExecutiveGuidanceMemoryRecord = unseenMemory,
  snoozedUntil: number,
): ExecutiveGuidanceMemoryRecord {
  void current;
  if (!isValidGuidanceSnoozeDeadline(snoozedUntil)) {
    return memory("seen");
  }

  return memory("snoozed", snoozedUntil);
}

/**
 * Pure suppression decision at a caller-provided instant.
 * Does not mutate records or own a clock.
 */
export function resolveGuidanceMemorySuppression(
  record: ExecutiveGuidanceMemoryRecord,
  now: number,
): ExecutiveGuidanceMemorySuppression {
  switch (record.state) {
    case "unseen":
    case "seen":
      return { suppressed: false, reason: null };
    case "dismissed":
      return { suppressed: true, reason: "dismissed" };
    case "completed":
      return { suppressed: true, reason: "completed" };
    case "snoozed": {
      if (!isValidGuidanceSnoozeDeadline(record.snoozedUntil)) {
        return { suppressed: false, reason: null };
      }

      if (!isFiniteInstant(now) || now >= record.snoozedUntil) {
        return { suppressed: false, reason: null };
      }

      return { suppressed: true, reason: "snoozed" };
    }
    default: {
      const exhaustive: never = record.state;
      return exhaustive;
    }
  }
}

export function isGuidanceSuppressedByMemory(
  record: ExecutiveGuidanceMemoryRecord,
  now: number,
): boolean {
  return resolveGuidanceMemorySuppression(record, now).suppressed;
}
