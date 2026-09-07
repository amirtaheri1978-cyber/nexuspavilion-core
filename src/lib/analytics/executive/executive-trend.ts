export type ExecutiveTrendDirection =
  | "increasing"
  | "stable"
  | "decreasing"
  | "unknown";

export type ExecutiveTrendEvidenceState =
  | "available"
  | "limited"
  | "insufficient-data"
  | "access-restricted";

export type ExecutiveTrend = {
  direction: ExecutiveTrendDirection;
  directionLabel: string;
  evidenceState: ExecutiveTrendEvidenceState;
  evidenceLabel: string;
  currentValue: number;
  previousValue: number;
  currentObservationCount: number;
  previousObservationCount: number;
  delta?: number;
  summary: string;
};

export type ExecutiveHistoricalPatterns = {
  periodDays: number;
  currentPeriodLabel: string;
  previousPeriodLabel: string;
  status: "observed" | "limited" | "insufficient-data" | "access-restricted";
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
  canViewQuoteHistory?: boolean;
  asOf?: Date;
  periodDays?: number;
};

type BuildTrendInput = {
  label: string;
  currentValue: number;
  previousValue: number;
  currentObservationCount: number;
  previousObservationCount: number;
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

  return "had insufficient recorded evidence";
}

function evidenceLabel(state: ExecutiveTrendEvidenceState): string {
  if (state === "available") {
    return "Available";
  }

  if (state === "limited") {
    return "Limited Evidence";
  }

  if (state === "access-restricted") {
    return "Access Restricted";
  }

  return "Insufficient Data";
}

function resolveEvidenceState(
  currentObservationCount: number,
  previousObservationCount: number,
): ExecutiveTrendEvidenceState {
  if (currentObservationCount === 0 && previousObservationCount === 0) {
    return "insufficient-data";
  }

  if (currentObservationCount === 0 || previousObservationCount === 0) {
    return "limited";
  }

  return "available";
}

function buildTrend({
  label,
  currentValue,
  previousValue,
  currentObservationCount,
  previousObservationCount,
  currentPeriodLabel,
  previousPeriodLabel,
  formatValue,
}: BuildTrendInput): ExecutiveTrend {
  const state = resolveEvidenceState(
    currentObservationCount,
    previousObservationCount,
  );
  const direction = resolveDirection(currentValue, previousValue);

  if (state === "insufficient-data") {
    return {
      direction: "unknown",
      directionLabel: "Insufficient Data",
      evidenceState: state,
      evidenceLabel: evidenceLabel(state),
      currentValue,
      previousValue,
      currentObservationCount,
      previousObservationCount,
      summary: `${label}: no qualifying recorded evidence was available in either ${currentPeriodLabel} or ${previousPeriodLabel}. Evidence: Insufficient Data.`,
    };
  }

  const delta = currentValue - previousValue;
  const changeSummary =
    delta === 0
      ? "no change"
      : `${delta > 0 ? "an increase" : "a decrease"} of ${formatValue(
          Math.abs(delta),
        )}`;
  const supportSummary =
    state === "limited"
      ? "Evidence: Limited Evidence because one comparison window contains no qualifying observations."
      : `Evidence: Available from ${formatCount(
          currentObservationCount,
        )} current-window and ${formatCount(
          previousObservationCount,
        )} prior-window qualifying observations.`;

  return {
    direction,
    directionLabel: directionLabel(direction),
    evidenceState: state,
    evidenceLabel: evidenceLabel(state),
    currentValue,
    previousValue,
    currentObservationCount,
    previousObservationCount,
    delta,
    summary: `${label}: ${formatValue(currentValue)} in ${currentPeriodLabel} versus ${formatValue(previousValue)} in ${previousPeriodLabel}; ${changeSummary}. ${supportSummary}`,
  };
}

function createAccessRestrictedTrend(label: string): ExecutiveTrend {
  return {
    direction: "unknown",
    directionLabel: "Access Restricted",
    evidenceState: "access-restricted",
    evidenceLabel: "Access Restricted",
    currentValue: 0,
    previousValue: 0,
    currentObservationCount: 0,
    previousObservationCount: 0,
    summary: `${label}: access restricted for the current workspace membership; no historical comparison was calculated.`,
  };
}

