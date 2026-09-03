import { describe, expect, it } from "vitest";

import { evaluateQuotationSubmissionCompleteness } from "./quotation-submission-completeness";

describe("evaluateQuotationSubmissionCompleteness", () => {
  it("marks an empty quotation incomplete", () => {
    const result = evaluateQuotationSubmissionCompleteness({});

    expect(result.status).toBe("incomplete");
    expect(result.completedCount).toBe(0);
    expect(result.totalCount).toBe(3);
    expect(result.completionPercent).toBe(0);
    expect(result.missingSignals.map((signal) => signal.key)).toEqual([
      "amount",
      "timeline",
      "proposal_note",
    ]);
  });

  it("preserves the existing exact 1,000 quote amount threshold", () => {
    const result = evaluateQuotationSubmissionCompleteness({
      amountNumber: 1000,
      timeline: "16 months",
      message: "Complete proposal note",
    });

    expect(result.status).toBe("complete");
    expect(result.completedCount).toBe(3);
    expect(result.completionPercent).toBe(100);
  });

  it("keeps an amount below the existing threshold incomplete", () => {
    const result = evaluateQuotationSubmissionCompleteness({
      amountNumber: 999,
      timeline: "16 months",
      message: "Complete proposal note",
    });

    expect(result.status).toBe("incomplete");
    expect(result.completedCount).toBe(2);
    expect(result.completionPercent).toBe(67);
    expect(result.missingSignals.map((signal) => signal.key)).toEqual([
      "amount",
    ]);
  });

  it("treats whitespace-only timeline and proposal note as missing", () => {
    const result = evaluateQuotationSubmissionCompleteness({
      amountNumber: 1250000,
      timeline: "   ",
      message: "\n\t",
    });

    expect(result.status).toBe("incomplete");
    expect(result.completedCount).toBe(1);
    expect(result.missingSignals.map((signal) => signal.key)).toEqual([
      "timeline",
      "proposal_note",
    ]);
  });

  it("reports partial progress deterministically", () => {
    const result = evaluateQuotationSubmissionCompleteness({
      amountNumber: 1250000,
      timeline: "16 months",
      message: "",
    });

    expect(result.status).toBe("incomplete");
    expect(result.completedCount).toBe(2);
    expect(result.totalCount).toBe(3);
    expect(result.completionPercent).toBe(67);
    expect(result.missingSignals.map((signal) => signal.key)).toEqual([
      "proposal_note",
    ]);
  });

  it("does not accept non-finite amount values", () => {
    for (const amountNumber of [Number.NaN, Number.POSITIVE_INFINITY]) {
      const result = evaluateQuotationSubmissionCompleteness({
        amountNumber,
        timeline: "16 months",
        message: "Complete proposal note",
      });

      expect(result.status).toBe("incomplete");
      expect(result.missingSignals.map((signal) => signal.key)).toEqual([
        "amount",
      ]);
    }
  });

  it("returns stable source and guidance metadata for all three inputs", () => {
    const result = evaluateQuotationSubmissionCompleteness({});

    expect(result.signals).toEqual([
      expect.objectContaining({
        key: "amount",
        label: "Quote amount",
        source: "Quotation / Quote amount",
        context: "Enter the full contract value of at least 1,000.",
      }),
      expect.objectContaining({
        key: "timeline",
        label: "Delivery timeline",
        source: "Quotation / Delivery timeline",
        context: "Enter a delivery timeline.",
      }),
      expect.objectContaining({
        key: "proposal_note",
        label: "Proposal note",
        source: "Quotation / Proposal note",
        context: "Include a proposal note.",
      }),
    ]);
  });
});
