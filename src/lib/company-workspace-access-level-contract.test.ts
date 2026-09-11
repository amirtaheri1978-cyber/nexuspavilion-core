import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const BASELINE_V2_PATH =
  "supabase/migrations/20260911000000_launch_candidate_baseline_v2.sql";
const HISTORICAL_INVITATION_ACCESS_PATH =
  "supabase/legacy-migrations/pre-baseline-v2/20260837000000_secure_company_workspace_invitation_access.sql";

function normalizeContractSql(source: string) {
  return source
    .replace(/\r\n/g, "\n")
    .replace(/"/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function readSource(relativePath: string) {
  return readFileSync(resolve(process.cwd(), relativePath), "utf8").replace(
    /\r\n/g,
    "\n",
  );
}

const createRoutePath = "src/app/api/company-invitations/route.ts";
const resendRoutePath = "src/app/api/company-invitations/resend/route.ts";
const acceptRoutePath = "src/app/api/company-invitations/accept/route.ts";
const inviteFormPath = "src/components/invite-user-form.tsx";

const sql = normalizeContractSql(readSource(BASELINE_V2_PATH));
const historicalInvitationAccess = normalizeContractSql(
  readSource(HISTORICAL_INVITATION_ACCESS_PATH),
);
const createRoute = readSource(createRoutePath);
const resendRoute = readSource(resendRoutePath);
const acceptRoute = readSource(acceptRoutePath);
const inviteForm = readSource(inviteFormPath);

function functionBody(name: string) {
  const marker = `create or replace function public.${name.toLowerCase()}`;
  const start = sql.indexOf(marker);
  expect(start, `missing ${name}`).toBeGreaterThan(-1);
  const end = sql.indexOf(`alter function public.${name.toLowerCase()}`, start);
  expect(end).toBeGreaterThan(start);
  return sql.slice(start, end);
}

const createBody = functionBody("create_company_workspace_invitation");
const acceptBody = functionBody("accept_organization_invitation");

describe("company workspace Access Level invitation contract (FINAL ACTIVE: Baseline V2)", () => {
  it("does not add a workspace_role column on invitations or a duplicate authority column", () => {
    expect(createBody).not.toContain("add column if not exists workspace_role");
    expect(createBody).not.toContain("alter table public.invitations");
    expect(createBody).toContain("insert into public.invitations (");
    expect(createBody).toContain("normalized_role,");
    expect(createBody).toContain("role,");
  });

  it("preserves SECURITY DEFINER, search_path, owner, and execute grants", () => {
    expect(createBody).toContain("security definer");
    expect(createBody).toContain("set search_path to 'public', 'pg_temp'");
    expect(acceptBody).toContain("security definer");
    expect(acceptBody).toContain("set search_path to 'public', 'pg_temp'");
    expect(sql).toContain(
      "alter function public.create_company_workspace_invitation(p_email text, p_role text) owner to postgres",
    );
    expect(sql).toContain(
      "alter function public.accept_organization_invitation(invitation_token text, p_job_title text) owner to postgres",
    );
    expect(sql).toContain(
      "revoke all on function public.create_company_workspace_invitation(p_email text, p_role text) from public",
    );
    expect(sql).toContain(
      "grant all on function public.create_company_workspace_invitation(p_email text, p_role text) to authenticated",
    );
    expect(sql).toContain(
      "revoke all on function public.accept_organization_invitation(invitation_token text, p_job_title text) from public",
    );
    expect(sql).toContain(
      "grant all on function public.accept_organization_invitation(invitation_token text, p_job_title text) to authenticated",
    );
    expect(sql).not.toContain(
      "grant all on function public.create_company_workspace_invitation(p_email text, p_role text) to anon",
    );
    expect(sql).not.toContain(
      "grant all on function public.accept_organization_invitation(invitation_token text, p_job_title text) to anon",
    );
  });

  it("accepts viewer, member, and admin for new invitation creation", () => {
    expect(createBody).toContain(
      "if normalized_role not in ('viewer', 'member', 'admin') then",
    );
    expect(createRoute).toContain('"viewer" | "member" | "admin"');
    expect(createRoute).toContain("parseInviteAccessLevel");
    expect(inviteForm).toContain('value: "viewer"');
    expect(inviteForm).toContain('value: "member"');
    expect(inviteForm).toContain('value: "admin"');
  });

  it("rejects buyer, vendor, and owner for new invitations", () => {
    expect(createBody).not.toContain("'admin', 'buyer', 'vendor'");
    expect(createBody).toContain(
      "if normalized_role not in ('viewer', 'member', 'admin') then",
    );
    expect(createBody).not.toContain(
      "normalized_role not in ('viewer', 'member', 'admin', 'owner')",
    );
    expect(sql).toContain("owner cannot be invited through this command.");
    expect(createRoute).toContain("if (!role)");
    expect(createRoute).toContain("{ status: 400 }");
    expect(inviteForm).not.toContain('value: "owner"');
    expect(inviteForm).not.toContain('value: "buyer"');
    expect(inviteForm).not.toContain('value: "vendor"');
  });

  it("maps new Access Levels on acceptance without legacy buyer/vendor profiles.role", () => {
    expect(acceptBody).toContain("when 'viewer' then");
    expect(acceptBody).toContain("when 'member' then");
    expect(acceptBody).toContain("when 'admin' then");
    expect(acceptBody).toContain("next_workspace_role := 'viewer'");
    expect(acceptBody).toContain("next_workspace_role := 'member'");
    expect(acceptBody).toContain("next_workspace_role := 'admin'");
    expect(acceptBody).toContain("next_procurement_function := 'none'");
    expect(acceptBody).toContain("next_membership_type := 'employee'");
    expect(acceptBody).toContain("next_profile_role := null");
    expect(acceptBody).toContain("next_profile_role := 'admin'");
    expect(acceptBody).toContain("next_profile_role,");
    expect(acceptBody).not.toContain(
      "lower(trim(invitation_record.role)), invitation_record.company_id",
    );
  });

  it("keeps historical buyer and vendor acceptance semantics", () => {
    expect(acceptBody).toContain("when 'buyer' then");
    expect(acceptBody).toContain("when 'vendor' then");
    expect(acceptBody).toContain("next_procurement_function := 'buyer'");
    expect(acceptBody).toContain("next_procurement_function := 'supplier'");
    expect(acceptBody).toContain("next_membership_type := 'procurement_agent'");
    expect(acceptBody).toContain(
      "next_membership_type := 'external_consultant'",
    );
    expect(acceptBody).toContain("next_profile_role := 'buyer'");
    expect(acceptBody).toContain("next_profile_role := 'vendor'");
    expect(acceptBody).toContain(
      "'legacy_role', lower(trim(invitation_record.role))",
    );
    expect(acceptBody).not.toContain("invitation_record.role =");
  });

  it("uses canonical Access Level labels in SQL notifications", () => {
    expect(acceptBody).toContain("access_level_label := 'read only'");
    expect(acceptBody).toContain("access_level_label := 'standard'");
    expect(acceptBody).toContain("access_level_label := 'administrator'");
    expect(acceptBody).toContain("|| access_level_label");
    expect(acceptBody).not.toContain(
      "initcap(lower(trim(invitation_record.role)))",
    );
  });

  it("company-scopes acceptance notifications for workspace visibility", () => {
    expect(acceptBody).toContain(
      "insert into public.notifications ( company_id,",
    );
    expect(acceptBody).toContain(
      "values ( invitation_record.company_id, 'invitation accepted',",
    );
  });

  it("preserves recipient mismatch, pending uniqueness, and tenant isolation", () => {
    expect(acceptBody).toContain("'error_code', 'recipient_mismatch'");
    expect(acceptBody).toContain(
      "actor_email <> lower(trim(invitation_record.email))",
    );
    expect(acceptBody).toContain("'error_code', 'invitation_not_pending'");
    expect(acceptBody).toContain("invitation_record.status <> 'pending'");
    expect(createBody).toContain(
      "resolve_company_workspace_invitation_context()",
    );
    expect(createBody).toContain("i.company_id = actor_company_id");
    expect(createBody).toContain("'error_code', 'invitation_already_pending'");

    // HISTORICAL PROVENANCE: pending uniqueness index introduced before Baseline V2.
    expect(historicalInvitationAccess).toContain(
      "create unique index if not exists invitations_pending_company_email_uidx",
    );
    expect(sql).toContain("invitations_pending_company_email_uidx");

    expect(acceptRoute).toContain('"accept_organization_invitation"');
    expect(acceptRoute).not.toContain("p_company_id");
    expect(acceptRoute).not.toContain("p_user_id");
    expect(resendRoute).toContain("invitation.role || \"\"");
    expect(resendRoute).not.toContain('invitation.role || "vendor"');
  });
});
