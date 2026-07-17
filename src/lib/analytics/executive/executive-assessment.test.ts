import { describe, expect, it } from "vitest";

import { buildExecutiveAssessment } from "@/lib/analytics/executive/executive-assessment";
import type { ExecutiveSignal } from "@/lib/analytics/executive/executive-signal";

function createSignal(
  overrides: Partial<ExecutiveSignal> = {},
): ExecutiveSignal {
  return {
    id: "signal-1",
    category: "commercial",
    label: "Commercial readiness",
    value: "Healthy",
    status: "healthy",
    importance: 80,
    description: "Commercial conditions support executive action.",
    ...overrides,
  };
}

describe("buildExecutiveAssessment", () => {
  it("builds all executive assessment dimensions", () => {
    const assessment = buildExecutiveAssessment([
      createSignal(),
    ]);

    expect(assessment.factors).toHaveLength(4);

    expect(
      assessment.factors.map((factor) => factor.dimension),
    ).toEqual([
      "portfolio-health",
      "supplier-resilience",
      "commercial-readiness",
      "evidence-quality",
    ]);
  });

  it("uses signal status and importance to calculate weighted scores", () => {
    const assessment = buildExecutiveAssessment([
      createSignal({
        id: "strong-commercial",
        status: "strong",
        importance: 90,
      }),
      createSignal({
        id: "limited-commercial",
        status: "limited",
        importance: 10,
      }),
    ]);

    const commercialReadiness = assessment.factors.find(
      (factor) => factor.dimension === "commercial-readiness",
    );

    expect(commercialReadiness).toBeDefined();
    expect(commercialReadiness?.score).toBe(90);
    expect(commercialReadiness?.status).toBe("strong");
  });

  it("returns zero and critical status when a dimension has no signals", () => {
    const assessment = buildExecutiveAssessment([
      createSignal({
        category: "commercial",
      }),
    ]);

    const supplierResilience = assessment.factors.find(
      (factor) => factor.dimension === "supplier-resilience",
    );

    expect(supplierResilience).toMatchObject({
      score: 0,
      status: "critical",
      signalIds: [],
    });

    expect(supplierResilience?.rationale).toContain(
      "No executive signals",
    );
  });

  it("identifies constrained signals in factor rationale", () => {
    const assessment = buildExecutiveAssessment([
      createSignal({
        id: "supplier-risk",
        category: "supplier",
        label: "Supplier concentration",
        status: "limited",
        importance: 95,
      }),
    ]);

    const supplierResilience = assessment.factors.find(
      (factor) => factor.dimension === "supplier-resilience",
    );

    expect(supplierResilience?.rationale).toContain(
      "Supplier concentration",
    );
    expect(supplierResilience?.rationale).toContain(
      "require attention",
    );
  });

it.each([
  ["strong", "strong"],
  ["healthy", "strong"],
  ["neutral", "stable"],
  ["moderate", "watch"],
  ["limited", "critical"],
  ["critical", "critical"],
] as const)(
  "maps an executive evidence status of %s to assessment status %s",
  (signalStatus, expectedStatus) => {
    const assessment = buildExecutiveAssessment([
      createSignal({
        category: "commercial",
        status: signalStatus,
        importance: 100,
      }),
    ]);

    const portfolioHealth = assessment.factors.find(
      (factor) => factor.dimension === "portfolio-health",
    );

    expect(portfolioHealth?.status).toBe(expectedStatus);
  },
);

  it("returns a consistent overall assessment summary", () => {
    const assessment = buildExecutiveAssessment([
      createSignal({
        category: "commercial",
        status: "strong",
        importance: 100,
      }),
      createSignal({
        id: "supplier",
        category: "supplier",
        status: "strong",
        importance: 100,
      }),
      createSignal({
        id: "classification",
        category: "classification",
        status: "strong",
        importance: 100,
      }),
      createSignal({
        id: "governance",
        category: "governance",
        status: "strong",
        importance: 100,
      }),
    ]);

    expect(assessment.status).toBe("strong");
    expect(assessment.summary).toBe(
      "Executive conditions are strongly supported for confident action.",
    );
  });

  it("preserves supporting signal identifiers", () => {
    const assessment = buildExecutiveAssessment([
      createSignal({
        id: "commercial-1",
        category: "commercial",
      }),
      createSignal({
        id: "governance-1",
        category: "governance",
      }),
    ]);

    const commercialReadiness = assessment.factors.find(
      (factor) => factor.dimension === "commercial-readiness",
    );

    expect(commercialReadiness?.signalIds).toEqual([
      "commercial-1",
      "governance-1",
    ]);
  });
});