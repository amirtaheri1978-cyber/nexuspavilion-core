import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import {
  resolveAskNexusTrustPolicy,
  type AskNexusTrustPolicyResult,
} from "@/lib/ask-nexus/ask-nexus-trust-policy";

const policySource = readFileSync(
  resolve(process.cwd(), "src/lib/ask-nexus/ask-nexus-trust-policy.ts"),
  "utf8",
).replace(/\r\n/g, "\n");

function assertInformationalNonBinding(
  result: AskNexusTrustPolicyResult,
  kind: "explain" | "advise",
) {
  expect(result).toEqual({
    kind,
    allowed: true,
    status: "informational",
    requiresConfirmation: false,
    requiresPermission: false,
    requiresExecutionRevalidation: false,
    authorizedNavigationHref: null,
    nonBinding: true,
  });
}

describe("ask nexus trust policy", () => {
  it("allows explain as informational and non-binding without mutation capability", () => {
    assertInformationalNonBinding(
      resolveAskNexusTrustPolicy({ kind: "explain" }),
      "explain",
    );
  });

  it("allows advise as informational and non-binding", () => {
    assertInformationalNonBinding(
      resolveAskNexusTrustPolicy({ kind: "advise" }),
      "advise",
    );
  });

  it("never promotes advice into an execution-eligible state", () => {
    const advised = resolveAskNexusTrustPolicy({
      kind: "advise",
      permissionGranted: true,
      explicitConfirmation: true,
    });

    expect(advised.status).toBe("informational");
    expect(advised.nonBinding).toBe(true);
    expect(advised.allowed).toBe(true);
    expect(advised.requiresExecutionRevalidation).toBe(false);
    expect(advised.status).not.toBe("eligible_for_authorized_execution");
  });

  it("returns only the exact trimmed caller-supplied authorized navigation href", () => {
    const href = "/rfq/harbor-point-mixed-use-developmet-1787392774540";
    const result = resolveAskNexusTrustPolicy({
      kind: "navigate",
      authorizedNavigationHref: `  ${href}  `,
    });

    expect(result).toEqual({
      kind: "navigate",
      allowed: true,
      status: "navigation_ready",
      requiresConfirmation: false,
      requiresPermission: false,
      requiresExecutionRevalidation: false,
      authorizedNavigationHref: href,
      nonBinding: true,
    });
  });

  it("marks missing or empty navigation href as not navigation-ready", () => {
    expect(
      resolveAskNexusTrustPolicy({
        kind: "navigate",
      }).status,
    ).toBe("navigation_unavailable");

    expect(
      resolveAskNexusTrustPolicy({
        kind: "navigate",
        authorizedNavigationHref: null,
      }).status,
    ).toBe("navigation_unavailable");

    expect(
      resolveAskNexusTrustPolicy({
        kind: "navigate",
        authorizedNavigationHref: "   ",
      }),
    ).toMatchObject({
      allowed: false,
      status: "navigation_unavailable",
      authorizedNavigationHref: null,
    });
  });

  it("does not construct product routes from kind or other signals", () => {
    const result = resolveAskNexusTrustPolicy({
      kind: "navigate",
      permissionGranted: true,
      explicitConfirmation: true,
    });

    expect(result.authorizedNavigationHref).toBeNull();
    expect(result.status).toBe("navigation_unavailable");
    expect(policySource).not.toContain('"/rfq/');
    expect(policySource).not.toContain("'/rfq/");
    expect(policySource).not.toContain("`/rfq/");
    expect(policySource).not.toContain("encodeURIComponent");
    expect(policySource).not.toContain("joinPublicSitePath");
  });

  it("denies consequential actions when permission is not explicitly granted", () => {
    expect(
      resolveAskNexusTrustPolicy({
        kind: "consequential_action",
      }),
    ).toMatchObject({
      allowed: false,
      status: "permission_denied",
      requiresPermission: true,
      requiresExecutionRevalidation: true,
    });

    expect(
      resolveAskNexusTrustPolicy({
        kind: "consequential_action",
        permissionGranted: false,
        explicitConfirmation: true,
      }).status,
    ).toBe("permission_denied");
  });

  it("requires explicit confirmation when permission is granted", () => {
    expect(
      resolveAskNexusTrustPolicy({
        kind: "consequential_action",
        permissionGranted: true,
      }),
    ).toMatchObject({
      allowed: false,
      status: "confirmation_required",
      requiresConfirmation: true,
      requiresPermission: true,
      requiresExecutionRevalidation: true,
    });

    expect(
      resolveAskNexusTrustPolicy({
        kind: "consequential_action",
        permissionGranted: true,
        explicitConfirmation: false,
      }).status,
    ).toBe("confirmation_required");
  });

  it("marks permission plus confirmation as eligible only, not executed", () => {
    const result = resolveAskNexusTrustPolicy({
      kind: "consequential_action",
      permissionGranted: true,
      explicitConfirmation: true,
    });

    expect(result).toEqual({
      kind: "consequential_action",
      allowed: true,
      status: "eligible_for_authorized_execution",
      requiresConfirmation: true,
      requiresPermission: true,
      requiresExecutionRevalidation: true,
      authorizedNavigationHref: null,
      nonBinding: false,
    });
  });

  it("retains execution-time authorization revalidation in the eligible state", () => {
    const result = resolveAskNexusTrustPolicy({
      kind: "consequential_action",
      permissionGranted: true,
      explicitConfirmation: true,
    });

    expect(result.status).toBe("eligible_for_authorized_execution");
    expect(result.requiresExecutionRevalidation).toBe(true);
  });

  it("defaults permission and confirmation booleans safely", () => {
    const unset = resolveAskNexusTrustPolicy({
      kind: "consequential_action",
    });
    expect(unset.status).toBe("permission_denied");

    const permissionOnly = resolveAskNexusTrustPolicy({
      kind: "consequential_action",
      permissionGranted: true,
    });
    expect(permissionOnly.status).toBe("confirmation_required");
  });

  it("does not infer permission from roles, content, recommendations, or model output", () => {
    expect(policySource).not.toContain("workspace role");
    expect(policySource).not.toContain("procurement_function");
    expect(policySource).not.toContain("procurementFunction");
    expect(policySource).not.toContain("canCreateCompanyRfq");
    expect(policySource).not.toContain("canSubmitCompanyQuote");
    expect(policySource).not.toContain("openai");
    expect(policySource).not.toContain("recommendation");
    expect(policySource).not.toContain("evidence");
    expect(policySource).not.toMatch(/\brole\b/);
    expect(policySource).toContain("permissionGranted !== true");
    expect(policySource).toContain("explicitConfirmation !== true");
  });

  it("contains no data-access, API, router, or AI imports", () => {
    expect(policySource).not.toContain("from \"@/lib/supabase");
    expect(policySource).not.toContain("from '@supabase");
    expect(policySource).not.toContain("createClient");
    expect(policySource).not.toContain("fetch(");
    expect(policySource).not.toContain("next/navigation");
    expect(policySource).not.toContain("useRouter");
    expect(policySource).not.toContain("openai");
    expect(policySource).not.toContain("@/lib/ai");
    expect(policySource).not.toContain("from \"next/");
  });

  it("does not embed domain-specific authorization or mutation logic", () => {
    expect(policySource).not.toContain("procurement-write-authorization");
    expect(policySource).not.toContain("workspace-permissions");
    expect(policySource).not.toContain("award-contract");
    expect(policySource).not.toContain("canAward");
    expect(policySource).not.toContain("canPublish");
    expect(policySource).not.toContain("canSubmit");
    expect(policySource).not.toContain("acknowledgeAddendum");
    expect(policySource).not.toContain("membership_type");
    expect(policySource).not.toContain("organization_memberships");
    expect(policySource).toContain("eligible_for_authorized_execution");
    expect(policySource).toContain(
      "Existing domain authorization remains authoritative",
    );
    expect(policySource).not.toMatch(
      /function\s+\w*(mutate|execute|submit|award|publish|acknowledge)\w*/i,
    );
  });
});
