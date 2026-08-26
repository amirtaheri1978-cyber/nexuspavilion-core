import { describe, expect, it } from "vitest";

import type { OrganizationMembership } from "@/lib/auth/membership";
import {
  canAwardVerifiedCompanyContract,
  canCreateCompanyRfq,
  canDecideCompanyQuotes,
  canInviteCompanySuppliers,
  canSubmitCompanyQuote,
} from "@/lib/procurement/procurement-write-authorization";

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

describe("procurement write authorization", () => {
  it("denies stale privileged profile.role when no qualifying active membership exists", () => {
    expect(canCreateCompanyRfq(null, COMPANY_ID)).toBe(false);
    expect(canSubmitCompanyQuote(null, COMPANY_ID)).toBe(false);
    expect(canDecideCompanyQuotes(null, COMPANY_ID)).toBe(false);
    expect(
      canAwardVerifiedCompanyContract({
        membership: null,
        companyId: COMPANY_ID,
        workspaceStatus: "active",
        verificationStatus: "verified",
      }),
    ).toBe(false);
  });

  it("allows RFQ create for an active buyer membership", () => {
    expect(
      canCreateCompanyRfq(
        membership({ procurementFunction: "buyer" }),
        COMPANY_ID,
      ),
    ).toBe(true);
    expect(
      canCreateCompanyRfq(
        membership({ workspaceRole: "owner", procurementFunction: "none" }),
        COMPANY_ID,
      ),
    ).toBe(true);
    expect(
      canCreateCompanyRfq(
        membership({ workspaceRole: "admin", procurementFunction: "supplier" }),
        COMPANY_ID,
      ),
    ).toBe(true);
  });

  it("allows quote submit for any active acting-company membership", () => {
    expect(
      canSubmitCompanyQuote(
        membership({ procurementFunction: "supplier" }),
        COMPANY_ID,
      ),
    ).toBe(true);
    expect(
      canSubmitCompanyQuote(
        membership({
          workspaceRole: "owner",
          procurementFunction: "buyer",
        }),
        COMPANY_ID,
      ),
    ).toBe(true);
    expect(
      canSubmitCompanyQuote(
        membership({ procurementFunction: "none" }),
        COMPANY_ID,
      ),
    ).toBe(true);
    expect(
      canSubmitCompanyQuote(
        membership({ procurementFunction: "consultant" }),
        COMPANY_ID,
      ),
    ).toBe(true);
    expect(
      canSubmitCompanyQuote(
        membership({ procurementFunction: "buyer" }),
        COMPANY_ID,
      ),
    ).toBe(true);
    expect(
      canCreateCompanyRfq(
        membership({ procurementFunction: "none" }),
        COMPANY_ID,
      ),
    ).toBe(false);
    expect(
      canInviteCompanySuppliers(
        membership({ procurementFunction: "consultant" }),
        COMPANY_ID,
      ),
    ).toBe(false);
    expect(
      canDecideCompanyQuotes(
        membership({ procurementFunction: "supplier" }),
        COMPANY_ID,
      ),
    ).toBe(false);
  });

  it("denies inactive or revoked memberships for all four write operations", () => {
    for (const membershipStatus of ["pending", "suspended", "revoked"] as const) {
      const privilegedButInactive = membership({
        membershipStatus,
        workspaceRole: "owner",
        procurementFunction: "buyer",
      });

      expect(canCreateCompanyRfq(privilegedButInactive, COMPANY_ID)).toBe(false);
      expect(
        canSubmitCompanyQuote(
          membership({
            membershipStatus,
            procurementFunction: "supplier",
          }),
          COMPANY_ID,
        ),
      ).toBe(false);
      expect(canDecideCompanyQuotes(privilegedButInactive, COMPANY_ID)).toBe(
        false,
      );
      expect(
        canAwardVerifiedCompanyContract({
          membership: privilegedButInactive,
          companyId: COMPANY_ID,
          workspaceStatus: "active",
          verificationStatus: "verified",
        }),
      ).toBe(false);
    }
  });

  it("does not permit quote decision from buyer procurement_function alone", () => {
    expect(
      canDecideCompanyQuotes(
        membership({
          workspaceRole: "member",
          procurementFunction: "buyer",
        }),
        COMPANY_ID,
      ),
    ).toBe(false);
  });

  it("permits quote decision for active owner or admin membership", () => {
    expect(
      canDecideCompanyQuotes(
        membership({ workspaceRole: "owner", procurementFunction: "buyer" }),
        COMPANY_ID,
      ),
    ).toBe(true);
    expect(
      canDecideCompanyQuotes(
        membership({ workspaceRole: "admin", procurementFunction: "none" }),
        COMPANY_ID,
      ),
    ).toBe(true);
  });

  it("permits award for owner or admin only when workspace and verification trust-state pass", () => {
    const owner = membership({
      workspaceRole: "owner",
      procurementFunction: "buyer",
    });

    expect(
      canAwardVerifiedCompanyContract({
        membership: owner,
        companyId: COMPANY_ID,
        workspaceStatus: "active",
        verificationStatus: "verified",
      }),
    ).toBe(true);
    expect(
      canAwardVerifiedCompanyContract({
        membership: membership({ workspaceRole: "admin" }),
        companyId: COMPANY_ID,
        workspaceStatus: "active",
        verificationStatus: "verified",
      }),
    ).toBe(true);
    expect(
      canAwardVerifiedCompanyContract({
        membership: owner,
        companyId: COMPANY_ID,
        workspaceStatus: "setup",
        verificationStatus: "verified",
      }),
    ).toBe(false);
    expect(
      canAwardVerifiedCompanyContract({
        membership: owner,
        companyId: COMPANY_ID,
        workspaceStatus: "active",
        verificationStatus: "provisional",
      }),
    ).toBe(false);
  });

  it("does not permit award for supplier or buyer-only membership", () => {
    expect(
      canAwardVerifiedCompanyContract({
        membership: membership({
          workspaceRole: "member",
          procurementFunction: "supplier",
        }),
        companyId: COMPANY_ID,
        workspaceStatus: "active",
        verificationStatus: "verified",
      }),
    ).toBe(false);
    expect(
      canAwardVerifiedCompanyContract({
        membership: membership({
          workspaceRole: "member",
          procurementFunction: "buyer",
        }),
        companyId: COMPANY_ID,
        workspaceStatus: "active",
        verificationStatus: "verified",
      }),
    ).toBe(false);
  });

  it("allows supplier invites for owner, admin, or buyer membership only", () => {
    expect(canInviteCompanySuppliers(null, COMPANY_ID)).toBe(false);
    expect(
      canInviteCompanySuppliers(
        membership({ workspaceRole: "owner", procurementFunction: "none" }),
        COMPANY_ID,
      ),
    ).toBe(true);
    expect(
      canInviteCompanySuppliers(
        membership({ workspaceRole: "admin", procurementFunction: "supplier" }),
        COMPANY_ID,
      ),
    ).toBe(true);
    expect(
      canInviteCompanySuppliers(
        membership({ workspaceRole: "member", procurementFunction: "buyer" }),
        COMPANY_ID,
      ),
    ).toBe(true);
    expect(
      canInviteCompanySuppliers(
        membership({ workspaceRole: "member", procurementFunction: "none" }),
        COMPANY_ID,
      ),
    ).toBe(false);
    expect(
      canInviteCompanySuppliers(
        membership({ workspaceRole: "member", procurementFunction: "supplier" }),
        COMPANY_ID,
      ),
    ).toBe(false);
    expect(
      canInviteCompanySuppliers(
        membership({ workspaceRole: "viewer", procurementFunction: "none" }),
        COMPANY_ID,
      ),
    ).toBe(false);
    expect(
      canInviteCompanySuppliers(
        membership({ workspaceRole: "owner" }),
        "22222222-2222-2222-2222-222222222222",
      ),
    ).toBe(false);
    expect(
      canInviteCompanySuppliers(
        membership({
          membershipStatus: "pending",
          workspaceRole: "owner",
          procurementFunction: "buyer",
        }),
        COMPANY_ID,
      ),
    ).toBe(false);
  });
});
