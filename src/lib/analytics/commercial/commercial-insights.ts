import type { AnalyticsRFQ } from "@/lib/analytics/procurement-utils";
import {
  buildAnalyticsRfqSourceHref,
  resolveContractFramework,
  resolveSourcingMethod,
} from "@/lib/analytics/procurement-utils";
import type { AnalyticsQuote } from "@/lib/analytics/source-data/load-analytics-source-data";

export type CommercialEvidenceState =
  | "access-restricted"
  | "policy-locked"
  | "insufficient-data"
  | "available";

export type ObservedQuotationOpportunity = {
  amount: number;
  eligibleRfqCount: number;
  positiveQuoteCount: number;
};

export type CommercialRfqEvidence = {
  rfqId: string;
  title: string;
  sourceHref: string | null;
  positiveQuoteCount: number;
  averageQuote: number | null;
  lowestQuote: number | null;
  highestQuote: number | null;
  medianQuote: number | null;
  bidSpreadPercentage: number | null;
  estimatedOpportunity: number | null;
  maxAbsoluteMedianDeviationPercentage: number | null;
  highDeviationQuoteCount: number;
};

export type CommercialInsights = {
  state: CommercialEvidenceState;
  asOf: string;
  reviewThresholdPercentage: number;
  unlockedRfqCount: number;
  lockedRfqCount: number;
  visiblePositiveQuoteCount: number;
  comparableRfqCount: number;
  highDeviationRfqCount: number;
  estimatedOpportunity: number | null;
  limitation: string;
  rfqEvidence: CommercialRfqEvidence[];
};

export const HIGH_DEVIATION_REVIEW_THRESHOLD_PERCENTAGE = 20;

function normalizePositiveAmount(
  value: number | string | null | undefined,
): number | null {
  const amount = Number(value);

  if (!Number.isFinite(amount) || amount <= 0) {
    return null;
  }

  return amount;
}

function resolveAsOf(asOf: Date): Date {
  return Number.isFinite(asOf.getTime()) ? asOf : new Date();
}

function getMedian(amounts: number[]): number | null {
  if (amounts.length === 0) {
    return null;
  }

  const sorted = [...amounts].sort((a, b) => a - b);
  const midpoint = Math.floor(sorted.length / 2);

  return sorted.length % 2 === 0
    ? (sorted[midpoint - 1] + sorted[midpoint]) / 2
    : sorted[midpoint];
}

function getAverage(amounts: number[]): number | null {
  if (amounts.length === 0) {
    return null;
  }

  return (
    amounts.reduce((total, amount) => total + amount, 0) /
    amounts.length
  );
}

function getDeadlineMs(deadline: string | null | undefined): number | null {
  const normalizedDeadline = deadline?.trim();

  if (!normalizedDeadline) {
    return null;
  }

  const deadlineMs = new Date(normalizedDeadline).getTime();

  return Number.isFinite(deadlineMs) ? deadlineMs : null;
}

export function isAnalyticsCommerciallyUnlocked(
  rfq: AnalyticsRFQ,
  asOf: Date,
): boolean {
  const sourcingMethod =
    resolveSourcingMethod(rfq.sourcing_method) ?? "invited";
  const contractFramework =
    resolveContractFramework(rfq.contract_framework) ?? "project_specific";

  if (
    sourcingMethod === "open" &&
    contractFramework !== "framework"
  ) {
    return true;
  }

  const deadlineMs = getDeadlineMs(rfq.deadline);

  return deadlineMs !== null && deadlineMs < asOf.getTime();
}

function groupPositiveAmountsByRfq({
  rfqList,
  quoteList,
}: {
  rfqList: AnalyticsRFQ[];
  quoteList: AnalyticsQuote[];
}): Map<string, number[]> {
  const scopedRfqIds = new Set(rfqList.map((rfq) => rfq.id));
  const amountsByRfq = new Map<string, number[]>();

  for (const quote of quoteList) {
    if (!scopedRfqIds.has(quote.rfq_id)) {
      continue;
    }

    const amount = normalizePositiveAmount(quote.amount);

    if (amount === null) {
      continue;
    }

    const amounts = amountsByRfq.get(quote.rfq_id) ?? [];
    amounts.push(amount);
    amountsByRfq.set(quote.rfq_id, amounts);
  }

  return amountsByRfq;
}

