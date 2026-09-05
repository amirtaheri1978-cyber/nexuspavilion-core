type Quote = {
  id: string;
  rfq_id: string;
  company_id: string | null;
  amount: number | string | null;
  decision: string | null;
};

type Company = {
  id: string;
  name: string | null;
};

type BuildSupplierIntelligenceInput = {
  quoteList: Quote[];
  companyList: Company[];
};

export type SupplierPerformanceEvidence = {
  name: string | null;
  quotes: number;
  awards: number;
  revenue: number;
  winRate: number;
};

function compareSupplierEvidence(
  left: SupplierPerformanceEvidence,
  right: SupplierPerformanceEvidence,
) {
  if (right.revenue !== left.revenue) {
    return right.revenue - left.revenue;
  }

  if (right.awards !== left.awards) {
    return right.awards - left.awards;
  }

  if (right.quotes !== left.quotes) {
    return right.quotes - left.quotes;
  }

  return String(left.name ?? "").localeCompare(String(right.name ?? ""));
}

export function buildSupplierIntelligence({
  quoteList,
  companyList,
}: BuildSupplierIntelligenceInput) {
  const supplierEvidence = companyList
    .map((company) => {
      const companyQuotes = quoteList.filter(
        (quote) => quote.company_id === company.id,
      );

      const awardedQuotes = companyQuotes.filter(
        (quote) => quote.decision === "awarded",
      );

      const revenue = awardedQuotes.reduce(
        (total, quote) => total + Number(quote.amount || 0),
        0,
      );

      const winRate =
        companyQuotes.length > 0
          ? Math.round((awardedQuotes.length / companyQuotes.length) * 100)
          : 0;

      return {
        name: company.name,
        quotes: companyQuotes.length,
        awards: awardedQuotes.length,
        revenue,
        winRate,
      } satisfies SupplierPerformanceEvidence;
    })
    .filter((vendor) => vendor.quotes > 0)
    .sort(compareSupplierEvidence);

  const vendorLeaderboard = supplierEvidence.slice(0, 10);
  const supplierRanking = supplierEvidence.slice(0, 20);

  const suppliersWithAwardHistory = supplierRanking.filter(
    (supplier) => supplier.awards > 0,
  ).length;

  const suppliersWithMultipleAwards = supplierRanking.filter(
    (supplier) => supplier.awards > 1,
  ).length;

  const suppliersWithLimitedQuoteHistory = supplierRanking.filter(
    (supplier) => supplier.quotes < 3,
  ).length;

  const supplierParticipationCount = supplierRanking.length;

  const supplierDiversificationScore =
    supplierParticipationCount >= 10
      ? 100
      : Math.min(100, supplierParticipationCount * 10);

  const awardHistoryCoverage =
    supplierParticipationCount > 0
      ? Math.round(
          (suppliersWithAwardHistory / supplierParticipationCount) * 100,
        )
      : 0;

  const supplierReliabilityScore =
    supplierRanking.length > 0
      ? Math.round(
          supplierRanking.reduce((sum, vendor) => sum + vendor.winRate, 0) /
            supplierRanking.length,
        )
      : 0;

  return {
    vendorLeaderboard,
    supplierRanking,
    suppliersWithAwardHistory,
    suppliersWithMultipleAwards,
    suppliersWithLimitedQuoteHistory,
    supplierParticipationCount,
    supplierDiversificationScore,
    awardHistoryCoverage,
    supplierReliabilityScore,
  };
}
