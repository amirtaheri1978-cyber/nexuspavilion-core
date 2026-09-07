import { describe, expect, it } from "vitest";

import type { AnalyticsRFQ } from "@/lib/analytics/procurement-utils";
import type { AnalyticsQuote } from "@/lib/analytics/source-data/load-analytics-source-data";
import {
  buildCommercialInsights,
  calculateObservedQuotationOpportunity,
} from "@/lib/analytics/commercial/commercial-insights";
import { buildTopOpportunityInsight } from "@/lib/analytics/executive/opportunity-intelligence";

function rfq(
  id: string,
  {
    sourcing = "open",
    framework = "project_specific",
    deadline = null,
  }: {
    sourcing?: AnalyticsRFQ["sourcing_method"];
    framework?: AnalyticsRFQ["contract_framework"];
    deadline?: string | null;
  } = {},
): AnalyticsRFQ {
  return {
    id,
    slug: id,
    title: id,
    category: "Trade",
    location: null,
    budget: 1000,
    status: "open",
    created_at: "2026-01-01T00:00:00.000Z",
    deadline,
    procurement_scope: "subcontractor",
    sourcing_method: sourcing,
    contract_framework: framework,
  };
}

function quote(
  id: string,
  rfqId: string,
  amount: number | string | null,
): AnalyticsQuote {
  return {
    id,
    rfq_id: rfqId,
    company_id: `supplier-${id}`,
    amount,
    decision: null,
    created_at: "2026-01-15T00:00:00.000Z",
  };
}

describe("commercial insights", () => {
  it("fails closed when the workspace membership cannot view issuer commercial analytics", () => {
    const result = buildCommercialInsights({
      rfqList: [rfq("rfq-1")],
      quoteList: [
        quote("quote-1", "rfq-1", 100),
        quote("quote-2", "rfq-1", 200),
      ],
      canViewIssuerCommercialAnalytics: false,
      asOf: new Date("2026-01-31T00:00:00.000Z"),
    });

    expect(result.state).toBe("access-restricted");
    expect(result.estimatedOpportunity).toBeNull();
    expect(result.visiblePositiveQuoteCount).toBe(0);
    expect(result.rfqEvidence).toEqual([]);
  });

  it("keeps invited commercial evidence policy locked until a valid deadline is in the past", () => {
    const result = buildCommercialInsights({
      rfqList: [
        rfq("rfq-locked", {
          sourcing: "invited",
          deadline: "2026-02-15T00:00:00.000Z",
        }),
        rfq("rfq-malformed", {
          sourcing: "sealed_bid",
          deadline: "not-a-date",
        }),
      ],
      quoteList: [
        quote("quote-1", "rfq-locked", 100),
        quote("quote-2", "rfq-locked", 200),
      ],
      canViewIssuerCommercialAnalytics: true,
      asOf: new Date("2026-01-31T00:00:00.000Z"),
    });

    expect(result.state).toBe("policy-locked");
    expect(result.unlockedRfqCount).toBe(0);
    expect(result.lockedRfqCount).toBe(2);
    expect(result.estimatedOpportunity).toBeNull();
  });

  it("calculates opportunity and spread only within the same RFQ", () => {
    const rfqList = [rfq("rfq-1"), rfq("rfq-2")];
    const quoteList = [
      quote("quote-1", "rfq-1", 100),
      quote("quote-2", "rfq-1", 200),
      quote("quote-3", "rfq-2", 1000),
    ];

    const result = buildCommercialInsights({
      rfqList,
      quoteList,
      canViewIssuerCommercialAnalytics: true,
      asOf: new Date("2026-01-31T00:00:00.000Z"),
    });

    expect(result.state).toBe("available");
    expect(result.estimatedOpportunity).toBe(50);
    expect(result.comparableRfqCount).toBe(1);
    expect(
      result.rfqEvidence.find((item) => item.rfqId === "rfq-1"),
    ).toMatchObject({
      positiveQuoteCount: 2,
      averageQuote: 150,
      lowestQuote: 100,
      highestQuote: 200,
      bidSpreadPercentage: 100,
      estimatedOpportunity: 50,
    });

    expect(
      calculateObservedQuotationOpportunity({
        rfqList,
        quoteList,
      }),
    ).toEqual({
      amount: 50,
      eligibleRfqCount: 1,
      positiveQuoteCount: 3,
    });
  });

  it("uses a within-RFQ median and requires three positive quotations for the high-deviation review signal", () => {
    const result = buildCommercialInsights({
      rfqList: [
        rfq("rfq-1", {
          sourcing: "invited",
          deadline: "2026-01-01T00:00:00.000Z",
        }),
      ],
      quoteList: [
        quote("quote-1", "rfq-1", 100),
        quote("quote-2", "rfq-1", 100),
        quote("quote-3", "rfq-1", 160),
      ],
      canViewIssuerCommercialAnalytics: true,
      asOf: new Date("2026-01-31T00:00:00.000Z"),
    });

    expect(result.state).toBe("available");
    expect(result.estimatedOpportunity).toBe(20);
    expect(result.highDeviationRfqCount).toBe(1);
    expect(result.reviewThresholdPercentage).toBe(20);
    expect(result.rfqEvidence[0]).toMatchObject({
      medianQuote: 100,
      maxAbsoluteMedianDeviationPercentage: 60,
      highDeviationQuoteCount: 1,
      bidSpreadPercentage: 60,
    });
  });

  it("excludes zero, negative, non-finite, and foreign-RFQ amounts from comparable evidence", () => {
    const result = buildCommercialInsights({
      rfqList: [rfq("rfq-1")],
      quoteList: [
        quote("quote-zero", "rfq-1", 0),
        quote("quote-negative", "rfq-1", -10),
        quote("quote-invalid", "rfq-1", "not-a-number"),
        quote("quote-1", "rfq-1", 100),
        quote("quote-2", "rfq-1", 120),
        quote("quote-foreign", "rfq-foreign", 1),
      ],
      canViewIssuerCommercialAnalytics: true,
      asOf: new Date("2026-01-31T00:00:00.000Z"),
    });

    expect(result.visiblePositiveQuoteCount).toBe(2);
    expect(result.estimatedOpportunity).toBe(10);
  });

  it("keeps executive commercial opportunity language fail-closed when commercial evidence is unavailable", () => {
    const restricted = buildTopOpportunityInsight({
      topCategory: "Trade",
      potentialSavings: 0,
      avgQuotesPerRfq: 2,
      supplierCount: 5,
      commercialEvidenceState: "access-restricted",
    });

    expect(restricted.insight.summary).toContain("access restricted");
    expect(restricted.insight.recommendation).toContain(
      "authorized commercial review context",
    );
    expect(
      restricted.signals.some(
        (signal) => signal.id === "estimated-savings-opportunity",
      ),
    ).toBe(false);

    const available = buildTopOpportunityInsight({
      topCategory: "Trade",
      potentialSavings: 50_000,
      avgQuotesPerRfq: 2,
      supplierCount: 5,
      commercialEvidenceState: "available",
    });

    expect(available.insight.summary).toContain(
      "estimated 50,000 dollars in within-RFQ quotation opportunity",
    );
    expect(
      available.signals.some(
        (signal) => signal.id === "estimated-savings-opportunity",
      ),
    ).toBe(true);
  });
});
