import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const sql = readFileSync(
  resolve(
    process.cwd(),
    "supabase/migrations/20260813_create_approve_representative_verification_rpc.sql",
  ),
  "utf8",
);

describe("approve representative verification RPC", () => {
  it("uses a protected reviewer-authorized approval command", () => {
    for (const text of [
      "function public.approve_representative_verification",
      "security definer",
      "set search_path = public",
      "auth.uid()",
      "from public.internal_reviewer_assignments",
      "capability='representative_verification.review'",
      "status='active' for update",
      "from public.representative_verification_cases where id=p_case_id for update",
      "CASE_INVALIDATED",
      "CASE_NOT_PENDING",
      "v_case.status='verified'",
      "'idempotent',true",
      "representative_user_id",
      "submitted_by_user_id",
      "submitted_owner_membership_id",
      "submitted_company_owner_user_id",
      "membership_status='active' and workspace_role='owner'",
      "order by user_id, id",
      "OWNER_MEMBERSHIP_INACTIVE",
      "OWNERSHIP_PROJECTION_MISMATCH",
      "OWNER_CHANGED",
      "SUBJECT_UNAVAILABLE",
      "status='invalidated'",
      "reviewed_by_user_id=null",
      "rejection_reason_code=null",
      "invalidation_reason_code=v_reason",
      "REPRESENTATIVE_VERIFICATION_INVALIDATED",
      "'system_enforced',true",
      "status='verified'",
      "reviewed_by_user_id=v_user",
      "decided_at=now()",
      "REPRESENTATIVE_VERIFIED",
      "public.audit_logs",
      "revoke all on function public.approve_representative_verification(uuid) from public",
      "revoke all on function public.approve_representative_verification(uuid) from anon",
      "grant execute on function public.approve_representative_verification(uuid) to authenticated",
    ]) {
      expect(sql).toContain(text);
    }
  });

  it("keeps reviewer authority, disclosure, revalidation, and decision ordered", () => {
    const reviewerLock = sql.indexOf(
      "from public.internal_reviewer_assignments",
    );
    const caseLock = sql.indexOf(
      "from public.representative_verification_cases where id=p_case_id for update",
    );
    const companyLock = sql.indexOf(
      "from public.companies where id=v_case.company_id for update",
    );
    const membershipLock = sql.indexOf(
      "from public.organization_memberships\n   where id=v_case.submitted_owner_membership_id",
    );
    const verifiedTransition = sql.indexOf(
      "update public.representative_verification_cases set status='verified'",
    );
    const terminalTransition = sql.indexOf(
      "update public.representative_verification_cases set status='invalidated'",
    );

    expect(reviewerLock).toBeGreaterThan(-1);
    expect(caseLock).toBeGreaterThan(reviewerLock);
    expect(companyLock).toBeGreaterThan(caseLock);
    expect(membershipLock).toBeGreaterThan(companyLock);
    expect(verifiedTransition).toBeGreaterThan(membershipLock);
    expect(terminalTransition).toBeGreaterThan(reviewerLock);
  });

  it("serializes the authoritative decision inputs", () => {
    expect(sql).toContain(
      "status='active' for update;\n if not found then return jsonb_build_object('success',false,'error_code','REVIEWER_NOT_AUTHORIZED')",
    );
    expect(sql).toContain(
      "from public.companies where id=v_case.company_id for update",
    );
    expect(sql).toContain("order by user_id, id\n   for update");
    expect(sql).toContain(
      "where id=v_case.submitted_owner_membership_id for update",
    );
    expect(sql).toContain(
      "workspace_role='owner' for update",
    );
  });

  it("keeps reviewer authority separate from ownership eligibility and does not mutate ownership", () => {
    const reviewerLookup = sql.slice(
      sql.indexOf("from public.internal_reviewer_assignments"),
      sql.indexOf("if not found then return jsonb_build_object('success',false,'error_code','REVIEWER_NOT_AUTHORIZED')"),
    );

    expect(reviewerLookup).not.toMatch(/workspace_role|procurement_function|profiles\.role/i);
    expect(sql).not.toMatch(
      /update\s+public\.companies|delete\s+from\s+public\.companies/i,
    );
    expect(sql).not.toMatch(
      /update\s+public\.organization_memberships|delete\s+from\s+public\.organization_memberships/i,
    );
    expect(sql).not.toMatch(/ownership_transfer_requests/i);
    expect(sql).not.toMatch(/function\s+public\.reject_representative_verification/i);
    expect(sql).not.toMatch(/function\s+public\.invalidate_representative_verification/i);
    expect(sql).not.toMatch(/\/api\/|src\/app|tsx|jsx/i);
  });
});
