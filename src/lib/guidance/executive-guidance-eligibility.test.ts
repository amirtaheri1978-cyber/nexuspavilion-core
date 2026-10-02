import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

import {
  EXECUTIVE_GUIDANCE_CONTEXTS,
  EXECUTIVE_GUIDANCE_PROACTIVE_CONTEXTS,
  isExecutiveGuidanceContext,
  isProactiveGuidanceContext,
  isUserRequestedGuidanceContext,
  resolveExecutiveGuidanceEligibility,
} from "@/lib/guidance/executive-guidance-eligibility";

const eligibilitySource = readFileSync(
  resolve(process.cwd(), "src/lib/guidance/executive-guidance-eligibility.ts"),
  "utf8",
).replace(/\r\n/g, "\n");

describe("executive guidance eligibility", () => {
  it("defines exactly five canonical contexts", () => {
    expect(EXECUTIVE_GUIDANCE_CONTEXTS).toEqual([
      "FIRST_TIME",
      "CHANGE",
      "RISK",
      "INCOMPLETE",
      "REQUESTED",
    ]);
    expect(new Set(EXECUTIVE_GUIDANCE_CONTEXTS).size).toBe(5);
    expect(EXECUTIVE_GUIDANCE_PROACTIVE_CONTEXTS).toEqual([
      "FIRST_TIME",
      "CHANGE",
      "RISK",
      "INCOMPLETE",
    ]);
  });

  it("marks proactive contexts eligible and not user-requested", () => {
    for (const context of EXECUTIVE_GUIDANCE_PROACTIVE_CONTEXTS) {
      expect(isExecutiveGuidanceContext(context)).toBe(true);
      expect(resolveExecutiveGuidanceEligibility(context)).toEqual({
        context,
        eligible: true,
        proactive: true,
        userRequested: false,
      });
      expect(isProactiveGuidanceContext(context)).toBe(true);
      expect(isUserRequestedGuidanceContext(context)).toBe(false);
    }
  });

  it("treats REQUESTED as eligible, user-requested, and not proactive", () => {
    expect(resolveExecutiveGuidanceEligibility("REQUESTED")).toEqual({
      context: "REQUESTED",
      eligible: true,
      proactive: false,
      userRequested: true,
    });
    expect(isProactiveGuidanceContext("REQUESTED")).toBe(false);
    expect(isUserRequestedGuidanceContext("REQUESTED")).toBe(true);
  });

  it("rejects unknown and empty contexts", () => {
    for (const value of ["", " ", "first_time", "L4", "UNKNOWN"]) {
      expect(isExecutiveGuidanceContext(value)).toBe(false);
      expect(resolveExecutiveGuidanceEligibility(value)).toEqual({
        context: null,
        eligible: false,
        proactive: false,
        userRequested: false,
      });
      expect(isProactiveGuidanceContext(value)).toBe(false);
      expect(isUserRequestedGuidanceContext(value)).toBe(false);
    }
  });

  it("stays domain-neutral without memory, persistence, or product ownership", () => {
    const forbidden = [
      "rfq",
      "procurement",
      "quote",
      "award",
      "supplier",
      "vendor",
      "frequency",
      "dismissed",
      "snoozed",
      "localStorage",
      "sessionStorage",
      "fetch(",
      "useRouter",
      "supabase",
      "prisma",
      "from \"react\"",
      "ask nexus",
    ];

    for (const term of forbidden) {
      expect(eligibilitySource.toLowerCase()).not.toContain(term.toLowerCase());
    }
  });
});
