import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
const migration = readFileSync(resolve(process.cwd(), "supabase/migrations/20260811_add_representative_verification_cases.sql"), "utf8");
describe("representative verification case persistence", () => {
  it("is isolated, constrained, and non-client-mutable", () => {
    expect(migration).toContain("create table public.representative_verification_cases");
    expect(migration).toContain("'pending_review', 'verified', 'rejected', 'invalidated'");
    expect(migration).not.toContain("'unverified'");
    expect(migration).toContain("rejection_reason_code = 'REPRESENTATIVE_AUTHORITY_NOT_CONFIRMED'");
    expect(migration).toContain("invalidation_reason_code in ('OWNER_CHANGED', 'OWNER_MEMBERSHIP_INACTIVE', 'OWNERSHIP_PROJECTION_MISMATCH', 'SUBJECT_UNAVAILABLE')");
    expect(migration).toContain("submitted_owner_membership_id uuid references public.organization_memberships(id)");
    expect(migration).toContain("submitted_company_owner_user_id uuid references public.profiles(id)");
    expect(migration).toContain("status = 'pending_review' and decided_at is null");
    expect(migration).toContain("status = 'verified' and decided_at is not null and reviewed_by_user_id is not null");
    expect(migration).toContain("status = 'rejected' and decided_at is not null and reviewed_by_user_id is not null and rejection_reason_code is not null");
    expect(migration).toContain("status = 'invalidated' and decided_at is not null");
    expect(migration).toContain("representative_verification_cases_one_pending_per_subject");
    expect(migration).toContain("enable row level security");
    expect(migration).toContain("revoke all on table public.representative_verification_cases from authenticated");
    expect(migration).not.toContain("workspace_role");
    expect(migration).not.toContain("ownership_transfer_requests");
    expect(migration).not.toContain("raw_document");
  });
});
