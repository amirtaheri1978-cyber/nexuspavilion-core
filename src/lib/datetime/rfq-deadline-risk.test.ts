import { describe, expect, it } from "vitest";

import {
  RFQ_DEADLINE_APPROACHING_WINDOW_HOURS,
  RFQ_DEADLINE_URGENT_WINDOW_HOURS,
  getRfqDeadlineRisk,
} from "./rfq-deadline-risk";

const HOUR = 60 * 60 * 1000;

describe("getRfqDeadlineRisk", () => {
  const deadline = "2026-09-10T12:00:00.000Z";
  const deadlineMs = new Date(deadline).getTime();

  it("keeps missing and invalid deadline context unavailable without implying expiry", () => {
    for (const value of [null, undefined, "", "not-a-date"]) {
      expect(getRfqDeadlineRisk(value, deadlineMs)).toEqual({
        status: "unavailable",
        millisecondsRemaining: null,
      });
    }
  });

  it("keeps invalid now context unavailable", () => {
    expect(getRfqDeadlineRisk(deadline, "not-a-date")).toEqual({
      status: "unavailable",
      millisecondsRemaining: null,
    });
  });

  it("keeps deadlines beyond seven days open", () => {
    const now = deadlineMs - (RFQ_DEADLINE_APPROACHING_WINDOW_HOURS * HOUR + 1);

    expect(getRfqDeadlineRisk(deadline, now).status).toBe("open");
  });

  it("starts the approaching band inclusively at exactly seven days", () => {
    const now = deadlineMs - RFQ_DEADLINE_APPROACHING_WINDOW_HOURS * HOUR;
    const result = getRfqDeadlineRisk(deadline, now);

    expect(result.status).toBe("approaching");
    expect(result.millisecondsRemaining).toBe(
      RFQ_DEADLINE_APPROACHING_WINDOW_HOURS * HOUR,
    );
  });

  it("keeps the interval immediately above 72 hours approaching", () => {
    const now = deadlineMs - (RFQ_DEADLINE_URGENT_WINDOW_HOURS * HOUR + 1);

    expect(getRfqDeadlineRisk(deadline, now).status).toBe("approaching");
  });

  it("starts the urgent band inclusively at exactly 72 hours", () => {
    const now = deadlineMs - RFQ_DEADLINE_URGENT_WINDOW_HOURS * HOUR;
    const result = getRfqDeadlineRisk(deadline, now);

    expect(result.status).toBe("urgent");
    expect(result.millisecondsRemaining).toBe(
      RFQ_DEADLINE_URGENT_WINDOW_HOURS * HOUR,
    );
  });

  it("keeps exact deadline equality urgent rather than expired", () => {
    expect(getRfqDeadlineRisk(deadline, deadlineMs)).toEqual({
      status: "urgent",
      millisecondsRemaining: 0,
    });
  });

  it("expires only after the deadline instant has passed", () => {
    expect(getRfqDeadlineRisk(deadline, deadlineMs + 1)).toEqual({
      status: "expired",
      millisecondsRemaining: -1,
    });
  });

  it("publishes the approved RFQ-specific 7-day and 72-hour thresholds", () => {
    expect(RFQ_DEADLINE_APPROACHING_WINDOW_HOURS).toBe(168);
    expect(RFQ_DEADLINE_URGENT_WINDOW_HOURS).toBe(72);
  });
});
