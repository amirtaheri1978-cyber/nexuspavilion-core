import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import {
  ACCOUNT_MENU_LINKS,
  flattenNavigation,
  getAppSectionTitle,
} from "@/lib/navigation/application-nav";

function readSource(relativePath: string) {
  return readFileSync(resolve(process.cwd(), relativePath), "utf8").replace(
    /\r\n/g,
    "\n",
  );
}

const settingsPage = readSource("src/app/company/settings/page.tsx");
const dashboardPage = readSource("src/app/dashboard/page.tsx");
const inviteForm = readSource("src/components/invite-user-form.tsx");
const logoUpload = readSource("src/components/company-logo-upload.tsx");
const settingsForm = readSource("src/components/company-settings-form.tsx");
const membersCenter = readSource("src/components/company-members-center.tsx");
const governanceCenter = readSource(
  "src/components/company-governance-center.tsx",
);
const commandCenter = readSource("src/components/company-command-center.tsx");
const companyPage = readSource("src/app/company/page.tsx");

const settingsNav = settingsPage.slice(
  settingsPage.indexOf('aria-label="Workspace settings sections"'),
  settingsPage.indexOf("</nav>"),
);

const dashboardReadiness = dashboardPage.slice(
  dashboardPage.indexOf("function buildReadinessItems"),
  dashboardPage.indexOf("function calculateReadinessScore"),
);

const APPROVED_HASH_TARGETS = [
  "#professional-identity",
  "#company-profile",
  "#invite-users",
  "#company-capabilities",
  "#company-qualifications",
  "#company-compliance",
  "#company-documents",
  "#policies-approval-controls-heading",
  "#activity-history",
  "#governance",
];

describe("settings utility navigation", () => {
  it("no longer hosts the company command center or procurement KPI row", () => {
    expect(settingsPage).not.toContain("CompanyCommandCenter");
    expect(settingsPage).not.toContain("company-command-center");
    expect(settingsPage).not.toContain("FooterMetric");
    expect(settingsPage).not.toContain("Total RFQs");
    expect(settingsPage).not.toContain("Active RFQs");
    expect(settingsPage).not.toContain(">Quotes<");
    expect(settingsPage).not.toContain(">Awards<");
    expect(commandCenter).toContain("Executive Workspace Command Center");
  });

  it("keeps Settings as utility configuration without operational header CTAs", () => {
    const header = settingsPage.slice(
      settingsPage.indexOf("<h1"),
      settingsPage.indexOf('aria-label="Workspace settings sections"'),
    );

    expect(settingsPage).toContain("Workspace Settings");
    expect(header).toContain("href=\"/dashboard\"");
    expect(header).not.toContain("/rfq/new");
    expect(header).not.toContain("/analytics");
    expect(header).not.toContain("Create RFQ");
    expect(header).not.toContain("Executive Analytics");
    expect(settingsPage).not.toContain("command layer");
    expect(settingsPage).not.toContain("procurement command center");
    expect(settingsPage).not.toContain("executive-grade command layer");
  });

  it("still renders the approved utility editors and workspace workflows", () => {
    expect(settingsPage).toContain("CompanyGovernanceCenter");
    expect(settingsPage).toContain("ProfessionalIdentitySettingsForm");
    expect(settingsPage).toContain("CompanyCapabilitiesEditor");
    expect(settingsPage).toContain("CompanyQualificationsEditor");
    expect(settingsPage).toContain("CompanyComplianceEditor");
    expect(settingsPage).toContain("CompanyDocumentsEditor");
    expect(settingsPage).toContain("CompanyMembersCenter");
    expect(membersCenter).toContain("InviteUserForm");
    expect(membersCenter).toContain("MemberActions");
    expect(membersCenter).toContain("OwnershipPanel");
    expect(membersCenter).toContain("DeleteCompanyButton");
    expect(governanceCenter).toContain("Policies & Approval Controls");
    expect(settingsPage).toContain("pendingTransfer={pendingTransfer}");
  });

  it("exposes compact utility navigation to the approved existing hashes", () => {
    expect(settingsPage).toContain(
      'aria-label="Workspace settings sections"',
    );
    expect(settingsNav).toContain("Professional Identity");
    expect(settingsNav).toContain("Company Profile");
    expect(settingsNav).toContain("Workspace Access");
    expect(settingsNav).toContain("Capabilities");
    expect(settingsNav).toContain("Qualifications");
    expect(settingsNav).toContain("Compliance");
    expect(settingsNav).toContain("Documents");
    expect(settingsNav).toContain("Policies");
    expect(settingsNav).toContain("Activity");
    expect(settingsNav).toContain("Ownership");

    const hrefs = [...settingsNav.matchAll(/href="(#[^"]+)"/g)].map(
      (match) => match[1],
    );

    expect(hrefs).toEqual(APPROVED_HASH_TARGETS);
  });

  it("labels application navigation as Workspace Settings", () => {
    expect(
      ACCOUNT_MENU_LINKS.find((item) => item.href === "/company/settings")
        ?.label,
    ).toBe("Workspace Settings");

    for (const experience of ["owner", "vendor", "consultant"] as const) {
      expect(
        flattenNavigation(experience).find(
          (item) => item.href === "/company/settings",
        )?.label,
      ).toBe("Workspace Settings");
    }

    expect(getAppSectionTitle("/company/settings")).toBe("Workspace Settings");
  });

  it("points dashboard company setup links at company profile without moving RFQ ownership", () => {
    expect(dashboardReadiness).toContain(
      'title: "Company Created"',
    );
    expect(dashboardReadiness).toContain(
      'href: "/company/settings#company-profile"',
    );
    expect(dashboardReadiness).toContain('title: "First RFQ"');
    expect(dashboardReadiness).toContain('href: "/rfq/new"');
    expect(dashboardReadiness).toContain('title: "Quote Activity"');
    expect(dashboardReadiness).toContain('href: "/rfq"');
    expect(dashboardReadiness).not.toContain('href: "/company/settings"');
  });

  it("keeps Workspace Invitation distinct from RFQ Invitation", () => {
    expect(inviteForm).toContain(
      "Workspace membership is separate from RFQ invitations",
    );
    expect(governanceCenter).toContain(
      "RFQ invitations are separate from company workspace invitations.",
    );
    expect(settingsPage).not.toContain("RFQ Invitation");
  });

  it("does not change reserved 7-10 authorization sources", () => {
    expect(settingsPage).toContain(
      'return role === "owner" || role === "admin" || role === "buyer";',
    );
    expect(settingsForm).toContain('currentUserRole === "buyer"');
    expect(logoUpload).not.toContain("canEdit");
    expect(companyPage).toContain("canManageCompanyWorkspace");
    expect(membersCenter).toContain("CompanyLogoUpload");
  });
});
