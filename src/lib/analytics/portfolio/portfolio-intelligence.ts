import { calculateObservedQuotationOpportunity } from "@/lib/analytics/commercial/commercial-insights";
import type { AnalyticsRFQ } from "@/lib/analytics/procurement-utils";
import type { AnalyticsQuote } from "@/lib/analytics/source-data/load-analytics-source-data";

export type PortfolioCategoryCount = {
  category: string;
  count: number;
};

export type ProcurementRatioEvidence = {
  numerator: number;
  denominator: number;
  percentage: number | null;
  status: "available" | "insufficient-data";
};

export type ProcurementAverageEvidence = {
  numerator: number;
  denominator: number;
  value: number | null;
  unit: "days" | "quotations";
  status: "available" | "insufficient-data";
};

export type ProcurementInsightMetrics = {
  asOf: string;
  averageActiveRfqAge: ProcurementAverageEvidence;
  rfqSubmissionCoverage: ProcurementRatioEvidence;
  quotationDecisionCoverage: ProcurementRatioEvidence;
  quotationAwardRate: ProcurementRatioEvidence;
  averageQuotationsPerRfq: ProcurementAverageEvidence;
  completedCycleDuration: {
    value: null;
    unit: "days";
    status: "insufficient-data";
    limitation: string;
  };
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
  procurementInsights: ProcurementInsightMetrics;
};

const DAY_IN_MS = 24 * 60 * 60 * 1000;

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

function hasRecordedDecision(decision: string | null): boolean {
  return Boolean(decision?.trim());
}

function buildRatioEvidence(
  numerator: number,
  denominator: number,
): ProcurementRatioEvidence {
  if (denominator <= 0) {
    return {
      numerator,
      denominator: 0,
      percentage: null,
      status: "insufficient-data",
    };
  }

  return {
    numerator,
    denominator,
    percentage: Math.round((numerator / denominator) * 100),
    status: "available",
  };
}

function buildAverageEvidence({
  numerator,
  denominator,
  unit,
}: {
  numerator: number;
  denominator: number;
  unit: ProcurementAverageEvidence["unit"];
}): ProcurementAverageEvidence {
  if (denominator <= 0) {
    return {
      numerator,
      denominator: 0,
      value: null,
      unit,
      status: "insufficient-data",
    };
  }

  const rawValue = numerator / denominator;
  const value =
    unit === "quotations"
      ? Number(rawValue.toFixed(1))
      : Math.round(rawValue);

  return {
    numerator,
    denominator,
    value,
    unit,
    status: "available",
  };
}

function resolveAsOf(asOf: Date): Date {
  return Number.isFinite(asOf.getTime()) ? asOf : new Date();
}

function buildProcurementInsightMetrics({
  rfqList,
  quoteList,
  awardedContracts,
  asOf,
}: {
  rfqList: AnalyticsRFQ[];
  quoteList: AnalyticsQuote[];
  awardedContracts: number;
  asOf: Date;
}): ProcurementInsightMetrics {
  const resolvedAsOf = resolveAsOf(asOf);
  const asOfMs = resolvedAsOf.getTime();

  const activeRfqAgeDays = rfqList.flatMap((rfq) => {
    if (!isActiveRfq(rfq.status) || !rfq.created_at) {
      return [];
    }

    const createdAtMs = new Date(rfq.created_at).getTime();

    if (!Number.isFinite(createdAtMs) || createdAtMs > asOfMs) {
      return [];
    }

    return [Math.floor((asOfMs - createdAtMs) / DAY_IN_MS)];
  });

  const totalObservedActiveAgeDays = activeRfqAgeDays.reduce(
    (total, ageDays) => total + ageDays,
    0,
  );

  const scopedRfqIds = new Set(rfqList.map((rfq) => rfq.id));
  const rfqsWithSubmissions = new Set(
    quoteList
      .filter((quote) => scopedRfqIds.has(quote.rfq_id))
      .map((quote) => quote.rfq_id),
  );

  const quotationsWithRecordedDecision = quoteList.filter((quote) =>
    hasRecordedDecision(quote.decision),
  ).length;

  return {
    asOf: resolvedAsOf.toISOString(),
    averageActiveRfqAge: buildAverageEvidence({
      numerator: totalObservedActiveAgeDays,
      denominator: activeRfqAgeDays.length,
      unit: "days",
    }),
    rfqSubmissionCoverage: buildRatioEvidence(
      rfqsWithSubmissions.size,
      rfqList.length,
    ),
    quotationDecisionCoverage: buildRatioEvidence(
      quotationsWithRecordedDecision,
      quoteList.length,
    ),
    quotationAwardRate: buildRatioEvidence(
      awardedContracts,
      quoteList.length,
    ),
    averageQuotationsPerRfq: buildAverageEvidence({
      numerator: quoteList.length,
      denominator: rfqList.length,
      unit: "quotations",
    }),
    completedCycleDuration: {
      value: null,
      unit: "days",
      status: "insufficient-data",
      limitation:
        "No trusted terminal RFQ timestamp is available for completed-cycle duration.",
    },
  };
}

export function buildPortfolioIntelligence({
  rfqList,
  quoteList,
  asOf = new Date(),
}: {
  rfqList: AnalyticsRFQ[];
  quoteList: AnalyticsQuote[];
  asOf?: Date;
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

  const potentialSavings = calculateObservedQuotationOpportunity({
    rfqList,
    quoteList,
  }).amount;

  const quotationAwardRate = buildRatioEvidence(
    awardedContracts,
    supplierQuotes,
  );

  const awardRate = quotationAwardRate.percentage ?? 0;

  const averageQuotationsPerRfq = buildAverageEvidence({
    numerator: supplierQuotes,
    denominator: totalRfqs,
    unit: "quotations",
  });

  const avgQuotesPerRfq = averageQuotationsPerRfq.value ?? 0;

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

  const procurementInsights = buildProcurementInsightMetrics({
    rfqList,
    quoteList,
    awardedContracts,
    asOf,
  });

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
    procurementInsights,
  };
}
