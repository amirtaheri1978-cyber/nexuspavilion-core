import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const migrationPath =
  "supabase/migrations/20260827000000_enable_professional_identity_primitives.sql";
const bootstrapMigrationPath =
  "supabase/migrations/20260825000000_enable_workspace_bootstrap_self_authorization.sql";
const invitationContextPath =
  "supabase/migrations/20260823000000_create_get_organization_invitation_context.sql";
const baselinePath =
  "supabase/migrations/20260822000000_dev_public_baseline.sql";
const acceptRoutePath =
  "src/app/api/company-invitations/accept/route.ts";
const createRoutePath = "src/app/api/companies/create/route.ts";
const loginPagePath = "src/app/login/page.tsx";
const serverClientPath = "src/lib/supabase/server.ts";

const sql = readFileSync(resolve(process.cwd(), migrationPath), "utf8").replace(
  /\r\n/g,
  "\n",
);
const bootstrapSql = readFileSync(
  resolve(process.cwd(), bootstrapMigrationPath),
  "utf8",
).replace(/\r\n/g, "\n");
const invitationContextSql = readFileSync(
  resolve(process.cwd(), invitationContextPath),
  "utf8",
).replace(/\r\n/g, "\n");
const baseline = readFileSync(resolve(process.cwd(), baselinePath), "utf8");
const acceptRoute = readFileSync(
  resolve(process.cwd(), acceptRoutePath),
  "utf8",
);
const createRoute = readFileSync(
  resolve(process.cwd(), createRoutePath),
  "utf8",
);
const loginPage = readFileSync(resolve(process.cwd(), loginPagePath), "utf8");
const serverClient = readFileSync(
  resolve(process.cwd(), serverClientPath),
  "utf8",
);

const bootstrapBody = sql.slice(
  sql.indexOf(
    "create or replace function public.bootstrap_owned_company_workspace(",
  ),
  sql.indexOf(
    "comment on function public.bootstrap_owned_company_workspace(uuid, text, text)",
  ),
);

const acceptBody = sql.slice(
  sql.indexOf(
    "create or replace function public.accept_organization_invitation(",
  ),
  sql.indexOf(
    "comment on function public.accept_organization_invitation(text, text)",
  ),
);

const ownTitleBody = sql.slice(
  sql.indexOf(
    "create or replace function public.update_own_workspace_job_title(",
  ),
  sql.indexOf(
    "comment on function public.update_own_workspace_job_title(text)",
  ),
);

const membersBody = sql.slice(
  sql.indexOf("create or replace function public.get_organization_members()"),
  sql.indexOf("comment on function public.get_organization_members()"),
);

const acceptSignature = acceptBody.slice(
  0,
  acceptBody.indexOf("returns jsonb"),
);

