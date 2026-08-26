import { describe, expect, it } from "vitest";

import type { OrganizationMembership } from "@/lib/auth/membership";
import {
  canAwardVerifiedCompanyContract,
  canCreateCompanyRfq,
  canDecideCompanyQuotes,
  canInviteCompanySuppliers,
  canSubmitCompanyQuote,
} from "@/lib/procurement/procurement-write-authorization";
import { canRespondToRfqSourcing } from "@/lib/procurement/rfq-access-contract";

const COMPANY_ID = "11111111-1111-1111-1111-111111111111";
const OTHER_COMPANY_ID = "22222222-2222-2222-2222-222222222222";

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

const LEGITIMATE_RESPONDENT_FUNCTIONS = [
  "supplier",
  "none",
  "buyer",
  "consultant",
] as const;

describe("Task 33E universal RFQ respondent authorization", () => {
  describe("Layer 2 acting-company membership", () => {
    it("lets every legitimate active procurement_function respond", () => {
      for (const procurementFunction of LEGITIMATE_RESPONDENT_FUNCTIONS) {
        expect(
          canSubmitCompanyQuote(
            membership({ procurementFunction }),
            COMPANY_ID,
          ),
          procurementFunction,
        ).toBe(true);
      }
    });

    it("maps honest company classifications onto response capability without supplier masquerade", () => {
      const buildingMaterialSupplier = membership({
        procurementFunction: "supplier",
      });
      const generalContractor = membership({
        workspaceRole: "owner",
        procurementFunction: "none",
      });
      const serviceProvider = membership({ procurementFunction: "none" });
      const architectConsultant = membership({
        procurementFunction: "none",
      });
      const engineerConsultant = membership({
        procurementFunction: "consultant",
      });
      const multidisciplinary = membership({
        workspaceRole: "owner",
        procurementFunction: "buyer",
      });

      expect(canSubmitCompanyQuote(buildingMaterialSupplier, COMPANY_ID)).toBe(
        true,
      );
      expect(canSubmitCompanyQuote(generalContractor, COMPANY_ID)).toBe(true);
      expect(canSubmitCompanyQuote(serviceProvider, COMPANY_ID)).toBe(true);
      expect(canSubmitCompanyQuote(architectConsultant, COMPANY_ID)).toBe(true);
      expect(canSubmitCompanyQuote(engineerConsultant, COMPANY_ID)).toBe(true);
      expect(canSubmitCompanyQuote(multidisciplinary, COMPANY_ID)).toBe(true);
    });

    it("denies missing, inactive, or foreign-company membership", () => {
      expect(canSubmitCompanyQuote(null, COMPANY_ID)).toBe(false);
      expect(
        canSubmitCompanyQuote(
          membership({ membershipStatus: "pending" }),
          COMPANY_ID,
        ),
      ).toBe(false);
      expect(
        canSubmitCompanyQuote(
          membership({ membershipStatus: "suspended" }),
          COMPANY_ID,
        ),
      ).toBe(false);
      expect(
        canSubmitCompanyQuote(
          membership({ membershipStatus: "revoked" }),
          COMPANY_ID,
        ),
      ).toBe(false);
      expect(
        canSubmitCompanyQuote(membership(), OTHER_COMPANY_ID),
      ).toBe(false);
    });

    it("does not grant issuer authority from respondent capability", () => {
      const gcOwnerNone = membership({
        workspaceRole: "member",
        procurementFunction: "none",
      });
      const architect = membership({ procurementFunction: "consultant" });
      const serviceProvider = membership({ procurementFunction: "none" });

      expect(canSubmitCompanyQuote(gcOwnerNone, COMPANY_ID)).toBe(true);
      expect(canCreateCompanyRfq(gcOwnerNone, COMPANY_ID)).toBe(false);
      expect(canInviteCompanySuppliers(gcOwnerNone, COMPANY_ID)).toBe(false);
      expect(canDecideCompanyQuotes(gcOwnerNone, COMPANY_ID)).toBe(false);
      expect(
        canAwardVerifiedCompanyContract({
          membership: gcOwnerNone,
          companyId: COMPANY_ID,
          workspaceStatus: "active",
          verificationStatus: "verified",
        }),
      ).toBe(false);

      expect(canCreateCompanyRfq(architect, COMPANY_ID)).toBe(false);
      expect(canCreateCompanyRfq(serviceProvider, COMPANY_ID)).toBe(false);
    });
  });

  describe("Layer 3 RFQ sourcing access", () => {
    it("allows open sourcing without an invitation", () => {
      expect(canRespondToRfqSourcing("open", false)).toBe(true);
      expect(canRespondToRfqSourcing("open", true)).toBe(true);
    });

    it("allows invited and sealed RFQs only with restricted access", () => {
      expect(canRespondToRfqSourcing("invited", true)).toBe(true);
      expect(canRespondToRfqSourcing("sealed_bid", true)).toBe(true);
      expect(canRespondToRfqSourcing("invited", false)).toBe(false);
      expect(canRespondToRfqSourcing("sealed_bid", false)).toBe(false);
    });

    it("fails closed for unknown sourcing methods without access", () => {
      expect(canRespondToRfqSourcing("framework", false)).toBe(false);
      expect(canRespondToRfqSourcing(null, false)).toBe(false);
    });
  });

  describe("Case matrix A-T at the authorization primitives", () => {
    const openPass = [
      ["A", "supplier"],
      ["B", "none"],
      ["C", "none"],
      ["D", "none"],
      ["E", "consultant"],
      ["F", "buyer"],
    ] as const;

    for (const [label, procurementFunction] of openPass) {
      it(`CASE ${label} — ${procurementFunction} membership may respond to an open RFQ`, () => {
        expect(
          canSubmitCompanyQuote(
            membership({ procurementFunction }),
            COMPANY_ID,
          ),
        ).toBe(true);
        expect(canRespondToRfqSourcing("open", false)).toBe(true);
      });
    }

    const invitedPass = [
      ["G", "supplier"],
      ["H", "none"],
      ["I", "none"],
      ["J", "none"],
      ["K", "consultant"],
    ] as const;

    for (const [label, procurementFunction] of invitedPass) {
      it(`CASE ${label} — invited ${procurementFunction} membership may respond to a restricted RFQ`, () => {
        expect(
          canSubmitCompanyQuote(
            membership({ procurementFunction }),
            COMPANY_ID,
          ),
        ).toBe(true);
        expect(canRespondToRfqSourcing("invited", true)).toBe(true);
        expect(canRespondToRfqSourcing("sealed_bid", true)).toBe(true);
      });
    }

    it("CASE L — non-invited company is denied on a restricted RFQ", () => {
      expect(canSubmitCompanyQuote(membership(), COMPANY_ID)).toBe(true);
      expect(canRespondToRfqSourcing("invited", false)).toBe(false);
      expect(canRespondToRfqSourcing("sealed_bid", false)).toBe(false);
    });

    it("CASE M — somebody else's invite is not a quote credential", () => {
      expect(canRespondToRfqSourcing("invited", false)).toBe(false);
    });

    it("CASE N/O — anonymous users and inactive memberships are denied", () => {
      expect(canSubmitCompanyQuote(null, COMPANY_ID)).toBe(false);
      expect(
        canSubmitCompanyQuote(
          membership({ membershipStatus: "pending" }),
          COMPANY_ID,
        ),
      ).toBe(false);
    });
  });
});
