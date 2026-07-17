import { describe, expect, it } from "vitest";

import type {
  ExecutiveAssessment,
  ExecutiveAssessmentFactor,
} from "@/lib/analytics/executive/executive-assessment";
import {
  buildExecutiveConfidence,
  type ExecutiveConfidenceLevel,
} from "@/lib/analytics/executive/executive-confidence";

function createFactor(
  overrides: Partial<ExecutiveAssessmentFactor> = {},
): ExecutiveAssessmentFactor {
  return {
    dimension: "portfolio-health",
    label: "Portfolio Health",
    score: 85,
    status: "strong",
    rationale: "Portfolio conditions support executive action.",
    signalIds: ["signal-1"],
    ...overrides,
  };
}

function createAssessment(
  overrides: Partial<ExecutiveAssessment> = {},
): ExecutiveAssessment {
  return {
    score: 85,
    status: "strong",
    summary: "Executive conditions are strongly supported.",
    factors: [
      createFactor(),
      createFactor({
        dimension: "supplier-resilience",
        label: "Supplier Resilience",
      }),
      createFactor({
        dimension: "commercial-readiness",
        label: "Commercial Readiness",
      }),
      createFactor({
        dimension: "evidence-quality",
        label: "Evidence Quality",
      }),
    ],
    ...overrides,
  };
}

