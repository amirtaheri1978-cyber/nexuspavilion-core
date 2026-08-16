import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

function readSource(relativePath: string) {
  return readFileSync(resolve(process.cwd(), relativePath), "utf8");
}

const rfqsRoute = readSource("src/app/api/rfqs/route.ts");
const quotesRoute = readSource("src/app/api/quotes/route.ts");
const quoteDecisionRoute = readSource("src/app/api/quote-decision/route.ts");
const awardRoute = readSource("src/app/api/award-contract/route.ts");
const membershipModule = readSource("src/lib/auth/membership.ts");

describe("procurement write API membership authorization", () => {
  it("loads company-scoped active organization_memberships rather than profiles.role", () => {
    expect(membershipModule).toContain(
      "export async function getActiveMembershipForUserCompany",
    );
    expect(membershipModule).toContain('.eq("user_id", normalizedUserId)');
    expect(membershipModule).toContain('.eq("company_id", normalizedCompanyId)');
    expect(membershipModule).toContain('.eq("membership_status", "active")');

    for (const route of [rfqsRoute, quotesRoute, quoteDecisionRoute, awardRoute]) {
      expect(route).toContain("getActiveMembershipForUserCompany");
      expect(route).not.toContain("profile.role");
      expect(route).not.toContain("canCreateRfqDraft");
      expect(route).not.toContain("canUpdateQuoteDecision");
      expect(route).not.toContain("canAwardVerifiedOrganizationContract");
      expect(route).not.toMatch(/as UserRole/);
    }

    expect(quotesRoute).not.toContain("canSubmitQuote(");
    expect(quotesRoute).toContain("canSubmitCompanyQuote");
    expect(rfqsRoute).toContain("canCreateCompanyRfq");
    expect(quoteDecisionRoute).toContain("canDecideCompanyQuotes");
    expect(awardRoute).toContain("canAwardVerifiedCompanyContract");
  });

  it("keeps quote-decision RFQ ownership and membership-derived audit metadata", () => {
    expect(quoteDecisionRoute).toContain(
      "rfq.company_id !== profile.company_id",
    );
    expect(quoteDecisionRoute).toContain("actor_workspace_role: membership.workspaceRole");
    expect(quoteDecisionRoute).toContain(
      "actor_procurement_function: membership.procurementFunction",
    );
    expect(quoteDecisionRoute).not.toContain("actor_role:");
  });

  it("keeps award ownership, trust-state, no-self-award, and award-state protections", () => {
    expect(awardRoute).toContain("rfq.company_id !== profile.company_id");
    expect(awardRoute).toContain('.select("status, workspace_status")');
    expect(awardRoute).toContain("workspaceStatus:");
    expect(awardRoute).toContain("verificationStatus:");
    expect(awardRoute).toContain(
      "selectedQuote.company_id === rfq.company_id",
    );
    expect(awardRoute).toContain('rfq.status === "awarded"');
    expect(awardRoute).toContain('selectedQuote.decision === "awarded"');
    expect(awardRoute).toContain(
      "awarded_by_workspace_role: membership.workspaceRole",
    );
    expect(awardRoute).not.toContain("awarded_by_role:");
  });
});
