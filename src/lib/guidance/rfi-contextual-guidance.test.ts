import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

import { resolveRfiContextualGuidance } from "@/lib/guidance/rfi-contextual-guidance";

const guidanceSource = readFileSync(
  resolve(process.cwd(), "src/lib/guidance/rfi-contextual-guidance.ts"),
  "utf8",
).replace(/\r\n/g, "\n");

describe("rfi contextual guidance", () => {
  it("produces approaching-deadline guidance without copying the status pill", () => {
    const owner = resolveRfiContextualGuidance({
      isOwner: true,
      deadlineStatus: "approaching",
      openRfiCount: 2,
    });
    const respondent = resolveRfiContextualGuidance({
      isOwner: false,
      deadlineStatus: "approaching",
      openRfiCount: 0,
    });

    expect(owner?.kind).toBe("deadline-approaching");
    expect(owner?.description).toContain("Review and respond");
    expect(respondent?.kind).toBe("deadline-approaching");
    expect(respondent?.description).toContain("confidential");
    expect(owner?.description).not.toContain(
      "RFI window closes within 72 hours",
    );
    expect(respondent?.title).not.toContain(
      "RFI window closes within 72 hours",
    );
  });

  it("guides owners with open RFIs while the window remains open", () => {
    expect(
      resolveRfiContextualGuidance({
        isOwner: true,
        deadlineStatus: "open",
        openRfiCount: 3,
      }),
    ).toMatchObject({
      kind: "owner-open-rfis",
    });

    expect(
      resolveRfiContextualGuidance({
        isOwner: true,
        deadlineStatus: "open",
        openRfiCount: 0,
      }),
    ).toBeNull();

    expect(
      resolveRfiContextualGuidance({
        isOwner: false,
        deadlineStatus: "open",
        openRfiCount: 2,
      }),
    ).toBeNull();
  });

  it("surfaces ambiguity guidance only when the signal is explicitly true", () => {
    expect(
      resolveRfiContextualGuidance({
        isOwner: true,
        deadlineStatus: "open",
        openRfiCount: 0,
        ambiguityDetected: true,
      })?.kind,
    ).toBe("ambiguity");

    expect(
      resolveRfiContextualGuidance({
        isOwner: false,
        deadlineStatus: "open",
        openRfiCount: 0,
        ambiguityDetected: false,
      }),
    ).toBeNull();

    expect(
      resolveRfiContextualGuidance({
        isOwner: true,
        deadlineStatus: "open",
        openRfiCount: 0,
      }),
    ).toBeNull();
  });

  it("surfaces Addendum guidance only when addendum impact is explicitly true", () => {
    const guidance = resolveRfiContextualGuidance({
      isOwner: true,
      deadlineStatus: "open",
      openRfiCount: 1,
      addendumImpactDetected: true,
    });

    expect(guidance?.kind).toBe("addendum-impact");
    expect(guidance?.description).toContain("formal Addendum workflow");
    expect(guidance?.description).toContain("originating respondent company");

    expect(
      resolveRfiContextualGuidance({
        isOwner: true,
        deadlineStatus: "open",
        openRfiCount: 1,
        addendumImpactDetected: false,
      })?.kind,
    ).toBe("owner-open-rfis");
  });

  it("returns no guidance when no justified context applies", () => {
    expect(
      resolveRfiContextualGuidance({
        isOwner: false,
        deadlineStatus: "open",
        openRfiCount: 0,
      }),
    ).toBeNull();

    expect(
      resolveRfiContextualGuidance({
        isOwner: true,
        deadlineStatus: "expired",
        openRfiCount: 2,
      }),
    ).toBeNull();

    expect(
      resolveRfiContextualGuidance({
        isOwner: false,
        deadlineStatus: "unavailable",
        openRfiCount: 0,
      }),
    ).toBeNull();
  });

  it("never parses RFI text and only accepts explicit ambiguity or addendum signals", () => {
    expect(guidanceSource).not.toContain("question");
    expect(guidanceSource).not.toContain("response_text");
    expect(guidanceSource).not.toContain("includes(");
    expect(guidanceSource).not.toContain("match(");
    expect(guidanceSource).not.toContain("openai");
    expect(guidanceSource).not.toContain("fetch(");
    expect(guidanceSource).toContain("ambiguityDetected === true");
    expect(guidanceSource).toContain("addendumImpactDetected === true");
  });
});
