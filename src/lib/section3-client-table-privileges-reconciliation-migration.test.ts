import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const migrationsDirectory = path.resolve(process.cwd(), "supabase/migrations");
const reconciliationMigrationName =
  "20260809_reconcile_section3_client_table_privileges.sql";
const reconciliationMigration = readFileSync(
  path.join(migrationsDirectory, reconciliationMigrationName),
  "utf8",
);
const companyRlsMigration = readFileSync(
  path.join(
    migrationsDirectory,
    "20260808_correct_company_rls_membership_authorization.sql",
  ),
  "utf8",
);

const laterMigrations = readdirSync(migrationsDirectory)
  .filter((fileName) => fileName.endsWith(".sql") && fileName > reconciliationMigrationName)
  .map((fileName) => ({
    fileName,
    contents: readFileSync(path.join(migrationsDirectory, fileName), "utf8"),
  }));

describe("Section 3 client table privilege reconciliation (STATIC)", () => {
  it("restores required company reads and self-company creation without widening updates", () => {
    expect(reconciliationMigration).toContain(
      "grant select on table public.companies to anon, authenticated;",
    );
    expect(reconciliationMigration).toContain(
      "grant insert on table public.companies to authenticated;",
    );
    expect(reconciliationMigration).toContain(
      "revoke update on table public.companies from public;",
    );
    expect(reconciliationMigration).toContain(
      "revoke update on table public.companies from anon;",
    );
    expect(reconciliationMigration).toContain(
      "revoke update on table public.companies from authenticated;",
    );
    expect(reconciliationMigration).toContain(
      "grant update (\n  name,\n  category,\n  location,\n  network_role,\n  logo_url\n) on table public.companies to authenticated;",
    );
    expect(reconciliationMigration).not.toContain("user_id");
    expect(reconciliationMigration).not.toMatch(
      /grant\s+insert\s+on\s+table\s+public\.companies\s+to\s+anon\b/i,
    );
    expect(reconciliationMigration).toContain(
      "revoke delete on table public.companies from public;",
    );
    expect(reconciliationMigration).toContain(
      "revoke delete on table public.companies from anon;",
    );
    expect(reconciliationMigration).toContain(
      "revoke delete on table public.companies from authenticated;",
    );
    expect(reconciliationMigration).toContain(
      "grant delete on table public.companies to authenticated;",
    );
  });

  it("keeps company deletion limited to table privilege plus active owner/admin RLS", () => {
    const deletePolicy = companyRlsMigration.slice(
      companyRlsMigration.indexOf(
        'create policy "Company owners and admins can delete company"',
      ),
    );

    expect(deletePolicy).toContain("for delete\nto authenticated");
    expect(deletePolicy).toContain("from public.organization_memberships om");
    expect(deletePolicy).toContain("om.user_id = auth.uid()");
    expect(deletePolicy).toContain("om.company_id = companies.id");
    expect(deletePolicy).toContain("om.membership_status = 'active'");
    expect(deletePolicy).toContain("om.workspace_role in ('owner', 'admin')");
  });

  it("makes transfer requests select-only for authenticated clients", () => {
    for (const role of ["public", "anon", "authenticated"]) {
      expect(reconciliationMigration).toContain(
        `revoke all on table public.ownership_transfer_requests from ${role};`,
      );
    }

    expect(reconciliationMigration).toContain(
      "grant select on table public.ownership_transfer_requests to authenticated;",
    );
    expect(reconciliationMigration).toContain(
      "grant all privileges on table public.ownership_transfer_requests to service_role;",
    );
    expect(reconciliationMigration).not.toMatch(
      /grant\s+(?:insert|update|delete|truncate|all(?:\s+privileges)?)\s+on\s+table\s+public\.ownership_transfer_requests\s+to\s+authenticated\b/i,
    );
  });

  it("has no later migration that re-grants client mutation privileges", () => {
    const clientMutationGrant = /grant\s+(?:all(?:\s+privileges)?|insert|update|delete|truncate)\s+on\s+table\s+public\.(?:companies|ownership_transfer_requests)\s+to\s+(?:public|anon|authenticated)\b/i;

    for (const migration of laterMigrations) {
      expect(migration.contents, migration.fileName).not.toMatch(clientMutationGrant);
    }
  });
});
