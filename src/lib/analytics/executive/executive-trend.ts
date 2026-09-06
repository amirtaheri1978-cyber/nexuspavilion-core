export type ExecutiveTrendDirection =
  | "increasing"
  | "stable"
  | "decreasing"
  | "unknown";

export type ExecutiveTrend = {
  direction: ExecutiveTrendDirection;
  directionLabel: string;
  currentValue: number;
  previousValue: number;
  delta?: number;
  summary: string;
};

export type ExecutiveHistoricalPatterns = {
  periodDays: number;
  currentPeriodLabel: string;
  previousPeriodLabel: string;
  status: "observed" | "insufficient-data";
  statusLabel: string;
  narrative: string;
  rfqCreation: ExecutiveTrend;
  quoteSubmission: ExecutiveTrend;
  supplierParticipation: ExecutiveTrend;
  submittedQuoteValue: ExecutiveTrend;
};

type HistoricalRfqRecord = {
  created_at?: string | null;
};

type HistoricalQuoteRecord = {
  created_at?: string | null;
  company_id?: string | null;
  amount?: number | string | null;
};

type BuildExecutiveHistoricalPatternsInput = {
  rfqs: HistoricalRfqRecord[];
  quotes: HistoricalQuoteRecord[];
  asOf?: Date;
  periodDays?: number;
};

type BuildTrendInput = {
  label: string;
  currentValue: number;
  previousValue: number;
  currentPeriodLabel: string;
  previousPeriodLabel: string;
  formatValue: (value: number) => string;
};

const DAY_MS = 86_400_000;
const DEFAULT_PERIOD_DAYS = 30;
const MAX_PERIOD_DAYS = 365;

function normalizePeriodDays(value: number | undefined): number {
  if (!Number.isFinite(value)) {
    return DEFAULT_PERIOD_DAYS;
  }

  return Math.min(
    MAX_PERIOD_DAYS,
    Math.max(1, Math.floor(value ?? DEFAULT_PERIOD_DAYS)),
  );
}

function parseTimestamp(value: string | null | undefined): number | null {
  if (!value) {
    return null;
  }

  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? timestamp : null;
}

function formatUtcDate(timestamp: number): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(timestamp));
}

function formatPeriod(start: number, end: number): string {
  return `${formatUtcDate(start)} - ${formatUtcDate(end)}`;
}

function formatCount(value: number): string {
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 0,
  }).format(value);
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

function resolveDirection(
  currentValue: number,
  previousValue: number,
): ExecutiveTrendDirection {
  if (currentValue === 0 && previousValue === 0) {
    return "unknown";
  }

  if (currentValue > previousValue) {
    return "increasing";
  }

  if (currentValue < previousValue) {
    return "decreasing";
  }

  return "stable";
}

function directionLabel(direction: ExecutiveTrendDirection): string {
  if (direction === "increasing") {
    return "Increasing";
  }

  if (direction === "decreasing") {
    return "Decreasing";
  }

  if (direction === "stable") {
    return "Stable";
  }

  return "Insufficient Data";
}

function directionNarrative(direction: ExecutiveTrendDirection): string {
  if (direction === "increasing") {
    return "increased";
  }

  if (direction === "decreasing") {
    return "decreased";
  }

  if (direction === "stable") {
    return "was stable";
  }

  return "had no recorded activity";
}

function buildTrend({
  label,
  currentValue,
  previousValue,
  currentPeriodLabel,
  previousPeriodLabel,
  formatValue,
}: BuildTrendInput): ExecutiveTrend {
  const direction = resolveDirection(currentValue, previousValue);

  if (direction === "unknown") {
    return {
      direction,
      directionLabel: directionLabel(direction),
      currentValue,
      previousValue,
      summary: `${label}: no recorded activity was available in either ${currentPeriodLabel} or ${previousPeriodLabel}.`,
    };
  }

  const delta = currentValue - previousValue;
  const changeSummary =
    delta === 0
      ? "no change"
      : `${delta > 0 ? "an increase" : "a decrease"} of ${formatValue(
          Math.abs(delta),
        )}`;

  return {
    direction,
    directionLabel: directionLabel(direction),
    currentValue,
    previousValue,
    delta,
    summary: `${label}: ${formatValue(currentValue)} in ${currentPeriodLabel} versus ${formatValue(previousValue)} in ${previousPeriodLabel}; ${changeSummary}.`,
  };
}

function isInWindow(
  timestamp: number | null,
  startInclusive: number,
  endExclusive: number,
): boolean {
  return (
    timestamp !== null &&
    timestamp >= startInclusive &&
    timestamp < endExclusive
  );
}

function sumQuoteValue(
  quotes: HistoricalQuoteRecord[],
  startInclusive: number,
  endExclusive: number,
): number {
  return quotes.reduce((total, quote) => {
    const timestamp = parseTimestamp(quote.created_at);

    if (!isInWindow(timestamp, startInclusive, endExclusive)) {
      return total;
    }

    const amount = Number(quote.amount);
    return Number.isFinite(amount) && amount > 0 ? total + amount : total;
  }, 0);
}

function countDistinctSuppliers(
  quotes: HistoricalQuoteRecord[],
  startInclusive: number,
  endExclusive: number,
): number {
  const supplierIds = new Set<string>();

  quotes.forEach((quote) => {
    const timestamp = parseTimestamp(quote.created_at);

    if (!isInWindow(timestamp, startInclusive, endExclusive)) {
      return;
    }

    const supplierId = quote.company_id?.trim();

    if (supplierId) {
      supplierIds.add(supplierId);
    }
  });

  return supplierIds.size;
}

