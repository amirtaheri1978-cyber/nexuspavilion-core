import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import {
  resolveAskNexusDeepLinkActions,
  type AskNexusDeepLinkInput,
  type AskNexusDeepLinkKind,
} from "@/lib/ask-nexus/ask-nexus-deep-link-actions";
import { resolveAskNexusTrustPolicy } from "@/lib/ask-nexus/ask-nexus-trust-policy";

const deepLinkSource = readFileSync(
  resolve(process.cwd(), "src/lib/ask-nexus/ask-nexus-deep-link-actions.ts"),
  "utf8",
).replace(/\r\n/g, "\n");

const ALL_KINDS: readonly AskNexusDeepLinkKind[] = [
  "bid_rules",
  "rfi",
  "compliance",
  "source_evidence",
  "other",
] as const;

function input(
  overrides: Partial<AskNexusDeepLinkInput> &
    Pick<AskNexusDeepLinkInput, "id" | "authorizedHref">,
): AskNexusDeepLinkInput {
  return {
    label: overrides.label ?? `Label ${overrides.id}`,
    kind: overrides.kind ?? "other",
    ...overrides,
  };
}

describe("ask nexus deep link actions", () => {
  it("projects a valid caller-authorized href into a navigation-ready action", () => {
    const href = "/rfq/example/bid-rules";
    const actions = resolveAskNexusDeepLinkActions([
      input({
        id: "bid-rules",
        label: "Bid Rules",
        kind: "bid_rules",
        authorizedHref: href,
      }),
    ]);

    expect(actions).toEqual([
      {
        id: "bid-rules",
        label: "Bid Rules",
        kind: "bid_rules",
        href,
        allowed: true,
        status: "navigation_ready",
      },
    ]);
  });

  it("trims whitespace on id, label, and authorized href", () => {
    const href = "/rfq/example/rfi";
    const actions = resolveAskNexusDeepLinkActions([
      input({
        id: "  rfi  ",
        label: "  Private RFI  ",
        kind: "rfi",
        authorizedHref: `  ${href}  `,
      }),
    ]);

    expect(actions).toEqual([
      {
        id: "rfi",
        label: "Private RFI",
        kind: "rfi",
        href,
        allowed: true,
        status: "navigation_ready",
      },
    ]);
  });

  it("drops missing or empty authorized href", () => {
    expect(
      resolveAskNexusDeepLinkActions([
        input({ id: "missing", authorizedHref: null }),
        input({ id: "empty", authorizedHref: "" }),
        input({ id: "blank", authorizedHref: "   " }),
        input({ id: "ok", authorizedHref: "/ok" }),
      ]),
    ).toEqual([
      {
        id: "ok",
        label: "Label ok",
        kind: "other",
        href: "/ok",
        allowed: true,
        status: "navigation_ready",
      },
    ]);
  });

  it("drops empty id or label", () => {
    expect(
      resolveAskNexusDeepLinkActions([
        input({ id: " ", label: "Valid", authorizedHref: "/a" }),
        input({ id: "valid", label: " ", authorizedHref: "/b" }),
        input({ id: "", label: "Valid", authorizedHref: "/c" }),
        input({ id: "kept", label: "Kept", authorizedHref: "/d" }),
      ]),
    ).toEqual([
      {
        id: "kept",
        label: "Kept",
        kind: "other",
        href: "/d",
        allowed: true,
        status: "navigation_ready",
      },
    ]);
  });

  it("deduplicates by id and preserves the first valid occurrence", () => {
    const actions = resolveAskNexusDeepLinkActions([
      input({
        id: "shared",
        label: "Invalid first",
        authorizedHref: null,
      }),
      input({
        id: "shared",
        label: "First valid",
        kind: "compliance",
        authorizedHref: "/compliance/first",
      }),
      input({
        id: "shared",
        label: "Second valid",
        kind: "compliance",
        authorizedHref: "/compliance/second",
      }),
      input({
        id: "other",
        label: "Other",
        authorizedHref: "/other",
      }),
    ]);

    expect(actions.map((action) => action.href)).toEqual([
      "/compliance/first",
      "/other",
    ]);
    expect(actions[0]?.label).toBe("First valid");
  });

  it("preserves original valid input order", () => {
    const actions = resolveAskNexusDeepLinkActions([
      input({ id: "c", kind: "compliance", authorizedHref: "/c" }),
      input({ id: "a", kind: "bid_rules", authorizedHref: "/a" }),
      input({ id: "b", kind: "rfi", authorizedHref: "/b" }),
    ]);

    expect(actions.map((action) => action.id)).toEqual(["c", "a", "b"]);
  });

  it("treats all descriptive kinds identically for authorization", () => {
    const href = "/shared/destination";

    for (const kind of ALL_KINDS) {
      const actions = resolveAskNexusDeepLinkActions([
        input({
          id: `kind-${kind}`,
          label: kind,
          kind,
          authorizedHref: href,
        }),
      ]);

      expect(actions).toHaveLength(1);
      expect(actions[0]).toMatchObject({
        kind,
        href,
        allowed: true,
        status: "navigation_ready",
      });
    }

    for (const kind of ALL_KINDS) {
      expect(
        resolveAskNexusDeepLinkActions([
          input({
            id: `denied-${kind}`,
            label: kind,
            kind,
            authorizedHref: null,
          }),
        ]),
      ).toEqual([]);
    }
  });

  it("does not grant access from kind, id, or label content alone", () => {
    expect(
      resolveAskNexusDeepLinkActions([
        input({
          id: "source_evidence",
          label: "Open source evidence",
          kind: "source_evidence",
          authorizedHref: null,
        }),
        input({
          id: "/rfq/secret/compliance",
          label: "/rfq/secret/compliance",
          kind: "compliance",
          authorizedHref: "   ",
        }),
        input({
          id: "admin",
          label: "Award contract now",
          kind: "other",
          authorizedHref: null,
        }),
      ]),
    ).toEqual([]);
  });

  it("returns exactly the trust-policy authorized navigation href", () => {
    const raw = "  /rfq/example/source-evidence  ";
    const trust = resolveAskNexusTrustPolicy({
      kind: "navigate",
      authorizedNavigationHref: raw,
    });
    const actions = resolveAskNexusDeepLinkActions([
      input({
        id: "evidence",
        kind: "source_evidence",
        authorizedHref: raw,
      }),
    ]);

    expect(trust.authorizedNavigationHref).toBe("/rfq/example/source-evidence");
    expect(actions[0]?.href).toBe(trust.authorizedNavigationHref);
    expect(actions[0]?.href).not.toBe(raw);
  });

  it("imports and reuses the 13G-01 trust policy boundary", () => {
    expect(deepLinkSource).toContain(
      'from "@/lib/ask-nexus/ask-nexus-trust-policy"',
    );
    expect(deepLinkSource).toContain("resolveAskNexusTrustPolicy");
    expect(deepLinkSource).toContain('kind: "navigate"');
    expect(deepLinkSource).toContain("authorizedNavigationHref:");
    expect(deepLinkSource).toContain('status !== "navigation_ready"');
  });

  it("does not synthesize routes or concatenate ids into hrefs", () => {
    expect(
      resolveAskNexusDeepLinkActions([
        input({
          id: "rfq-123",
          label: "RFQ",
          kind: "rfi",
          authorizedHref: null,
        }),
      ]),
    ).toEqual([]);

    expect(deepLinkSource).not.toContain('"/rfq/');
    expect(deepLinkSource).not.toContain("'/rfq/");
    expect(deepLinkSource).not.toContain("`/rfq/");
    expect(deepLinkSource).not.toContain("encodeURIComponent");
    expect(deepLinkSource).not.toContain("${");
    expect(deepLinkSource).not.toContain("join(");
    expect(deepLinkSource).not.toContain("application-nav");
  });

  it("has no application-nav, role, procurement, or execution side effects", () => {
    expect(deepLinkSource).not.toContain("application-nav");
    expect(deepLinkSource).not.toContain("useRouter");
    expect(deepLinkSource).not.toContain("router.push");
    expect(deepLinkSource).not.toContain("router.replace");
    expect(deepLinkSource).not.toContain("window.location");
    expect(deepLinkSource).not.toContain("next/navigation");
    expect(deepLinkSource).not.toContain("next/link");
    expect(deepLinkSource).not.toContain("permissionGranted");
    expect(deepLinkSource).not.toContain("workspaceRole");
    expect(deepLinkSource).not.toContain("procurementFunction");
    expect(deepLinkSource).not.toContain("hasPermission");
    expect(deepLinkSource).not.toContain("fetch(");
    expect(deepLinkSource).not.toContain("createClient");
    expect(deepLinkSource).not.toContain("@/lib/supabase");
    expect(deepLinkSource).not.toContain("@/lib/ai");
    expect(deepLinkSource).not.toContain("openai");
  });

  it("contains no mutation or consequential-action logic", () => {
    expect(deepLinkSource).not.toContain("consequential_action");
    expect(deepLinkSource).not.toContain("submit");
    expect(deepLinkSource).not.toContain("publish");
    expect(deepLinkSource).not.toContain("award");
    expect(deepLinkSource).not.toContain("acknowledge");
    expect(deepLinkSource).not.toContain("approve");
    expect(deepLinkSource).not.toContain("invite");
    expect(deepLinkSource).not.toContain("DELETE");
    expect(deepLinkSource).not.toContain("PATCH");
    expect(deepLinkSource).not.toContain("POST");
    expect(deepLinkSource).not.toContain("jsx");
    expect(deepLinkSource).not.toContain("React");
    expect(deepLinkSource).not.toContain("createElement");
  });
});
