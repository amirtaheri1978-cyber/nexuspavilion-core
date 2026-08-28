import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

import {
  formatMemberIdentity,
  formatMemberRemovalSubject,
  formatOwnershipTransferOptionLabel,
  getAccountIdentitySecondary,
} from "@/lib/auth/professional-identity-display";

function readSource(relativePath: string) {
  return readFileSync(resolve(process.cwd(), relativePath), "utf8").replace(
    /\r\n/g,
    "\n",
  );
}

function countHeading(source: string, tag: "h1" | "h2") {
  return source.match(new RegExp(`<${tag}[\\s>]`, "g"))?.length ?? 0;
}

const displayHelper = readSource(
  "src/lib/auth/professional-identity-display.ts",
);
const accountLine = readSource("src/components/account-identity-line.tsx");
const companyPage = readSource("src/app/company/page.tsx");
const settingsPage = readSource("src/app/company/settings/page.tsx");
const commandCenter = readSource("src/components/company-command-center.tsx");
const membersCenter = readSource("src/components/company-members-center.tsx");
const memberDisplay = readSource("src/components/member-identity-display.tsx");
const memberActions = readSource("src/components/member-actions.tsx");
const ownershipPanel = readSource("src/components/ownership/ownership-panel.tsx");
const sidebar = readSource("src/components/sidebar.tsx");
const topbar = readSource("src/components/common/AppTopbar.tsx");
const notificationsPage = readSource("src/app/notifications/page.tsx");
const publicCompanyPage = readSource("src/app/company/[slug]/page.tsx");
const directoryPage = readSource("src/app/directory/page.tsx");
const rfqComparePage = readSource("src/app/rfq/[slug]/compare/page.tsx");
const rfqDetailPage = readSource("src/app/rfq/[slug]/page.tsx");
const rfqOwnerQuotes = readSource(
  "src/components/rfq-workspace/rfq-owner-quotes.tsx",
);
const visualQaPage = readSource(
  "src/app/dev/identity-surfaces-visual-qa/page.tsx",
);
const visualQaFixture = readSource(
  "src/components/identity-surfaces-visual-qa-fixture.tsx",
);
const identityApi = readSource(
  "src/app/api/profile/professional-identity/route.ts",
);
const identityMigration = readSource(
  "supabase/migrations/20260827000000_enable_professional_identity_primitives.sql",
);

describe("NP-MASTER-22-B04-5 current-user account display", () => {
  it("prefers First Last for the signed-in account chip", () => {
    const named = formatMemberIdentity({
      firstName: "Alex",
      lastName: "Morgan",
      jobTitle: "Procurement Director",
      email: "alex.morgan@example.com",
    });

    expect(named.primary).toBe("Alex Morgan");
    expect(named.emailIsPrimary).toBe(false);
    expect(accountLine).toContain("Signed in as {identity.primary}");
    expect(companyPage).toContain("AccountIdentityLine");
    expect(companyPage).toContain("currentWorkspaceMember?.profile.first_name");
    expect(commandCenter).toContain("AccountIdentityLine");
    expect(settingsPage).toContain("userIdentityFirstName={ownNames.firstName}");
  });

  it("uses email fallback when names are null", () => {
    const fallback = formatMemberIdentity({
      firstName: null,
      lastName: null,
      jobTitle: null,
      email: "legacy.user@example.com",
    });

    expect(fallback.primary).toBe("legacy.user@example.com");
    expect(fallback.emailIsPrimary).toBe(true);
    expect(getAccountIdentitySecondary(fallback)).toBeNull();
    expect(companyPage).toContain(
      "email={workspace.email || currentProfile.email}",
    );
    expect(companyPage).not.toContain(
      'currentProfile.email ||\n                    "Workspace Member"',
    );
  });

  it("shows job title as secondary, not profiles.role", () => {
    const named = formatMemberIdentity({
      firstName: "Alex",
      lastName: "Morgan",
      jobTitle: "Procurement Director",
      email: "alex.morgan@example.com",
    });
    const namedNoTitle = formatMemberIdentity({
      firstName: "Jordan",
      lastName: "Lee",
      jobTitle: null,
      email: "jordan.lee@example.com",
    });

    expect(getAccountIdentitySecondary(named)).toBe("Procurement Director");
    expect(getAccountIdentitySecondary(namedNoTitle)).toBe(
      "jordan.lee@example.com",
    );
    expect(accountLine).toContain("getAccountIdentitySecondary");
    expect(accountLine).toContain("roleLabel");
    expect(accountLine).not.toContain("jobTitle={role");
    expect(displayHelper).not.toContain("profiles.role");
    expect(companyPage).toContain("roleLabel={workspaceRoleLabel}");
    expect(commandCenter).toContain("roleLabel={workspaceRoleLabel}");
    expect(commandCenter).toContain("workspaceRoleLabel:");
    expect(commandCenter).not.toContain("userRole");
    expect(commandCenter).not.toContain("userEmail");
  });
});

