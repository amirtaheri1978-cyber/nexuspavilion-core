import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  path.resolve(
    process.cwd(),
    "supabase/legacy-migrations/pre-baseline/20260808_correct_company_rls_membership_authorization.sql",
  ),
  "utf8",
).replace(/\r\n/g, "\n");

describe("company RLS membership authorization migration", () => {
  it("explicitly enables RLS while preserving public read and authenticated self-create", () => {
    expect(migration).toContain("alter table public.companies\nenable row level security;");
    expect(migration).toContain('create policy "Public can read companies"');
    expect(migration).toContain("for select\nto public\nusing (true);");
    expect(migration).toContain('create policy "Authenticated users can create own company"');
    expect(migration).toContain("auth.uid() is not null\n  and user_id = auth.uid()");
  });

  it("uses active owner or admin memberships for update and delete, not legacy profiles", () => {
    const updatePolicy = migration.slice(
      migration.indexOf('create policy "Company owners and admins can update company"'),
      migration.indexOf('create policy "Company owners and admins can delete company"'),
    );
    const deletePolicy = migration.slice(
      migration.indexOf('create policy "Company owners and admins can delete company"'),
    );

    for (const policy of [updatePolicy, deletePolicy]) {
      expect(policy).toContain("from public.organization_memberships om");
      expect(policy).toContain("om.user_id = auth.uid()");
      expect(policy).toContain("om.company_id = companies.id");
      expect(policy).toContain("om.membership_status = 'active'");
      expect(policy).toContain("om.workspace_role in ('owner', 'admin')");
      expect(policy).not.toContain("public.profiles");
      expect(policy).not.toContain(".role in ('owner', 'admin')");
    }

    expect((updatePolicy.match(/from public\.organization_memberships om/g) ?? []).length).toBe(2);
  });
});