function createCurrencyProvenanceTrend(): ExecutiveTrend {
  return {
    direction: "unknown",
    directionLabel: "Insufficient Data",
    evidenceState: "insufficient-data",
    evidenceLabel: "Insufficient Data",
    currentValue: 0,
    previousValue: 0,
    currentObservationCount: 0,
    previousObservationCount: 0,
    summary:
      "Submitted quote value: historical currency comparison is unavailable because the analytics quotation contract does not include currency provenance. No cross-window monetary aggregate was calculated.",
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

function countQuotesInWindow(
  quotes: HistoricalQuoteRecord[],
  startInclusive: number,
  endExclusive: number,
): number {
  return quotes.filter((quote) =>
    isInWindow(
      parseTimestamp(quote.created_at),
      startInclusive,
      endExclusive,
    ),
  ).length;
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

function countIdentifiedSupplierObservations(
  quotes: HistoricalQuoteRecord[],
  startInclusive: number,
  endExclusive: number,
): number {
  return quotes.filter((quote) => {
    const timestamp = parseTimestamp(quote.created_at);

    return (
      isInWindow(timestamp, startInclusive, endExclusive) &&
      Boolean(quote.company_id?.trim())
    );
  }).length;
}

function trendNarrative(
  trend: ExecutiveTrend,
  accessRestrictedPhrase = "was access restricted",
): string {
  if (trend.evidenceState === "access-restricted") {
    return accessRestrictedPhrase;
  }

  if (trend.evidenceState === "insufficient-data") {
    return "had insufficient recorded evidence";
  }

  if (trend.evidenceState === "limited") {
    return `${directionNarrative(trend.direction)} with limited evidence`;
  }

  return directionNarrative(trend.direction);
}

function resolveHistoricalStatus(
  rfqCreation: ExecutiveTrend,
  quoteSubmission: ExecutiveTrend,
  supplierParticipation: ExecutiveTrend,
): ExecutiveHistoricalPatterns["status"] {
  const coreStates = [
    rfqCreation.evidenceState,
    quoteSubmission.evidenceState,
    supplierParticipation.evidenceState,
  ];

  if (coreStates.every((state) => state === "available")) {
    return "observed";
  }

  if (
    coreStates.some(
      (state) => state === "available" || state === "limited",
    )
  ) {
    return "limited";
  }

  if (coreStates.some((state) => state === "access-restricted")) {
    return "access-restricted";
  }

  return "insufficient-data";
}

function historicalStatusLabel(
  status: ExecutiveHistoricalPatterns["status"],
): string {
  if (status === "observed") {
    return "Observed Historical Evidence";
  }

  if (status === "limited") {
    return "Limited Historical Evidence";
  }

  if (status === "access-restricted") {
    return "Historical Evidence Access Restricted";
  }

  return "Insufficient Recent History";
}

export function createUnknownTrend(
  summary = "Historical trend data is not yet available.",
): ExecutiveTrend {
  return {
    direction: "unknown",
    directionLabel: "Insufficient Data",
    evidenceState: "insufficient-data",
    evidenceLabel: "Insufficient Data",
    currentValue: 0,
    previousValue: 0,
    currentObservationCount: 0,
    previousObservationCount: 0,
    summary,
  };
}

export function buildExecutiveHistoricalPatterns({
  rfqs,
  quotes,
  canViewQuoteHistory = true,
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

  const rfqCreation = buildTrend({
    label: "RFQ creation activity",
    currentValue: currentRfqCount,
    previousValue: previousRfqCount,
    currentObservationCount: currentRfqCount,
    previousObservationCount: previousRfqCount,
    currentPeriodLabel,
    previousPeriodLabel,
    formatValue: formatCount,
  });

  const currentQuoteCount = canViewQuoteHistory
    ? countQuotesInWindow(quotes, currentPeriodStart, currentPeriodEnd)
    : 0;
  const previousQuoteCount = canViewQuoteHistory
    ? countQuotesInWindow(quotes, previousPeriodStart, previousPeriodEnd)
    : 0;
  const currentIdentifiedSupplierCount = canViewQuoteHistory
    ? countIdentifiedSupplierObservations(
        quotes,
        currentPeriodStart,
        currentPeriodEnd,
      )
    : 0;
  const previousIdentifiedSupplierCount = canViewQuoteHistory
    ? countIdentifiedSupplierObservations(
        quotes,
        previousPeriodStart,
        previousPeriodEnd,
      )
    : 0;

  const quoteSubmission = canViewQuoteHistory
    ? buildTrend({
        label: "Quote submission activity",
        currentValue: currentQuoteCount,
        previousValue: previousQuoteCount,
        currentObservationCount: currentQuoteCount,
        previousObservationCount: previousQuoteCount,
        currentPeriodLabel,
        previousPeriodLabel,
        formatValue: formatCount,
      })
    : createAccessRestrictedTrend("Quote submission activity");

  const supplierParticipation = canViewQuoteHistory
    ? buildTrend({
        label: "Distinct supplier participation",
        currentValue: countDistinctSuppliers(
          quotes,
          currentPeriodStart,
          currentPeriodEnd,
        ),
        previousValue: countDistinctSuppliers(
          quotes,
          previousPeriodStart,
          previousPeriodEnd,
        ),
        currentObservationCount: currentIdentifiedSupplierCount,
        previousObservationCount: previousIdentifiedSupplierCount,
        currentPeriodLabel,
        previousPeriodLabel,
        formatValue: formatCount,
      })
    : createAccessRestrictedTrend("Distinct supplier participation");

  const submittedQuoteValue = canViewQuoteHistory
    ? createCurrencyProvenanceTrend()
    : createAccessRestrictedTrend("Submitted quote value");

  const status = resolveHistoricalStatus(
    rfqCreation,
    quoteSubmission,
    supplierParticipation,
  );
  const statusLabel = historicalStatusLabel(status);

  const narrative =
    status === "insufficient-data"
      ? `No qualifying RFQ creation or quotation submission evidence was recorded across ${currentPeriodLabel} and ${previousPeriodLabel}. Historical pattern interpretation is limited until additional activity is recorded. Historical quotation value is not compared because currency provenance is not available in the analytics quotation contract.`
      : status === "access-restricted"
        ? `No qualifying RFQ creation evidence was recorded across ${currentPeriodLabel} and ${previousPeriodLabel}, and quotation-derived historical measures are access restricted for the current workspace membership. Historical interpretation remains limited.`
        : `Compared with the preceding ${normalizedPeriodDays}-day window, RFQ creation ${trendNarrative(rfqCreation)}, quote submissions ${trendNarrative(quoteSubmission, "were access restricted")}, and distinct supplier participation ${trendNarrative(supplierParticipation)}. Historical quotation value is not compared because currency provenance is not available in the analytics quotation contract. These are descriptive historical patterns from recorded events, not forecasts or outcome probabilities.`;

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
