import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

import { resolveActivityAttentionGuidance } from "@/lib/guidance/activity-attention-guidance";

const guidanceSource = readFileSync(
  resolve(process.cwd(), "src/lib/guidance/activity-attention-guidance.ts"),
  "utf8",
).replace(/\r\n/g, "\n");

describe("activity attention guidance", () => {
  it("returns concise rationale for each supported attention type", () => {
    expect(
      resolveActivityAttentionGuidance({
        type: "addendum_action_required",
        sourceHref: "/rfq/demo",
      }),
    ).toMatchObject({
      kind: "addendum_action_required",
      actionLabel: "Open RFQ Workspace",
      sourceHref: "/rfq/demo",
    });
    expect(
      resolveActivityAttentionGuidance({
        type: "addendum_action_required",
        sourceHref: "/rfq/demo",
      })?.description,
    ).toContain("quotation readiness");

    expect(
      resolveActivityAttentionGuidance({
        type: "rfi",
        sourceHref: "/rfq/demo",
      })?.description,
    ).toContain("Private RFI");

    expect(
      resolveActivityAttentionGuidance({
        type: "rfi_response",
        sourceHref: "/rfq/demo",
      })?.description,
    ).toContain("clarification state");

    expect(
      resolveActivityAttentionGuidance({
        type: "quote",
        sourceHref: "/rfq/demo",
      })?.description,
    ).toContain("quotation activity");
    expect(
      resolveActivityAttentionGuidance({
        type: "quote",
        sourceHref: "/rfq/demo",
      })?.description.toLowerCase(),
    ).not.toContain("award evidence");
  });

  it("returns null for unknown or non-attention types", () => {
    expect(
      resolveActivityAttentionGuidance({
        type: "award",
        sourceHref: "/rfq/demo",
      }),
    ).toBeNull();
    expect(
      resolveActivityAttentionGuidance({
        type: "rfq",
        sourceHref: "/rfq/demo",
      }),
    ).toBeNull();
    expect(
      resolveActivityAttentionGuidance({
        type: null,
        sourceHref: "/rfq/demo",
      }),
    ).toBeNull();
  });

  it("keeps action links tied to caller-provided sourceHref only", () => {
    expect(
      resolveActivityAttentionGuidance({
        type: "rfi",
        sourceHref: null,
      }),
    ).toMatchObject({
      kind: "rfi",
      actionLabel: null,
      sourceHref: null,
    });

    expect(
      resolveActivityAttentionGuidance({
        type: "quote",
        sourceHref: "   ",
      }),
    ).toMatchObject({
      actionLabel: null,
      sourceHref: null,
    });
  });

  it("does not parse title or message text", () => {
    expect(guidanceSource).not.toContain("notification.title");
    expect(guidanceSource).not.toContain("notification.message");
    expect(guidanceSource).not.toContain("input.title");
    expect(guidanceSource).not.toContain("input.message");
    expect(guidanceSource).not.toContain("includes(");
    expect(guidanceSource).not.toContain("match(");
    expect(guidanceSource).not.toContain("openai");
    expect(guidanceSource).not.toContain("fetch(");
  });

  it("keeps concise professional tone without patronizing language", () => {
    const lower = guidanceSource.toLowerCase();
    for (const phrase of [
      "be ready",
      "make sure",
      "don't forget",
      "you should",
      "simply",
      "obviously",
      "critical",
      "urgent",
    ]) {
      expect(lower).not.toContain(phrase);
    }
    expect(lower).not.toMatch(/\bjust\b/);
    expect(guidanceSource).toContain("Private RFI");
    expect(guidanceSource).toContain("Addendum");
    expect(guidanceSource).toContain("RFQ workspace");
    expect(guidanceSource).toContain("Open RFQ Workspace");
  });
});
