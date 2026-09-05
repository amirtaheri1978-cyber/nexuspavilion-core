import { describe, expect, it } from "vitest";

import {
  buildSupplierHistorySnapshots,
  getAwardedQuotes,
  getAwardedRevenue,
  getTotalQuotedValue,
  getWinRate,
  type SupplierQuotePerformance,
} from "@/lib/procurement/supplier-intelligence";

function buildQuote(
  overrides: Partial<SupplierQuotePerformance> = {},
): SupplierQuotePerformance {
  return {
    id: "quote-1",
    rfq_id: "rfq-1",
    company_id: "supplier-1",
    amount: 100_000,
    decision: null,
    created_at: "2026-01-01T00:00:00.000Z",
    awarded_at: null,
    ...overrides,
  };
}

describe("supplier intelligence history", () => {
  it("normalizes awarded decisions", () => {
    const quotes = [
      buildQuote({ decision: "AWARDED" }),
      buildQuote({ id: "quote-2", decision: " awarded " }),
      buildQuote({ id: "quote-3", decision: null }),
    ];

    expect(getAwardedQuotes(quotes)).toHaveLength(2);
  });

  it("calculates quoted value, awarded value, and win rate", () => {
    const quotes = [
      buildQuote({
        amount: "100000",
        decision: "awarded",
      }),
      buildQuote({
        id: "quote-2",
        amount: 50_000,
        decision: null,
      }),
    ];

    expect(getTotalQuotedValue(quotes)).toBe(150_000);
    expect(getAwardedRevenue(quotes)).toBe(100_000);
    expect(getWinRate(quotes)).toBe(50);
  });

  it("groups buyer-scoped quote rows into supplier snapshots", () => {
    const snapshots = buildSupplierHistorySnapshots([
      buildQuote({
        id: "supplier-1-award",
        amount: 120_000,
        decision: "awarded",
      }),
      buildQuote({
        id: "supplier-1-open",
        amount: 80_000,
        decision: null,
      }),
      buildQuote({
        id: "supplier-2-award",
        company_id: "supplier-2",
        amount: 50_000,
        decision: "awarded",
      }),
    ]);

    expect(snapshots).toHaveLength(2);

    const supplierOne = snapshots.find(
      (snapshot) =>
        snapshot.supplierCompanyId === "supplier-1",
    );

    expect(supplierOne).toMatchObject({
      submittedQuoteCount: 2,
      awardedQuoteCount: 1,
      unsuccessfulQuoteCount: 0,
      totalQuotedValue: 200_000,
      totalAwardedValue: 120_000,
      winRate: 50,
    });
  });

  it("ignores quote rows without verified supplier company identity", () => {
    const snapshots = buildSupplierHistorySnapshots([
      buildQuote({ company_id: null }),
    ]);

    expect(snapshots).toEqual([]);
  });

  it("does not infer unsuccessful outcomes from unresolved decisions", () => {
    const [snapshot] = buildSupplierHistorySnapshots([
      buildQuote({ decision: null }),
      buildQuote({
        id: "quote-2",
        decision: "under_review",
      }),
    ]);

    expect(snapshot.unsuccessfulQuoteCount).toBe(0);
    expect(snapshot.awardedQuoteCount).toBe(0);
    expect(snapshot.submittedQuoteCount).toBe(2);
  });
});