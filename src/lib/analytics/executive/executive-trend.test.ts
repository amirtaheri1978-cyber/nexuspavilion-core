import { describe, expect, it } from "vitest";

import { buildExecutiveHistoricalPatterns } from "@/lib/analytics/executive/executive-trend";

describe("executive historical patterns", () => {
  const asOf = new Date("2026-09-01T12:00:00.000Z");

  it("compares adjacent observed 30-day windows using persisted event timestamps", () => {
    const result = buildExecutiveHistoricalPatterns({
      asOf,
      periodDays: 30,
      rfqs: [
        { created_at: "2026-08-28T12:00:00.000Z" },
        { created_at: "2026-08-10T12:00:00.000Z" },
        { created_at: "2026-07-20T12:00:00.000Z" },
      ],
      quotes: [
        {
          created_at: "2026-08-29T12:00:00.000Z",
          company_id: "supplier-a",
          amount: 200,
        },
        {
          created_at: "2026-08-20T12:00:00.000Z",
          company_id: "supplier-b",
          amount: "150",
        },
        {
          created_at: "2026-08-05T12:00:00.000Z",
          company_id: "supplier-a",
          amount: 100,
        },
        {
          created_at: "2026-07-25T12:00:00.000Z",
          company_id: "supplier-a",
          amount: 100,
        },
        {
          created_at: "2026-07-10T12:00:00.000Z",
          company_id: "supplier-a",
          amount: 50,
        },
      ],
    });

    expect(result.status).toBe("observed");
    expect(result.statusLabel).toBe("Observed Historical Evidence");

    expect(result.rfqCreation.currentValue).toBe(2);
    expect(result.rfqCreation.previousValue).toBe(1);
    expect(result.rfqCreation.direction).toBe("increasing");
    expect(result.rfqCreation.delta).toBe(1);

    expect(result.quoteSubmission.currentValue).toBe(3);
    expect(result.quoteSubmission.previousValue).toBe(2);
    expect(result.quoteSubmission.direction).toBe("increasing");

    expect(result.supplierParticipation.currentValue).toBe(2);
    expect(result.supplierParticipation.previousValue).toBe(1);
    expect(result.supplierParticipation.direction).toBe("increasing");

    expect(result.submittedQuoteValue.currentValue).toBe(450);
    expect(result.submittedQuoteValue.previousValue).toBe(150);
    expect(result.submittedQuoteValue.direction).toBe("increasing");
    expect(result.submittedQuoteValue.delta).toBe(300);

    expect(result.narrative).toContain("descriptive historical patterns");
    expect(result.narrative).toContain("not forecasts or outcome probabilities");
  });

  it("uses neutral stable and decreasing directions rather than performance judgments", () => {
    const result = buildExecutiveHistoricalPatterns({
      asOf,
      rfqs: [
        { created_at: "2026-08-25T12:00:00.000Z" },
        { created_at: "2026-07-20T12:00:00.000Z" },
      ],
      quotes: [
        {
          created_at: "2026-08-25T12:00:00.000Z",
          company_id: "supplier-a",
          amount: 100,
        },
        {
          created_at: "2026-07-25T12:00:00.000Z",
          company_id: "supplier-a",
          amount: 125,
        },
        {
          created_at: "2026-07-15T12:00:00.000Z",
          company_id: "supplier-b",
          amount: 125,
        },
      ],
    });

    expect(result.rfqCreation.direction).toBe("stable");
    expect(result.quoteSubmission.direction).toBe("decreasing");
    expect(result.supplierParticipation.direction).toBe("decreasing");
    expect(result.submittedQuoteValue.direction).toBe("decreasing");
    expect(result.rfqCreation.directionLabel).toBe("Stable");
    expect(result.quoteSubmission.directionLabel).toBe("Decreasing");
  });

  it("returns insufficient data when both comparison windows have no recorded activity", () => {
    const result = buildExecutiveHistoricalPatterns({
      asOf,
      rfqs: [{ created_at: "2025-01-01T00:00:00.000Z" }],
      quotes: [],
    });

    expect(result.status).toBe("insufficient-data");
    expect(result.statusLabel).toBe("Insufficient Recent History");
    expect(result.rfqCreation.direction).toBe("unknown");
    expect(result.quoteSubmission.direction).toBe("unknown");
    expect(result.supplierParticipation.direction).toBe("unknown");
    expect(result.submittedQuoteValue.direction).toBe("unknown");
    expect(result.narrative).toContain("Historical pattern interpretation is limited");
  });

  it("ignores invalid timestamps and non-positive or non-numeric quote values", () => {
    const result = buildExecutiveHistoricalPatterns({
      asOf,
      rfqs: [
        { created_at: "not-a-date" },
        { created_at: null },
        { created_at: "2026-08-20T12:00:00.000Z" },
      ],
      quotes: [
        {
          created_at: "2026-08-20T12:00:00.000Z",
          company_id: null,
          amount: "not-a-number",
        },
        {
          created_at: "2026-08-21T12:00:00.000Z",
          company_id: "supplier-a",
          amount: -25,
        },
        {
          created_at: "not-a-date",
          company_id: "supplier-b",
          amount: 500,
        },
      ],
    });

    expect(result.rfqCreation.currentValue).toBe(1);
    expect(result.quoteSubmission.currentValue).toBe(2);
    expect(result.supplierParticipation.currentValue).toBe(1);
    expect(result.submittedQuoteValue.currentValue).toBe(0);
    expect(result.submittedQuoteValue.direction).toBe("unknown");
  });

  it("uses a bounded default period when periodDays is invalid", () => {
    const result = buildExecutiveHistoricalPatterns({
      asOf,
      periodDays: Number.NaN,
      rfqs: [],
      quotes: [],
    });

    expect(result.periodDays).toBe(30);
  });
});
