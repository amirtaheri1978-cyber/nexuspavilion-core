import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const sql = readFileSync(
  resolve(
    process.cwd(),
    "supabase/legacy-migrations/pre-baseline/20260812_create_submit_representative_verification_rpc.sql",
  ),
  "utf8",
);

describe("submit representative verification RPC", () => {
  it("uses a protected, constrained submission command", () => {
    for (const text of [
      "function public.submit_representative_verification",
      "security definer",
      "set search_path = public",
      "auth.uid()",
      "from public.profiles",
      "membership_status='active' and workspace_role='owner'",
      "v_company.user_id is distinct from v_user_id",
      "representative_user_id",
      "submitted_by_user_id",
      "submitted_owner_membership_id",
      "submitted_company_owner_user_id",
      "'pending_review'",
      "ALREADY_VERIFIED",
      "public.audit_logs",
      "REPRESENTATIVE_VERIFICATION_SUBMITTED",
      "get stacked diagnostics v_constraint_name = constraint_name",
      "representative_verification_cases_one_pending_per_subject",
      "revoke all on function public.submit_representative_verification(uuid) from public",
      "revoke all on function public.submit_representative_verification(uuid) from anon",
      "grant execute on function public.submit_representative_verification(uuid) to authenticated",
    ]) {
      expect(sql).toContain(text);
    }
  });

  it("authorizes owner membership before locking the company row", () => {
    const membershipLockIndex = sql.indexOf(
      "from public.organization_memberships",
    );

    const companyLockIndex = sql.indexOf(
      "from public.companies",
    );

    expect(membershipLockIndex).toBeGreaterThan(-1);
    expect(companyLockIndex).toBeGreaterThan(-1);

    expect(membershipLockIndex).toBeLessThan(companyLockIndex);
  });

  it("keeps duplicate-pending mapping constraint-specific", () => {
    expect(sql).toContain(
      "get stacked diagnostics v_constraint_name = constraint_name",
    );

    expect(sql).toContain(
      "v_constraint_name = 'representative_verification_cases_one_pending_per_subject'",
    );

    expect(sql).toContain(
      "'error_code','DUPLICATE_PENDING_CASE'",
    );
  });

  it("does not broaden lifecycle or ownership authority", () => {
    expect(sql).not.toMatch(
      /update\s+public\.companies|delete\s+from\s+public\.companies/i,
    );

    expect(sql).not.toMatch(
      /update\s+public\.organization_memberships|delete\s+from\s+public\.organization_memberships/i,
    );

    expect(sql).not.toMatch(
      /ownership_transfer_requests|approve_representative_verification|reject_representative_verification|\/api\//i,
    );
  });
});