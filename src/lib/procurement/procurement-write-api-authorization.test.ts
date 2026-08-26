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
const invitesRoute = readSource("src/app/api/invites/route.ts");
const membershipModule = readSource("src/lib/auth/membership.ts");

describe("procurement write API membership authorization", () => {
  it("loads company-scoped active organization_memberships rather than profiles.role", () => {
    expect(membershipModule).toContain(
      "export async function getActiveMembershipForUserCompany",
    );
    expect(membershipModule).toContain('.eq("user_id", normalizedUserId)');
    expect(membershipModule).toContain('.eq("company_id", normalizedCompanyId)');
    expect(membershipModule).toContain('.eq("membership_status", "active")');

    for (const route of [rfqsRoute, quotesRoute, quoteDecisionRoute, invitesRoute]) {
      expect(route).toContain("getActiveMembershipForUserCompany");
      expect(route).not.toContain("profile.role");
      expect(route).not.toContain("canCreateRfqDraft");
      expect(route).not.toContain("canUpdateQuoteDecision");
      expect(route).not.toContain("canAwardVerifiedOrganizationContract");
      expect(route).not.toMatch(/as UserRole/);
    }

    expect(awardRoute).not.toContain("profile.role");
    expect(awardRoute).not.toContain("canCreateRfqDraft");
    expect(awardRoute).not.toContain("canUpdateQuoteDecision");
    expect(awardRoute).not.toContain("canAwardVerifiedOrganizationContract");
    expect(awardRoute).not.toMatch(/as UserRole/);

    expect(quotesRoute).not.toContain("canSubmitQuote(");
    expect(quotesRoute).toContain("canSubmitCompanyQuote");
    expect(quotesRoute).toContain("canRespondToRfqSourcing");
    expect(quotesRoute).toContain("current_user_has_supplier_rfq_access");
    expect(quotesRoute).not.toContain(
      "Only authorized supplier accounts can submit quotations.",
    );
    expect(quotesRoute).not.toContain("body.isInvited");
    expect(quotesRoute).not.toContain("invite_token");
    expect(quotesRoute).not.toContain("p_token");
    expect(rfqsRoute).toContain("canCreateCompanyRfq");
    expect(quoteDecisionRoute).toContain("canDecideCompanyQuotes");
    expect(invitesRoute).toContain("canInviteCompanySuppliers");
    expect(invitesRoute).not.toContain("isAllowedProcurementRole");
    expect(invitesRoute).toContain('select("id, email, company_id")');
    expect(awardRoute).toContain('.rpc(');
    expect(awardRoute).toContain('"award_rfq_quote"');
    expect(awardRoute).not.toContain("canAwardVerifiedCompanyContract");
  });

  it("keeps quote-decision RFQ ownership, awarded-state guards, and membership-derived audit metadata", () => {
    expect(quoteDecisionRoute).toContain(
      "rfq.company_id !== profile.company_id",
    );
    expect(quoteDecisionRoute).toContain(
      "Quote decisions cannot be changed after the RFQ has been awarded.",
    );
    expect(quoteDecisionRoute).toContain(
      "Awarded quotes cannot be approved or rejected.",
    );
    expect(quoteDecisionRoute).toContain("actor_workspace_role: membership.workspaceRole");
    expect(quoteDecisionRoute).toContain(
      "actor_procurement_function: membership.procurementFunction",
    );
    expect(quoteDecisionRoute).not.toContain("actor_role:");
  });

  it("delegates award integrity to award_rfq_quote and keeps post-commit audit metadata", () => {
    expect(awardRoute).toContain('.rpc(');
    expect(awardRoute).toContain('"award_rfq_quote"');
    expect(awardRoute).toContain("p_quote_id: quoteId");
    expect(awardRoute).toContain("NOT_RFQ_COMPANY");
    expect(awardRoute).toContain("SELF_AWARD_NOT_ALLOWED");
    expect(awardRoute).toContain("RFQ_ALREADY_AWARDED");
    expect(awardRoute).toContain("QUOTE_ALREADY_AWARDED");
    expect(awardRoute).toContain(
      "awarded_by_workspace_role: membership?.workspaceRole ?? null",
    );
    expect(awardRoute).not.toContain("awarded_by_role:");
    expect(awardRoute).not.toContain('decision: "pending"');
  });
});
