import { describe, expect, it } from "vitest";

import { buildSupplierIntelligence } from "@/lib/analytics/supplier-intelligence";

describe("supplier intelligence population denominators", () => {
  it("keeps display ranking capped while calculating aggregates from the full supplier population", () => {
    const companyList = Array.from({ length: 25 }, (_, index) => ({
      id: `supplier-${index + 1}`,
      name: `Supplier ${String(index + 1).padStart(2, "0")}`,
    }));

    const quoteList = companyList.map((company, index) => ({
      id: `quote-${index + 1}`,
      rfq_id: `rfq-${(index % 3) + 1}`,
      company_id: company.id,
      amount: 1000 + index,
      decision: index < 5 ? "awarded" : null,
    }));

    const result = buildSupplierIntelligence({
      quoteList,
      companyList,
    });

    expect(result.vendorLeaderboard).toHaveLength(10);
    expect(result.supplierRanking).toHaveLength(20);

    expect(result.supplierParticipationCount).toBe(25);
    expect(result.suppliersWithAwardHistory).toBe(5);
    expect(result.suppliersWithMultipleAwards).toBe(0);
    expect(result.suppliersWithLimitedQuoteHistory).toBe(25);
    expect(result.awardHistoryCoverage).toBe(20);
    expect(result.supplierDiversificationScore).toBe(100);
    expect(result.supplierReliabilityScore).toBe(20);
  });
});
