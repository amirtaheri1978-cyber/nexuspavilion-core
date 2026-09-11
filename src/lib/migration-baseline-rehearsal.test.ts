import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const activeMigrationsDirectory = path.resolve(
  process.cwd(),
  "supabase/migrations",
);
const preBaselineV1Directory = path.resolve(
  process.cwd(),
  "supabase/legacy-migrations/pre-baseline",
);
const preBaselineV2Directory = path.resolve(
  process.cwd(),
  "supabase/legacy-migrations/pre-baseline-v2",
);
const baselineMigrationName =
  "20260911000000_launch_candidate_baseline_v2.sql";
const baselineMigrationTimestamp = "20260911000000";
const historicalSurgeryMigrationName =
  "20260904204031_populate_notification_rfq_source_from_trusted_writers.sql";
const activeMigrationFileNamePattern = /^(\d{14})_.+\.sql$/;

function listSqlFiles(directory: string) {
  return readdirSync(directory)
    .filter((fileName) => fileName.endsWith(".sql"))
    .sort();
}

const activeSqlFiles = listSqlFiles(activeMigrationsDirectory);
const archivedV1SqlFiles = listSqlFiles(preBaselineV1Directory);
const archivedV2SqlFiles = listSqlFiles(preBaselineV2Directory);
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
  "projects",
  "company_documents",
  "rfq_document_requirements",
] as const;

const expectedPublicFunctions = [
  "accept_company_ownership_transfer",
  "accept_organization_invitation",
  "approve_representative_verification",
  "current_user_has_supplier_rfq_access",
  "get_company_representative_verification_status",
  "get_organization_members",
  "record_procurement_activity",
  "record_rfq_award_workspace_activity",
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
  it("keeps Canonical Baseline V2 as the only active migration", () => {
    expect(activeSqlFiles).toEqual([baselineMigrationName]);
    expect(activeSqlFiles[0]).toBe(baselineMigrationName);

    const match = baselineMigrationName.match(activeMigrationFileNamePattern);
    expect(match).not.toBeNull();
    expect(match?.[1]).toBe(baselineMigrationTimestamp);
  });

  it("archives the prior 33-file chain under pre-baseline-v2 without modifying contents", () => {
    expect(archivedV2SqlFiles).toHaveLength(33);
    expect(archivedV2SqlFiles[0]).toBe(
      "20260822000000_dev_public_baseline.sql",
    );
    expect(archivedV2SqlFiles[archivedV2SqlFiles.length - 1]).toBe(
      "20260909090225_harden_rfq_addendum_acknowledgement_terminal_state.sql",
    );
    expect(archivedV2SqlFiles).toContain(historicalSurgeryMigrationName);
    expect(activeSqlFiles).not.toContain(historicalSurgeryMigrationName);
    expect(archivedV1SqlFiles).toHaveLength(31);
  });

  it("keeps 20260904204031 archive-only with historical MD5 surgery evidence", () => {
    const archivedSurgery = readFileSync(
      path.join(preBaselineV2Directory, historicalSurgeryMigrationName),
      "utf8",
    );

    expect(archivedSurgery).toContain(
      "record_procurement_activity definition changed after 8-10 review",
    );
    expect(archivedSurgery).toContain("30dfff294c0cfe2151456ac1d18c558e");
    expect(baseline).not.toContain(
      "record_procurement_activity definition changed after 8-10 review",
    );
    expect(baseline).not.toContain(
      "record_rfq_award_workspace_activity definition changed after 8-10 review",
    );
    expect(baseline).not.toContain("30dfff294c0cfe2151456ac1d18c558e");
    expect(baseline).not.toContain("de6c1c4ab00aaf3a630103c988696a5c");
    expect(baseline).not.toMatch(
      /md5\(\s*v_(?:proc|award)\s*\)\s*<>/i,
    );
  });

  it("materializes final direct trusted-writer function bodies with source_rfq_id", () => {
    expect(baseline).toContain(
      'CREATE OR REPLACE FUNCTION "public"."record_procurement_activity"',
    );
    expect(baseline).toContain(
      'CREATE OR REPLACE FUNCTION "public"."record_rfq_award_workspace_activity"',
    );
    expect(baseline).toContain("notification_source_rfq_id");
    expect(baseline).toContain("source_rfq_id");
  });

  it("provisions required Storage buckets and final Storage policies", () => {
    expect(normalizedBaseline).toContain("insert into storage.buckets");
    expect(baseline).toContain("'Company-logos'");
    expect(baseline).toContain("'company-documents'");
    expect(baseline).toContain("'rfq-attachments'");
    expect(baseline).toContain(
      "Company owners and admins can delete unbound Company-logos obje",
    );
    expect(baseline).toContain(
      "Company members can read company-documents objects",
    );
    expect(baseline).toContain(
      "RFQ participants can read rfq-attachments objects",
    );
  });

  it("excludes historical business-data backfills from the active baseline", () => {
    expect(normalizedBaseline).not.toContain(
      "repair already-awarded quotes that never received workspace activity",
    );
    expect(normalizedBaseline).not.toMatch(
      /insert into public\.projects\s*\([\s\S]*select[\s\S]*from public\.rfqs/i,
    );
  });

  it("contains representative public schema objects from the final Dev snapshot", () => {
    for (const table of expectedPublicTables) {
      expect(baseline).toContain(
        `CREATE TABLE IF NOT EXISTS "public"."${table}"`,
      );
    }

    for (const fn of expectedPublicFunctions) {
      expect(baseline).toContain(
        `CREATE OR REPLACE FUNCTION "public"."${fn}"`,
      );
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
