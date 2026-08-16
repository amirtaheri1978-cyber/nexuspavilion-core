import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const migrationsDirectory = path.resolve(process.cwd(), "supabase/migrations");
const reconciliationMigrationName =
  "20260821_revoke_client_maintain_and_postgres_default_privileges.sql";

function normalizeSql(sql: string) {
  return sql.replace(/\s+/g, " ").trim().toLowerCase();
}

function readNormalizedMigration(fileName: string) {
  return normalizeSql(
    readFileSync(path.join(migrationsDirectory, fileName), "utf8"),
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
  "20260820_revoke_client_truncate_trigger_references.sql",
] as const;

describe("F16-05 client MAINTAIN and postgres default ACL (STATIC)", () => {
  it("revokes MAINTAIN from public, anon, and authenticated on launch-sensitive tables", () => {
    for (const role of ["public", "anon", "authenticated"] as const) {
      expect(normalized).toContain(`from ${role}`);
    }

    expect((normalized.match(/revoke maintain on table/g) ?? []).length).toBe(3);

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

  it("hardens postgres-owned default table privileges without changing CRUD defaults", () => {
    expect(
      (
        normalized.match(
          /alter default privileges for role postgres in schema public revoke truncate, references, trigger, maintain on tables from/g,
        ) ?? []
      ).length,
    ).toBe(3);

    for (const role of ["public", "anon", "authenticated"] as const) {
      expect(normalized).toContain(
        `alter default privileges for role postgres in schema public revoke truncate, references, trigger, maintain on tables from ${role};`,
      );
    }

    expect(normalized).not.toMatch(
      /alter default privileges[\s\S]*revoke\s+(?:select|insert|update|delete)\b/,
    );
    expect(normalized).not.toMatch(
      /alter default privileges[\s\S]*grant\s+/,
    );
  });

  it("does not alter supabase_admin default privileges and records the follow-up limitation", () => {
    expect(normalized).not.toMatch(
      /alter default privileges for role supabase_admin/,
    );
    expect(normalized).toContain("supabase_admin default table acl remains a separate platform-owned follow-up");
    expect(normalized).toContain("pg_has_role(postgres, supabase_admin, member) = false");
    expect(normalized).toContain("pg_has_role(postgres, supabase_admin, set) = false");
    expect(normalized).toContain(
      "does not attempt to change default privileges owned by supabase_admin",
    );
  });

  it("does not edit historical privilege or F16-01 through F16-04 migrations", () => {
    const files = readdirSync(migrationsDirectory).filter((fileName) =>
      fileName.endsWith(".sql"),
    );

    expect(files).toContain(reconciliationMigrationName);
    expect(files).toContain("20260819_restrict_rfq_sourcing_access_rls.sql");
    expect(files).toContain("20260820_revoke_client_truncate_trigger_references.sql");
    expect(files).toContain("20260809_reconcile_section3_client_table_privileges.sql");

    const f16_04 = readNormalizedMigration(
      "20260820_revoke_client_truncate_trigger_references.sql",
    );
    expect(f16_04).toContain("revoke truncate, trigger, references");
    expect(f16_04).not.toContain("revoke maintain");
    expect(f16_04).not.toContain("alter default privileges");

    const f16_01 = readNormalizedMigration(
      "20260819_restrict_rfq_sourcing_access_rls.sql",
    );
    expect(f16_01).toContain(
      "create or replace function public.current_user_has_supplier_rfq_access",
    );

    const section3 = readNormalizedMigration(
      "20260809_reconcile_section3_client_table_privileges.sql",
    );
    expect(section3).toContain(
      "grant select on table public.companies to anon, authenticated;",
    );
    expect(section3).toContain(
      "grant all privileges on table public.ownership_transfer_requests to service_role;",
    );

    for (const fileName of historicalPrivilegeMigrations) {
      expect(fileName).not.toBe(reconciliationMigrationName);
    }
  });
});