describe("Phase 7-01 company identity presentation consistency", () => {
  it("keeps membership-derived workspace role on company and settings", () => {
    expect(companyPage).toContain("roleLabel={workspaceRoleLabel}");
    expect(settingsPage).toContain("workspaceRoleLabel={workspaceRoleLabel}");
    expect(settingsPage).toContain(
      "getWorkspaceRoleLabel(\n  currentMember?.membership?.workspace_role",
    );
    expect(settingsPage).not.toContain(
      "userRole={getRoleLabel(currentProfile.role)}",
    );
    expect(settingsPage).not.toContain(
      'roleLabel={getRoleLabel(currentProfile.role)}',
    );
    expect(commandCenter).toContain("workspaceRoleLabel:");
    expect(commandCenter).toContain("roleLabel={workspaceRoleLabel}");
    expect(commandCenter).not.toContain("userRole");
  });

  it("links professional identity editing to the settings anchor", () => {
    expect(companyPage).toContain(
      'href="/company/settings#professional-identity"',
    );
    expect(companyPage).toContain("Edit Professional Identity");
    expect(settingsPage).toContain('id="professional-identity"');
    expect(settingsPage).toContain("ProfessionalIdentitySettingsForm");
  });

  it("uses canonical missing company identity copy on touched surfaces", () => {
    expect(companyPage).toContain('"Not specified"');
    expect(companyPage).toContain('"Location N/A"');
    expect(companyPage).toContain('"Status not set"');
    expect(settingsPage).toContain('"Status not set"');
    expect(settingsPage).toContain('"Not specified"');
    expect(settingsPage).toContain('"Location N/A"');
    expect(commandCenter).toContain("Status not set");
    expect(publicCompanyPage).toContain('"Not specified"');
    expect(publicCompanyPage).toContain('"Location N/A"');
    expect(membersCenter).toContain("public profile visibility");
  });

  it("does not synthesize misleading missing identity values on touched surfaces", () => {
    for (const source of [
      companyPage,
      settingsPage,
      commandCenter,
      publicCompanyPage,
    ]) {
      expect(source).not.toContain('"provisional"');
      expect(source).not.toContain('|| "verified"');
      expect(source).not.toContain('|| "Enterprise"');
      expect(source).not.toContain('|| "Enterprise Workspace"');
    }
  });

  it("uses Open Procurement Center for touched /rfq identity CTAs", () => {
    expect(companyPage).toContain("Open Procurement Center");
    expect(companyPage).toContain('href="/rfq"');
    expect(companyPage).not.toContain("Open Marketplace");
    expect(publicCompanyPage).toContain("Open Procurement Center");
    expect(publicCompanyPage).not.toContain("View Marketplace");
  });

  it("keeps public profile free of professional identity disclosure", () => {
    expect(publicCompanyPage).toContain("Public Company Profile");
    expect(publicCompanyPage).not.toContain("first_name");
    expect(publicCompanyPage).not.toContain("last_name");
    expect(publicCompanyPage).not.toContain("formatMemberIdentity");
  });
});