export function calculateObservedQuotationOpportunity({
  rfqList,
  quoteList,
}: {
  rfqList: AnalyticsRFQ[];
  quoteList: AnalyticsQuote[];
}): ObservedQuotationOpportunity {
  const amountsByRfq = groupPositiveAmountsByRfq({
    rfqList,
    quoteList,
  });

  let opportunityAmount = 0;
  let eligibleRfqCount = 0;
  let positiveQuoteCount = 0;

  for (const amounts of amountsByRfq.values()) {
    positiveQuoteCount += amounts.length;

    if (amounts.length < 2) {
      continue;
    }

    const averageQuote = getAverage(amounts);
    const lowestQuote = Math.min(...amounts);

    if (averageQuote === null) {
      continue;
    }

    opportunityAmount += Math.max(0, averageQuote - lowestQuote);
    eligibleRfqCount += 1;
  }

  return {
    amount: Math.round(opportunityAmount),
    eligibleRfqCount,
    positiveQuoteCount,
  };
}

function buildRfqEvidence({
  rfq,
  amounts,
}: {
  rfq: AnalyticsRFQ;
  amounts: number[];
}): CommercialRfqEvidence {
  const averageQuote = getAverage(amounts);
  const lowestQuote = amounts.length > 0 ? Math.min(...amounts) : null;
  const highestQuote = amounts.length > 0 ? Math.max(...amounts) : null;
  const medianQuote = getMedian(amounts);

  const bidSpreadPercentage =
    amounts.length >= 2 &&
    lowestQuote !== null &&
    lowestQuote > 0 &&
    highestQuote !== null
      ? Math.round(
          ((highestQuote - lowestQuote) / lowestQuote) * 100,
        )
      : null;

  const estimatedOpportunity =
    amounts.length >= 2 &&
    averageQuote !== null &&
    lowestQuote !== null
      ? Math.round(Math.max(0, averageQuote - lowestQuote))
      : null;

  const medianDeviations =
    amounts.length >= 2 &&
    medianQuote !== null &&
    medianQuote > 0
      ? amounts.map((amount) =>
          Math.abs(((amount - medianQuote) / medianQuote) * 100),
        )
      : [];

  const maxAbsoluteMedianDeviationPercentage =
    medianDeviations.length > 0
      ? Math.round(Math.max(...medianDeviations))
      : null;

  const highDeviationQuoteCount =
    amounts.length >= 3
      ? medianDeviations.filter(
          (deviation) =>
            deviation >=
            HIGH_DEVIATION_REVIEW_THRESHOLD_PERCENTAGE,
        ).length
      : 0;

  return {
    rfqId: rfq.id,
    title: rfq.title?.trim() || "Untitled RFQ",
    sourceHref: buildAnalyticsRfqSourceHref(rfq.slug),
    positiveQuoteCount: amounts.length,
    averageQuote:
      averageQuote === null ? null : Math.round(averageQuote),
    lowestQuote,
    highestQuote,
    medianQuote:
      medianQuote === null ? null : Math.round(medianQuote),
    bidSpreadPercentage,
    estimatedOpportunity,
    maxAbsoluteMedianDeviationPercentage,
    highDeviationQuoteCount,
  };
}

