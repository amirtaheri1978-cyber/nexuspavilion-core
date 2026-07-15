import { describe, expect, it } from "vitest";

import type { ExecutiveBrief } from "@/lib/analytics/executive/executive-brief";
import { buildExecutiveNarrative } from "@/lib/analytics/executive/executive-narrative";

function createBrief(
  overrides: Partial<ExecutiveBrief> = {},
): ExecutiveBrief {
  const baseInsight = {
    category: "action" as const,
    title: "Test Insight",
    summary: "Test summary.",
    reason: "Test reason.",
    recommendation: "Review the current procurement evidence.",
    confidence: 80,
    severity: "low" as const,
    evidence: [],
  };

  return {
    action: {
      ...baseInsight,
      category: "action",
      title: "Immediate Leadership Action",
    },
    opportunity: {
      ...baseInsight,
      category: "opportunity",
      title: "Top Commercial Opportunity",
      severity: "high",
    },
    risk: {
      ...baseInsight,
      category: "risk",
      title: "Top Portfolio Risk",
      severity: "low",
    },
    confidence: {
      score: 84,
      level: "high",
      evidence: [],
    },
    ...overrides,
  };
}

describe("buildExecutiveNarrative", () => {
  it("uses a positive headline when opportunity is high and risk is low", () => {
    const brief = createBrief();

    const result = buildExecutiveNarrative(brief);

    expect(result.headline).toBe(
      "Portfolio conditions support confident commercial action.",
    );
  });

  it("prioritizes leadership intervention when action severity is high", () => {
    const brief = createBrief({
      action: {
        ...createBrief().action,
        severity: "high",
      },
    });

    const result = buildExecutiveNarrative(brief);

    expect(result.headline).toBe(
      "Leadership intervention is required before major procurement action.",
    );

    expect(result.summary).toContain(
      "Major procurement action should pause",
    );
  });

  it("describes high confidence consistently", () => {
    const brief = createBrief({
      confidence: {
        score: 84,
        level: "high",
        evidence: [],
      },
    });

    const result = buildExecutiveNarrative(brief);

    expect(result.summary).toContain(
      "Decision confidence is high (84/100).",
    );
  });

  it("describes moderate confidence consistently", () => {
    const brief = createBrief({
      confidence: {
        score: 67,
        level: "moderate",
        evidence: [],
      },
    });

    const result = buildExecutiveNarrative(brief);

    expect(result.summary).toContain(
      "Decision confidence is moderate (67/100).",
    );
  });

  it("uses the action recommendation as the leadership priority", () => {
    const brief = createBrief({
      action: {
        ...createBrief().action,
        recommendation:
          "Validate the governance evidence before approval.",
      },
    });

    const result = buildExecutiveNarrative(brief);

    expect(result.priority).toBe(
      "Validate the governance evidence before approval.",
    );
  });

  it("falls back to a safe priority when the action recommendation is empty", () => {
    const brief = createBrief({
      action: {
        ...createBrief().action,
        recommendation: "",
      },
    });

    const result = buildExecutiveNarrative(brief);

    expect(result.priority).toBe(
      "Review the current procurement evidence before authorizing further action.",
    );
  });
});