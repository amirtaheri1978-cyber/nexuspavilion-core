import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

import {
  getExecutiveGuidanceLevel,
  isExecutiveGuidanceLevelId,
  listExecutiveGuidanceLevels,
  type ExecutiveGuidanceLevelId,
} from "@/lib/guidance/executive-guidance-model";

const modelSource = readFileSync(
  resolve(process.cwd(), "src/lib/guidance/executive-guidance-model.ts"),
  "utf8",
).replace(/\r\n/g, "\n");

const levels = listExecutiveGuidanceLevels();

describe("executive guidance model", () => {
  it("defines exactly five stable canonical levels", () => {
    expect(levels.map((level) => level.id)).toEqual([
      "L0",
      "L1",
      "L2",
      "L3",
      "L4",
    ]);
    expect(new Set(levels.map((level) => level.id)).size).toBe(5);
    expect(levels.map((level) => level.level)).toEqual([0, 1, 2, 3, 4]);
    expect(levels.map((level) => level.name)).toEqual([
      "Silent Intelligence",
      "Inline Hint",
      "Guidance Card",
      "Anchored Coachmark",
      "Interactive Nexus Guide",
    ]);
  });

  it("describes silent, inline, card, and anchored guidance without an assistant", () => {
    const silent = getExecutiveGuidanceLevel("L0");
    const hint = getExecutiveGuidanceLevel("L1");
    const card = getExecutiveGuidanceLevel("L2");
    const coachmark = getExecutiveGuidanceLevel("L3");

    expect(silent.visibleTutorialSurface).toBe(false);
    expect(silent.interactionMode).toBe("silent");
    expect(silent.interruptionLevel).toBe("none");
    expect(silent.blocking).toBe(false);
    expect(silent.purpose).toContain("contextual intelligence");

    expect(hint.interactionMode).toBe("inline");
    expect(hint.modal).toBe(false);
    expect(hint.blocking).toBe(false);
    expect(hint.persistenceExpectation).toContain("beside the relevant content");

    expect(card.interactionMode).toBe("embedded");
    expect(card.modal).toBe(false);
    expect(card.persistenceExpectation).toContain("reviews or dismisses");

    expect(coachmark.interactionMode).toBe("anchored");
    expect(coachmark.purpose).toContain("real existing control");
    expect(coachmark.inventsControls).toBe(false);

    for (const level of [silent, hint, card, coachmark]) {
      expect(level.userRequested).toBe(false);
      expect(level.interactionMode).not.toBe("interactive");
    }
  });

  it("keeps interactive guidance user-requested and non-consequential", () => {
    const guide = getExecutiveGuidanceLevel("L4");

    expect(guide.interactionMode).toBe("interactive");
    expect(guide.userRequested).toBe(true);
    expect(guide.proactiveEligible).toBe(false);
    expect(guide.interruptionLevel).toBe("user-requested");
    expect(guide.purpose).toContain("user requests");
    expect(guide.purpose).toContain("contextual questions");
    expect(guide.performsConsequentialActions).toBe(false);

    for (const level of levels) {
      expect(level.blocking).toBe(false);
      expect(level.inventsControls).toBe(false);
      expect(level.performsConsequentialActions).toBe(false);
    }
  });

  it("validates only the closed level ids", () => {
    expect(isExecutiveGuidanceLevelId("L2")).toBe(true);
    expect(isExecutiveGuidanceLevelId("L5")).toBe(false);
    expect(isExecutiveGuidanceLevelId("FIRST_TIME")).toBe(false);

    const known: ExecutiveGuidanceLevelId = "L1";
    expect(getExecutiveGuidanceLevel(known).name).toBe("Inline Hint");
  });

  it("stays domain-neutral and free of product ownership", () => {
    const forbidden = [
      "rfq",
      "procurement",
      "quote",
      "award",
      "supplier",
      "vendor",
      "first_time",
      "matchMedia",
      "fetch(",
      "useRouter",
      "supabase",
      "prisma",
      "from \"react\"",
      "ask nexus",
    ];

    for (const term of forbidden) {
      expect(modelSource.toLowerCase()).not.toContain(term.toLowerCase());
    }
  });
});
