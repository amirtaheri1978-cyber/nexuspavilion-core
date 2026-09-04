import { describe, expect, it } from "vitest";

import {
  classifyActivityView,
  prioritizeAttentionRows,
  resolveRfqSourceHref,
} from "./activity-center-prioritization";

describe("Activity Center prioritization", () => {
  it("classifies attention, updates, and history without changing business domains", () => {
    expect(classifyActivityView("addendum_action_required")).toBe("attention");
    expect(classifyActivityView("rfi")).toBe("attention");
    expect(classifyActivityView("rfi_response")).toBe("attention");
    expect(classifyActivityView("quote")).toBe("attention");

    expect(classifyActivityView("rfq")).toBe("updates");
    expect(classifyActivityView("invitation")).toBe("updates");
    expect(classifyActivityView("award")).toBe("updates");

    expect(classifyActivityView("other")).toBe("history");
    expect(classifyActivityView(null)).toBe("history");
  });

  it("prioritizes required action before recency", () => {
    const rows = [
      {
        id: "quote-new",
        type: "quote",
        created_at: "2026-09-04T14:00:00.000Z",
      },
      {
        id: "rfi-response",
        type: "rfi_response",
        created_at: "2026-09-04T13:00:00.000Z",
      },
      {
        id: "rfi",
        type: "rfi",
        created_at: "2026-09-04T12:00:00.000Z",
      },
      {
        id: "addendum",
        type: "addendum_action_required",
        created_at: "2026-09-04T11:00:00.000Z",
      },
    ];

    expect(prioritizeAttentionRows(rows).map((row) => row.id)).toEqual([
      "addendum",
      "rfi",
      "rfi-response",
      "quote-new",
    ]);
  });

  it("uses newest-first ordering as the tie-breaker within the same action class", () => {
    const rows = [
      {
        id: "older-rfi",
        type: "rfi",
        created_at: "2026-09-04T10:00:00.000Z",
      },
      {
        id: "newer-rfi",
        type: "rfi",
        created_at: "2026-09-04T12:00:00.000Z",
      },
    ];

    expect(prioritizeAttentionRows(rows).map((row) => row.id)).toEqual([
      "newer-rfi",
      "older-rfi",
    ]);
  });

  it("does not mutate the chronological source list", () => {
    const rows = [
      {
        id: "quote",
        type: "quote",
        created_at: "2026-09-04T14:00:00.000Z",
      },
      {
        id: "addendum",
        type: "addendum_action_required",
        created_at: "2026-09-04T13:00:00.000Z",
      },
    ];

    const originalOrder = rows.map((row) => row.id);

    prioritizeAttentionRows(rows);

    expect(rows.map((row) => row.id)).toEqual(originalOrder);
  });

  it("resolves RFQ source navigation only when an authorized slug was resolved", () => {
    const sourceMap = new Map([
      ["rfq-1", "tower-envelope-rfq"],
    ]);

    expect(resolveRfqSourceHref("rfq-1", sourceMap)).toBe(
      "/rfq/tower-envelope-rfq",
    );
    expect(resolveRfqSourceHref("rfq-2", sourceMap)).toBeNull();
    expect(resolveRfqSourceHref(null, sourceMap)).toBeNull();
  });
});
