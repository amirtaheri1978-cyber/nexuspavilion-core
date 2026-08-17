import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

const migration = readFileSync(
  path.resolve(
    process.cwd(),
    "supabase/legacy-migrations/pre-baseline/20260808_fix_request_company_ownership_transfer_expiration_audit.sql",
  ),
  "utf8",
);

describe("request-time ownership-transfer expiration audit migration", () => {
  it("audits only the expired pending rows returned by its update", () => {
    expect(migration).toContain("for expired_transfer_request in");
    expect(migration).toContain("and status = 'pending_acceptance'");
    expect(migration).toContain("returning *");
    expect(migration).toContain("'OWNERSHIP_TRANSFER_EXPIRED'");
    expect(migration).toContain("'expiration_detected_during', 'request'");
  });

  it("preserves creation and requested audit evidence", () => {
    expect(migration).toContain("insert into public.ownership_transfer_requests");
    expect(migration).toContain("'OWNERSHIP_TRANSFER_REQUESTED'");
  });

  it("does not broaden the fix into ownership, membership, or cancellation changes", () => {
    expect(migration).not.toContain("update public.companies");
    expect(migration).not.toContain("update public.organization_memberships");
    expect(migration).not.toContain("cancel_company_ownership_transfer");
  });
});