describe("buildExecutiveConfidence", () => {
  it("builds one confidence driver for every assessment factor", () => {
    const confidence = buildExecutiveConfidence(createAssessment());

    expect(confidence.drivers).toHaveLength(4);

    expect(
      confidence.drivers.map((driver) => driver.dimension),
    ).toEqual([
      "portfolio-health",
      "supplier-resilience",
      "commercial-readiness",
      "evidence-quality",
    ]);
  });

  it("preserves factor labels, scores, and supporting signal identifiers", () => {
    const confidence = buildExecutiveConfidence(
      createAssessment({
        factors: [
          createFactor({
            label: "Evidence Quality",
            score: 78,
            signalIds: ["signal-a", "signal-b"],
          }),
        ],
      }),
    );

    expect(confidence.drivers[0]).toMatchObject({
      label: "Evidence Quality",
      score: 78,
      signalIds: ["signal-a", "signal-b"],
    });
  });

  it("creates independent signal identifier arrays", () => {
    const signalIds = ["signal-a", "signal-b"];

    const confidence = buildExecutiveConfidence(
      createAssessment({
        factors: [
          createFactor({
            signalIds,
          }),
        ],
      }),
    );

    expect(confidence.drivers[0].signalIds).toEqual(signalIds);
    expect(confidence.drivers[0].signalIds).not.toBe(signalIds);
  });

  it("returns high confidence when the assessment is strongly supported", () => {
    const confidence = buildExecutiveConfidence(
      createAssessment({
        score: 90,
      }),
    );

    expect(confidence).toMatchObject({
      score: 90,
      level: "high",
    });

    expect(confidence.summary).toContain("high");
  });

  it("applies an eight-point penalty for each critical factor", () => {
    const confidence = buildExecutiveConfidence(
      createAssessment({
        score: 80,
        factors: [
          createFactor({
            status: "critical",
            score: 40,
          }),
          createFactor({
            dimension: "supplier-resilience",
          }),
        ],
      }),
    );

    expect(confidence.score).toBe(72);
    expect(confidence.level).toBe("moderate");
  });

  it("applies a three-point penalty for each watch factor", () => {
    const confidence = buildExecutiveConfidence(
      createAssessment({
        score: 75,
        factors: [
          createFactor({
            status: "watch",
            score: 60,
          }),
          createFactor({
            dimension: "supplier-resilience",
          }),
        ],
      }),
    );

    expect(confidence.score).toBe(72);
    expect(confidence.level).toBe("moderate");
  });

  it("combines critical and watch penalties", () => {
    const confidence = buildExecutiveConfidence(
      createAssessment({
        score: 80,
        factors: [
          createFactor({
            status: "critical",
            score: 40,
          }),
          createFactor({
            dimension: "supplier-resilience",
            status: "watch",
            score: 60,
          }),
        ],
      }),
    );

    expect(confidence.score).toBe(69);
    expect(confidence.level).toBe("low");
  });

  it("does not penalize strong or stable factors", () => {
    const confidence = buildExecutiveConfidence(
      createAssessment({
        score: 82,
        factors: [
          createFactor({
            status: "strong",
            score: 90,
          }),
          createFactor({
            dimension: "supplier-resilience",
            status: "stable",
            score: 75,
          }),
        ],
      }),
    );

    expect(confidence.score).toBe(82);
    expect(confidence.level).toBe("moderate");
  });

  it("clamps the confidence score at zero", () => {
    const confidence = buildExecutiveConfidence(
      createAssessment({
        score: 5,
        factors: [
          createFactor({
            status: "critical",
            score: 20,
          }),
          createFactor({
            dimension: "supplier-resilience",
            status: "critical",
            score: 20,
          }),
        ],
      }),
    );

    expect(confidence.score).toBe(0);
    expect(confidence.level).toBe("insufficient");
  });

  it("returns limiting drivers ordered from lowest score to highest", () => {
    const confidence = buildExecutiveConfidence(
      createAssessment({
        factors: [
          createFactor({
            dimension: "portfolio-health",
            status: "watch",
            score: 55,
          }),
          createFactor({
            dimension: "supplier-resilience",
            status: "critical",
            score: 30,
          }),
          createFactor({
            dimension: "commercial-readiness",
            status: "watch",
            score: 50,
          }),
          createFactor({
            dimension: "evidence-quality",
            status: "strong",
            score: 90,
          }),
        ],
      }),
    );

    expect(
      confidence.limitingDrivers.map((driver) => driver.score),
    ).toEqual([30, 50, 55]);
  });

  it("excludes strong and stable factors from limiting drivers", () => {
    const confidence = buildExecutiveConfidence(
      createAssessment({
        factors: [
          createFactor({
            status: "strong",
          }),
          createFactor({
            dimension: "supplier-resilience",
            status: "stable",
            score: 75,
          }),
        ],
      }),
    );

    expect(confidence.limitingDrivers).toEqual([]);
  });

  it("uses assessment status to build explainable driver rationales", () => {
    const confidence = buildExecutiveConfidence(
      createAssessment({
        factors: [
          createFactor({
            status: "strong",
          }),
          createFactor({
            dimension: "supplier-resilience",
            label: "Supplier Resilience",
            status: "stable",
          }),
          createFactor({
            dimension: "commercial-readiness",
            label: "Commercial Readiness",
            status: "watch",
          }),
          createFactor({
            dimension: "evidence-quality",
            label: "Evidence Quality",
            status: "critical",
          }),
        ],
      }),
    );

    expect(confidence.drivers[0].rationale).toContain(
      "strongly supports",
    );

    expect(confidence.drivers[1].rationale).toContain(
      "selective validation",
    );

    expect(confidence.drivers[2].rationale).toContain(
      "additional validation",
    );

    expect(confidence.drivers[3].rationale).toContain(
      "materially limits",
    );
  });

  it.each([
    [85, "strong", "high"],
    [84, "stable", "moderate"],
    [70, "stable", "moderate"],
    [72, "watch", "low"],
    [53, "watch", "low"],
    [57, "critical", "insufficient"],
    [8, "critical", "insufficient"],
  ] satisfies Array<
    [
      number,
      ExecutiveAssessmentFactor["status"],
      ExecutiveConfidenceLevel,
    ]
  >)(
    "maps assessment score %i with factor status %s to confidence level %s",
    (score, factorStatus, expectedLevel) => {
      const confidence = buildExecutiveConfidence(
        createAssessment({
          score,
          factors: [
            createFactor({
              score,
              status: factorStatus,
            }),
          ],
        }),
      );

      expect(confidence.level).toBe(expectedLevel);
    },
  );

  it("returns moderate confidence with selective validation guidance", () => {
    const confidence = buildExecutiveConfidence(
      createAssessment({
        score: 80,
        status: "stable",
        factors: [
          createFactor({
            score: 80,
            status: "stable",
          }),
        ],
      }),
    );

    expect(confidence.level).toBe("moderate");
    expect(confidence.summary).toContain(
      "selective validation",
    );
  });

  it("returns low confidence with additional validation guidance", () => {
    const confidence = buildExecutiveConfidence(
      createAssessment({
        score: 69,
        status: "watch",
        factors: [
          createFactor({
            score: 69,
            status: "stable",
          }),
        ],
      }),
    );

    expect(confidence.level).toBe("low");
    expect(confidence.summary).toContain(
      "additional validation",
    );
  });

  it("returns insufficient confidence for materially unsupported action", () => {
    const confidence = buildExecutiveConfidence(
      createAssessment({
        score: 45,
        status: "critical",
        factors: [
          createFactor({
            score: 45,
            status: "stable",
          }),
        ],
      }),
    );

    expect(confidence.level).toBe("insufficient");
    expect(confidence.summary).toContain(
      "insufficient",
    );
  });

  it("returns an insufficient result when no assessment factors exist", () => {
    const confidence = buildExecutiveConfidence(
      createAssessment({
        score: 90,
        factors: [],
      }),
    );

    expect(confidence.score).toBe(0);
    expect(confidence.level).toBe("insufficient");
    expect(confidence.drivers).toEqual([]);
    expect(confidence.limitingDrivers).toEqual([]);
  });
});