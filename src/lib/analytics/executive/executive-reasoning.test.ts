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
  it("prioritizes the most urgent evidence as the primary driver", () => {
    const result = buildExecutiveReasoning({
      subject: "Top portfolio risk",
      severity: "medium",
      evidence: [
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
      ],
      fallbackReason: "Fallback reason.",
      fallbackRecommendation: "Fallback recommendation.",
    });

    expect(result.drivers[0]?.label).toBe(
      "Classification maturity",
    );

    expect(result.reason).toContain(
      "classification maturity at 42/100",
    );
  });

  it("uses the two highest-priority drivers in the generated reason", () => {
    const result = buildExecutiveReasoning({
      subject: "Commercial opportunity",
      severity: "medium",
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
      fallbackRecommendation: "Fallback recommendation.",
    });

    expect(result.reason).toContain(
      "supplier coverage at 2",
    );

    expect(result.reason).toContain(
      "competition at 1.4",
    );
  });

  it("uses the high-severity recommendation for urgent insights", () => {
    const result = buildExecutiveReasoning({
      subject: "Top portfolio risk",
      severity: "high",
      evidence: [
        createEvidence({
          status: "critical",
        }),
      ],
      fallbackReason: "Fallback reason.",
      fallbackRecommendation: "Fallback recommendation.",
    });

    expect(result.recommendation).toBe(
      "Prioritize immediate leadership review of top portfolio risk and validate the supporting commercial, supplier, and governance evidence before proceeding.",
    );
  });

  it("uses the medium-severity recommendation for managed escalation", () => {
    const result = buildExecutiveReasoning({
      subject: "Commercial opportunity",
      severity: "medium",
      evidence: [
        createEvidence({
          status: "moderate",
        }),
      ],
      fallbackReason: "Fallback reason.",
      fallbackRecommendation: "Fallback recommendation.",
    });

    expect(result.recommendation).toBe(
      "Assign management ownership for commercial opportunity and review the supporting evidence during the current procurement cycle.",
    );
  });

  it("uses the fallback recommendation for low-severity insights", () => {
    const result = buildExecutiveReasoning({
      subject: "Portfolio position",
      severity: "low",
      evidence: [
        createEvidence({
          status: "healthy",
        }),
      ],
      fallbackReason: "Fallback reason.",
      fallbackRecommendation:
        "Continue monitoring the current portfolio.",
    });

    expect(result.recommendation).toBe(
      "Continue monitoring the current portfolio.",
    );
  });

  it("uses fallback reasoning when no evidence is available", () => {
    const result = buildExecutiveReasoning({
      subject: "Portfolio position",
      severity: "low",
      evidence: [],
      fallbackReason:
        "No supporting evidence is currently available.",
      fallbackRecommendation:
        "Continue monitoring the current portfolio.",
    });

    expect(result.reason).toBe(
      "No supporting evidence is currently available.",
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

    const originalOrder = evidence.map((item) => item.label);

    buildExecutiveReasoning({
      subject: "Portfolio risk",
      severity: "high",
      evidence,
      fallbackReason: "Fallback reason.",
      fallbackRecommendation: "Fallback recommendation.",
    });

    expect(evidence.map((item) => item.label)).toEqual(
      originalOrder,
    );
  });
});