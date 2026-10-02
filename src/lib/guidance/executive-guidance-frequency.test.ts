import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

import { EXECUTIVE_GUIDANCE_PROACTIVE_CONTEXTS } from "@/lib/guidance/executive-guidance-eligibility";
import {
  EXECUTIVE_GUIDANCE_PROACTIVE_PAGE_QUOTA,
  resolveExecutiveGuidanceFrequency,
  type ExecutiveGuidanceFrequencyInput,
} from "@/lib/guidance/executive-guidance-frequency";

const frequencySource = readFileSync(
  resolve(process.cwd(), "src/lib/guidance/executive-guidance-frequency.ts"),
  "utf8",
).replace(/\r\n/g, "\n");

function decision(input: ExecutiveGuidanceFrequencyInput) {
  return resolveExecutiveGuidanceFrequency(input);
}

describe("executive guidance frequency", () => {
  it("allows the first proactive item on a page load and marks it as consuming quota", () => {
    expect(EXECUTIVE_GUIDANCE_PROACTIVE_PAGE_QUOTA).toBe(1);

    for (const context of EXECUTIVE_GUIDANCE_PROACTIVE_CONTEXTS) {
      expect(
        decision({
          context,
          proactiveShownCount: 0,
        }),
      ).toEqual({
        showable: true,
        consumesProactiveQuota: true,
        blockReason: null,
      });
    }
  });

  it("blocks a second proactive item without consuming another quota unit", () => {
    for (const context of EXECUTIVE_GUIDANCE_PROACTIVE_CONTEXTS) {
      expect(
        decision({
          context,
          proactiveShownCount: EXECUTIVE_GUIDANCE_PROACTIVE_PAGE_QUOTA,
        }),
      ).toEqual({
        showable: false,
        consumesProactiveQuota: false,
        blockReason: "proactive-quota",
      });
    }
  });

  it("allows REQUESTED independently and does not consume proactive quota", () => {
    for (const proactiveShownCount of [0, 1, 4]) {
      expect(
        decision({
          context: "REQUESTED",
          proactiveShownCount,
          levelId: "L4",
        }),
      ).toEqual({
        showable: true,
        consumesProactiveQuota: false,
        blockReason: null,
      });
    }
  });

  it("blocks a dismissed or completed anchored coachmark", () => {
    expect(
      decision({
        context: "FIRST_TIME",
        proactiveShownCount: 0,
        levelId: "L3",
        dismissed: true,
      }),
    ).toEqual({
      showable: false,
      consumesProactiveQuota: false,
      blockReason: "dismissed-coachmark",
    });

    expect(
      decision({
        context: "FIRST_TIME",
        proactiveShownCount: 0,
        levelId: "L3",
        completed: true,
      }),
    ).toEqual({
      showable: false,
      consumesProactiveQuota: false,
      blockReason: "completed-coachmark",
    });

    expect(
      decision({
        context: "CHANGE",
        proactiveShownCount: 0,
        levelId: "L3",
        dismissed: false,
        completed: false,
      }).showable,
    ).toBe(true);
  });

  it("does not invent dismissal or completion rules for non-coachmarks", () => {
    for (const levelId of ["L0", "L1", "L2", undefined] as const) {
      expect(
        decision({
          context: "RISK",
          proactiveShownCount: 0,
          levelId,
          dismissed: true,
          completed: true,
        }),
      ).toEqual({
        showable: true,
        consumesProactiveQuota: true,
        blockReason: null,
      });
    }

    expect(
      decision({
        context: "REQUESTED",
        proactiveShownCount: 1,
        levelId: "L4",
        dismissed: true,
        completed: true,
      }),
    ).toEqual({
      showable: true,
      consumesProactiveQuota: false,
      blockReason: null,
    });
  });

  it("blocks unknown and ineligible contexts without consuming quota", () => {
    for (const context of ["", " ", "first_time", "L4", "UNKNOWN"]) {
      expect(
        decision({
          context,
          proactiveShownCount: 0,
        }),
      ).toEqual({
        showable: false,
        consumesProactiveQuota: false,
        blockReason: "ineligible",
      });
    }
  });

  it("stays pure and domain-neutral without persistence or runtime ownership", () => {
    expect(frequencySource).toContain(
      "@/lib/guidance/executive-guidance-eligibility",
    );
    expect(frequencySource).toContain("@/lib/guidance/executive-guidance-model");

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
      "snoozed",
      "timestamp",
      "Date.now",
      "fetch(",
      "useRouter",
      "useEffect",
      "createContext",
      "supabase",
      "prisma",
      "from \"react\"",
      "ask nexus",
    ];

    for (const term of forbidden) {
      expect(frequencySource.toLowerCase()).not.toContain(term.toLowerCase());
    }
  });
});
