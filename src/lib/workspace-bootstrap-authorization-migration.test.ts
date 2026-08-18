import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const migrationPath =
  "supabase/migrations/20260825000000_enable_workspace_bootstrap_self_authorization.sql";
const baselinePath =
  "supabase/migrations/20260822000000_dev_public_baseline.sql";
const directoryMigrationPath =
  "supabase/migrations/20260824000000_restrict_public_company_column_disclosure.sql";
const loginPagePath = "src/app/login/page.tsx";
const createRoutePath = "src/app/api/companies/create/route.ts";

const sql = readFileSync(resolve(process.cwd(), migrationPath), "utf8").replace(
  /\r\n/g,
  "\n",
);
const normalized = sql.replace(/\s+/g, " ").trim().toLowerCase();
const baseline = readFileSync(resolve(process.cwd(), baselinePath), "utf8");
const directoryMigration = readFileSync(
  resolve(process.cwd(), directoryMigrationPath),
  "utf8",
);
const loginPage = readFileSync(resolve(process.cwd(), loginPagePath), "utf8");
const createRoute = readFileSync(resolve(process.cwd(), createRoutePath), "utf8");

const functionBody = sql.slice(
  sql.indexOf("create or replace function public.bootstrap_owned_company_workspace"),
  sql.indexOf("comment on function public.bootstrap_owned_company_workspace"),
);

describe("workspace bootstrap self-authorization migration", () => {
  it("does not grant authenticated clients write access to profiles.company_id", () => {
    expect(sql).toContain(
      "revoke insert (company_id)\non table public.profiles\nfrom authenticated;",
    );
    expect(sql).toContain(
      'revoke update (company_id, "role")\non table public.profiles\nfrom authenticated;',
    );
    expect(sql).toContain(
      'grant insert (id, email, "role")\non table public.profiles\nto authenticated;',
    );
    expect(sql).toContain(
      "grant update (email)\non table public.profiles\nto authenticated;",
    );
    expect(sql).not.toMatch(
      /grant insert \([^)]*company_id[^)]*\)\s+on table public\.profiles/i,
    );
    expect(sql).not.toMatch(
      /grant update \([^)]*company_id[^)]*\)\s+on table public\.profiles/i,
    );
    expect(loginPage).not.toContain("company_id:");
  });

  it("blocks client profile insert from attaching a company", () => {
    expect(sql).toContain(
      'create policy "Authenticated users can insert own profile"',
    );
    expect(sql).toContain("id = auth.uid()\n  and company_id is null");
    expect(createRoute).not.toContain(".upsert({");
    expect(createRoute).toContain('.select("id, email, role, company_id")');
    expect(createRoute).not.toMatch(
      /\.from\(\s*"profiles"\s*\)\s*\.(insert|update|upsert)\s*\(/,
    );
  });

  it("keeps self-only profile update without tenant reassignment", () => {
    expect(sql).toContain(
      'create policy "Authenticated users can update own profile"',
    );
    expect(sql).toContain(
      "for update\nto authenticated\nusing (id = auth.uid())\nwith check (id = auth.uid());",
    );
    expect(sql).not.toContain("using (true)");
    expect(sql).not.toMatch(/grant update\s*\(\s*id/i);
  });

  it("keeps existing own-profile select", () => {
    expect(sql).not.toContain(
      'drop policy if exists "Authenticated users can read own profile"',
    );
    expect(baseline).toContain(
      'CREATE POLICY "Authenticated users can read own profile" ON "public"."profiles" FOR SELECT TO "authenticated" USING (("id" = ( SELECT "auth"."uid"() AS "uid")));',
    );
  });

  it("accepts bootstrap only for a company owned by auth.uid()", () => {
    expect(sql).toContain(
      "create or replace function public.bootstrap_owned_company_workspace",
    );
    expect(sql).toContain("p_company_id uuid");
    expect(sql).toContain("p_profile_role text");
    expect(sql).toContain("security definer");
    expect(sql).toContain("set search_path = ''");
    expect(sql).toContain("actor_user_id uuid := auth.uid();");
    expect(sql).toContain("c.id = p_company_id");
    expect(sql).toContain("c.user_id = actor_user_id");
    expect(functionBody).not.toContain("p_user_id");
  });

  it("rejects a foreign company and does not take a caller-supplied user id", () => {
    expect(sql).toContain("'error_code', 'COMPANY_NOT_OWNED'");
    expect(functionBody).toContain("if owned_company_id is null then");
    expect(functionBody).not.toContain("user_id = p_");
    expect(sql).toContain("drop function if exists public.bootstrap_owned_company_founder_membership(uuid);");
  });

  it("creates or repairs profile linkage and an active founder membership in one command", () => {
    const profileWriteIndex = functionBody.indexOf(
      "insert into public.profiles as existing_profile",
    );
    const membershipWriteIndex = functionBody.indexOf(
      "insert into public.organization_memberships as existing_membership",
    );

    expect(profileWriteIndex).toBeGreaterThan(-1);
    expect(membershipWriteIndex).toBeGreaterThan(profileWriteIndex);
    expect(functionBody).toContain("company_id = excluded.company_id");
    expect(functionBody).toContain("'owner',\n    'founder',\n    'none',\n    'active'");
    expect(functionBody).not.toMatch(/\bexception\b/i);
    expect(functionBody).toContain("return jsonb_build_object(\n    'success', true,");
  });

  it("does not grant organization_memberships insert or anonymous execute", () => {
    expect(sql).not.toMatch(
      /grant\s+insert\s+on\s+table\s+public\.organization_memberships/i,
    );
    expect(sql).not.toMatch(
      /grant\s+update\s+on\s+table\s+public\.organization_memberships/i,
    );
    expect(sql).toContain(
      "revoke all\non function public.bootstrap_owned_company_workspace(uuid, text)\nfrom public;",
    );
    expect(sql).toContain(
      "revoke all\non function public.bootstrap_owned_company_workspace(uuid, text)\nfrom anon;",
    );
    expect(sql).toContain(
      "grant execute\non function public.bootstrap_owned_company_workspace(uuid, text)\nto authenticated, service_role;",
    );
    expect(baseline).not.toMatch(
      /GRANT\s+INSERT[\s\S]*ON TABLE\s+"public"\."organization_memberships"\s+TO\s+"authenticated"/,
    );
  });

  it("does not change existing company write or directory read policies", () => {
    expect(normalized).not.toContain(
      'drop policy if exists "authenticated users can create own company"',
    );
    expect(normalized).not.toContain(
      'drop policy if exists "company owners and admins can update company"',
    );
    expect(normalized).not.toContain(
      'drop policy if exists "company owners and admins can delete company"',
    );
    expect(normalized).not.toMatch(
      /\b(insert|update|delete)\s+on\s+public\.companies\b/,
    );
    expect(baseline).toContain(
      'CREATE POLICY "Authenticated users can create own company"',
    );
    expect(directoryMigration).toContain(
      'create policy "Authenticated users can read created or member companies"',
    );
  });
});
