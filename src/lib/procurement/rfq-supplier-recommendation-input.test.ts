import { describe, expect, it } from "vitest";

import {
  buildRfqSupplierRecommendationInput,
  getRfqSupplierCompanyIds,
  type RfqSupplierCompany,
} from "@/lib/procurement/rfq-supplier-recommendation-input";
import type { ScoredQuote } from "@/lib/procurement/rfq-commercial-intelligence";

function buildScoredQuote(
  overrides: Partial<ScoredQuote> = {},
): ScoredQuote {
  return {
    id: "quote-1",
    company_id: "company-1",
    user_id: "user-1",
    amount: 100_000,
    timeline: "6 months",
    message: "Quality assurance and project management included.",
    decision: null,
    validity_days: 90,
    amountNumber: 100_000,
    rank: 1,
    priceScore: 94,
    timelineScore: 100,
    riskScore: 85,
    performanceScore: 82,
    totalScore: 91,
    awardConfidence: 91,
    riskLevel: "Low",
    budgetVariance: -10_000,
    lowestBidVariance: 0,
    ...overrides,
  };
}

function buildCompany(
  overrides: Partial<RfqSupplierCompany> = {},
): RfqSupplierCompany {
  return {
    id: "company-1",
    name: "Northstar Acoustics",
    category: "Acoustical Ceilings",
    location: "Toronto, Ontario",
    network_role: "Supplier",
    ...overrides,
  };
}

describe("getRfqSupplierCompanyIds", () => {
  it("returns unique verified company identifiers only", () => {
    expect(
      getRfqSupplierCompanyIds([
        buildScoredQuote(),
        buildScoredQuote({
          id: "quote-2",
          rank: 2,
        }),
        buildScoredQuote({
          id: "quote-3",
          company_id: "company-2",
        }),
        buildScoredQuote({
          id: "quote-4",
          company_id: null,
        }),
      ]),
    ).toEqual(["company-1", "company-2"]);
  });
});

describe("buildRfqSupplierRecommendationInput", () => {
  it("builds one candidate per supplier company using its strongest current quote", () => {
    const input =
      buildRfqSupplierRecommendationInput({
        rfqSlug: "hospital-acoustical-ceilings",
        rfqCategory: "Acoustical Ceilings",
        rfqLocation: "Toronto",
        procurementScope: "supply_and_install",
        sourcingMethod: "invited",
        commercialEvaluationUnlocked: true,
        scoredQuotes: [
          buildScoredQuote({
            id: "quote-lower-ranked",
            rank: 2,
            totalScore: 78,
          }),
          buildScoredQuote({
            id: "quote-leading",
            rank: 1,
            totalScore: 91,
          }),
        ],
        companies: [buildCompany()],
      });

    expect(input.candidates).toHaveLength(1);
    expect(input.candidates[0].supplierName).toBe(
      "Northstar Acoustics",
    );
    expect(input.candidates[0].currentQuote?.rank).toBe(1);
    expect(input.candidates[0].currentQuote?.totalScore).toBe(
      91,
    );
  });

  it("uses canonical commercial scores without recalculating them", () => {
    const quote = buildScoredQuote({
      priceScore: 73,
      timelineScore: 81,
      performanceScore: 67,
      riskScore: 76,
      totalScore: 74,
    });

    const input =
      buildRfqSupplierRecommendationInput({
        rfqSlug: "test-rfq",
        rfqCategory: "Acoustical Ceilings",
        rfqLocation: "Toronto",
        procurementScope: null,
        sourcingMethod: null,
        commercialEvaluationUnlocked: true,
        scoredQuotes: [quote],
        companies: [buildCompany()],
      });

    const signals = input.candidates[0].signals;

    expect(
      signals.find(
        (signal) =>
          signal.key === "commercial_competitiveness",
      )?.score,
    ).toBe(73);

    expect(
      signals.find(
        (signal) => signal.key === "delivery_reliability",
      )?.score,
    ).toBe(81);

    expect(
      signals.find(
        (signal) => signal.key === "quality_performance",
      )?.score,
    ).toBe(67);

    expect(
      signals.find(
        (signal) => signal.key === "procurement_risk",
      )?.score,
    ).toBe(76);
  });

  it("keeps unsupported AVL, historical, compliance, and capacity evidence unavailable", () => {
    const input =
      buildRfqSupplierRecommendationInput({
        rfqSlug: "test-rfq",
        rfqCategory: "Acoustical Ceilings",
        rfqLocation: "Toronto",
        procurementScope: null,
        sourcingMethod: null,
        commercialEvaluationUnlocked: true,
        scoredQuotes: [buildScoredQuote()],
        companies: [buildCompany()],
      });

    const unavailableKeys = input.candidates[0].signals
      .filter(
        (signal) =>
          signal.availability === "insufficient_data",
      )
      .map((signal) => signal.key);

    expect(unavailableKeys).toEqual([
      "avl_governance",
      "historical_award_performance",
      "response_reliability",
      "compliance_readiness",
      "capacity_confidence",
    ]);

    expect(input.candidates[0].avlStatus).toBeNull();
    expect(input.candidates[0].submittedQuoteCount).toBe(0);
    expect(input.candidates[0].totalAwardedValue).toBe(0);
  });

  it("preserves a company-linked quote as unverified when its company profile is missing", () => {
    const input =
      buildRfqSupplierRecommendationInput({
        rfqSlug: "test-rfq",
        rfqCategory: "Acoustical Ceilings",
        rfqLocation: "Toronto",
        procurementScope: null,
        sourcingMethod: null,
        commercialEvaluationUnlocked: true,
        scoredQuotes: [buildScoredQuote()],
        companies: [],
      });

    expect(input.candidates).toHaveLength(1);
    expect(input.candidates[0].supplierName).toBe(
      "Unverified Supplier",
    );

    expect(
      input.candidates[0].signals.find(
        (signal) => signal.key === "category_alignment",
      )?.availability,
    ).toBe("insufficient_data");
  });

  it("does not promote a user identifier into supplier identity", () => {
    const input =
      buildRfqSupplierRecommendationInput({
        rfqSlug: "test-rfq",
        rfqCategory: null,
        rfqLocation: null,
        procurementScope: null,
        sourcingMethod: null,
        commercialEvaluationUnlocked: true,
        scoredQuotes: [
          buildScoredQuote({
            company_id: null,
            user_id: "user-without-company",
          }),
        ],
        companies: [],
      });

    expect(input.candidates).toEqual([]);
  });
});