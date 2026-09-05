export type SupplierQuotePerformance = {
  id: string;
  rfq_id: string | null;
  company_id: string | null;
  amount: number | string | null;
  decision: string | null;
  created_at: string | null;
  awarded_at: string | null;
};

export type SupplierHistorySnapshot = {
  supplierCompanyId: string;
  submittedQuoteCount: number;
  awardedQuoteCount: number;
  unsuccessfulQuoteCount: number;
  totalQuotedValue: number;
  totalAwardedValue: number;
  winRate: number;
  performanceScore: number;
};

function toFiniteNumber(
  value: number | string | null | undefined,
) {
  const parsed = Number(value);

  return Number.isFinite(parsed) ? parsed : 0;
}

function normalizeDecision(
  value: string | null | undefined,
) {
  return String(value ?? "").trim().toLowerCase();
}

function clampScore(value: number) {
  return Math.min(100, Math.max(0, Math.round(value)));
}

export function getAwardedQuotes(
  quotes: SupplierQuotePerformance[],
) {
  return quotes.filter(
    (quote) => normalizeDecision(quote.decision) === "awarded",
  );
}

export function getAwardedRevenue(
  quotes: SupplierQuotePerformance[],
) {
  return getAwardedQuotes(quotes).reduce(
    (total, quote) =>
      total + toFiniteNumber(quote.amount),
    0,
  );
}

export function getTotalQuotedValue(
  quotes: SupplierQuotePerformance[],
) {
  return quotes.reduce(
    (total, quote) =>
      total + toFiniteNumber(quote.amount),
    0,
  );
}

export function getWinRate(
  quotes: SupplierQuotePerformance[],
) {
  if (quotes.length === 0) {
    return 0;
  }

  return clampScore(
    (getAwardedQuotes(quotes).length / quotes.length) * 100,
  );
}

/**
 * Buyer-scoped historical participation evidence used by RFQ recommendation
 * inputs. Not a universal supplier trust classification.
 */
export function getPerformanceScore(
  quotes: SupplierQuotePerformance[],
) {
  const quoteCount = quotes.length;
  const awards = getAwardedQuotes(quotes).length;
  const winRate = getWinRate(quotes);
  const revenue = getAwardedRevenue(quotes);

  return clampScore(
    Math.min(quoteCount * 8, 30) +
      Math.min(awards * 15, 35) +
      winRate * 0.2 +
      Math.min(revenue / 50000, 15),
  );
}

export function buildSupplierHistorySnapshots(
  quotes: SupplierQuotePerformance[],
): SupplierHistorySnapshot[] {
  const quotesBySupplierCompanyId = new Map<
    string,
    SupplierQuotePerformance[]
  >();

  for (const quote of quotes) {
    if (!quote.company_id) {
      continue;
    }

    const supplierQuotes =
      quotesBySupplierCompanyId.get(quote.company_id) ?? [];

    supplierQuotes.push(quote);
    quotesBySupplierCompanyId.set(
      quote.company_id,
      supplierQuotes,
    );
  }

  return [...quotesBySupplierCompanyId.entries()].map(
    ([supplierCompanyId, supplierQuotes]) => {
      const awardedQuotes = getAwardedQuotes(supplierQuotes);

      return {
        supplierCompanyId,
        submittedQuoteCount: supplierQuotes.length,
        awardedQuoteCount: awardedQuotes.length,
        unsuccessfulQuoteCount: 0,
        totalQuotedValue:
          getTotalQuotedValue(supplierQuotes),
        totalAwardedValue:
          getAwardedRevenue(supplierQuotes),
        winRate: getWinRate(supplierQuotes),
        performanceScore: getPerformanceScore(supplierQuotes),
      };
    },
  );
}