export function buildCommercialInsights({
  rfqList,
  quoteList,
  canViewIssuerCommercialAnalytics,
  asOf = new Date(),
}: {
  rfqList: AnalyticsRFQ[];
  quoteList: AnalyticsQuote[];
  canViewIssuerCommercialAnalytics: boolean;
  asOf?: Date;
}): CommercialInsights {
  const resolvedAsOf = resolveAsOf(asOf);

  if (!canViewIssuerCommercialAnalytics) {
    return {
      state: "access-restricted",
      asOf: resolvedAsOf.toISOString(),
      reviewThresholdPercentage:
        HIGH_DEVIATION_REVIEW_THRESHOLD_PERCENTAGE,
      unlockedRfqCount: 0,
      lockedRfqCount: rfqList.length,
      visiblePositiveQuoteCount: 0,
      comparableRfqCount: 0,
      highDeviationRfqCount: 0,
      estimatedOpportunity: null,
      limitation:
        "Commercial pricing evidence is not available to the current workspace membership. Database row-level security remains authoritative.",
      rfqEvidence: [],
    };
  }

  const unlockedRfqs = rfqList.filter((rfq) =>
    isAnalyticsCommerciallyUnlocked(rfq, resolvedAsOf),
  );
  const unlockedRfqIds = new Set(unlockedRfqs.map((rfq) => rfq.id));
  const lockedRfqCount = rfqList.length - unlockedRfqs.length;

  if (rfqList.length > 0 && unlockedRfqs.length === 0) {
    return {
      state: "policy-locked",
      asOf: resolvedAsOf.toISOString(),
      reviewThresholdPercentage:
        HIGH_DEVIATION_REVIEW_THRESHOLD_PERCENTAGE,
      unlockedRfqCount: 0,
      lockedRfqCount,
      visiblePositiveQuoteCount: 0,
      comparableRfqCount: 0,
      highDeviationRfqCount: 0,
      estimatedOpportunity: null,
      limitation:
        "Commercial pricing remains locked under RFQ sourcing and deadline policy. Locked RFQs are excluded from commercial analytics.",
      rfqEvidence: [],
    };
  }

  const visibleUnlockedQuotes = quoteList.filter((quote) =>
    unlockedRfqIds.has(quote.rfq_id),
  );

  const amountsByRfq = groupPositiveAmountsByRfq({
    rfqList: unlockedRfqs,
    quoteList: visibleUnlockedQuotes,
  });

  const rfqEvidence = unlockedRfqs
    .map((rfq) =>
      buildRfqEvidence({
        rfq,
        amounts: amountsByRfq.get(rfq.id) ?? [],
      }),
    )
    .filter((evidence) => evidence.positiveQuoteCount > 0)
    .sort((first, second) => {
      const reviewDelta =
        Number(second.highDeviationQuoteCount > 0) -
        Number(first.highDeviationQuoteCount > 0);

      if (reviewDelta !== 0) {
        return reviewDelta;
      }

      return (
        (second.estimatedOpportunity ?? 0) -
        (first.estimatedOpportunity ?? 0)
      );
    });

  const observedOpportunity = calculateObservedQuotationOpportunity({
    rfqList: unlockedRfqs,
    quoteList: visibleUnlockedQuotes,
  });

  const highDeviationRfqCount = rfqEvidence.filter(
    (evidence) => evidence.highDeviationQuoteCount > 0,
  ).length;

  const state: CommercialEvidenceState =
    observedOpportunity.eligibleRfqCount > 0
      ? "available"
      : "insufficient-data";

  return {
    state,
    asOf: resolvedAsOf.toISOString(),
    reviewThresholdPercentage:
      HIGH_DEVIATION_REVIEW_THRESHOLD_PERCENTAGE,
    unlockedRfqCount: unlockedRfqs.length,
    lockedRfqCount,
    visiblePositiveQuoteCount:
      observedOpportunity.positiveQuoteCount,
    comparableRfqCount:
      observedOpportunity.eligibleRfqCount,
    highDeviationRfqCount,
    estimatedOpportunity:
      state === "available"
        ? observedOpportunity.amount
        : null,
    limitation:
      state === "available"
        ? "Observed quotation opportunity compares positive visible quotations within the same RFQ. It is an estimate, not realized savings or an external market benchmark."
        : "At least two positive visible quotations within the same unlocked RFQ are required for a comparable commercial opportunity estimate.",
    rfqEvidence,
  };
}
