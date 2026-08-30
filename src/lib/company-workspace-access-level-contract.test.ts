import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

function readSource(relativePath: string) {
  return readFileSync(resolve(process.cwd(), relativePath), "utf8").replace(
    /\r\n/g,
    "\n",
  );
}

const migrationPath =
  "supabase/migrations/20260838000000_company_workspace_access_level_contract.sql";
const priorInvitationAccessPath =
  "supabase/migrations/20260837000000_secure_company_workspace_invitation_access.sql";
const createRoutePath = "src/app/api/company-invitations/route.ts";
const resendRoutePath = "src/app/api/company-invitations/resend/route.ts";
const acceptRoutePath = "src/app/api/company-invitations/accept/route.ts";
const inviteFormPath = "src/components/invite-user-form.tsx";

const sql = readSource(migrationPath);
const priorInvitationAccess = readSource(priorInvitationAccessPath);
const createRoute = readSource(createRoutePath);
const resendRoute = readSource(resendRoutePath);
const acceptRoute = readSource(acceptRoutePath);
const inviteForm = readSource(inviteFormPath);

const createBody = sql.slice(
  sql.indexOf(
    "create or replace function public.create_company_workspace_invitation(",
  ),
  sql.indexOf(
    "create or replace function public.accept_organization_invitation(",
  ),
);

const acceptBody = sql.slice(
  sql.indexOf(
    "create or replace function public.accept_organization_invitation(",
  ),
  sql.indexOf(
    "comment on function public.create_company_workspace_invitation(text, text)",
  ),
);

describe("company workspace Access Level invitation contract", () => {
  it("does not add a workspace_role column on invitations or a duplicate authority column", () => {
    expect(sql).not.toContain("add column if not exists workspace_role");
    expect(sql).not.toContain("alter table public.invitations");
    expect(sql).toContain("insert into public.invitations (");
    expect(createBody).toContain("normalized_role,");
    expect(createBody).toContain("role,");
  });

  it("preserves SECURITY DEFINER, search_path, owner, and execute grants", () => {
    expect(createBody).toContain("security definer");
    expect(createBody).toContain("set search_path = public, pg_temp");
    expect(acceptBody).toContain("security definer");
    expect(acceptBody).toContain("set search_path = public, pg_temp");
    expect(sql).toContain(
      "alter function public.create_company_workspace_invitation(text, text)\n  owner to postgres;",
    );
    expect(sql).toContain(
      "alter function public.accept_organization_invitation(text, text)\n  owner to postgres;",
    );
    expect(sql).toContain(
      "revoke all on function public.create_company_workspace_invitation(text, text)\nfrom anon;",
    );
    expect(sql).toContain(
      "grant execute on function public.create_company_workspace_invitation(text, text)\nto authenticated;",
    );
    expect(sql).toContain(
      "revoke all\non function public.accept_organization_invitation(text, text)\nfrom anon;",
    );
    expect(sql).toContain(
      "grant execute\non function public.accept_organization_invitation(text, text)\nto authenticated;",
    );
    expect(sql).not.toContain(
      "grant execute on function public.create_company_workspace_invitation(text, text)\nto anon;",
    );
    expect(sql).not.toContain(
      "grant execute\non function public.accept_organization_invitation(text, text)\nto anon;",
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
    expect(sql).toContain("Owner cannot be invited through this command.");
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
      "lower(trim(invitation_record.role)),\n    invitation_record.company_id",
    );
  });

  it("keeps historical buyer and vendor acceptance semantics", () => {
    expect(acceptBody).toContain("when 'buyer' then");
    expect(acceptBody).toContain("when 'vendor' then");
    expect(acceptBody).toContain("next_procurement_function := 'buyer'");
    expect(acceptBody).toContain("next_procurement_function := 'supplier'");
    expect(acceptBody).toContain("next_membership_type := 'procurement_agent'");
    expect(acceptBody).toContain("next_membership_type := 'external_consultant'");
    expect(acceptBody).toContain("next_profile_role := 'buyer'");
    expect(acceptBody).toContain("next_profile_role := 'vendor'");
    expect(acceptBody).toContain("'legacy_role', lower(trim(invitation_record.role))");
    expect(acceptBody).not.toContain("invitation_record.role =");
  });

  it("uses canonical Access Level labels in SQL notifications", () => {
    expect(acceptBody).toContain("access_level_label := 'Read Only'");
    expect(acceptBody).toContain("access_level_label := 'Standard'");
    expect(acceptBody).toContain("access_level_label := 'Administrator'");
    expect(acceptBody).toContain("|| access_level_label");
    expect(acceptBody).not.toContain("initcap(lower(trim(invitation_record.role)))");
  });

  it("company-scopes acceptance notifications for workspace visibility", () => {
    expect(acceptBody).toContain(
      "insert into public.notifications (\n    company_id,",
    );
    expect(acceptBody).toContain(
      "values (\n    invitation_record.company_id,\n    'Invitation Accepted',",
    );
  });

  it("preserves recipient mismatch, pending uniqueness, and tenant isolation", () => {
    expect(acceptBody).toContain("'error_code', 'RECIPIENT_MISMATCH'");
    expect(acceptBody).toContain(
      "actor_email <> lower(trim(invitation_record.email))",
    );
    expect(acceptBody).toContain("'error_code', 'INVITATION_NOT_PENDING'");
    expect(acceptBody).toContain("invitation_record.status <> 'pending'");
    expect(createBody).toContain("resolve_company_workspace_invitation_context()");
    expect(createBody).toContain("i.company_id = actor_company_id");
    expect(createBody).toContain("'error_code', 'INVITATION_ALREADY_PENDING'");
    expect(priorInvitationAccess).toContain(
      "create unique index if not exists invitations_pending_company_email_uidx",
    );
    expect(acceptRoute).toContain('"accept_organization_invitation"');
    expect(acceptRoute).not.toContain("p_company_id");
    expect(acceptRoute).not.toContain("p_user_id");
    expect(resendRoute).toContain("invitation.role || \"\"");
    expect(resendRoute).not.toContain('invitation.role || "vendor"');
  });
});
