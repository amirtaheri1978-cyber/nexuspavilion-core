import { describe, expect, it } from "vitest";

import type { OrganizationMembership } from "@/lib/auth/membership";
import { canReadIssuerCommercialQuotes } from "@/lib/procurement/rfq-commercial-read-authorization";

const COMPANY_ID = "11111111-1111-1111-1111-111111111111";

function membership(
  overrides: Partial<OrganizationMembership> = {},
): OrganizationMembership {
  return {
    id: "membership-1",
    userId: "user-1",
    companyId: COMPANY_ID,
    workspaceRole: "member",
    procurementFunction: "none",
    membershipType: "employee",
    membershipStatus: "active",
    jobTitle: null,
    jobFunction: null,
    invitedBy: null,
    joinedAt: null,
    ...overrides,
  };
}

describe("canReadIssuerCommercialQuotes", () => {
  it.each([
    ["owner", { workspaceRole: "owner" as const }],
    ["admin", { workspaceRole: "admin" as const }],
    [
      "member + buyer",
      {
        workspaceRole: "member" as const,
        procurementFunction: "buyer" as const,
      },
    ],
    [
      "viewer + buyer",
      {
        workspaceRole: "viewer" as const,
        procurementFunction: "buyer" as const,
      },
    ],
  ])("allows active %s", (_label, overrides) => {
    expect(
      canReadIssuerCommercialQuotes(membership(overrides), COMPANY_ID),
    ).toBe(true);
  });

  it.each([
    ["owner", { workspaceRole: "owner" as const }],
    ["admin", { workspaceRole: "admin" as const }],
    [
      "member + buyer",
      {
        workspaceRole: "member" as const,
        procurementFunction: "buyer" as const,
      },
    ],
    [
      "viewer + buyer",
      {
        workspaceRole: "viewer" as const,
        procurementFunction: "buyer" as const,
      },
    ],
  ])("allows archived %s", (_label, overrides) => {
    expect(
      canReadIssuerCommercialQuotes(
        membership({
          ...overrides,
          membershipStatus: "archived",
        }),
        COMPANY_ID,
      ),
    ).toBe(true);
  });

  it.each([
    ["ordinary member", {}],
    ["viewer", { workspaceRole: "viewer" as const }],
    [
      "supplier member without buyer",
      {
        workspaceRole: "member" as const,
        procurementFunction: "supplier" as const,
      },
    ],
  ])("denies active %s", (_label, overrides) => {
    expect(
      canReadIssuerCommercialQuotes(membership(overrides), COMPANY_ID),
    ).toBe(false);
  });

  it.each([
    ["ordinary member", {}],
    ["viewer", { workspaceRole: "viewer" as const }],
  ])("denies archived %s", (_label, overrides) => {
    expect(
      canReadIssuerCommercialQuotes(
        membership({
          ...overrides,
          membershipStatus: "archived",
        }),
        COMPANY_ID,
      ),
    ).toBe(false);
  });

  it.each(["pending", "suspended", "revoked"] as const)(
    "denies %s membership even for owner",
    (membershipStatus) => {
      expect(
        canReadIssuerCommercialQuotes(
          membership({
            workspaceRole: "owner",
            membershipStatus,
          }),
          COMPANY_ID,
        ),
      ).toBe(false);
    },
  );

  it("denies null membership and wrong company", () => {
    expect(canReadIssuerCommercialQuotes(null, COMPANY_ID)).toBe(false);
    expect(
      canReadIssuerCommercialQuotes(
        membership({ workspaceRole: "owner" }),
        "22222222-2222-2222-2222-222222222222",
      ),
    ).toBe(false);
    expect(
      canReadIssuerCommercialQuotes(membership({ workspaceRole: "owner" }), ""),
    ).toBe(false);
  });
});
