const DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
const TIME_PATTERN = /^(\d{1,2}):(\d{2})(?::(\d{2}))?$/;

type CalendarParts = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
};

function assertValidTimeZone(timeZone: string) {
  try {
    Intl.DateTimeFormat("en-US", { timeZone }).format(new Date(0));
  } catch {
    throw new Error(`Invalid IANA timezone: ${timeZone}`);
  }
}

function parseLocalDate(localDate: string): {
  year: number;
  month: number;
  day: number;
} {
  const match = DATE_PATTERN.exec(localDate.trim());

  if (!match) {
    throw new Error(`Invalid local date: ${localDate}`);
  }

  return {
    year: Number(match[1]),
    month: Number(match[2]),
    day: Number(match[3]),
  };
}

function parseLocalTime(localTime: string): {
  hour: number;
  minute: number;
  second: number;
} {
  const match = TIME_PATTERN.exec(localTime.trim());

  if (!match) {
    throw new Error(`Invalid local time: ${localTime}`);
  }

  const hour = Number(match[1]);
  const minute = Number(match[2]);
  const second = Number(match[3] || 0);

  if (hour > 23 || minute > 59 || second > 59) {
    throw new Error(`Invalid local time: ${localTime}`);
  }

  return { hour, minute, second };
}

function getZonedParts(date: Date, timeZone: string): CalendarParts {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  });

  const values: Record<string, string> = {};

  for (const part of formatter.formatToParts(date)) {
    if (part.type !== "literal") {
      values[part.type] = part.value;
    }
  }

  let year = Number(values.year);
  let month = Number(values.month);
  let day = Number(values.day);
  let hour = Number(values.hour);

  // Some engines report midnight as hour 24.
  if (hour === 24) {
    hour = 0;
    const nextDay = new Date(Date.UTC(year, month - 1, day + 1));
    year = nextDay.getUTCFullYear();
    month = nextDay.getUTCMonth() + 1;
    day = nextDay.getUTCDate();
  }

  return {
    year,
    month,
    day,
    hour,
    minute: Number(values.minute),
    second: Number(values.second),
  };
}

function getTimeZoneOffsetMs(date: Date, timeZone: string) {
  const parts = getZonedParts(date, timeZone);
  const asUtc = Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day,
    parts.hour,
    parts.minute,
    parts.second
  );

  return asUtc - date.getTime();
}

function partsMatch(left: CalendarParts, right: CalendarParts) {
  return (
    left.year === right.year &&
    left.month === right.month &&
    left.day === right.day &&
    left.hour === right.hour &&
    left.minute === right.minute &&
    left.second === right.second
  );
}

/**
 * Convert a wall-clock date and time in an IANA timezone to a UTC ISO instant.
 *
 * Uses Intl timezone data (IANA rules, including DST). Does not use the
 * machine/server local timezone or hardcoded offsets.
 */
export function localDateTimeToUtcIso(
  localDate: string,
  localTime: string,
  timeZone: string
): string {
  const trimmedZone = timeZone.trim();

  if (!trimmedZone) {
    throw new Error("IANA timezone is required.");
  }

  assertValidTimeZone(trimmedZone);

  const { year, month, day } = parseLocalDate(localDate);
  const { hour, minute, second } = parseLocalTime(localTime);
  const desired: CalendarParts = { year, month, day, hour, minute, second };
  const desiredAsUtc = Date.UTC(year, month - 1, day, hour, minute, second);

  let utcMillis =
    desiredAsUtc - getTimeZoneOffsetMs(new Date(desiredAsUtc), trimmedZone);
  utcMillis =
    desiredAsUtc - getTimeZoneOffsetMs(new Date(utcMillis), trimmedZone);

  if (!partsMatch(getZonedParts(new Date(utcMillis), trimmedZone), desired)) {
    throw new Error(
      `Could not convert ${localDate} ${localTime} in ${trimmedZone} to UTC.`
    );
  }

  return new Date(utcMillis).toISOString();
}

export const DEFAULT_RFQ_DEADLINE_TIMEZONE = "America/Toronto";

const NAIVE_DATETIME =
  /^(\d{4}-\d{2}-\d{2})[T ](\d{2}:\d{2}(?::(\d{2}))?)$/;
const DATE_ONLY = /^(\d{4}-\d{2}-\d{2})$/;

function normalizeText(value: unknown) {
  return String(value || "").trim();
}

function normalizeTimezone(value: unknown) {
  const timezone = normalizeText(value);
  return timezone || DEFAULT_RFQ_DEADLINE_TIMEZONE;
}

function resolveLocalDateAndTime(deadline: string): {
  localDate: string;
  localTime: string;
} {
  const dateTimeMatch = NAIVE_DATETIME.exec(deadline);

  if (dateTimeMatch) {
    return {
      localDate: dateTimeMatch[1],
      localTime: dateTimeMatch[2],
    };
  }

  const dateOnlyMatch = DATE_ONLY.exec(deadline);

  if (dateOnlyMatch) {
    return {
      localDate: dateOnlyMatch[1],
      localTime: "00:00",
    };
  }

  throw new Error("Submission closing date and time are required.");
}

/**
 * Convert RFQ creation deadline inputs into the canonical stored pair:
 * UTC ISO instant + unchanged IANA timezone.
 */
export function resolveRfqDeadlineForStorage(input: {
  deadline?: unknown;
  deadline_timezone?: unknown;
}): {
  deadline: string;
  deadline_timezone: string;
} {
  const deadline_timezone = normalizeTimezone(input.deadline_timezone);
  const { localDate, localTime } = resolveLocalDateAndTime(
    normalizeText(input.deadline)
  );

  return {
    deadline: localDateTimeToUtcIso(localDate, localTime, deadline_timezone),
    deadline_timezone,
  };
}
