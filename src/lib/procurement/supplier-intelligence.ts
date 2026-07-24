export type SupplierQuotePerformance = {
  id: string;
  rfq_id: string | null;
  company_id: string | null;
  amount: number | string | null;
  decision: string | null;
  created_at: string | null;
  awarded_at: string | null;
};

export type SupplierComplianceSignal = {
  compliance_score: number | null;
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

export function getSupplierIntelligenceScore({
  compliance,
  quotes,
}: {
  compliance: SupplierComplianceSignal | null;
  quotes: SupplierQuotePerformance[];
}) {
  const complianceScore = clampScore(
    toFiniteNumber(compliance?.compliance_score),
  );

  const quoteCount = quotes.length;
  const awardCount = getAwardedQuotes(quotes).length;

  const participationScore = Math.min(
    100,
    quoteCount * 12,
  );

  const winRateScore =
    quoteCount > 0
      ? (awardCount / quoteCount) * 100
      : 0;

  return clampScore(
    complianceScore * 0.45 +
      participationScore * 0.25 +
      winRateScore * 0.3,
  );
}

export function getSupplierIntelligenceRank(
  score: number,
) {
  const normalizedScore = clampScore(score);

  if (normalizedScore >= 90) {
    return "Strategic Supplier";
  }

  if (normalizedScore >= 75) {
    return "Preferred Supplier";
  }

  if (normalizedScore >= 60) {
    return "Qualified Supplier";
  }

  if (normalizedScore >= 35) {
    return "Developing Supplier";
  }

  return "Unqualified / Review Required";
}

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

export function getPerformanceRank(score: number) {
  const normalizedScore = clampScore(score);

  if (normalizedScore >= 85) {
    return "Excellent";
  }

  if (normalizedScore >= 70) {
    return "Strong";
  }

  if (normalizedScore >= 50) {
    return "Reliable";
  }

  if (normalizedScore >= 30) {
    return "Developing";
  }

  return "Limited Data";
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
        performanceScore:
          getPerformanceScore(supplierQuotes),
      };
    },
  );
}