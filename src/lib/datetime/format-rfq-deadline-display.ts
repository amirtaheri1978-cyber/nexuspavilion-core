const DEFAULT_RFQ_DISPLAY_TIMEZONE = "America/Toronto";

const DISPLAY_OPTIONS = {
  year: "numeric",
  month: "long",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
} as const;

/**
 * Present a stored UTC deadline instant in the RFQ's IANA timezone.
 * Does not change instant comparisons used for enforcement.
 * Never formats against the host/process/browser timezone.
 */
export function formatRfqDeadlineForDisplay(
  value: string | null | undefined,
  timeZone?: string | null
) {
  if (!value) return "N/A";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  const resolvedTimeZone = timeZone?.trim() || DEFAULT_RFQ_DISPLAY_TIMEZONE;

  try {
    return formatInstantInTimeZone(date, resolvedTimeZone);
  } catch {
    return formatInstantInTimeZone(date, DEFAULT_RFQ_DISPLAY_TIMEZONE);
  }
}

function formatInstantInTimeZone(date: Date, timeZone: string) {
  return `${date.toLocaleString("en-US", {
    ...DISPLAY_OPTIONS,
    timeZone,
  })} ${timeZone}`;
}
