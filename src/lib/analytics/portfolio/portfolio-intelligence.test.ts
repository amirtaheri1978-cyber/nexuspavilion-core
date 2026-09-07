import { describe, expect, it } from "vitest";

import type { AnalyticsRFQ } from "@/lib/analytics/procurement-utils";
import type { AnalyticsQuote } from "@/lib/analytics/source-data/load-analytics-source-data";
import { buildPortfolioIntelligence } from "@/lib/analytics/portfolio/portfolio-intelligence";

function rfq(
  id: string,
  {
    status = "open",
    createdAt = "2026-01-01T00:00:00.000Z",
  }: {
    status?: string | null;
    createdAt?: string | null;
  } = {},
): AnalyticsRFQ {
  return {
    id,
    slug: id,
    title: id,
    category: "Trade",
    location: null,
    budget: 1000,
    status,
    created_at: createdAt,
    procurement_scope: "subcontractor",
    sourcing_method: "invited",
    contract_framework: "project_specific",
  };
}

function quote(
  id: string,
  rfqId: string,
  decision: string | null,
  amount = 100,
): AnalyticsQuote {
  return {
    id,
    rfq_id: rfqId,
    company_id: `supplier-${id}`,
    amount,
    decision,
    created_at: "2026-01-15T00:00:00.000Z",
  };
}

describe("portfolio procurement insight denominators", () => {
  it("uses explicit RFQ and quotation populations for participation and decision evidence", () => {
    const result = buildPortfolioIntelligence({
      rfqList: [
        rfq("rfq-1"),
        rfq("rfq-2", { createdAt: "2026-01-21T00:00:00.000Z" }),
        rfq("rfq-3", { status: "awarded" }),
      ],
      quoteList: [
        quote("quote-1", "rfq-1", "awarded"),
        quote("quote-2", "rfq-1", null),
        quote("quote-3", "rfq-2", "rejected"),
      ],
      asOf: new Date("2026-01-31T00:00:00.000Z"),
    });

    expect(result.procurementInsights.rfqSubmissionCoverage).toEqual({
      numerator: 2,
      denominator: 3,
      percentage: 67,
      status: "available",
    });

    expect(result.procurementInsights.quotationDecisionCoverage).toEqual({
      numerator: 2,
      denominator: 3,
      percentage: 67,
      status: "available",
    });

    expect(result.procurementInsights.quotationAwardRate).toEqual({
      numerator: 1,
      denominator: 3,
      percentage: 33,
      status: "available",
    });

    expect(result.procurementInsights.averageQuotationsPerRfq).toEqual({
      numerator: 3,
      denominator: 3,
      value: 1,
      unit: "quotations",
      status: "available",
    });

    expect(result.awardRate).toBe(33);
    expect(result.avgQuotesPerRfq).toBe(1);
  });

  it("calculates active RFQ age only from valid non-future active creation timestamps", () => {
    const result = buildPortfolioIntelligence({
      rfqList: [
        rfq("rfq-1", { createdAt: "2026-01-01T00:00:00.000Z" }),
        rfq("rfq-2", { createdAt: "2026-01-21T00:00:00.000Z" }),
        rfq("rfq-invalid", { createdAt: "not-a-date" }),
        rfq("rfq-future", { createdAt: "2026-02-10T00:00:00.000Z" }),
        rfq("rfq-awarded", {
          status: "awarded",
          createdAt: "2025-12-01T00:00:00.000Z",
        }),
      ],
      quoteList: [],
      asOf: new Date("2026-01-31T00:00:00.000Z"),
    });

    expect(result.procurementInsights.averageActiveRfqAge).toEqual({
      numerator: 40,
      denominator: 2,
      value: 20,
      unit: "days",
      status: "available",
    });
  });

  it("fails closed when a ratio or average has no denominator", () => {
    const result = buildPortfolioIntelligence({
      rfqList: [],
      quoteList: [],
      asOf: new Date("2026-01-31T00:00:00.000Z"),
    });

    expect(result.procurementInsights.rfqSubmissionCoverage.percentage).toBeNull();
    expect(result.procurementInsights.rfqSubmissionCoverage.status).toBe(
      "insufficient-data",
    );
    expect(
      result.procurementInsights.quotationDecisionCoverage.percentage,
    ).toBeNull();
    expect(result.procurementInsights.quotationAwardRate.percentage).toBeNull();
    expect(result.procurementInsights.averageQuotationsPerRfq.value).toBeNull();
    expect(result.procurementInsights.averageActiveRfqAge.value).toBeNull();
  });

  it("calculates portfolio opportunity only from comparable quotations within the same RFQ", () => {
    const result = buildPortfolioIntelligence({
      rfqList: [rfq("rfq-1"), rfq("rfq-2")],
      quoteList: [
        quote("quote-1", "rfq-1", null, 100),
        quote("quote-2", "rfq-1", null, 200),
        quote("quote-3", "rfq-2", null, 1000),
      ],
      asOf: new Date("2026-01-31T00:00:00.000Z"),
    });

    expect(result.potentialSavings).toBe(50);
  });

  it("does not infer completed procurement cycle duration from mutable RFQ status", () => {
    const result = buildPortfolioIntelligence({
      rfqList: [rfq("rfq-awarded", { status: "awarded" })],
      quoteList: [quote("quote-1", "rfq-awarded", "awarded")],
      asOf: new Date("2026-01-31T00:00:00.000Z"),
    });

    expect(result.procurementInsights.completedCycleDuration).toEqual({
      value: null,
      unit: "days",
      status: "insufficient-data",
      limitation:
        "No trusted terminal RFQ timestamp is available for completed-cycle duration.",
    });
  });
});
