import type { AnalyticsRFQ } from "@/lib/analytics/procurement-utils";
import type { AnalyticsQuote } from "@/lib/analytics/source-data/load-analytics-source-data";

export type PortfolioCategoryCount = {
  category: string;
  count: number;
};

export type PortfolioIntelligence = {
  totalRfqs: number;
  activeRfqs: number;
  awardedContracts: number;
  supplierQuotes: number;
  procurementVolume: number;
  awardedVolume: number;
  averageQuote: number;
  lowestQuote: number;
  potentialSavings: number;
  awardRate: number;
  avgQuotesPerRfq: number;
  budgetTotal: number;
  budgetUtilization: number;
  categoryCounts: Record<string, number>;
  categoryRanking: PortfolioCategoryCount[];
  topCategory: string;
};

function normalizeAmount(value: number | string | null | undefined): number {
  const amount = Number(value);

  if (!Number.isFinite(amount)) {
    return 0;
  }

  return Math.max(0, amount);
}

function isActiveRfq(status: string | null): boolean {
  return !status || status === "open";
}

function isAwardedQuote(decision: string | null): boolean {
  return decision === "awarded";
}

export function buildPortfolioIntelligence({
  rfqList,
  quoteList,
}: {
  rfqList: AnalyticsRFQ[];
  quoteList: AnalyticsQuote[];
}): PortfolioIntelligence {
  const totalRfqs = rfqList.length;

  const activeRfqs = rfqList.reduce((count, rfq) => {
    return isActiveRfq(rfq.status) ? count + 1 : count;
  }, 0);

  const supplierQuotes = quoteList.length;

  const awardedQuotes = quoteList.filter((quote) =>
    isAwardedQuote(quote.decision),
  );

  const awardedContracts = awardedQuotes.length;

  const quoteAmounts = quoteList
    .map((quote) => normalizeAmount(quote.amount))
    .filter((amount) => amount > 0);

  const procurementVolume = quoteAmounts.reduce(
    (total, amount) => total + amount,
    0,
  );

  const awardedVolume = awardedQuotes.reduce(
    (total, quote) => total + normalizeAmount(quote.amount),
    0,
  );

  const averageQuote =
    quoteAmounts.length > 0
      ? Math.round(procurementVolume / quoteAmounts.length)
      : 0;

  const lowestQuote =
    quoteAmounts.length > 0 ? Math.min(...quoteAmounts) : 0;

  const potentialSavings =
    averageQuote > lowestQuote ? averageQuote - lowestQuote : 0;

  const awardRate =
    supplierQuotes > 0
      ? Math.round((awardedContracts / supplierQuotes) * 100)
      : 0;

  const avgQuotesPerRfq =
    totalRfqs > 0
      ? Number((supplierQuotes / totalRfqs).toFixed(1))
      : 0;

  const budgetTotal = rfqList.reduce(
    (total, rfq) => total + normalizeAmount(rfq.budget),
    0,
  );

  const budgetUtilization =
    budgetTotal > 0
      ? Math.round((awardedVolume / budgetTotal) * 100)
      : 0;

  const categoryCounts = rfqList.reduce<Record<string, number>>(
    (counts, rfq) => {
      const category = rfq.category?.trim() || "Uncategorized";

      counts[category] = (counts[category] ?? 0) + 1;

      return counts;
    },
    {},
  );

  const categoryRanking = Object.entries(categoryCounts)
    .map(([category, count]) => ({
      category,
      count,
    }))
    .sort((a, b) => b.count - a.count);

  const topCategory = categoryRanking[0]?.category ?? "N/A";

  return {
    totalRfqs,
    activeRfqs,
    awardedContracts,
    supplierQuotes,
    procurementVolume,
    awardedVolume,
    averageQuote,
    lowestQuote,
    potentialSavings,
    awardRate,
    avgQuotesPerRfq,
    budgetTotal,
    budgetUtilization,
    categoryCounts,
    categoryRanking,
    topCategory,
  };
}