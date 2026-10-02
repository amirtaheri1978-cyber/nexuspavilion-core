import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import {
  resolveAskNexusEvidenceView,
  type AskNexusEvidenceViewInput,
} from "@/lib/ask-nexus/ask-nexus-evidence-view";
import { resolveAskNexusTrustPolicy } from "@/lib/ask-nexus/ask-nexus-trust-policy";

const evidenceViewSource = readFileSync(
  resolve(process.cwd(), "src/lib/ask-nexus/ask-nexus-evidence-view.ts"),
  "utf8",
).replace(/\r\n/g, "\n");

function baseInput(
  overrides: Partial<AskNexusEvidenceViewInput> = {},
): AskNexusEvidenceViewInput {
  return {
    id: "flag-1",
    claim: "Coverage is incomplete.",
    explanation: "Caller-supplied producer marked incomplete coverage.",
    ...overrides,
  };
}

describe("ask nexus evidence view", () => {
  it("projects a valid claim and explanation into an evidence view", () => {
    const view = resolveAskNexusEvidenceView(
      baseInput({
        evidence: [
          {
            id: "src-1",
            label: "Coverage matrix",
            detail: "Two required fields empty.",
            authorizedHref: "/rfq/example/coverage",
          },
        ],
      }),
    );

    expect(view).toEqual({
      id: "flag-1",
      claim: "Coverage is incomplete.",
      explanation: "Caller-supplied producer marked incomplete coverage.",
      evidence: [
        {
          id: "src-1",
          label: "Coverage matrix",
          detail: "Two required fields empty.",
          href: "/rfq/example/coverage",
        },
      ],
      limitations: [],
      evidenceStatus: "supported",
      nonBinding: true,
    });
  });

  it("returns null for empty id, claim, or explanation", () => {
    expect(resolveAskNexusEvidenceView(baseInput({ id: " " }))).toBeNull();
    expect(resolveAskNexusEvidenceView(baseInput({ claim: "" }))).toBeNull();
    expect(
      resolveAskNexusEvidenceView(baseInput({ explanation: "   " })),
    ).toBeNull();
  });

  it("normalizes evidence and drops invalid sources", () => {
    const view = resolveAskNexusEvidenceView(
      baseInput({
        evidence: [
          { id: " ", label: "Bad", detail: "x" },
          { id: "ok", label: " ", detail: "x" },
          {
            id: "  kept  ",
            label: "  Kept source  ",
            detail: "  Detail text  ",
            authorizedHref: null,
          },
          { id: "empty-detail", label: "No detail", detail: "   " },
        ],
      }),
    );

    expect(view?.evidence).toEqual([
      {
        id: "kept",
        label: "Kept source",
        detail: "Detail text",
        href: null,
      },
      {
        id: "empty-detail",
        label: "No detail",
        detail: null,
        href: null,
      },
    ]);
  });

  it("deduplicates evidence by id and preserves first valid occurrence and order", () => {
    const view = resolveAskNexusEvidenceView(
      baseInput({
        evidence: [
          { id: " ", label: "Invalid", authorizedHref: "/a" },
          { id: "shared", label: "First", authorizedHref: "/first" },
          { id: "shared", label: "Second", authorizedHref: "/second" },
          { id: "later", label: "Later", authorizedHref: "/later" },
        ],
      }),
    );

    expect(view?.evidence.map((source) => source.id)).toEqual([
      "shared",
      "later",
    ]);
    expect(view?.evidence[0]?.label).toBe("First");
    expect(view?.evidence[0]?.href).toBe("/first");
  });

  it("routes authorizedHref through trust policy and nulls invalid hrefs", () => {
    const raw = "  /rfq/example/source-evidence  ";
    const trust = resolveAskNexusTrustPolicy({
      kind: "navigate",
      authorizedNavigationHref: raw,
    });

    const view = resolveAskNexusEvidenceView(
      baseInput({
        evidence: [
          {
            id: "linked",
            label: "Source",
            authorizedHref: raw,
          },
          {
            id: "missing",
            label: "Missing link",
            authorizedHref: null,
          },
          {
            id: "blank",
            label: "Blank link",
            authorizedHref: "   ",
          },
        ],
      }),
    );

    expect(trust.authorizedNavigationHref).toBe("/rfq/example/source-evidence");
    expect(view?.evidence[0]?.href).toBe(trust.authorizedNavigationHref);
    expect(view?.evidence[1]?.href).toBeNull();
    expect(view?.evidence[2]?.href).toBeNull();
    expect(evidenceViewSource).toContain("resolveAskNexusTrustPolicy");
    expect(evidenceViewSource).toContain('kind: "navigate"');
  });

  it("normalizes limitations and removes exact duplicates while preserving order", () => {
    const view = resolveAskNexusEvidenceView(
      baseInput({
        evidence: [{ id: "src", label: "Source" }],
        limitations: [
          " ",
          "  Partial source set  ",
          "Partial source set",
          "Caller withheld detail",
          "",
        ],
      }),
    );

    expect(view?.limitations).toEqual([
      "Partial source set",
      "Caller withheld detail",
    ]);
  });

  it("sets supported only with evidence and no limitations; otherwise limited", () => {
    expect(
      resolveAskNexusEvidenceView(
        baseInput({
          evidence: [{ id: "src", label: "Source" }],
          limitations: [],
        }),
      )?.evidenceStatus,
    ).toBe("supported");

    expect(
      resolveAskNexusEvidenceView(baseInput({ evidence: [] }))?.evidenceStatus,
    ).toBe("limited");

    expect(
      resolveAskNexusEvidenceView(
        baseInput({
          evidence: [{ id: "src", label: "Source" }],
          limitations: ["Incomplete producer payload"],
        }),
      )?.evidenceStatus,
    ).toBe("limited");
  });

  it("always returns nonBinding true for valid views", () => {
    const supported = resolveAskNexusEvidenceView(
      baseInput({ evidence: [{ id: "src", label: "Source" }] }),
    );
    const limited = resolveAskNexusEvidenceView(baseInput());

    expect(supported?.nonBinding).toBe(true);
    expect(limited?.nonBinding).toBe(true);
  });

  it("does not parse claim or explanation text for business meaning", () => {
    const claim =
      "High risk missing compliance award quote supplier severity status role permissions";
    const explanation =
      "Producer text mentioning readiness recommendation and confidence must stay literal.";

    const view = resolveAskNexusEvidenceView(
      baseInput({
        claim,
        explanation,
        evidence: [],
      }),
    );

    expect(view?.claim).toBe(claim);
    expect(view?.explanation).toBe(explanation);
    expect(view?.evidenceStatus).toBe("limited");
    expect(evidenceViewSource).not.toContain("includes(");
    expect(evidenceViewSource).not.toContain(".match(");
    expect(evidenceViewSource).not.toContain("toLowerCase(");
    expect(evidenceViewSource).not.toContain("high risk");
    expect(evidenceViewSource).not.toContain("severity");
  });

  it("exposes no confidence, severity, risk, readiness, or recommendation fields", () => {
    const view = resolveAskNexusEvidenceView(
      baseInput({ evidence: [{ id: "src", label: "Source" }] }),
    );

    expect(view).toBeTruthy();
    expect(view).not.toHaveProperty("confidence");
    expect(view).not.toHaveProperty("severity");
    expect(view).not.toHaveProperty("risk");
    expect(view).not.toHaveProperty("riskLevel");
    expect(view).not.toHaveProperty("readiness");
    expect(view).not.toHaveProperty("recommendation");
    expect(view).not.toHaveProperty("probability");
    expect(view).not.toHaveProperty("score");
  });

  it("does not import producers, UI, data, AI, or synthesize routes", () => {
    expect(evidenceViewSource).not.toContain("executive-evidence");
    expect(evidenceViewSource).not.toContain("EXECUTIVE_EVIDENCE_THRESHOLDS");
    expect(evidenceViewSource).not.toContain("executive-ai-explainability");
    expect(evidenceViewSource).not.toContain("application-nav");
    expect(evidenceViewSource).not.toContain("@/lib/supabase");
    expect(evidenceViewSource).not.toContain("createClient");
    expect(evidenceViewSource).not.toContain("fetch(");
    expect(evidenceViewSource).not.toContain("@/lib/ai");
    expect(evidenceViewSource).not.toContain("openai");
    expect(evidenceViewSource).not.toContain("procurement-context-repository");
    expect(evidenceViewSource).not.toContain("load-analytics-source-data");
    expect(evidenceViewSource).not.toContain('"/rfq/');
    expect(evidenceViewSource).not.toContain("'/rfq/");
    expect(evidenceViewSource).not.toContain("`/rfq/");
    expect(evidenceViewSource).not.toContain("encodeURIComponent");
    expect(evidenceViewSource).not.toContain("${");
  });

  it("has no mutation, role inference, or consequential-action logic", () => {
    expect(evidenceViewSource).not.toContain("consequential_action");
    expect(evidenceViewSource).not.toContain("permissionGranted");
    expect(evidenceViewSource).not.toContain("workspaceRole");
    expect(evidenceViewSource).not.toContain("hasPermission");
    expect(evidenceViewSource).not.toContain("router.push");
    expect(evidenceViewSource).not.toContain("window.location");
    expect(evidenceViewSource).not.toContain("useRouter");
    expect(evidenceViewSource).toContain(
      'from "@/lib/ask-nexus/ask-nexus-trust-policy"',
    );
  });
});
