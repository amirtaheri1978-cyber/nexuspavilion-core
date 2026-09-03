export const RFQ_DEADLINE_APPROACHING_WINDOW_HOURS = 168;
export const RFQ_DEADLINE_URGENT_WINDOW_HOURS = 72;

const HOUR_IN_MILLISECONDS = 60 * 60 * 1000;
const APPROACHING_WINDOW_MILLISECONDS =
  RFQ_DEADLINE_APPROACHING_WINDOW_HOURS * HOUR_IN_MILLISECONDS;
const URGENT_WINDOW_MILLISECONDS =
  RFQ_DEADLINE_URGENT_WINDOW_HOURS * HOUR_IN_MILLISECONDS;

export type RfqDeadlineRiskStatus =
  | "unavailable"
  | "open"
  | "approaching"
  | "urgent"
  | "expired";

export type RfqDeadlineRisk = {
  status: RfqDeadlineRiskStatus;
  millisecondsRemaining: number | null;
};

type RfqDeadlineRiskNow = string | number | Date;

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

function parseNowMilliseconds(now: RfqDeadlineRiskNow): number | null {
  if (typeof now === "number") {
    return Number.isFinite(now) ? now : null;
  }

  const nowMilliseconds =
    now instanceof Date ? now.getTime() : new Date(now).getTime();

  return Number.isNaN(nowMilliseconds) ? null : nowMilliseconds;
}

/**
 * Derives presentation-only RFQ submission deadline risk from the stored
 * deadline instant. This helper does not replace submissionClosed or server-side
 * quote enforcement. Missing/invalid deadline context is unavailable rather
 * than implicitly closed. A deadline is expired only when now is strictly later
 * than the deadline instant.
 */
export function getRfqDeadlineRisk(
  deadline: string | null | undefined,
  now: RfqDeadlineRiskNow,
): RfqDeadlineRisk {
  const deadlineMilliseconds = parseDeadlineMilliseconds(deadline);
  const nowMilliseconds = parseNowMilliseconds(now);

  if (deadlineMilliseconds === null || nowMilliseconds === null) {
    return {
      status: "unavailable",
      millisecondsRemaining: null,
    };
  }

  const millisecondsRemaining = deadlineMilliseconds - nowMilliseconds;

  if (millisecondsRemaining < 0) {
    return {
      status: "expired",
      millisecondsRemaining,
    };
  }

  if (millisecondsRemaining <= URGENT_WINDOW_MILLISECONDS) {
    return {
      status: "urgent",
      millisecondsRemaining,
    };
  }

  if (millisecondsRemaining <= APPROACHING_WINDOW_MILLISECONDS) {
    return {
      status: "approaching",
      millisecondsRemaining,
    };
  }

  return {
    status: "open",
    millisecondsRemaining,
  };
}
