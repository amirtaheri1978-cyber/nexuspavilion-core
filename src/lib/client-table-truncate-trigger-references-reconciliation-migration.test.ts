import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const archivedMigrationsDirectory = path.resolve(
  process.cwd(),
  "supabase/legacy-migrations/pre-baseline",
);
const reconciliationMigrationName =
  "20260820_revoke_client_truncate_trigger_references.sql";

function normalizeSql(sql: string) {
  return sql.replace(/\s+/g, " ").trim().toLowerCase();
}

function readNormalizedMigration(fileName: string) {
  return normalizeSql(
    readFileSync(path.join(archivedMigrationsDirectory, fileName), "utf8"),
  );
}

const normalized = readNormalizedMigration(reconciliationMigrationName);

const coveredTables = [
  "audit_logs",
  "companies",
  "invitations",
  "notifications",
  "profiles",
  "organization_memberships",
  "ownership_transfer_requests",
  "internal_reviewer_assignments",
  "representative_verification_cases",
  "rfqs",
  "quotes",
  "rfq_ai_reviews",
  "rfq_invites",
] as const;

const historicalPrivilegeMigrations = [
  "20260809_reconcile_section3_client_table_privileges.sql",
  "20260808_restrict_company_ownership_sensitive_updates.sql",
  "20260801_create_organization_memberships.sql",
  "20260816_create_procurement_domain_schema.sql",
  "20260818_enable_secure_own_profile_read.sql",
  "20260819_restrict_rfq_sourcing_access_rls.sql",
] as const;

describe("F16-04 client TRUNCATE/TRIGGER/REFERENCES reconciliation (STATIC)", () => {
  it("revokes TRUNCATE, TRIGGER, and REFERENCES from public, anon, and authenticated", () => {
    for (const role of ["public", "anon", "authenticated"] as const) {
      expect(normalized).toContain(`from ${role}`);
    }

    expect((normalized.match(/revoke truncate, trigger, references/g) ?? []).length).toBe(3);

    for (const table of coveredTables) {
      expect(normalized).toContain(`public.${table}`);
    }

    expect(normalized).not.toMatch(/revoke\s+(select|insert|update|delete)\b/);
    expect(normalized).not.toMatch(/revoke\s+all\b/);
  });

  it("does not revoke required CRUD grants", () => {
    expect(normalized).not.toMatch(
      /revoke\s+(?:select|insert|update|delete)(?:\s*,\s*(?:select|insert|update|delete))*\s+on\s+table/,
    );
    expect(normalized).not.toMatch(/grant\s+/);
    expect(normalized).not.toContain("grant select");
    expect(normalized).not.toContain("grant insert");
    expect(normalized).not.toContain("grant update");
    expect(normalized).not.toContain("grant delete");
    expect(normalized).not.toContain("grant all");
  });

  it("does not restrict service_role or change RLS, ownership, or RPC execute", () => {
    expect(normalized).not.toMatch(/from service_role/);
    expect(normalized).not.toMatch(/to service_role/);
    expect(normalized).not.toMatch(/revoke[\s\S]*service_role/);
    expect(normalized).not.toMatch(/create policy|drop policy/);
    expect(normalized).not.toMatch(/enable row level security|disable row level security/);
    expect(normalized).not.toMatch(/alter table|alter function|owner to/);
    expect(normalized).not.toMatch(/grant execute|revoke execute/);
  });

  it("does not edit historical privilege or F16-01 migrations", () => {
    const files = readdirSync(archivedMigrationsDirectory).filter((fileName) =>
      fileName.endsWith(".sql"),
    );

    expect(files).toContain(reconciliationMigrationName);
    expect(files).toContain("20260819_restrict_rfq_sourcing_access_rls.sql");
    expect(files).toContain("20260809_reconcile_section3_client_table_privileges.sql");

    const section3 = readNormalizedMigration(
      "20260809_reconcile_section3_client_table_privileges.sql",
    );
    expect(section3).toContain(
      "grant select on table public.companies to anon, authenticated;",
    );
    expect(section3).toContain(
      "grant insert on table public.companies to authenticated;",
    );
    expect(section3).toContain(
      "grant delete on table public.companies to authenticated;",
    );
    expect(section3).toContain(
      "grant select on table public.ownership_transfer_requests to authenticated;",
    );
    expect(section3).toContain(
      "grant all privileges on table public.ownership_transfer_requests to service_role;",
    );

    const procurement = readNormalizedMigration(
      "20260816_create_procurement_domain_schema.sql",
    );
    expect(procurement).toContain(
      "grant select, insert, update, delete on table public.rfqs to authenticated;",
    );
    expect(procurement).toContain(
      "grant all privileges on table public.rfqs, public.quotes, public.rfq_ai_reviews, public.rfq_invites to service_role;",
    );

    const f16_01 = readNormalizedMigration(
      "20260819_restrict_rfq_sourcing_access_rls.sql",
    );
    expect(f16_01).toContain(
      "create or replace function public.current_user_has_supplier_rfq_access",
    );

    const memberships = readNormalizedMigration(
      "20260801_create_organization_memberships.sql",
    );
    expect(memberships).toContain(
      "grant select on table public.organization_memberships to authenticated;",
    );

    const profiles = readNormalizedMigration(
      "20260818_enable_secure_own_profile_read.sql",
    );
    expect(profiles).toContain(
      "grant select on table public.profiles to authenticated;",
    );

    for (const fileName of historicalPrivilegeMigrations) {
      expect(fileName).not.toBe(reconciliationMigrationName);
    }
  });
});