export function createUnknownTrend(
  summary = "Historical trend data is not yet available.",
): ExecutiveTrend {
  return {
    direction: "unknown",
    directionLabel: "Insufficient Data",
    currentValue: 0,
    previousValue: 0,
    summary,
  };
}

export function buildExecutiveHistoricalPatterns({
  rfqs,
  quotes,
  asOf = new Date(),
  periodDays,
}: BuildExecutiveHistoricalPatternsInput): ExecutiveHistoricalPatterns {
  const asOfTimestamp = asOf.getTime();

  if (!Number.isFinite(asOfTimestamp)) {
    throw new Error("Historical pattern comparison requires a valid asOf date.");
  }

  const normalizedPeriodDays = normalizePeriodDays(periodDays);
  const currentPeriodEnd = asOfTimestamp;
  const currentPeriodStart =
    currentPeriodEnd - normalizedPeriodDays * DAY_MS;
  const previousPeriodEnd = currentPeriodStart;
  const previousPeriodStart =
    previousPeriodEnd - normalizedPeriodDays * DAY_MS;

  const currentPeriodLabel = formatPeriod(
    currentPeriodStart,
    currentPeriodEnd,
  );
  const previousPeriodLabel = formatPeriod(
    previousPeriodStart,
    previousPeriodEnd,
  );

  const currentRfqCount = rfqs.filter((rfq) =>
    isInWindow(
      parseTimestamp(rfq.created_at),
      currentPeriodStart,
      currentPeriodEnd,
    ),
  ).length;

  const previousRfqCount = rfqs.filter((rfq) =>
    isInWindow(
      parseTimestamp(rfq.created_at),
      previousPeriodStart,
      previousPeriodEnd,
    ),
  ).length;

  const currentQuoteCount = quotes.filter((quote) =>
    isInWindow(
      parseTimestamp(quote.created_at),
      currentPeriodStart,
      currentPeriodEnd,
    ),
  ).length;

  const previousQuoteCount = quotes.filter((quote) =>
    isInWindow(
      parseTimestamp(quote.created_at),
      previousPeriodStart,
      previousPeriodEnd,
    ),
  ).length;

  const currentSupplierCount = countDistinctSuppliers(
    quotes,
    currentPeriodStart,
    currentPeriodEnd,
  );
  const previousSupplierCount = countDistinctSuppliers(
    quotes,
    previousPeriodStart,
    previousPeriodEnd,
  );

  const currentSubmittedQuoteValue = sumQuoteValue(
    quotes,
    currentPeriodStart,
    currentPeriodEnd,
  );
  const previousSubmittedQuoteValue = sumQuoteValue(
    quotes,
    previousPeriodStart,
    previousPeriodEnd,
  );

  const rfqCreation = buildTrend({
    label: "RFQ creation activity",
    currentValue: currentRfqCount,
    previousValue: previousRfqCount,
    currentPeriodLabel,
    previousPeriodLabel,
    formatValue: formatCount,
  });

  const quoteSubmission = buildTrend({
    label: "Quote submission activity",
    currentValue: currentQuoteCount,
    previousValue: previousQuoteCount,
    currentPeriodLabel,
    previousPeriodLabel,
    formatValue: formatCount,
  });

  const supplierParticipation = buildTrend({
    label: "Distinct supplier participation",
    currentValue: currentSupplierCount,
    previousValue: previousSupplierCount,
    currentPeriodLabel,
    previousPeriodLabel,
    formatValue: formatCount,
  });

  const submittedQuoteValue = buildTrend({
    label: "Submitted quote value",
    currentValue: currentSubmittedQuoteValue,
    previousValue: previousSubmittedQuoteValue,
    currentPeriodLabel,
    previousPeriodLabel,
    formatValue: formatCurrency,
  });

  const hasObservedActivity =
    currentRfqCount +
      previousRfqCount +
      currentQuoteCount +
      previousQuoteCount >
    0;

  const status: ExecutiveHistoricalPatterns["status"] = hasObservedActivity
    ? "observed"
    : "insufficient-data";

  const statusLabel =
    status === "observed"
      ? "Observed Historical Evidence"
      : "Insufficient Recent History";

  const narrative =
    status === "observed"
      ? `Compared with the preceding ${normalizedPeriodDays}-day window, RFQ creation ${directionNarrative(rfqCreation.direction)}, quote submissions ${directionNarrative(quoteSubmission.direction)}, distinct supplier participation ${directionNarrative(supplierParticipation.direction)}, and submitted quote value ${directionNarrative(submittedQuoteValue.direction)}. These are descriptive historical patterns from recorded events, not forecasts or outcome probabilities.`
      : `No RFQ creation or quotation submission activity was recorded across ${currentPeriodLabel} and ${previousPeriodLabel}. Historical pattern interpretation is limited until additional activity is recorded.`;

  return {
    periodDays: normalizedPeriodDays,
    currentPeriodLabel,
    previousPeriodLabel,
    status,
    statusLabel,
    narrative,
    rfqCreation,
    quoteSubmission,
    supplierParticipation,
    submittedQuoteValue,
  };
}
