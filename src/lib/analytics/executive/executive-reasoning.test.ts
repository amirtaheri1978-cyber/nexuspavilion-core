import { describe, expect, it } from "vitest";

import type { ExecutiveEvidence } from "@/lib/analytics/executive/executive-insight";
import { buildExecutiveReasoning } from "@/lib/analytics/executive/executive-reasoning";

function createEvidence(
  overrides: Partial<ExecutiveEvidence> = {},
): ExecutiveEvidence {
  return {
    label: "Supplier coverage",
    value: "6",
    status: "healthy",
    description: "Supplier coverage signal.",
    ...overrides,
  };
}

describe("buildExecutiveReasoning", () => {
  it("preserves the canonical evidence order", () => {
    const evidence = [
      createEvidence({
        label: "Competition",
        value: "2.5",
        status: "healthy",
      }),
      createEvidence({
        label: "Classification maturity",
        value: "42/100",
        status: "limited",
      }),
      createEvidence({
        label: "Risk index",
        value: "55/100",
        status: "moderate",
      }),
    ];

    const result = buildExecutiveReasoning({
      subject: "Top portfolio risk",
      evidence,
      fallbackReason: "Fallback reason.",
      recommendation:
        "Review the material portfolio exposure.",
    });

    expect(
      result.drivers.map((driver) => driver.label),
    ).toEqual([
      "Competition",
      "Classification maturity",
      "Risk index",
    ]);
  });

  it("uses the first two canonical evidence entries in the generated reason", () => {
    const result = buildExecutiveReasoning({
      subject: "Commercial opportunity",
      evidence: [
        createEvidence({
          label: "Savings opportunity",
          value: "$120,000",
          status: "strong",
        }),
        createEvidence({
          label: "Supplier coverage",
          value: "2",
          status: "limited",
        }),
        createEvidence({
          label: "Competition",
          value: "1.4",
          status: "moderate",
        }),
      ],
      fallbackReason: "Fallback reason.",
      recommendation:
        "Increase qualified supplier participation before relying on the current savings estimate.",
    });

    expect(result.reason).toContain(
      "savings opportunity at $120,000",
    );

    expect(result.reason).toContain(
      "supplier coverage at 2",
    );

    expect(result.reason).not.toContain(
      "competition at 1.4",
    );
  });

  it("uses the primary evidence entry when only one driver is available", () => {
    const result = buildExecutiveReasoning({
      subject: "Top portfolio risk",
      evidence: [
        createEvidence({
          label: "Risk index",
          value: "72/100",
          status: "critical",
        }),
      ],
      fallbackReason: "Fallback reason.",
      recommendation:
        "Review supplier concentration and commercial exposure.",
    });

    expect(result.reason).toBe(
      "Top portfolio risk is primarily influenced by risk index at 72/100.",
    );
  });

  it("preserves the supplied domain recommendation", () => {
    const recommendation =
      "Increase qualified supplier participation before progressing major award decisions.";

    const result = buildExecutiveReasoning({
      subject: "Immediate leadership action",
      evidence: [
        createEvidence({
          status: "critical",
        }),
      ],
      fallbackReason: "Fallback reason.",
      recommendation,
    });

    expect(result.recommendation).toBe(
      recommendation,
    );
  });

  it("uses fallback reasoning when no evidence is available", () => {
    const result = buildExecutiveReasoning({
      subject: "Portfolio position",
      evidence: [],
      fallbackReason:
        "No supporting evidence is currently available.",
      recommendation:
        "Continue monitoring the current portfolio.",
    });

    expect(result.reason).toBe(
      "No supporting evidence is currently available.",
    );

    expect(result.recommendation).toBe(
      "Continue monitoring the current portfolio.",
    );

    expect(result.drivers).toEqual([]);
  });

  it("does not mutate the original evidence array", () => {
    const evidence = [
      createEvidence({
        label: "Healthy signal",
        status: "healthy",
      }),
      createEvidence({
        label: "Critical signal",
        status: "critical",
      }),
    ];

    const originalOrder = evidence.map(
      (item) => item.label,
    );

    buildExecutiveReasoning({
      subject: "Portfolio risk",
      evidence,
      fallbackReason: "Fallback reason.",
      recommendation:
        "Review the material portfolio exposure.",
    });

    expect(
      evidence.map((item) => item.label),
    ).toEqual(originalOrder);
  });

  it("returns a defensive copy of the evidence array", () => {
    const evidence = [
      createEvidence({
        label: "Supplier coverage",
      }),
    ];

    const result = buildExecutiveReasoning({
      subject: "Portfolio position",
      evidence,
      fallbackReason: "Fallback reason.",
      recommendation:
        "Continue monitoring the current portfolio.",
    });

    expect(result.drivers).toEqual(evidence);
    expect(result.drivers).not.toBe(evidence);
  });
});
