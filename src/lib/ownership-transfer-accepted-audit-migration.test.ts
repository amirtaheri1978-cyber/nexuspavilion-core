import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(path.resolve(process.cwd(), "supabase/legacy-migrations/pre-baseline/20260808_add_ownership_transfer_accepted_audit.sql"), "utf8");

describe("atomic ownership acceptance audit migration", () => {
  it("emits Accepted before Completed while retaining direct completion", () => {
    expect(migration.indexOf("'OWNERSHIP_TRANSFER_ACCEPTED'")).toBeGreaterThan(-1);
    expect(migration.indexOf("'OWNERSHIP_TRANSFER_COMPLETED'")).toBeGreaterThan(migration.indexOf("'OWNERSHIP_TRANSFER_ACCEPTED'"));
    expect(migration).toContain("status = 'completed'");
    expect(migration).toContain("accepted_at = accepted_timestamp");
    expect(migration).toContain("completed_at = accepted_timestamp");
  });

  it("retains ownership synchronization without adding an accepted state or cancellation", () => {
    expect(migration).toContain("workspace_role = transfer_request.previous_owner_next_role");
    expect(migration).toContain("workspace_role = 'owner'");
    expect(migration).toContain("user_id = transfer_request.to_user_id");
    expect(migration).not.toContain("status = 'accepted'");
    expect(migration).not.toContain("cancel_company_ownership_transfer");
    expect(migration).not.toContain("procurement_function =");
  });
});