describe("NP-MASTER-22-B04-1 professional identity primitives", () => {
  it("adds nullable first_name and last_name with 1..80 trimmed length checks", () => {
    expect(sql).toContain("add column if not exists first_name text");
    expect(sql).toContain("add column if not exists last_name text");
    expect(sql).toContain("profiles_first_name_length_check");
    expect(sql).toContain("profiles_last_name_length_check");
    expect(sql).toContain(
      "first_name is null\n    or char_length(btrim(first_name)) between 1 and 80",
    );
    expect(sql).toContain(
      "last_name is null\n    or char_length(btrim(last_name)) between 1 and 80",
    );
    expect(sql).not.toContain("profiles.job_title");
    expect(sql).not.toContain("add column if not exists display_name");
    expect(sql).not.toContain("add column if not exists full_name");
    expect(sql).not.toMatch(/update public\.profiles\s+set\s+first_name/i);
    expect(sql).not.toMatch(/update public\.profiles\s+set\s+last_name/i);
  });

  it("reuses organization_memberships.job_title with a nullable 1..120 check", () => {
    expect(sql).toContain("organization_memberships_job_title_length_check");
    expect(sql).toContain(
      "job_title is null\n    or char_length(btrim(job_title)) between 1 and 120",
    );
    expect(sql).not.toContain(
      "alter table public.organization_memberships\n  add column if not exists job_title",
    );
    expect(baseline).toContain('"job_title" "text"');
  });

  it("extends own-profile insert and update grants without tenant attachment", () => {
    expect(sql).toContain(
      'grant insert (id, email, "role", first_name, last_name)\non table public.profiles\nto authenticated;',
    );
    expect(sql).toContain(
      "grant update (email, first_name, last_name)\non table public.profiles\nto authenticated;",
    );
    expect(sql).toContain(
      "revoke insert (company_id)\non table public.profiles\nfrom authenticated;",
    );
    expect(sql).toContain(
      'revoke update (id, company_id, "role")\non table public.profiles\nfrom authenticated;',
    );
    expect(sql).not.toMatch(
      /grant insert \([^)]*company_id[^)]*\)\s+on table public\.profiles/i,
    );
    expect(sql).not.toMatch(
      /grant update \([^)]*company_id[^)]*\)\s+on table public\.profiles/i,
    );
    expect(sql).not.toMatch(/grant update\s*\(\s*id/i);
    expect(loginPage).not.toContain("company_id:");
  });

  it("does not broaden own-profile RLS or cross-profile SELECT", () => {
    expect(sql).not.toContain(
      'drop policy if exists "Authenticated users can read own profile"',
    );
    expect(sql).not.toContain(
      'drop policy if exists "Authenticated users can insert own profile"',
    );
    expect(sql).not.toContain(
      'drop policy if exists "Authenticated users can update own profile"',
    );
    expect(bootstrapSql).toContain("id = auth.uid()\n  and company_id is null");
    expect(bootstrapSql).toContain(
      "for update\nto authenticated\nusing (id = auth.uid())\nwith check (id = auth.uid());",
    );
    expect(baseline).toContain(
      'CREATE POLICY "Authenticated users can read own profile" ON "public"."profiles" FOR SELECT TO "authenticated" USING (("id" = ( SELECT "auth"."uid"() AS "uid")));',
    );
    expect(sql).not.toMatch(
      /grant\s+select\s+on\s+table\s+public\.profiles\s+to\s+anon/i,
    );
    expect(sql).not.toMatch(/using \(true\)/);
  });

  it("does not grant authenticated organization_memberships mutation", () => {
    expect(sql).not.toMatch(
      /grant\s+(insert|update|delete|all)\s+on\s+table\s+public\.organization_memberships/i,
    );
    expect(sql).not.toMatch(
      /grant update\s*\([^)]*job_title[^)]*\)\s+on table public\.organization_memberships/i,
    );
    expect(baseline).not.toMatch(
      /GRANT\s+INSERT[\s\S]*ON TABLE\s+"public"\."organization_memberships"\s+TO\s+"authenticated"/,
    );
  });

  it("extends bootstrap with optional p_job_title while keeping auth.uid actor bounds", () => {
    expect(sql).toContain(
      "drop function if exists public.bootstrap_owned_company_workspace(uuid, text);",
    );
    expect(sql).toContain("p_company_id uuid");
    expect(sql).toContain("p_profile_role text");
    expect(sql).toContain("p_job_title text default null");
    expect(bootstrapBody).toContain("security definer");
    expect(bootstrapBody).toContain("set search_path = ''");
    expect(bootstrapBody).toContain("actor_user_id uuid := auth.uid();");
    expect(bootstrapBody).not.toContain("p_user_id");
    expect(bootstrapBody).toContain("c.id = p_company_id");
    expect(bootstrapBody).toContain("c.user_id = actor_user_id");
    expect(bootstrapBody).toContain("'error_code', 'COMPANY_NOT_OWNED'");
    expect(sql).toContain(
      "revoke all\non function public.bootstrap_owned_company_workspace(uuid, text, text)\nfrom public;",
    );
    expect(sql).toContain(
      "revoke all\non function public.bootstrap_owned_company_workspace(uuid, text, text)\nfrom anon;",
    );
    expect(sql).toContain(
      "grant execute\non function public.bootstrap_owned_company_workspace(uuid, text, text)\nto authenticated, service_role;",
    );
  });

  it("writes founder job_title without overwriting profile names", () => {
    const profileInsert = bootstrapBody.slice(
      bootstrapBody.indexOf("insert into public.profiles as existing_profile"),
      bootstrapBody.indexOf("insert into public.organization_memberships"),
    );
    const membershipInsert = bootstrapBody.slice(
      bootstrapBody.indexOf("insert into public.organization_memberships"),
    );

    expect(profileInsert).not.toContain("first_name");
    expect(profileInsert).not.toContain("last_name");
    expect(profileInsert).toContain("company_id = excluded.company_id");
    expect(membershipInsert).toContain("job_title,");
    expect(membershipInsert).toContain("normalized_job_title");
    expect(membershipInsert).toContain("'owner',\n    'founder',\n    'none',\n    'active'");
    expect(membershipInsert).toContain(
      "job_title = coalesce(\n      excluded.job_title,\n      existing_membership.job_title\n    )",
    );
    expect(bootstrapBody).toContain("'error_code', 'JOB_TITLE_TOO_LONG'");
    expect(createRoute).toContain("p_company_id: company.id");
    expect(createRoute).toContain("p_profile_role: accountConfig.profileRole");
    expect(createRoute).not.toContain("p_user_id");
  });

  it("extends invitation accept with p_job_title without reopening Task 17 authority", () => {
    expect(sql).toContain(
      "drop function if exists public.accept_organization_invitation(text);",
    );
    expect(acceptSignature).toContain("invitation_token text");
    expect(acceptSignature).toContain("p_job_title text default null");
    expect(acceptSignature).not.toContain("p_company_id");
    expect(acceptSignature).not.toContain("p_user_id");
    expect(acceptSignature).not.toContain("p_workspace_role");
    expect(acceptSignature).not.toContain("p_procurement_function");
    expect(acceptBody).toContain("actor_user_id := auth.uid()");
    expect(acceptBody).toContain("'error_code', 'RECIPIENT_MISMATCH'");
    expect(acceptBody).toContain("'error_code', 'UNAUTHENTICATED'");
    expect(acceptBody).toContain("'error_code', 'INVITATION_EXPIRED'");
    expect(acceptBody).toContain("'error_code', 'INVITATION_NOT_PENDING'");
    expect(acceptBody).toContain(
      "actor_email <> lower(trim(invitation_record.email))",
    );
    expect(acceptBody).toContain("invitation_record.company_id");
    expect(sql).toContain(
      "revoke all\non function public.accept_organization_invitation(text, text)\nfrom anon;",
    );
    expect(sql).toContain(
      "grant execute\non function public.accept_organization_invitation(text, text)\nto authenticated;",
    );
    expect(sql).not.toContain(
      "grant execute\non function public.accept_organization_invitation(text, text)\nto anon;",
    );
    expect(acceptRoute).toContain('"accept_organization_invitation"');
    expect(acceptRoute).toContain("invitation_token: token");
    expect(acceptRoute).not.toContain("p_company_id");
    expect(acceptRoute).not.toContain("p_user_id");
  });

  it("writes accept job_title only onto the accepted membership and leaves invitation rows untitled", () => {
    const membershipInsert = acceptBody.slice(
      acceptBody.indexOf("insert into public.organization_memberships"),
      acceptBody.indexOf("update public.invitations"),
    );
    const invitationUpdate = acceptBody.slice(
      acceptBody.indexOf("update public.invitations"),
      acceptBody.indexOf("insert into public.notifications"),
    );
    const profileInsert = acceptBody.slice(
      acceptBody.indexOf("insert into public.profiles"),
      acceptBody.indexOf("insert into public.organization_memberships"),
    );

    expect(membershipInsert).toContain("job_title,");
    expect(membershipInsert).toContain("normalized_job_title");
    expect(membershipInsert).toContain("invitation_record.company_id");
    expect(membershipInsert).toContain("actor_user_id");
    expect(invitationUpdate).not.toContain("job_title");
    expect(profileInsert).not.toContain("first_name");
    expect(profileInsert).not.toContain("last_name");
    expect(profileInsert).not.toContain("job_title");
  });

  it("leaves the invitation context RPC unchanged and token-only", () => {
    expect(invitationContextSql).toContain(
      "create or replace function public.get_organization_invitation_context(",
    );
    expect(invitationContextSql).toContain("p_token text");
    expect(invitationContextSql).not.toContain("p_job_title");
    expect(invitationContextSql).not.toContain("first_name");
    expect(sql).not.toContain("get_organization_invitation_context");
  });

  it("creates an own-job-title RPC that mutates only the unique active membership title", () => {
    expect(ownTitleBody).toContain("security definer");
    expect(ownTitleBody).toContain("set search_path = ''");
    expect(ownTitleBody).toContain("actor_user_id uuid := auth.uid();");
    expect(ownTitleBody).not.toContain("p_user_id");
    expect(ownTitleBody).not.toContain("p_company_id");
    expect(ownTitleBody).toContain("'error_code', 'AMBIGUOUS_WORKSPACE'");
    expect(ownTitleBody).toContain("'error_code', 'NO_ACTIVE_MEMBERSHIP'");
    expect(ownTitleBody).toContain("job_title = normalized_job_title,\n    updated_at = now()");
    expect(ownTitleBody).not.toContain("workspace_role =");
    expect(ownTitleBody).not.toContain("membership_type =");
    expect(ownTitleBody).not.toContain("procurement_function =");
    expect(ownTitleBody).not.toContain("user_id = excluded");
    expect(ownTitleBody).not.toContain("company_id = excluded");
    expect(sql).toContain(
      "revoke all\non function public.update_own_workspace_job_title(text)\nfrom anon;",
    );
    expect(sql).toContain(
      "grant execute\non function public.update_own_workspace_job_title(text)\nto authenticated;",
    );
    expect(sql).not.toContain(
      "grant execute\non function public.update_own_workspace_job_title(text)\nto anon;",
    );
  });

  it("extends get_organization_members with names and job_title without broad profile SELECT", () => {
    expect(sql).toContain("drop function if exists public.get_organization_members();");
    expect(membersBody).toContain("first_name text");
    expect(membersBody).toContain("last_name text");
    expect(membersBody).toContain("job_title text");
    expect(membersBody).toContain("p.first_name");
    expect(membersBody).toContain("p.last_name");
    expect(membersBody).toContain("om.job_title");
    expect(membersBody).toContain("p.email");
    expect(membersBody).toContain("om.workspace_role");
    expect(membersBody).toContain("security definer");
    expect(sql).toContain(
      "revoke all\non function public.get_organization_members()\nfrom anon;",
    );
    expect(sql).toContain(
      "grant execute\non function public.get_organization_members()\nto authenticated;",
    );
    expect(sql).not.toMatch(
      /grant\s+select\s+on\s+table\s+public\.profiles\s+to\s+authenticated/,
    );
  });

  it("does not add service_role to application clients", () => {
    for (const source of [acceptRoute, createRoute, loginPage, serverClient]) {
      expect(source).not.toMatch(
        /service_role|SERVICE_ROLE|createAdminClient|secret key/i,
      );
    }
  });
});
