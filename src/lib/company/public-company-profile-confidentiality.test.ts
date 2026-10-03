import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

function readSource(relativePath: string) {
  return readFileSync(resolve(process.cwd(), relativePath), "utf8").replace(
    /\r\n/g,
    "\n",
  );
}

const publicCompanyPage = readSource("src/app/company/[slug]/page.tsx");
const qualificationsDisplay = readSource(
  "src/components/company-qualifications-display.tsx",
);
const capabilitiesDisplay = readSource(
  "src/components/company-capabilities-display.tsx",
);

describe("Public Company Network data-scope confidentiality", () => {
  it("keeps public discovery on company_directory approved/verified companies", () => {
    expect(publicCompanyPage).toContain('.from("company_directory")');
    expect(publicCompanyPage).toContain(
      '.select("id, name, slug, category, location, network_role, status, logo_url")',
    );
    expect(publicCompanyPage).toContain('.in("status", ["approved", "verified"])');
  });

  it("preserves public capabilities and public-only qualifications", () => {
    expect(publicCompanyPage).toContain("loadCompanyCapabilities");
    expect(publicCompanyPage).toContain("loadPublicCompanyQualifications");
    expect(publicCompanyPage).toContain('variant="public"');
    expect(publicCompanyPage).toContain("CompanyCapabilitiesDisplay");
    expect(publicCompanyPage).toContain("CompanyQualificationsDisplay");

    expect(capabilitiesDisplay).toContain('variant === "public"');
    expect(qualificationsDisplay).toContain(
      "items.filter((item) => item.is_public)",
    );
    expect(qualificationsDisplay).toContain('variant === "internal"');
    expect(qualificationsDisplay).toContain("Credential Identifier");
    expect(publicCompanyPage).not.toContain("credential_identifier");
    expect(publicCompanyPage).not.toContain("Credential Identifier");
  });

  it("does not query viewer-dependent or internal procurement tables", () => {
    for (const forbidden of [
      '.from("audit_logs")',
      '.from("rfqs")',
      '.from("quotes")',
      '.from("notifications")',
      '.from("rfq_invites")',
      '.from("organization_memberships")',
      '.from("company_invitations")',
    ]) {
      expect(publicCompanyPage).not.toContain(forbidden);
    }
  });

  it("removes commercial, governance, and misleading portfolio disclosure", () => {
    for (const forbidden of [
      "Procurement Volume",
      "Award Rate",
      "Recent Procurement Activity",
      "Procurement Portfolio",
      "Company RFQs",
      "awarded_amount",
      "QUOTE_SUBMITTED",
      "INVITATION_CREATED",
      "MEMBER_ROLE_UPDATED",
      "MEMBER_REMOVED",
      "Create RFQ",
      "Open Analytics",
      "isVendorProfile",
      "Supplier Commercial Evidence",
      "evaluationScore",
      "win rate",
      "awarded revenue",
      "average quote value",
    ]) {
      expect(publicCompanyPage).not.toContain(forbidden);
    }

    expect(publicCompanyPage).toContain("Access Restricted");
    expect(publicCompanyPage).toContain("Public Data Boundary");
    expect(publicCompanyPage).toContain("Open Procurement Center");
    expect(publicCompanyPage).not.toContain("View Marketplace");
  });

  it("does not branch public discovery on workspace authority", () => {
    for (const forbidden of [
      "getCurrentWorkspaceContext",
      "canManageWorkspace",
      "workspaceRole",
      "membershipStatus",
      "organization_memberships",
      "profile.role",
    ]) {
      expect(publicCompanyPage).not.toContain(forbidden);
    }
  });
});
