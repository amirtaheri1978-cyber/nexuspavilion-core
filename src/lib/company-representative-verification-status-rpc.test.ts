import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const sql = readFileSync(
  resolve(
    process.cwd(),
    "supabase/migrations/20260816_create_company_representative_verification_status_rpc.sql",
  ),
  "utf8",
);

const normalized = sql.replace(/\s+/g, " ").trim().toLowerCase();

describe("company representative verification status RPC", () => {
  it("uses a protected, authenticated status-only command", () => {
    for (const fragment of [
      "function public.get_company_representative_verification_status(",
      "security definer",
      "set search_path = public",
      "auth.uid()",
      "'error_code', 'authentication_required'",
      "'error_code', 'status_not_authorized'",
      "jsonb_build_object('success', true, 'status', v_status)",
      "revoke all on function public.get_company_representative_verification_status(uuid) from public",
      "revoke all on function public.get_company_representative_verification_status(uuid) from anon",
      "grant execute on function public.get_company_representative_verification_status(uuid) to authenticated",
    ]) {
      expect(normalized).toContain(fragment);
    }
  });

  it("authorizes only the active canonical owner or active company admin", () => {
    expect(normalized).toContain("c.user_id = v_user_id");
    expect(normalized).toContain("om.company_id = c.id");
    expect(normalized).toContain("om.user_id = v_user_id");
    expect(normalized).toContain("om.membership_status = 'active'");
    expect(normalized).toContain("om.workspace_role = 'owner'");
    expect(normalized).toContain("om.workspace_role = 'admin'");
    expect(normalized).not.toContain("internal_reviewer_assignments");
    expect(normalized).not.toContain("procurement_function");
    expect(normalized).not.toContain("profiles.role");
  });

  it("uses company-level applicability and governed deterministic precedence", () => {
    expect(normalized).toContain("join authorized_company ac on ac.id = rvc.company_id");
    expect(normalized).not.toContain("rvc.representative_user_id");
    expect(normalized).not.toContain("rvc.submitted_by_user_id");

    const verified = normalized.indexOf("when 'verified' then 1");
    const pending = normalized.indexOf("when 'pending_review' then 2");
    const terminal = normalized.indexOf("when 'rejected' then 3");
    const ordering = normalized.indexOf("rvc.decided_at desc nulls last, rvc.id desc");
    expect(verified).toBeGreaterThan(-1);
    expect(pending).toBeGreaterThan(verified);
    expect(terminal).toBeGreaterThan(pending);
    expect(ordering).toBeGreaterThan(terminal);
    expect(normalized).toContain("coalesce((select status from current_case), 'unverified')");
  });

  it("does not broaden privileges, disclose case fields, or mutate state", () => {
    expect(normalized).not.toContain("for update");
    expect(normalized).not.toMatch(/\b(insert|update|delete)\s+(into\s+|from\s+)?public\./);
    expect(normalized).not.toMatch(
      /grant\s+.+\s+on table public\.representative_verification_cases/,
    );
    expect(normalized).not.toMatch(
      /jsonb_build_object\([^)]*(case_id|representative_user_id|submitted_by_user_id|reviewed_by_user_id|reason_code|decided_at|submitted_at)/,
    );
    expect(normalized).not.toContain("ownership_transfer_requests");
  });
});
