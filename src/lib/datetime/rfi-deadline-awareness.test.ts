import { describe, expect, it } from "vitest";

import {
  getRfiDeadlineAwareness,
  RFI_DEADLINE_APPROACHING_WINDOW_HOURS,
} from "@/lib/datetime/rfi-deadline-awareness";

const NOW = "2026-09-02T12:00:00.000Z";
const HOUR_IN_MILLISECONDS = 60 * 60 * 1000;

function deadlineHoursFromNow(hours: number) {
  return new Date(
    new Date(NOW).getTime() + hours * HOUR_IN_MILLISECONDS,
  ).toISOString();
}

describe("getRfiDeadlineAwareness", () => {
  it("keeps missing and invalid deadline context unavailable and closed", () => {
    expect(getRfiDeadlineAwareness(null, NOW)).toEqual({
      status: "unavailable",
      isClosed: true,
      millisecondsRemaining: null,
    });

    expect(getRfiDeadlineAwareness("", NOW)).toEqual({
      status: "unavailable",
      isClosed: true,
      millisecondsRemaining: null,
    });

    expect(getRfiDeadlineAwareness("not-a-deadline", NOW)).toEqual({
      status: "unavailable",
      isClosed: true,
      millisecondsRemaining: null,
    });
  });

  it("returns unavailable when the comparison instant cannot be resolved", () => {
    expect(
      getRfiDeadlineAwareness(deadlineHoursFromNow(96), "not-a-now"),
    ).toEqual({
      status: "unavailable",
      isClosed: true,
      millisecondsRemaining: null,
    });
  });

  it("returns open when more than 72 hours remain", () => {
    const result = getRfiDeadlineAwareness(deadlineHoursFromNow(73), NOW);

    expect(result).toEqual({
      status: "open",
      isClosed: false,
      millisecondsRemaining: 73 * HOUR_IN_MILLISECONDS,
    });
  });

  it("starts approaching awareness at exactly the approved 72-hour window", () => {
    const result = getRfiDeadlineAwareness(
      deadlineHoursFromNow(RFI_DEADLINE_APPROACHING_WINDOW_HOURS),
      NOW,
    );

    expect(result).toEqual({
      status: "approaching",
      isClosed: false,
      millisecondsRemaining:
        RFI_DEADLINE_APPROACHING_WINDOW_HOURS * HOUR_IN_MILLISECONDS,
    });
  });

  it("keeps the exact deadline instant open under existing strict-past semantics", () => {
    expect(getRfiDeadlineAwareness(NOW, NOW)).toEqual({
      status: "approaching",
      isClosed: false,
      millisecondsRemaining: 0,
    });
  });

  it("returns expired only after the deadline instant has passed", () => {
    const nowMilliseconds = new Date(NOW).getTime();

    expect(
      getRfiDeadlineAwareness(NOW, nowMilliseconds + 1),
    ).toEqual({
      status: "expired",
      isClosed: true,
      millisecondsRemaining: -1,
    });
  });
});