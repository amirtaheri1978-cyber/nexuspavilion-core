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
    expect(result.rfqCreation.evidenceState).toBe("available");
    expect(result.rfqCreation.delta).toBe(1);

    expect(result.quoteSubmission.currentValue).toBe(3);
    expect(result.quoteSubmission.previousValue).toBe(2);
    expect(result.quoteSubmission.direction).toBe("increasing");
    expect(result.quoteSubmission.evidenceState).toBe("available");

    expect(result.supplierParticipation.currentValue).toBe(2);
    expect(result.supplierParticipation.previousValue).toBe(1);
    expect(result.supplierParticipation.direction).toBe("increasing");
    expect(result.supplierParticipation.evidenceState).toBe("available");

    expect(result.submittedQuoteValue.evidenceState).toBe("insufficient-data");
    expect(result.submittedQuoteValue.direction).toBe("unknown");
    expect(result.submittedQuoteValue.summary).toContain("currency provenance");
    expect(result.submittedQuoteValue.summary).toContain(
      "No cross-window monetary aggregate was calculated",
    );

    expect(result.narrative).toContain("descriptive historical patterns");
    expect(result.narrative).toContain("not forecasts or outcome probabilities");
    expect(result.narrative).toContain(
      "Historical quotation value is not compared",
    );
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
    expect(result.rfqCreation.directionLabel).toBe("Stable");
    expect(result.quoteSubmission.directionLabel).toBe("Decreasing");
    expect(result.submittedQuoteValue.directionLabel).toBe("Insufficient Data");
  });

  it("marks one-sided windows as limited evidence without changing the neutral direction math", () => {
    const result = buildExecutiveHistoricalPatterns({
      asOf,
      rfqs: [{ created_at: "2026-08-25T12:00:00.000Z" }],
      quotes: [
        {
          created_at: "2026-08-24T12:00:00.000Z",
          company_id: "supplier-a",
          amount: 100,
        },
      ],
    });

    expect(result.status).toBe("limited");
    expect(result.statusLabel).toBe("Limited Historical Evidence");

    expect(result.rfqCreation.direction).toBe("increasing");
    expect(result.rfqCreation.evidenceState).toBe("limited");
    expect(result.rfqCreation.evidenceLabel).toBe("Limited Evidence");
    expect(result.rfqCreation.summary).toContain(
      "one comparison window contains no qualifying observations",
    );

    expect(result.quoteSubmission.evidenceState).toBe("limited");
    expect(result.supplierParticipation.evidenceState).toBe("limited");
    expect(result.narrative).toContain("with limited evidence");
  });

  it("inherits the existing commercial-access decision instead of treating restricted quote history as zero activity", () => {
    const result = buildExecutiveHistoricalPatterns({
      asOf,
      canViewQuoteHistory: false,
      rfqs: [
        { created_at: "2026-08-25T12:00:00.000Z" },
        { created_at: "2026-07-25T12:00:00.000Z" },
      ],
      quotes: [
        {
          created_at: "2026-08-24T12:00:00.000Z",
          company_id: "supplier-a",
          amount: 500,
        },
      ],
    });

    expect(result.status).toBe("limited");
    expect(result.rfqCreation.evidenceState).toBe("available");
    expect(result.quoteSubmission.evidenceState).toBe("access-restricted");
    expect(result.quoteSubmission.directionLabel).toBe("Access Restricted");
    expect(result.supplierParticipation.evidenceState).toBe(
      "access-restricted",
    );
    expect(result.submittedQuoteValue.evidenceState).toBe("access-restricted");
    expect(result.quoteSubmission.summary).toContain(
      "access restricted for the current workspace membership",
    );
    expect(result.narrative).toContain("quote submissions were access restricted");
    expect(result.narrative).not.toContain("$500");
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
    expect(result.narrative).toContain(
      "Historical pattern interpretation is limited",
    );
  });

  it("returns an access-restricted overall state when RFQ history is absent and quotation history cannot be evaluated", () => {
    const result = buildExecutiveHistoricalPatterns({
      asOf,
      canViewQuoteHistory: false,
      rfqs: [],
      quotes: [],
    });

    expect(result.status).toBe("access-restricted");
    expect(result.statusLabel).toBe("Historical Evidence Access Restricted");
    expect(result.rfqCreation.evidenceState).toBe("insufficient-data");
    expect(result.quoteSubmission.evidenceState).toBe("access-restricted");
    expect(result.supplierParticipation.evidenceState).toBe(
      "access-restricted",
    );
  });

  it("ignores invalid timestamps and requires supplier identifiers for supplier-participation support", () => {
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
    expect(result.rfqCreation.evidenceState).toBe("limited");
    expect(result.quoteSubmission.currentValue).toBe(2);
    expect(result.quoteSubmission.evidenceState).toBe("limited");
    expect(result.supplierParticipation.currentValue).toBe(1);
    expect(result.supplierParticipation.currentObservationCount).toBe(1);
    expect(result.supplierParticipation.evidenceState).toBe("limited");
    expect(result.submittedQuoteValue.currentValue).toBe(0);
    expect(result.submittedQuoteValue.evidenceState).toBe("insufficient-data");
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
