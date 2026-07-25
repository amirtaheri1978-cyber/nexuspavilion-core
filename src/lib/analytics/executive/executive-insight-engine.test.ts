import { describe, expect, it } from "vitest";

import { buildExecutiveInsight } from "@/lib/analytics/executive/executive-insight-engine";
import type { ExecutiveInsightSeverity } from "@/lib/analytics/executive/executive-insight";
import {
  createExecutiveSignal,
  type ExecutiveSignal,
} from "@/lib/analytics/executive/executive-signal";

function createSignal(
  overrides: Partial<ExecutiveSignal> = {},
): ExecutiveSignal {
  return createExecutiveSignal({
    id: "supplier-coverage",
    category: "supplier",
    label: "Supplier coverage",
    value: "6",
    status: "healthy",
    importance: 80,
    description: "Supplier coverage signal.",
    ...overrides,
  });
}

describe("buildExecutiveInsight", () => {
  it("preserves category, title, summary, and severity", () => {
    const result = buildExecutiveInsight({
      category: "risk",
      title: "Top Portfolio Risk",
      summary: "Portfolio exposure remains controlled.",
      subject: "Top portfolio risk",
      severity: "medium",
      confidence: 75,
      signals: [createSignal()],
      fallbackReason: "Fallback reason.",
      recommendation:
        "Maintain monitoring and validate the underlying evidence.",
    });

    expect(result.category).toBe("risk");
    expect(result.title).toBe("Top Portfolio Risk");
    expect(result.summary).toBe(
      "Portfolio exposure remains controlled.",
    );
    expect(result.severity).toBe("medium");
  });

  it("normalizes confidence to the 0-100 range", () => {
    const highResult = buildExecutiveInsight({
      category: "opportunity",
      title: "Opportunity",
      summary: "High confidence insight.",
      subject: "Commercial opportunity",
      severity: "high",
      confidence: 140,
      signals: [createSignal()],
      fallbackReason: "Fallback reason.",
      recommendation:
        "Validate the opportunity before commercial escalation.",
    });

    const lowResult = buildExecutiveInsight({
      category: "risk",
      title: "Risk",
      summary: "Low confidence insight.",
      subject: "Portfolio risk",
      severity: "low",
      confidence: -25,
      signals: [createSignal()],
      fallbackReason: "Fallback reason.",
      recommendation:
        "Continue monitoring the current portfolio.",
    });

    expect(highResult.confidence).toBe(100);
    expect(lowResult.confidence).toBe(0);
  });

  it("rounds finite confidence values", () => {
    const result = buildExecutiveInsight({
      category: "action",
      title: "Action",
      summary: "Rounded confidence insight.",
      subject: "Immediate leadership action",
      severity: "low",
      confidence: 84.6,
      signals: [createSignal()],
      fallbackReason: "Fallback reason.",
      recommendation:
        "Proceed through the authorized decision workflow.",
    });

    expect(result.confidence).toBe(85);
  });

  it("converts non-finite confidence values to zero", () => {
    const result = buildExecutiveInsight({
      category: "risk",
      title: "Risk",
      summary: "Invalid confidence insight.",
      subject: "Portfolio risk",
      severity: "low",
      confidence: Number.NaN,
      signals: [createSignal()],
      fallbackReason: "Fallback reason.",
      recommendation:
        "Continue monitoring the current portfolio.",
    });

    expect(result.confidence).toBe(0);
  });

  it("prioritizes urgent signals before generating evidence", () => {
    const result = buildExecutiveInsight({
      category: "risk",
      title: "Top Portfolio Risk",
      summary: "Risk summary.",
      subject: "Top portfolio risk",
      severity: "medium",
      confidence: 80,
      signals: [
        createSignal({
          id: "strong",
          label: "Strong signal",
          status: "strong",
          importance: 100,
        }),
        createSignal({
          id: "critical",
          label: "Critical signal",
          status: "critical",
          importance: 20,
        }),
        createSignal({
          id: "limited",
          label: "Limited signal",
          status: "limited",
          importance: 90,
        }),
      ],
      fallbackReason: "Fallback reason.",
      recommendation:
        "Review the material portfolio exposure.",
    });

    expect(result.evidence.map((item) => item.label)).toEqual([
      "Critical signal",
      "Limited signal",
      "Strong signal",
    ]);
  });

  it("uses prioritized evidence in generated reasoning", () => {
    const result = buildExecutiveInsight({
      category: "opportunity",
      title: "Top Commercial Opportunity",
      summary: "Opportunity summary.",
      subject: "Top commercial opportunity",
      severity: "medium",
      confidence: 90,
      signals: [
        createSignal({
          id: "savings",
          label: "Savings opportunity",
          value: "$250,000",
          status: "strong",
          importance: 100,
        }),
        createSignal({
          id: "supplier-coverage",
          label: "Supplier coverage",
          value: "2",
          status: "limited",
          importance: 80,
        }),
        createSignal({
          id: "competition",
          label: "Competition",
          value: "1.5",
          status: "moderate",
          importance: 90,
        }),
      ],
      fallbackReason: "Fallback reason.",
      recommendation:
        "Increase qualified supplier participation before relying on the current savings estimate.",
    });

    expect(result.reason).toContain(
      "supplier coverage at 2",
    );

    expect(result.reason).toContain(
      "competition at 1.5",
    );
  });

  it.each([
    "high",
    "medium",
    "low",
  ] satisfies ExecutiveInsightSeverity[])(
    "preserves the supplied recommendation for %s-severity insights",
    (severity) => {
      const recommendation =
        "Increase qualified supplier participation before progressing major award decisions.";

      const result = buildExecutiveInsight({
        category: "action",
        title: "Immediate Leadership Action",
        summary: "Action summary.",
        subject: "Immediate leadership action",
        severity,
        confidence: 88,
        signals: [createSignal()],
        fallbackReason: "Fallback reason.",
        recommendation,
      });

      expect(result.recommendation).toBe(
        recommendation,
      );
    },
  );

  it("uses fallback reasoning when no signals are available", () => {
    const result = buildExecutiveInsight({
      category: "risk",
      title: "Portfolio Position",
      summary: "Portfolio summary.",
      subject: "Portfolio position",
      severity: "low",
      confidence: 70,
      signals: [],
      fallbackReason:
        "No supporting evidence is currently available.",
      recommendation:
        "Continue monitoring the current portfolio.",
    });

    expect(result.reason).toBe(
      "No supporting evidence is currently available.",
    );

    expect(result.evidence).toEqual([]);
  });

  it("does not mutate the original signals array", () => {
    const signals = [
      createSignal({
        id: "healthy",
        label: "Healthy signal",
        status: "healthy",
      }),
      createSignal({
        id: "critical",
        label: "Critical signal",
        status: "critical",
      }),
    ];

    const originalOrder = signals.map(
      (signal) => signal.id,
    );

    buildExecutiveInsight({
      category: "risk",
      title: "Risk",
      summary: "Risk summary.",
      subject: "Portfolio risk",
      severity: "high",
      confidence: 75,
      signals,
      fallbackReason: "Fallback reason.",
      recommendation:
        "Review the material portfolio exposure.",
    });

    expect(
      signals.map((signal) => signal.id),
    ).toEqual(originalOrder);
  });
});
