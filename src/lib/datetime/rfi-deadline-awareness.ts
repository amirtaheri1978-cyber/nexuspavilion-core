export const RFI_DEADLINE_APPROACHING_WINDOW_HOURS = 72;

const HOUR_IN_MILLISECONDS = 60 * 60 * 1000;
const APPROACHING_WINDOW_MILLISECONDS =
  RFI_DEADLINE_APPROACHING_WINDOW_HOURS * HOUR_IN_MILLISECONDS;

export type RfiDeadlineAwarenessStatus =
  | "unavailable"
  | "open"
  | "approaching"
  | "expired";

export type RfiDeadlineAwareness = {
  status: RfiDeadlineAwarenessStatus;
  isClosed: boolean;
  millisecondsRemaining: number | null;
};

type RfiDeadlineNow = string | number | Date;

function parseDeadlineMilliseconds(
  deadline: string | null | undefined,
): number | null {
  const normalizedDeadline = deadline?.trim();

  if (!normalizedDeadline) {
    return null;
  }

  const parsedDeadline = new Date(normalizedDeadline);
  const deadlineMilliseconds = parsedDeadline.getTime();

  return Number.isNaN(deadlineMilliseconds) ? null : deadlineMilliseconds;
}

function parseNowMilliseconds(now: RfiDeadlineNow): number | null {
  if (typeof now === "number") {
    return Number.isFinite(now) ? now : null;
  }

  const nowMilliseconds =
    now instanceof Date ? now.getTime() : new Date(now).getTime();

  return Number.isNaN(nowMilliseconds) ? null : nowMilliseconds;
}

/**
 * Derives contextual RFI deadline awareness without changing the server-side
 * enforcement boundary. Missing or invalid deadline context remains closed,
 * matching the existing client behavior. A deadline is expired only when the
 * current instant is strictly later than the deadline instant.
 */
export function getRfiDeadlineAwareness(
  deadline: string | null | undefined,
  now: RfiDeadlineNow,
): RfiDeadlineAwareness {
  const deadlineMilliseconds = parseDeadlineMilliseconds(deadline);
  const nowMilliseconds = parseNowMilliseconds(now);

  if (deadlineMilliseconds === null || nowMilliseconds === null) {
    return {
      status: "unavailable",
      isClosed: true,
      millisecondsRemaining: null,
    };
  }

  const millisecondsRemaining = deadlineMilliseconds - nowMilliseconds;

  if (millisecondsRemaining < 0) {
    return {
      status: "expired",
      isClosed: true,
      millisecondsRemaining,
    };
  }

  if (millisecondsRemaining <= APPROACHING_WINDOW_MILLISECONDS) {
    return {
      status: "approaching",
      isClosed: false,
      millisecondsRemaining,
    };
  }

  return {
    status: "open",
    isClosed: false,
    millisecondsRemaining,
  };
}