describe("NP-MASTER-22-B04-5 company vs person identity", () => {
  it("keeps procurement participant labels as company names", () => {
    expect(rfqComparePage).toContain("supplierLabel:");
    expect(rfqComparePage).toContain("supplierNames.get(quote.company_id)");
    expect(rfqComparePage).toContain("`Supplier quote #${quote.rank}`");
    expect(rfqOwnerQuotes).toContain("resolveRfqOwnerSupplierLabel");
    expect(rfqOwnerQuotes).toContain("quote.company_id");
    expect(rfqOwnerQuotes).not.toContain("first_name");
    expect(rfqOwnerQuotes).not.toContain("last_name");
    expect(rfqOwnerQuotes).not.toContain("formatMemberIdentity");
    expect(rfqComparePage).not.toContain("first_name");
    expect(rfqComparePage).not.toContain("last_name");
    expect(rfqComparePage).not.toContain("formatMemberIdentity");
    expect(rfqDetailPage).toContain("supplierCompanies={supplierCompanies}");
    expect(rfqDetailPage).toContain('.select("id, email, role, company_id")');
    expect(visualQaFixture).toContain("Harbor Steel Co.");
    expect(visualQaFixture).toContain("Company identity remains company-level");
  });

  it("does not introduce public first/last disclosure", () => {
    expect(publicCompanyPage).toContain("company_directory");
    expect(publicCompanyPage).not.toContain("first_name");
    expect(publicCompanyPage).not.toContain("last_name");
    expect(publicCompanyPage).not.toContain("formatMemberIdentity");
    expect(directoryPage).toContain("company_directory");
    expect(directoryPage).toContain(
      '.select("id, name, slug, category, location, network_role, status, logo_url, created_at")',
    );
    expect(directoryPage).not.toContain("first_name");
    expect(directoryPage).not.toContain("last_name");
    expect(sidebar).toContain(".select(\"role, company_id\")");
    expect(sidebar).toContain("context.companyName");
    expect(sidebar).not.toContain("first_name");
    expect(topbar).not.toContain("first_name");
    expect(topbar).not.toContain("user.email");
  });

  it("does not add a new broad profile SELECT", () => {
    expect(companyPage).toContain(
      '.select("id, email, role, company_id, created_at")',
    );
    expect(companyPage).not.toContain(
      '.select("id, email, role, company_id, created_at, first_name',
    );
    expect(companyPage).toContain('supabase.rpc("get_organization_members")');
    expect(settingsPage).toContain(
      '.select("id, email, role, company_id, created_at")',
    );
    expect(accountLine).not.toContain('.from("profiles")');
    expect(ownershipPanel).not.toContain('.from("profiles")');
    expect(memberActions).not.toContain('.from("profiles")');
    expect(identityApi).not.toContain("select(");
  });
});

