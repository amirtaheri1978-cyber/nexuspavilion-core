import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { canManageWorkspace } from "@/lib/auth/membership";
import {
  parseProjectCreateInput,
  PROJECT_CODE_MAX_LENGTH,
  PROJECT_NAME_MAX_LENGTH,
} from "@/lib/projects/project-contract";
import {
  ACCOUNT_MENU_LINKS,
  flattenNavigation,
  getAppSectionTitle,
  getAppSidebarSections,
} from "@/lib/navigation/application-nav";

const apiSource = fs.readFileSync(
  path.join(process.cwd(), "src/app/api/projects/route.ts"),
  "utf8",
);

const projectsPageSource = fs.readFileSync(
  path.join(process.cwd(), "src/app/projects/page.tsx"),
  "utf8",
);

const repositorySource = fs.readFileSync(
  path.join(process.cwd(), "src/lib/projects/project-repository.ts"),
  "utf8",
);

const migrationSource = fs.readFileSync(
  path.join(
    process.cwd(),
    "supabase/migrations/20260905093000_project_portfolio_foundation.sql",
  ),
  "utf8",
);

const portfolioListSource = fs.readFileSync(
  path.join(
    process.cwd(),
    "src/components/projects/project-portfolio-list.tsx",
  ),
  "utf8",
);

const projectInsightsSource = fs.readFileSync(
  path.join(process.cwd(), "src/lib/projects/project-insights.ts"),
  "utf8",
);

