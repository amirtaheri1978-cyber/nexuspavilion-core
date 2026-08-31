import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

function readSource(relativePath: string) {
  return readFileSync(resolve(process.cwd(), relativePath), "utf8").replace(
    /\r\n/g,
    "\n",
  );
}

const governance = readSource("src/components/company-governance-center.tsx");
const settings = readSource("src/app/company/settings/page.tsx");

describe("company policies and approval controls overview contract", () => {
  it("keeps the read-only catalog on CompanyGovernanceCenter", () => {
    expect(settings).toContain("CompanyGovernanceCenter");
    expect(governance).toContain("Policies & Approval Controls");
    expect(governance).toContain(
      "Authority is enforced within each business workflow.",
    );
    expect(governance).toContain("without creating a second");
    expect(governance).toContain("approval layer.");
  });

  it("surfaces the approved live domains with distinct invitation and award language", () => {
    expect(governance).toContain("Workspace Access & Invitations");
    expect(governance).toContain("company workspace invitations");
    expect(governance).toContain("They do not grant RFQ access.");
    expect(governance).toContain("Ownership Governance");
    expect(governance).toContain("Membership-based ownership transfer");
    expect(governance).toContain("RFQ Access & Supplier Invitations");
    expect(governance).toContain(
      "RFQ invitations are separate from company workspace invitations.",
    );
    expect(governance).toContain("Commercial Visibility");
    expect(governance).toContain("Quotation is not contract award.");
    expect(governance).toContain("Contract Award Authorization");
    expect(governance).toContain(
      "Award is not performed from company settings.",
    );
    expect(governance).toContain("Organization Verification");
    expect(governance).toContain("not a company self-approval control");
    expect(governance).toContain("Audit Trail");
    expect(governance).toContain(
      "Platform-governed verification controls are managed outside company",
    );
  });

  it("navigates only to existing operational surfaces", () => {
    expect(governance).toContain('href="#invite-users"');
    expect(governance).toContain('href="#governance"');
    expect(governance).toContain('href="#activity-history"');
    expect(governance).toContain('href="/rfq"');
  });

  it("does not introduce mutation controls or deferred approval surfaces", () => {
    expect(governance).not.toContain("fetch(");
    expect(governance).not.toContain("<form");
    expect(governance).not.toContain("/api/quote-decision");
    expect(governance).not.toContain("/api/award-contract");
    expect(governance).not.toContain("/api/company-invitations");
    expect(governance).not.toContain(
      "/api/representative-verification/",
    );
    expect(governance).not.toContain("RecoverOwnershipButton");
    expect(governance).not.toContain("/api/company/recover-admin");
    expect(governance).not.toContain("canApproveRfq");
    expect(governance).not.toContain("canSubmitRfqForApproval");
    expect(governance).not.toContain("Recover Ownership");
    expect(governance).not.toContain("type=\"checkbox\"");
    expect(governance).not.toContain("<input");
    expect(governance).not.toContain("<button");
  });
});
