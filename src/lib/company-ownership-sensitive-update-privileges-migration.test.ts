import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const privilegeMigration = readFileSync(
  path.resolve(
    process.cwd(),
    "supabase/migrations/20260808_restrict_company_ownership_sensitive_updates.sql",
  ),
  "utf8",
);
const acceptanceMigration = readFileSync(
  path.resolve(
    process.cwd(),
    "supabase/migrations/20260808_add_ownership_transfer_accepted_audit.sql",
  ),
  "utf8",
);
const migrationFiles = [
  "20260808_restrict_company_ownership_sensitive_updates.sql",
  "20260801_create_get_organization_members_rpc.sql",
  "20260801_create_update_organization_member_role_rpc.sql",
  "20260801_create_remove_organization_member_rpc.sql",
  "20260801_create_accept_organization_invitation_rpc.sql",
  "20260802_add_company_workspace_status.sql",
  "20260802_create_ownership_transfer_requests.sql",
  "20260802_enforce_single_active_owner.sql",
  "20260802_create_request_company_ownership_transfer_rpc.sql",
  "20260802_create_accept_company_ownership_transfer_rpc.sql",
  "20260802_create_reject_company_ownership_transfer_rpc.sql",
  "20260808_fix_request_company_ownership_transfer_expiration_audit.sql",
  "20260808_add_ownership_transfer_accepted_audit.sql",
].map((fileName) => ({
  fileName,
  contents: readFileSync(
    path.resolve(process.cwd(), "supabase/migrations", fileName),
    "utf8",
  ),
}));
const recoveryRoute = readFileSync(
  path.resolve(process.cwd(), "src/app/api/company/recover-admin/route.ts"),
  "utf8",
);

describe("company ownership-sensitive update boundary (STATIC)", () => {
  it("removes generic client update and grants only ordinary company fields", () => {
    expect(privilegeMigration).toContain("revoke update\non table public.companies\nfrom public;");
    expect(privilegeMigration).toContain("revoke update\non table public.companies\nfrom anon;");
    expect(privilegeMigration).toContain("revoke update\non table public.companies\nfrom authenticated;");
    expect(privilegeMigration).toContain("grant update (\n  name,\n  category,\n  location,\n  network_role,\n  logo_url\n)");
    expect(privilegeMigration).not.toContain("user_id");
    expect(privilegeMigration).not.toContain("to anon");
  });

  it("has no later repository migration that grants generic company update", () => {
    const genericCompanyUpdateGrant = /grant\s+(?:all|update)\s+on\s+(?:table\s+)?public\.companies\s+to\s+(?:public|anon|authenticated)\b/i;

    for (const migration of migrationFiles) {
      expect(migration.contents, migration.fileName).not.toMatch(genericCompanyUpdateGrant);
    }
  });

  it("retains controlled ownership transfer while disabling the unsafe recovery bypass", () => {
    expect(acceptanceMigration).toContain("security definer");
    expect(acceptanceMigration).toContain("update public.companies");
    expect(acceptanceMigration).toContain("user_id = transfer_request.to_user_id");
    expect(recoveryRoute).not.toContain('.from("companies")');
    expect(recoveryRoute).not.toContain("user_id:");
    expect(recoveryRoute).not.toContain('role: "owner"');
    expect(recoveryRoute).toContain("status: 410");
  });
});
