import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const migrationPath =
  "supabase/migrations/20260824000000_restrict_public_company_column_disclosure.sql";
const baselinePath =
  "supabase/migrations/20260822000000_dev_public_baseline.sql";

const sql = readFileSync(resolve(process.cwd(), migrationPath), "utf8");
const normalized = sql.replace(/\s+/g, " ").trim().toLowerCase();
const baseline = readFileSync(resolve(process.cwd(), baselinePath), "utf8");

const directory = readFileSync(
  resolve(process.cwd(), "src/app/directory/page.tsx"),
  "utf8",
);
const publicCompanyProfile = readFileSync(
  resolve(process.cwd(), "src/app/company/[slug]/page.tsx"),
  "utf8",
);
const analyticsSource = readFileSync(
  resolve(process.cwd(), "src/lib/analytics/source-data/load-analytics-source-data.ts"),
  "utf8",
);
const rfqPage = readFileSync(
  resolve(process.cwd(), "src/app/rfq/[slug]/page.tsx"),
  "utf8",
);
const inviteVendorForm = readFileSync(
  resolve(process.cwd(), "src/components/invite-vendor-form.tsx"),
  "utf8",
);
const awardRoute = readFileSync(
  resolve(process.cwd(), "src/app/api/award-contract/route.ts"),
  "utf8",
);
const companyUpdateRoute = readFileSync(
  resolve(process.cwd(), "src/app/api/companies/[id]/route.ts"),
  "utf8",
);

const publicColumns = [
  "id",
  "name",
  "slug",
  "category",
  "location",
  "network_role",
  "logo_url",
  "status",
  "created_at",
];

describe("public company directory column disclosure", () => {
  it("creates a directory view with only intentional public columns", () => {
    expect(normalized).toContain("create or replace view public.company_directory");
    expect(normalized).toContain("security_invoker = false");

    const viewBlock = normalized.slice(
      normalized.indexOf("create or replace view public.company_directory"),
      normalized.indexOf("comment on view public.company_directory"),
    );

    for (const column of publicColumns) {
      expect(viewBlock).toContain(column);
    }

    expect(viewBlock).not.toContain("user_id");
    expect(viewBlock).not.toContain("workspace_status");
  });

  it("revokes anonymous table select and grants directory select instead", () => {
    expect(normalized).toContain(
      "revoke select on table public.companies from anon",
    );
    expect(normalized).toContain(
      "revoke all on table public.company_directory from public, anon, authenticated, service_role",
    );
    expect(normalized).toContain(
      "grant select on table public.company_directory to anon, authenticated, service_role",
    );
    expect(normalized).not.toContain(
      "grant select on table public.companies to anon",
    );
  });

  it("replaces unrestricted company row reads with creator-or-member select", () => {
    expect(normalized).toContain(
      'drop policy if exists "public can read companies" on public.companies',
    );
    expect(normalized).toContain(
      'create policy "authenticated users can read created or member companies"',
    );
    expect(normalized).toContain("user_id = auth.uid()");
    expect(normalized).toContain("om.membership_status = 'active'");
    expect(normalized).toContain("om.company_id = companies.id");
  });

  it("does not change company write authorization", () => {
    expect(normalized).not.toContain("drop policy if exists \"authenticated users can create own company\"");
    expect(normalized).not.toContain("drop policy if exists \"company owners and admins can update company\"");
    expect(normalized).not.toContain("drop policy if exists \"company owners and admins can delete company\"");
    expect(normalized).not.toMatch(/\b(insert|update|delete)\s+on\s+public\.companies\b/);

    expect(baseline).toContain(
      'CREATE POLICY "Authenticated users can create own company"',
    );
    expect(baseline).toContain(
      'CREATE POLICY "Company owners and admins can update company"',
    );
    expect(baseline).toContain(
      'CREATE POLICY "Company owners and admins can delete company"',
    );
  });

  it("keeps public directory consumers on the safe view", () => {
    for (const source of [
      directory,
      publicCompanyProfile,
      analyticsSource,
      rfqPage,
      inviteVendorForm,
    ]) {
      expect(source).toContain('.from("company_directory")');
    }

    expect(directory).not.toMatch(/\.from\(\s*["']companies["']\s*\)/);
    expect(directory).not.toContain("user_id");
    expect(directory).not.toContain("workspace_status");
    expect(publicCompanyProfile).not.toContain("user_id");
    expect(publicCompanyProfile).not.toContain("workspace_status");
  });

  it("keeps authorized internal company management on the companies table", () => {
    expect(awardRoute).toContain('.rpc(');
    expect(awardRoute).toContain('"award_rfq_quote"');
    expect(companyUpdateRoute).toContain('.from("companies")');
    expect(companyUpdateRoute).toContain("workspace.companyId !== id");
  });
});