describe("Project Portfolio contract", () => {
  it("normalizes independent Project input without accepting company identity", () => {
    const parsed = parseProjectCreateInput({
      name: "  Riverside   Health Centre  ",
      project_code: "  RH-204  ",
      owner_client: "  City   Health  ",
      location: "  Toronto, ON  ",
      company_id: "untrusted-company",
      rfq_id: "untrusted-rfq",
    });

    expect(parsed).toEqual({
      ok: true,
      value: {
        name: "Riverside Health Centre",
        projectCode: "RH-204",
        ownerClient: "City Health",
        location: "Toronto, ON",
      },
    });
  });

  it("enforces bounded Project name and code inputs", () => {
    expect(
      parseProjectCreateInput({
        name: "x".repeat(PROJECT_NAME_MAX_LENGTH + 1),
      }).ok,
    ).toBe(false);

    expect(
      parseProjectCreateInput({
        name: "Valid Project",
        project_code: "x".repeat(PROJECT_CODE_MAX_LENGTH + 1),
      }).ok,
    ).toBe(false);
  });

  it("derives create company scope from verified workspace context", () => {
    expect(apiSource).toContain("getCurrentWorkspaceContext");
    expect(apiSource).toContain("context.membership.companyId");
    expect(apiSource).toContain("canManageWorkspace(context.membership)");
    expect(apiSource).not.toContain("body.company_id");
    expect(apiSource).not.toContain("payload.company_id");
  });

  it("keeps Project and procurement-context reads inside the exact company boundary", () => {
    expect(repositorySource).toContain('.from("projects")');
    expect(repositorySource).toContain('.from("rfqs")');
    expect(
      repositorySource.match(/\.eq\("company_id", normalizedCompanyId\)/g),
    ).toHaveLength(2);
    expect(repositorySource).toContain("normalizeProjectAssociationKey");
    expect(repositorySource).toContain("internal_project_id");
    expect(repositorySource).toContain("awarded_at");
    expect(repositorySource).not.toContain("awarded_quote_id");
    expect(repositorySource).not.toContain('.from("quotes")');
  });

  it("surfaces verified RFQ and award context without changing Project identity", () => {
    expect(portfolioListSource).toContain("Procurement Context");
    expect(portfolioListSource).toContain(
      "No verified procurement associations are linked to this Project",
    );
    expect(portfolioListSource).toContain(
      'association.status.trim().toLowerCase() === "awarded"',
    );
    expect(portfolioListSource).toContain("association.awardedAt");
    expect(portfolioListSource).toContain("`/rfq/${association.slug}`");
    expect(projectsPageSource).toContain(
      "verified company-scoped RFQ and contract-award context",
    );
    expect(projectsPageSource).not.toContain(
      "introduced only in their dedicated roadmap stages",
    );
  });

  it("surfaces only evidence-backed procurement-scoped Project signals", () => {
    expect(portfolioListSource).toContain("Project Signals");
    expect(portfolioListSource).toContain(
      "Project risk is not inferred from procurement activity.",
    );
    expect(portfolioListSource).toContain(
      'association.status.trim().toLowerCase() === "open"',
    );
    expect(portfolioListSource).toContain("Procurement Active");
    expect(portfolioListSource).toContain("Contract Awarded");
    expect(portfolioListSource).toContain("No Supported Signal");
    expect(portfolioListSource).toContain(
      "No supported Project status or risk signal is available",
    );
  });

  it("adds bounded Project Insights from the existing ProjectRecord payload only", () => {
    expect(portfolioListSource).toContain("buildProjectInsights(projects)");
    expect(portfolioListSource).toContain("Project Insights");
    expect(portfolioListSource).toContain("Project Association Evidence");
    expect(portfolioListSource).toContain("Identifier Coverage");
    expect(portfolioListSource).toContain("Linked Project Coverage");
    expect(portfolioListSource).toContain("Verified Awarded RFQs");
    expect(portfolioListSource).toContain("Insufficient Data");
    expect(portfolioListSource).toContain("Limited Evidence");

    expect(projectInsightsSource).toContain("ProjectRecord[]");
    expect(projectInsightsSource).toContain("identifierCoverage");
    expect(projectInsightsSource).toContain("associationCoverage");
    expect(projectInsightsSource).toContain("verifiedAwardedRfqCount");
    expect(projectInsightsSource).toContain("internal_project_id");
    expect(projectInsightsSource).not.toContain("createClient");
    expect(projectInsightsSource).not.toContain("fetch(");
    expect(projectInsightsSource).not.toContain('.from("');
  });

  it("keeps Project Insights descriptive and excludes unsupported project analytics claims", () => {
    for (const unsupportedLabel of [
      "Project Spend",
      "Project Savings",
      "Budget Variance",
      "Schedule Performance",
      "Completion Forecast",
      "Project Health Score",
      "Project Risk Score",
      "Market Benchmark",
      "Industry Benchmark",
    ]) {
      expect(portfolioListSource).not.toContain(unsupportedLabel);
      expect(projectInsightsSource).not.toContain(unsupportedLabel);
    }
  });

  it("does not manufacture unsupported Project status or risk semantics", () => {
    for (const unsupportedLabel of [
      "On Track",
      "At Risk",
      "Critical",
      "Risk Score",
      "Health Score",
      "Schedule Risk",
      "Budget Risk",
    ]) {
      expect(portfolioListSource).not.toContain(unsupportedLabel);
    }

    expect(repositorySource).not.toContain("rfq_ai_reviews");
    expect(repositorySource).not.toContain("readiness_score");
    expect(repositorySource).not.toContain("risk_level");
  });

  it("keeps database Project visibility company-scoped and manager creation explicit", () => {
    expect(migrationSource).toContain(
      "projects_select_active_company_member",
    );
    expect(migrationSource).toContain(
      "om.company_id = projects.company_id",
    );
    expect(migrationSource).toContain(
      "om.membership_status = 'active'",
    );
    expect(migrationSource).toContain(
      "projects_insert_company_manager",
    );
    expect(migrationSource).toContain(
      "om.workspace_role in ('owner', 'admin')",
    );
    expect(migrationSource).toContain("created_by = auth.uid()");
  });

  it("backfills only strong company plus internal-project evidence without linking RFQs", () => {
    expect(migrationSource).toContain("r.project_name");
    expect(migrationSource).toContain("r.internal_project_id");
    expect(migrationSource).toContain("row_number() over");
    expect(migrationSource).toContain("source.source_rank = 1");
    expect(migrationSource).not.toMatch(
      /alter\s+table\s+public\.rfqs[\s\S]*project_id/i,
    );
    expect(migrationSource).not.toMatch(
      /add\s+column\s+project_id/i,
    );
  });

  it("exposes one canonical Project Portfolio destination for every company experience", () => {
    for (const experience of ["owner", "vendor", "consultant"] as const) {
      const hrefs = flattenNavigation(experience).map((item) => item.href);
      expect(hrefs.filter((href) => href === "/projects")).toHaveLength(1);
    }

    expect(getAppSectionTitle("/projects")).toBe("Project Portfolio");
    expect(getAppSectionTitle("/projects/new")).toBe("Project Portfolio");

    expect(
      ACCOUNT_MENU_LINKS.filter((item) => item.href === "/projects"),
    ).toHaveLength(1);

    expect(
      getAppSidebarSections()
        .flatMap((section) => section.items)
        .filter((item) => item.href === "/projects"),
    ).toHaveLength(1);
  });

  it("keeps Project card headers readable on narrow mobile widths", () => {
    expect(portfolioListSource).toContain(
      'className="flex flex-col items-start gap-4 sm:flex-row sm:justify-between"',
    );
    expect(portfolioListSource).toContain(
      'className="min-w-0 w-full sm:flex-1"',
    );
    expect(portfolioListSource).toContain(
      'className="shrink-0 self-start"',
    );
  });

  it("keeps linked RFQ associations readable inside narrow Project cards", () => {
    expect(portfolioListSource).toContain(
      'className="flex flex-col gap-3"',
    );
    expect(portfolioListSource).toContain(
      'className="min-w-0 w-full"',
    );
    expect(portfolioListSource).toContain(
      'className="flex w-full flex-wrap gap-2"',
    );
    expect(portfolioListSource).not.toContain(
      'className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"',
    );
  });

  it("reuses the existing owner/admin workspace management contract", () => {
    const baseMembership = {
      id: "membership-1",
      userId: "user-1",
      companyId: "company-1",
      procurementFunction: "buyer" as const,
      membershipType: "employee" as const,
      membershipStatus: "active" as const,
      jobTitle: null,
      jobFunction: null,
      invitedBy: null,
      joinedAt: null,
    };

    expect(
      canManageWorkspace({
        ...baseMembership,
        workspaceRole: "owner",
      }),
    ).toBe(true);

    expect(
      canManageWorkspace({
        ...baseMembership,
        workspaceRole: "admin",
      }),
    ).toBe(true);

    expect(
      canManageWorkspace({
        ...baseMembership,
        workspaceRole: "member",
      }),
    ).toBe(false);
  });
});
