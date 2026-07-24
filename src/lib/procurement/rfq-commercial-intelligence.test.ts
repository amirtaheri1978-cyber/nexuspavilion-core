import { describe, expect, it } from "vitest";

import {
  buildCommercialIntelligence,
  type Quote,
} from "./rfq-commercial-intelligence";

function createQuote(overrides: Partial<Quote> = {}): Quote {
  return {
    id: "quote-1",
    company_id: "company-1",
    user_id: "user-1",
    amount: 100_000,
    timeline: "6 months",
    message:
      "Healthcare experience with quality assurance, project management, and warranty coverage.",
    decision: null,
    validity_days: 120,
    ...overrides,
  };
}

describe("buildCommercialIntelligence", () => {
  it("returns no commercial intelligence while evaluation is locked", () => {
    const result = buildCommercialIntelligence({
      quoteList: [
        createQuote(),
        createQuote({
          id: "quote-2",
          amount: 90_000,
        }),
      ],
      budget: 110_000,
      commercialEvaluationUnlocked: false,
      isOwner: true,
    });

    expect(result).toEqual({
      scoredQuotes: [],
      recommendedQuote: null,
      awardedQuote: null,
      lowestAmount: null,
      highestAmount: null,
      averageBid: 0,
      potentialSavings: 0,
    });
  });

  it("builds a complete commercial score for a valid quote", () => {
    const result = buildCommercialIntelligence({
      quoteList: [createQuote()],
      budget: 110_000,
      commercialEvaluationUnlocked: true,
      isOwner: true,
    });

    expect(result.lowestAmount).toBe(100_000);
    expect(result.highestAmount).toBe(100_000);
    expect(result.averageBid).toBe(100_000);
    expect(result.potentialSavings).toBe(0);

    expect(result.scoredQuotes).toHaveLength(1);

    expect(result.scoredQuotes[0]).toMatchObject({
      id: "quote-1",
      amountNumber: 100_000,
      rank: 1,
      priceScore: 100,
      timelineScore: 100,
      performanceScore: 75,
      riskScore: 85,
      totalScore: 93,
      awardConfidence: 93,
      riskLevel: "Low",
      budgetVariance: -10_000,
      lowestBidVariance: 0,
    });

    expect(result.recommendedQuote?.id).toBe("quote-1");
  });

  it("calculates lowest, highest, and average bid values", () => {
    const result = buildCommercialIntelligence({
      quoteList: [
        createQuote({
          id: "quote-1",
          amount: 90_000,
        }),
        createQuote({
          id: "quote-2",
          amount: 100_000,
        }),
        createQuote({
          id: "quote-3",
          amount: 120_000,
        }),
      ],
      budget: 110_000,
      commercialEvaluationUnlocked: true,
      isOwner: true,
    });

    expect(result.lowestAmount).toBe(90_000);
    expect(result.highestAmount).toBe(120_000);
    expect(result.averageBid).toBe(103_333);
  });

  it("ranks suppliers by total score rather than price alone", () => {
    const result = buildCommercialIntelligence({
      quoteList: [
        createQuote({
          id: "strong-supplier",
          company_id: "strong-company",
          amount: 100_000,
          timeline: "6 months",
          message:
            "Healthcare experience with quality assurance, project management, and warranty coverage.",
          validity_days: 120,
        }),
        createQuote({
          id: "lowest-price-supplier",
          company_id: "lowest-price-company",
          amount: 90_000,
          timeline: "18 months",
          message: null,
          validity_days: 30,
        }),
      ],
      budget: 110_000,
      commercialEvaluationUnlocked: true,
      isOwner: true,
    });

    expect(result.scoredQuotes).toHaveLength(2);

    expect(result.scoredQuotes[0]).toMatchObject({
      id: "strong-supplier",
      rank: 1,
      priceScore: 90,
      timelineScore: 100,
      performanceScore: 75,
      riskScore: 85,
      totalScore: 90,
    });

    expect(result.scoredQuotes[1]).toMatchObject({
      id: "lowest-price-supplier",
      rank: 2,
      priceScore: 100,
      timelineScore: 62,
      performanceScore: 55,
      riskScore: 70,
      totalScore: 77,
    });

    expect(result.recommendedQuote?.id).toBe("strong-supplier");
  });

  it("exposes the recommendation only to the RFQ owner", () => {
    const ownerResult = buildCommercialIntelligence({
      quoteList: [createQuote()],
      budget: 110_000,
      commercialEvaluationUnlocked: true,
      isOwner: true,
    });

    const nonOwnerResult = buildCommercialIntelligence({
      quoteList: [createQuote()],
      budget: 110_000,
      commercialEvaluationUnlocked: true,
      isOwner: false,
    });

    expect(ownerResult.recommendedQuote?.id).toBe("quote-1");
    expect(nonOwnerResult.recommendedQuote).toBeNull();
    expect(nonOwnerResult.scoredQuotes).toHaveLength(1);
  });

  it("returns the supplier with an awarded decision", () => {
    const result = buildCommercialIntelligence({
      quoteList: [
        createQuote({
          id: "recommended-quote",
          decision: null,
        }),
        createQuote({
          id: "awarded-quote",
          amount: 120_000,
          timeline: "12 months",
          decision: "awarded",
        }),
      ],
      budget: 110_000,
      commercialEvaluationUnlocked: true,
      isOwner: true,
    });

    expect(result.recommendedQuote?.id).toBe("recommended-quote");
    expect(result.awardedQuote?.id).toBe("awarded-quote");
  });

  it("returns undefined when evaluation is unlocked but no quote is awarded", () => {
    const result = buildCommercialIntelligence({
      quoteList: [createQuote()],
      budget: 110_000,
      commercialEvaluationUnlocked: true,
      isOwner: true,
    });

    expect(result.awardedQuote).toBeUndefined();
  });

  it("calculates budget and lowest-bid variances for every supplier", () => {
    const result = buildCommercialIntelligence({
      quoteList: [
        createQuote({
          id: "lowest-quote",
          amount: 90_000,
        }),
        createQuote({
          id: "higher-quote",
          amount: 115_000,
        }),
      ],
      budget: 100_000,
      commercialEvaluationUnlocked: true,
      isOwner: true,
    });

    const lowestQuote = result.scoredQuotes.find(
      (quote) => quote.id === "lowest-quote",
    );

    const higherQuote = result.scoredQuotes.find(
      (quote) => quote.id === "higher-quote",
    );

    expect(lowestQuote).toMatchObject({
      amountNumber: 90_000,
      budgetVariance: -10_000,
      lowestBidVariance: 0,
    });

    expect(higherQuote).toMatchObject({
      amountNumber: 115_000,
      budgetVariance: 15_000,
      lowestBidVariance: 25_000,
    });
  });

  it("calculates potential savings against the recommended supplier", () => {
    const result = buildCommercialIntelligence({
      quoteList: [
        createQuote({
          id: "recommended-quote",
          amount: 90_000,
          timeline: "6 months",
        }),
        createQuote({
          id: "higher-quote",
          amount: 110_000,
          timeline: "18 months",
          message: null,
          validity_days: 30,
        }),
      ],
      budget: 120_000,
      commercialEvaluationUnlocked: true,
      isOwner: true,
    });

    expect(result.averageBid).toBe(100_000);
    expect(result.recommendedQuote?.id).toBe("recommended-quote");
    expect(result.potentialSavings).toBe(10_000);
  });

  it("returns zero potential savings when recommendation visibility is unavailable", () => {
    const result = buildCommercialIntelligence({
      quoteList: [
        createQuote({
          id: "quote-1",
          amount: 90_000,
        }),
        createQuote({
          id: "quote-2",
          amount: 110_000,
        }),
      ],
      budget: 120_000,
      commercialEvaluationUnlocked: true,
      isOwner: false,
    });

    expect(result.averageBid).toBe(100_000);
    expect(result.recommendedQuote).toBeNull();
    expect(result.potentialSavings).toBe(0);
  });

  it("preserves input order when suppliers have equal total scores", () => {
    const firstQuote = createQuote({
      id: "first-quote",
      company_id: "first-company",
    });

    const secondQuote = createQuote({
      id: "second-quote",
      company_id: "second-company",
    });

    const result = buildCommercialIntelligence({
      quoteList: [firstQuote, secondQuote],
      budget: 110_000,
      commercialEvaluationUnlocked: true,
      isOwner: true,
    });

    expect(result.scoredQuotes.map((quote) => quote.id)).toEqual([
      "first-quote",
      "second-quote",
    ]);

    expect(result.scoredQuotes.map((quote) => quote.rank)).toEqual([1, 2]);
  });

  it("uses thirty days as the default quote-validity period", () => {
    const quoteWithoutValidity = createQuote({
      validity_days: null,
    });

    const quoteWithThirtyDayValidity = createQuote({
      id: "thirty-day-quote",
      validity_days: 30,
    });

    const resultWithoutValidity = buildCommercialIntelligence({
      quoteList: [quoteWithoutValidity],
      budget: 110_000,
      commercialEvaluationUnlocked: true,
      isOwner: true,
    });

    const resultWithThirtyDays = buildCommercialIntelligence({
      quoteList: [quoteWithThirtyDayValidity],
      budget: 110_000,
      commercialEvaluationUnlocked: true,
      isOwner: true,
    });

    expect(resultWithoutValidity.scoredQuotes[0].totalScore).toBe(
      resultWithThirtyDays.scoredQuotes[0].totalScore,
    );
  });

  it("returns empty unlocked results when no quotes exist", () => {
    const result = buildCommercialIntelligence({
      quoteList: [],
      budget: 110_000,
      commercialEvaluationUnlocked: true,
      isOwner: true,
    });

    expect(result).toEqual({
      scoredQuotes: [],
      recommendedQuote: null,
      awardedQuote: undefined,
      lowestAmount: null,
      highestAmount: null,
      averageBid: 0,
      potentialSavings: 0,
    });
  });
});