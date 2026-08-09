import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const sql = readFileSync(
  resolve(
    process.cwd(),
    "supabase/migrations/20260814_create_reject_representative_verification_rpc.sql",
  ),
  "utf8",
);

describe("reject representative verification RPC", () => {
  it("defines a protected, constrained rejection command", () => {
    for (const text of [
      "function public.reject_representative_verification(\n  p_case_id uuid,\n  p_rejection_reason_code text",
      "security definer",
      "set search_path = public",
      "auth.uid()",
      "from public.internal_reviewer_assignments",
      "capability = 'representative_verification.review'",
      "status = 'active'\n  for update",
      "INVALID_REJECTION_REASON",
      "p_rejection_reason_code is distinct from 'REPRESENTATIVE_AUTHORITY_NOT_CONFIRMED'",
      "rejection_reason_code = 'REPRESENTATIVE_AUTHORITY_NOT_CONFIRMED'",
      "from public.representative_verification_cases\n  where id = p_case_id\n  for update",
      "CASE_NOT_FOUND",
      "CASE_REJECTION_CONFLICT",
      "CASE_INVALIDATED",
      "CASE_NOT_PENDING",
      "'idempotent', true",
      "revoke all on function public.reject_representative_verification(uuid, text) from public",
      "revoke all on function public.reject_representative_verification(uuid, text) from anon",
      "grant execute on function public.reject_representative_verification(uuid, text) to authenticated",
    ]) {
      expect(sql).toContain(text);
    }
  });

  it("orders reviewer authority, disclosure, ownership revalidation, and decision", () => {
    const reviewerLock = sql.indexOf("from public.internal_reviewer_assignments");
    const caseLock = sql.indexOf("from public.representative_verification_cases");
    const companyLock = sql.indexOf("from public.companies\n  where id = v_case.company_id\n  for update");
    const membershipLocks = sql.indexOf("order by user_id, id\n    for update");
    const invalidation = sql.indexOf("update public.representative_verification_cases\n    set status = 'invalidated'");
    const rejection = sql.indexOf("update public.representative_verification_cases\n  set status = 'rejected'");

    expect(reviewerLock).toBeGreaterThan(-1);
    expect(caseLock).toBeGreaterThan(reviewerLock);
    expect(companyLock).toBeGreaterThan(caseLock);
    expect(membershipLocks).toBeGreaterThan(companyLock);
    expect(invalidation).toBeGreaterThan(membershipLocks);
    expect(rejection).toBeGreaterThan(membershipLocks);
  });

  it("preserves lazy invalidation and rejection audit contracts", () => {
    for (const text of [
      "SUBJECT_UNAVAILABLE",
      "OWNER_MEMBERSHIP_INACTIVE",
      "OWNERSHIP_PROJECTION_MISMATCH",
      "OWNER_CHANGED",
      "public.profiles where id = v_case.representative_user_id",
      "public.profiles where id = v_case.submitted_by_user_id",
      "v_member.company_id is distinct from v_case.company_id",
      "v_member.user_id is distinct from v_case.submitted_by_user_id",
      "v_member.membership_status <> 'active'",
      "v_member.workspace_role <> 'owner'",
      "v_current_owner_membership.user_id is distinct from v_company.user_id",
      "v_current_owner_membership.user_id is distinct from v_case.submitted_by_user_id",
      "status = 'invalidated'",
      "reviewed_by_user_id = null",
      "rejection_reason_code = null",
      "invalidation_reason_code = v_reason",
      "REPRESENTATIVE_VERIFICATION_INVALIDATED",
      "'system_enforced', true",
      "REPRESENTATIVE_VERIFICATION_REJECTED",
      "public.audit_logs",
      "reviewed_by_user_id = v_user",
      "decided_at = now()",
      "invalidation_reason_code = null",
    ]) {
      expect(sql).toContain(text);
    }
  });

  it("keeps same-reason replay out of the terminal write path", () => {
    const replayReturn = sql.indexOf("'idempotent', true");
    const terminalUpdate = sql.indexOf("set status = 'rejected'");

    expect(replayReturn).toBeGreaterThan(-1);
    expect(terminalUpdate).toBeGreaterThan(replayReturn);
  });

  it("does not broaden reviewer authority or mutate unrelated domains", () => {
    const reviewerLookup = sql.slice(
      sql.indexOf("from public.internal_reviewer_assignments"),
      sql.indexOf("select *\n  into v_case"),
    );

    expect(reviewerLookup).not.toMatch(/profiles\.role|procurement_function|workspace_role/i);
    expect(sql).not.toMatch(/update\s+public\.companies|delete\s+from\s+public\.companies/i);
    expect(sql).not.toMatch(/update\s+public\.organization_memberships|delete\s+from\s+public\.organization_memberships/i);
    expect(sql).not.toMatch(/ownership_transfer_requests/i);
    expect(sql).not.toMatch(/function\s+public\.submit_representative_verification/i);
    expect(sql).not.toMatch(/function\s+public\.approve_representative_verification/i);
    expect(sql).not.toMatch(/function\s+public\.invalidate_representative_verification/i);
    expect(sql).not.toMatch(/\/api\/|src\/app|tsx|jsx/i);
  });
});
