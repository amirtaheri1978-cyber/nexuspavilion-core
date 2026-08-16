import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  join(
    process.cwd(),
    "supabase",
    "migrations",
    "20260817_reconcile_representative_verification_invalidation_precedence.sql",
  ),
  "utf8",
);

describe("representative verification invalidation precedence reconciliation", () => {
  it("replaces both protected reviewer decision RPCs", () => {
    expect(migration).toContain(
      "create or replace function public.approve_representative_verification",
    );

    expect(migration).toContain(
      "create or replace function public.reject_representative_verification",
    );
  });

  it("captures submission membership existence before another query can overwrite FOUND", () => {
    expect(migration).toContain(
      "v_submitted_membership_found boolean := false;",
    );

    expect(migration).toContain(
      "v_submitted_membership_found := found;",
    );

    expect(migration.match(/if not v_submitted_membership_found/g)).toHaveLength(2);
  });

  it("validates captured membership before loading the current canonical owner", () => {
    const approveStart = migration.indexOf(
      "create or replace function public.approve_representative_verification",
    );
    const rejectStart = migration.indexOf(
      "create or replace function public.reject_representative_verification",
    );

    const approveSql = migration.slice(approveStart, rejectStart);
    const rejectSql = migration.slice(rejectStart);

    for (const sql of [approveSql, rejectSql]) {
      const capturedMembershipLoad = sql.indexOf("into v_member");
      const membershipValidation = sql.indexOf(
        "if not v_submitted_membership_found",
      );
      const membershipInactive = sql.indexOf(
        "v_reason := 'OWNER_MEMBERSHIP_INACTIVE';",
      );
      const currentOwnerLoad = sql.indexOf(
        "into v_current_owner_membership",
      );
      const subjectUnavailableAfterMembership = sql.indexOf(
        "v_reason := 'SUBJECT_UNAVAILABLE';",
        membershipInactive,
      );
      const projectionMismatch = sql.indexOf(
        "v_reason := 'OWNERSHIP_PROJECTION_MISMATCH';",
      );
      const ownerChanged = sql.indexOf(
        "v_reason := 'OWNER_CHANGED';",
      );

      expect(capturedMembershipLoad).toBeGreaterThan(-1);
      expect(membershipValidation).toBeGreaterThan(capturedMembershipLoad);
      expect(membershipInactive).toBeGreaterThan(membershipValidation);
      expect(currentOwnerLoad).toBeGreaterThan(membershipInactive);
      expect(subjectUnavailableAfterMembership).toBeGreaterThan(currentOwnerLoad);
      expect(projectionMismatch).toBeGreaterThan(subjectUnavailableAfterMembership);
      expect(ownerChanged).toBeGreaterThan(projectionMismatch);
    }
  });

  it("preserves company-before-membership locking and deterministic membership order", () => {
    const approveStart = migration.indexOf(
      "create or replace function public.approve_representative_verification",
    );
    const rejectStart = migration.indexOf(
      "create or replace function public.reject_representative_verification",
    );

    const approveSql = migration.slice(approveStart, rejectStart);
    const rejectSql = migration.slice(rejectStart);

    for (const sql of [approveSql, rejectSql]) {
      const companyLock = sql.indexOf(
        "from public.companies",
      );
      const membershipLock = sql.indexOf(
        "from public.organization_memberships",
      );

      expect(companyLock).toBeGreaterThan(-1);
      expect(membershipLock).toBeGreaterThan(companyLock);
      expect(sql).toContain("order by user_id, id");
    }
  });

  it("preserves authenticated-only execution grants", () => {
    expect(migration).toContain(
      "on function public.approve_representative_verification(uuid)",
    );
    expect(migration).toContain(
      "on function public.reject_representative_verification(uuid, text)",
    );

    expect(migration).toContain("from public;");
    expect(migration).toContain("from anon;");
    expect(migration).toContain("to authenticated;");
  });
});
