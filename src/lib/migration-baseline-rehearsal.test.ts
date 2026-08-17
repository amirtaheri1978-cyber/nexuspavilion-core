import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const activeMigrationsDirectory = path.resolve(
  process.cwd(),
  "supabase/migrations",
);
const archivedMigrationsDirectory = path.resolve(
  process.cwd(),
  "supabase/legacy-migrations/pre-baseline",
);
const baselineMigrationName = "20260822000000_dev_public_baseline.sql";
const baselineMigrationTimestamp = "20260822000000";
const activeMigrationFileNamePattern = /^(\d{14})_.+\.sql$/;

function listSqlFiles(directory: string) {
  return readdirSync(directory)
    .filter((fileName) => fileName.endsWith(".sql"))
    .sort();
}

const activeSqlFiles = listSqlFiles(activeMigrationsDirectory);
const archivedSqlFiles = listSqlFiles(archivedMigrationsDirectory);
const baseline = readFileSync(
  path.join(activeMigrationsDirectory, baselineMigrationName),
  "utf8",
);
const normalizedBaseline = baseline.replace(/\s+/g, " ").trim().toLowerCase();

const expectedPublicTables = [
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

const expectedPublicFunctions = [
  "accept_company_ownership_transfer",
  "accept_organization_invitation",
  "approve_representative_verification",
  "current_user_has_supplier_rfq_access",
  "get_company_representative_verification_status",
  "get_organization_members",
  "reject_company_ownership_transfer",
  "reject_representative_verification",
  "remove_organization_member",
  "request_company_ownership_transfer",
  "submit_representative_verification",
  "update_organization_member_role",
] as const;

const dangerousTablePrivileges = [
  "MAINTAIN",
  "TRUNCATE",
  "TRIGGER",
  "REFERENCES",
] as const;

function publicTableGrantsTo(role: "anon" | "authenticated" | "service_role") {
  const pattern = new RegExp(
    `GRANT\\s+([^;]+?)\\s+ON TABLE\\s+"public"\\."([^"]+)"\\s+TO\\s+"${role}"`,
    "gi",
  );
  return [...baseline.matchAll(pattern)].map((match) => ({
    privileges: match[1].replace(/\s+/g, "").toUpperCase(),
    table: match[2],
  }));
}

describe("NP migration ledger rehearsal baseline (STATIC)", () => {
  it("keeps the Dev public baseline first, then only later forward migrations", () => {
    expect(activeSqlFiles[0]).toBe(baselineMigrationName);
    expect(new Set(activeSqlFiles).size).toBe(activeSqlFiles.length);

    for (const [index, fileName] of activeSqlFiles.entries()) {
      const match = fileName.match(activeMigrationFileNamePattern);
      expect(match, `invalid active migration filename: ${fileName}`).not.toBeNull();

      const timestamp = match?.[1] ?? "";
      if (index === 0) {
        expect(timestamp).toBe(baselineMigrationTimestamp);
        continue;
      }

      expect(timestamp > baselineMigrationTimestamp).toBe(true);
    }
  });

  it("archives exactly 31 historical SQL migrations and does not duplicate them into active migrations", () => {
    expect(archivedSqlFiles).toHaveLength(31);
    expect(
      archivedSqlFiles.every((fileName) =>
        fileName !== baselineMigrationName && /^\d{8}_.+\.sql$/.test(fileName),
      ),
    ).toBe(true);
    expect(
      activeSqlFiles.filter((fileName) => archivedSqlFiles.includes(fileName)),
    ).toEqual([]);
  });

  it("contains representative public schema objects from the current Dev snapshot", () => {
    for (const table of expectedPublicTables) {
      expect(baseline).toContain(`CREATE TABLE IF NOT EXISTS "public"."${table}"`);
    }

    for (const fn of expectedPublicFunctions) {
      expect(baseline).toContain(`CREATE OR REPLACE FUNCTION "public"."${fn}"`);
    }
  });

  it("records explicit end-of-baseline client privilege hardening for anon and authenticated", () => {
    expect(normalizedBaseline).toContain("re-baseline hardening:");
    expect(normalizedBaseline).toContain(
      "revoke references, trigger, truncate on table",
    );
    expect(normalizedBaseline).toContain("from anon;");
    expect(normalizedBaseline).toContain("from authenticated;");

    for (const table of expectedPublicTables) {
      expect(normalizedBaseline).toContain(`public.${table}`);
    }
  });

  it("does not grant MAINTAIN, TRUNCATE, TRIGGER, or REFERENCES on public tables to anon or authenticated", () => {
    for (const role of ["anon", "authenticated"] as const) {
      for (const grant of publicTableGrantsTo(role)) {
        expect(grant.privileges.includes("ALL"), `${role} ${grant.table}`).toBe(
          false,
        );
        for (const privilege of dangerousTablePrivileges) {
          expect(
            grant.privileges.includes(privilege),
            `${role} ${grant.table} ${privilege}`,
          ).toBe(false);
        }
      }
    }
  });

  it("preserves service_role table privileges", () => {
    const serviceRoleGrants = publicTableGrantsTo("service_role");
    expect(serviceRoleGrants.length).toBeGreaterThan(0);

    for (const table of expectedPublicTables) {
      const grant = serviceRoleGrants.find((entry) => entry.table === table);
      expect(grant, `missing service_role grant for ${table}`).toBeDefined();
      expect(
        grant?.privileges.includes("ALL") ||
          dangerousTablePrivileges.every((privilege) =>
            grant?.privileges.includes(privilege),
          ),
      ).toBe(true);
    }

    expect(baseline).toContain(
      'ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLES TO "service_role";',
    );
  });
});
