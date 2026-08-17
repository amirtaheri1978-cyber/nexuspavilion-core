import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  resolve(process.cwd(), "supabase/legacy-migrations/pre-baseline/20260810_add_internal_reviewer_authorization.sql"),
  "utf8",
);

describe("internal reviewer authorization migration", () => {
  it("creates a platform-scoped, constrained, revocable capability", () => {
    expect(migration).toContain("create table public.internal_reviewer_assignments");
    expect(migration).toContain("capability = 'representative_verification.review'");
    expect(migration).toContain("status in ('active', 'revoked')");
    expect(migration).toContain("internal_reviewer_assignments_one_active_capability");
    expect(migration).toContain("where status = 'active'");
    expect(migration).not.toContain("company_id");
  });

  it("blocks ordinary client access and does not derive authority from business roles", () => {
    expect(migration).toContain("enable row level security");
    expect(migration).toContain("revoke all on table public.internal_reviewer_assignments from authenticated");
    expect(migration).not.toContain("workspace_role");
    expect(migration).not.toContain("procurement_function");
    expect(migration).not.toContain("profiles.role");
    expect(migration).not.toContain("representative_verification_cases");
  });
});
