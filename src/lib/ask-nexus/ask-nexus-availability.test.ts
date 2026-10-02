import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import {
  resolveAskNexusAvailability,
  type AskNexusAvailabilityInput,
} from "@/lib/ask-nexus/ask-nexus-availability";

const availabilitySource = readFileSync(
  resolve(process.cwd(), "src/lib/ask-nexus/ask-nexus-availability.ts"),
  "utf8",
).replace(/\r\n/g, "\n");

function input(
  overrides: Partial<AskNexusAvailabilityInput> &
    Pick<AskNexusAvailabilityInput, "availability">,
): AskNexusAvailabilityInput {
  return {
    ...overrides,
  };
}

describe("ask nexus availability", () => {
  it("allows definitive posture only for available + high confidence", () => {
    expect(
      resolveAskNexusAvailability(
        input({ availability: "available", confidence: "high" }),
      ),
    ).toMatchObject({
      availability: "available",
      confidence: "high",
      canStateDefinitively: true,
      requiresCaveat: false,
      fallback: null,
      nonBinding: true,
      summary: "Available evidence supports this explanation.",
    });
  });

  it("keeps medium and low confidence non-definitive with caveats", () => {
    expect(
      resolveAskNexusAvailability(
        input({ availability: "available", confidence: "medium" }),
      ),
    ).toMatchObject({
      canStateDefinitively: false,
      requiresCaveat: true,
      fallback: "limited_evidence",
      summary:
        "Available evidence supports a qualified explanation, but material uncertainty remains.",
    });

    expect(
      resolveAskNexusAvailability(
        input({ availability: "available", confidence: "low" }),
      ),
    ).toMatchObject({
      canStateDefinitively: false,
      requiresCaveat: true,
      fallback: "low_confidence",
      summary:
        "Available evidence supports only a low-confidence explanation.",
    });
  });

  it("treats available + unavailable/null confidence as unavailable fallback", () => {
    expect(
      resolveAskNexusAvailability(
        input({ availability: "available", confidence: "unavailable" }),
      ),
    ).toMatchObject({
      canStateDefinitively: false,
      requiresCaveat: true,
      fallback: "unavailable",
      summary:
        "Sufficient evidence is not available to support a reliable explanation.",
    });

    expect(
      resolveAskNexusAvailability(
        input({ availability: "available", confidence: null }),
      ),
    ).toMatchObject({
      confidence: null,
      canStateDefinitively: false,
      requiresCaveat: true,
      fallback: "unavailable",
    });

    expect(
      resolveAskNexusAvailability(input({ availability: "available" })),
    ).toMatchObject({
      confidence: null,
      fallback: "unavailable",
    });
  });

  it("lets limited and unavailable availability override high confidence", () => {
    expect(
      resolveAskNexusAvailability(
        input({ availability: "limited", confidence: "high" }),
      ),
    ).toMatchObject({
      availability: "limited",
      confidence: "high",
      canStateDefinitively: false,
      requiresCaveat: true,
      fallback: "limited_evidence",
      summary:
        "Available evidence is incomplete, so this explanation should be treated as limited.",
    });

    expect(
      resolveAskNexusAvailability(
        input({ availability: "unavailable", confidence: "high" }),
      ),
    ).toMatchObject({
      availability: "unavailable",
      confidence: "high",
      canStateDefinitively: false,
      requiresCaveat: true,
      fallback: "unavailable",
      summary:
        "Sufficient evidence is not available to support a reliable explanation.",
    });
  });

  it("preserves trimmed caller summary and uses fallback copy when empty", () => {
    const preserved = resolveAskNexusAvailability(
      input({
        availability: "available",
        confidence: "high",
        summary: "  Caller-supplied summary with high risk wording.  ",
      }),
    );
    expect(preserved.summary).toBe(
      "Caller-supplied summary with high risk wording.",
    );

    const fallback = resolveAskNexusAvailability(
      input({
        availability: "limited",
        confidence: "high",
        summary: "   ",
      }),
    );
    expect(fallback.summary).toBe(
      "Available evidence is incomplete, so this explanation should be treated as limited.",
    );
  });

  it("normalizes limitations without inventing any", () => {
    const result = resolveAskNexusAvailability(
      input({
        availability: "available",
        confidence: "high",
        limitations: [
          " ",
          "  Partial payload  ",
          "Partial payload",
          "Producer withheld detail",
          "",
        ],
      }),
    );

    expect(result.limitations).toEqual([
      "Partial payload",
      "Producer withheld detail",
    ]);

    expect(
      resolveAskNexusAvailability(
        input({ availability: "unavailable", confidence: "low" }),
      ).limitations,
    ).toEqual([]);
  });

  it("always returns nonBinding true", () => {
    const cases: AskNexusAvailabilityInput[] = [
      { availability: "available", confidence: "high" },
      { availability: "available", confidence: "medium" },
      { availability: "available", confidence: "low" },
      { availability: "limited", confidence: "high" },
      { availability: "unavailable", confidence: "high" },
    ];

    for (const caseInput of cases) {
      expect(resolveAskNexusAvailability(caseInput).nonBinding).toBe(true);
    }
  });

  it("fails closed on malformed availability and confidence at runtime", () => {
    const badAvailability = resolveAskNexusAvailability({
      // @ts-expect-error intentional malformed availability probe
      availability: "maybe",
      confidence: "high",
    });
    expect(badAvailability).toMatchObject({
      availability: "unavailable",
      canStateDefinitively: false,
      requiresCaveat: true,
      fallback: "unavailable",
    });

    const badConfidence = resolveAskNexusAvailability({
      availability: "available",
      // @ts-expect-error intentional malformed confidence probe
      confidence: "certain",
    });
    expect(badConfidence).toMatchObject({
      confidence: null,
      canStateDefinitively: false,
      requiresCaveat: true,
      fallback: "unavailable",
    });
  });

  it("does not import confidence producers, evidence engines, or data/AI modules", () => {
    expect(availabilitySource).not.toContain("executive-confidence");
    expect(availabilitySource).not.toContain("EXECUTIVE_CONFIDENCE_THRESHOLDS");
    expect(availabilitySource).not.toContain("executive-evidence");
    expect(availabilitySource).not.toContain("ask-nexus-evidence-view");
    expect(availabilitySource).not.toContain("procurement-context-repository");
    expect(availabilitySource).not.toContain("rfq-access-contract");
    expect(availabilitySource).not.toContain("workspace-permissions");
    expect(availabilitySource).not.toContain("application-nav");
    expect(availabilitySource).not.toContain("@/lib/supabase");
    expect(availabilitySource).not.toContain("createClient");
    expect(availabilitySource).not.toContain("@/lib/ai");
    expect(availabilitySource).not.toContain("openai");
    expect(availabilitySource).not.toContain("fetch(");
  });

  it("has no scoring, text inference, navigation, mutation, confirmation, or UI", () => {
    expect(availabilitySource).not.toContain("threshold");
    expect(availabilitySource).not.toContain("confidenceScore");
    expect(availabilitySource).not.toContain("calculateConfidence");
    expect(availabilitySource).not.toContain("includes(");
    expect(availabilitySource).not.toContain(".match(");
    expect(availabilitySource).not.toContain("toLowerCase(");
    expect(availabilitySource).not.toContain("router.push");
    expect(availabilitySource).not.toContain("window.location");
    expect(availabilitySource).not.toContain("useRouter");
    expect(availabilitySource).not.toContain("consequential_action");
    expect(availabilitySource).not.toContain("execute(");
    expect(availabilitySource).not.toContain("onConfirm");
    expect(availabilitySource).not.toContain("from \"react\"");
    expect(availabilitySource).not.toContain("from 'react'");
    expect(availabilitySource).not.toContain("jsx");
    expect(availabilitySource).not.toContain("createElement");
    expect(availabilitySource).not.toContain("confirmed");
    expect(availabilitySource).not.toContain("proven");
    expect(availabilitySource).not.toContain("definitely");
    expect(availabilitySource).not.toContain("guaranteed");
  });
});
