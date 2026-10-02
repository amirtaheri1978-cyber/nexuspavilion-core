import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

import {
  EXECUTIVE_GUIDANCE_MEMORY_STATES,
  completeGuidance,
  createUnseenGuidanceMemory,
  dismissGuidance,
  isExecutiveGuidanceMemoryState,
  isGuidanceSuppressedByMemory,
  isValidGuidanceSnoozeDeadline,
  markGuidanceSeen,
  resolveGuidanceMemorySuppression,
  snoozeGuidance,
} from "@/lib/guidance/executive-guidance-memory";

const memorySource = readFileSync(
  resolve(process.cwd(), "src/lib/guidance/executive-guidance-memory.ts"),
  "utf8",
).replace(/\r\n/g, "\n");

describe("executive guidance memory", () => {
  it("defines exactly five canonical memory states", () => {
    expect(EXECUTIVE_GUIDANCE_MEMORY_STATES).toEqual([
      "unseen",
      "seen",
      "dismissed",
      "snoozed",
      "completed",
    ]);
    expect(new Set(EXECUTIVE_GUIDANCE_MEMORY_STATES).size).toBe(5);

    for (const state of EXECUTIVE_GUIDANCE_MEMORY_STATES) {
      expect(isExecutiveGuidanceMemoryState(state)).toBe(true);
    }

    expect(isExecutiveGuidanceMemoryState("hidden")).toBe(false);
  });

  it("keeps unseen and seen open for display consideration", () => {
    const unseen = createUnseenGuidanceMemory();
    const seen = markGuidanceSeen(unseen);
    const now = 1_000;

    expect(unseen).toEqual({ state: "unseen", snoozedUntil: null });
    expect(seen).toEqual({ state: "seen", snoozedUntil: null });

    expect(resolveGuidanceMemorySuppression(unseen, now)).toEqual({
      suppressed: false,
      reason: null,
    });
    expect(resolveGuidanceMemorySuppression(seen, now)).toEqual({
      suppressed: false,
      reason: null,
    });
    expect(isGuidanceSuppressedByMemory(seen, now)).toBe(false);
  });

  it("suppresses dismissed and completed tutorial repeats", () => {
    const dismissed = dismissGuidance(createUnseenGuidanceMemory());
    const completed = completeGuidance(createUnseenGuidanceMemory());
    const now = 1_000;

    expect(dismissed).toEqual({ state: "dismissed", snoozedUntil: null });
    expect(completed).toEqual({ state: "completed", snoozedUntil: null });

    expect(resolveGuidanceMemorySuppression(dismissed, now)).toEqual({
      suppressed: true,
      reason: "dismissed",
    });
    expect(resolveGuidanceMemorySuppression(completed, now)).toEqual({
      suppressed: true,
      reason: "completed",
    });
  });

  it("maps Remind Me Later to snoozed and suppresses only while active", () => {
    const deadline = 5_000;
    const snoozed = snoozeGuidance(createUnseenGuidanceMemory(), deadline);

    expect(snoozed).toEqual({ state: "snoozed", snoozedUntil: deadline });
    expect(snoozed.state).not.toBe("dismissed");

    expect(resolveGuidanceMemorySuppression(snoozed, 4_999)).toEqual({
      suppressed: true,
      reason: "snoozed",
    });
    expect(resolveGuidanceMemorySuppression(snoozed, deadline)).toEqual({
      suppressed: false,
      reason: null,
    });
    expect(resolveGuidanceMemorySuppression(snoozed, 5_001)).toEqual({
      suppressed: false,
      reason: null,
    });
  });

  it("fails safely for invalid or missing snooze deadlines", () => {
    expect(isValidGuidanceSnoozeDeadline(null)).toBe(false);
    expect(isValidGuidanceSnoozeDeadline(undefined)).toBe(false);
    expect(isValidGuidanceSnoozeDeadline(Number.NaN)).toBe(false);
    expect(isValidGuidanceSnoozeDeadline(Number.POSITIVE_INFINITY)).toBe(false);

    expect(snoozeGuidance(createUnseenGuidanceMemory(), Number.NaN)).toEqual({
      state: "seen",
      snoozedUntil: null,
    });

    const broken = {
      state: "snoozed" as const,
      snoozedUntil: null,
    };

    expect(resolveGuidanceMemorySuppression(broken, 1_000)).toEqual({
      suppressed: false,
      reason: null,
    });
    expect(
      resolveGuidanceMemorySuppression(
        { state: "snoozed", snoozedUntil: Number.NaN },
        1_000,
      ),
    ).toEqual({
      suppressed: false,
      reason: null,
    });
  });

  it("stays pure, domain-neutral, and free of storage or hidden clocks", () => {
    const forbidden = [
      "rfq",
      "procurement",
      "quote",
      "award",
      "supplier",
      "vendor",
      "localStorage",
      "sessionStorage",
      "cookie",
      "indexedDB",
      "supabase",
      "prisma",
      "fetch(",
      "useRouter",
      "useEffect",
      "createContext",
      "setTimeout",
      "Date.now",
      "new Date",
      "from \"react\"",
      "ask nexus",
    ];

    for (const term of forbidden) {
      expect(memorySource.toLowerCase()).not.toContain(term.toLowerCase());
    }
  });
});