describe("NP-MASTER-22-B04-5 notifications and governance", () => {
  it("does not broaden notification identity access", () => {
    expect(notificationsPage).toContain(
      '.select("id, company_id, role, email")',
    );
    expect(notificationsPage).toContain(
      '.select("id, title, message, type, is_read, created_at, company_id")',
    );
    expect(notificationsPage).not.toContain("first_name");
    expect(notificationsPage).not.toContain("last_name");
    expect(notificationsPage).not.toContain("get_organization_members");
    expect(notificationsPage).not.toContain("formatMemberIdentity");
    expect(notificationsPage).toContain("{notification.title");
    expect(notificationsPage).toContain("{notification.message");
  });

  it("uses the canonical helper for member and ownership labels", () => {
    expect(membersCenter).toContain("formatMemberIdentity");
    expect(membersCenter).toContain("formatWorkspaceMemberPersonLabel");
    expect(membersCenter).toContain("MemberIdentityDisplay");
    expect(membersCenter).toContain("currentOwnerIdentity?.primary");
    expect(membersCenter).toContain('{invitation.email || "No email"}');
    expect(ownershipPanel).toContain("formatOwnershipTransferOptionLabel");
    expect(ownershipPanel).toContain("Current owner: ${currentOwnerLabel}");
    expect(memberActions).toContain("formatMemberRemovalSubject");
    expect(memberActions).toContain("memberLabel");
  });

  it("handles null names without breaking and never uses role as job title", () => {
    const unnamed = formatMemberIdentity({
      firstName: null,
      lastName: "   ",
      jobTitle: null,
      email: "legacy.user@example.com",
    });
    const titleOnly = formatMemberIdentity({
      firstName: null,
      lastName: null,
      jobTitle: "Buyer",
      email: "title.only@example.com",
    });
    const longName = formatMemberIdentity({
      firstName: "Alexandria-Catherine Montgomery-Whitfield",
      lastName: "Quintanilla",
      jobTitle: "Vice President of Strategic Global Procurement Operations",
      email: "long.name@example.com",
    });

    expect(unnamed.primary).toBe("legacy.user@example.com");
    expect(unnamed.fullName).toBeNull();
    expect(titleOnly.primary).toBe("title.only@example.com");
    expect(titleOnly.jobTitle).toBe("Buyer");
    expect(getAccountIdentitySecondary(titleOnly)).toBe("Buyer");
    expect(longName.primary.length).toBeGreaterThan(40);
    expect(accountLine).toContain("break-words");
    expect(memberDisplay).toContain("break-words");
    expect(membersCenter).not.toContain("profile.role as job");
    expect(ownershipPanel).not.toContain("workspace_role as job");
    expect(formatMemberIdentity).not.toHaveProperty("role");
  });

  it("does not render a user id as a person label", () => {
    expect(
      formatOwnershipTransferOptionLabel({
        firstName: null,
        lastName: null,
        jobTitle: null,
        email: null,
        workspaceRole: "admin",
      }),
    ).toBe("Member — admin");
    expect(
      formatOwnershipTransferOptionLabel({
        firstName: "Jordan",
        lastName: "Lee",
        jobTitle: null,
        email: "jordan.lee@example.com",
        workspaceRole: "admin",
      }),
    ).toBe("Jordan Lee — admin");
    expect(ownershipPanel).not.toContain("target.email || target.id");
    expect(ownershipPanel).toContain("value={target.id}");
    expect(memberDisplay).not.toContain("{profile.id}");
    expect(accountLine).not.toContain("user.id");
    expect(memberActions).not.toContain("{memberId}");
    expect(formatMemberRemovalSubject("Alex Morgan", "alex.morgan@example.com")).toBe(
      "Alex Morgan (alex.morgan@example.com)",
    );
    expect(
      formatMemberRemovalSubject("legacy.user@example.com", "legacy.user@example.com"),
    ).toBe("legacy.user@example.com");
  });
});

describe("NP-MASTER-22-B04-5 visual contract and safety", () => {
  it("keeps one fixture h1, visible wrapping, and no hover-scale on identity chips", () => {
    expect(countHeading(accountLine, "h1")).toBe(0);
    expect(countHeading(visualQaFixture, "h1")).toBe(1);
    expect(companyPage).toContain("<h1");
    expect(accountLine).not.toContain("hover:scale");
    expect(memberDisplay).not.toContain("hover:scale");
    expect(ownershipPanel).not.toContain("hover:scale");
    expect(accountLine).not.toContain("text-slate-500");
    expect(memberDisplay).not.toContain("text-slate-500");
    expect(visualQaPage).toContain('process.env.NODE_ENV === "production"');
    expect(visualQaPage).toContain("notFound()");
    expect(memberActions).toContain("EXECUTIVE_FOCUS_CYAN");
    expect(ownershipPanel).toContain("EXECUTIVE_FOCUS_CYAN");
  });

  it("does not create a migration, touch award logic, or weaken identity writes", () => {
    expect(identityMigration).toContain("first_name");
    expect(displayHelper).not.toContain("create table");
    expect(companyPage).not.toContain("award_rfq_quote");
    expect(ownershipPanel).not.toContain("award_rfq_quote");
    expect(memberActions).not.toContain("award_rfq_quote");
    expect(identityApi).not.toContain("p_user_id");
    expect(sidebar).not.toContain("get_organization_members");
  });
});
