import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const route = readFileSync(
  resolve(process.cwd(), "src/app/api/companies/create/route.ts"),
  "utf8",
).replace(/\r\n/g, "\n");
const helper = readFileSync(
  resolve(process.cwd(), "src/lib/auth/workspace-bootstrap.ts"),
  "utf8",
).replace(/\r\n/g, "\n");
const createCompanyPage = readFileSync(
  resolve(process.cwd(), "src/app/create-company/page.tsx"),
  "utf8",
).replace(/\r\n/g, "\n");
const serverClient = readFileSync(
  resolve(process.cwd(), "src/lib/supabase/server.ts"),
  "utf8",
).replace(/\r\n/g, "\n");

describe("workspace bootstrap create route", () => {
  const postHandler = route.slice(route.indexOf("export async function POST"));

  it("creates a company then bootstraps profile link and founder membership", () => {
    expect(route).toContain('.from("companies")');
    expect(route).toContain("user_id: user.id");
    expect(route).toContain('"bootstrap_owned_company_workspace"');
    expect(route).toContain("p_company_id: company.id");
    expect(route).toContain("p_profile_role: accountConfig.profileRole");
    expect(route).toContain("p_job_title: jobTitle || null");
    expect(route).toContain("bootstrapPayload?.success !== true");
    expect(route).toContain("success: true");
    expect(route).not.toContain(".upsert({");
    expect(route).not.toContain("bootstrap_owned_company_founder_membership");
  });

  it("recovers a missing profile when exactly one owned company exists", () => {
    expect(route).toContain('.eq("user_id", user.id)');
    expect(route).toContain("planOwnedCompanyResolution");
    expect(route).toContain('companyPlan.action === "recover"');
    expect(route).toContain('.eq("id", companyPlan.companyId)');
    expect(helper).toContain('action: "recover"');
    expect(helper).toContain("uniqueOwnedCompanyIds.length === 1");
  });

  it("fails closed for multiple owned orphan companies", () => {
    expect(route).toContain('companyPlan.action === "recovery_required"');
    expect(route).toContain("WORKSPACE_RECOVERY_REQUIRED_ERROR");
    expect(route).toContain("status: 409");
    expect(helper).toContain("uniqueOwnedCompanyIds.length > 1");
    expect(helper).toContain('action: "recovery_required"');
  });

  it("does not blindly insert another company on retry", () => {
    const ownedLookupIndex = postHandler.indexOf('.from("companies")');
    const planIndex = postHandler.indexOf("planOwnedCompanyResolution");
    const recoverIndex = postHandler.indexOf(
      'companyPlan.action === "recover"',
    );
    const nameSyncIndex = postHandler.indexOf(
      "syncCurrentUserProfessionalNames",
    );
    const companyInsertIndex = postHandler.indexOf('status: "verified"');
    const bootstrapIndex = postHandler.indexOf(
      '"bootstrap_owned_company_workspace"',
    );

    expect(ownedLookupIndex).toBeGreaterThan(-1);
    expect(planIndex).toBeGreaterThan(ownedLookupIndex);
    expect(recoverIndex).toBeGreaterThan(planIndex);
    expect(nameSyncIndex).toBeGreaterThan(planIndex);
    expect(companyInsertIndex).toBeGreaterThan(nameSyncIndex);
    expect(bootstrapIndex).toBeGreaterThan(companyInsertIndex);
    expect(postHandler).toContain(
      'companyPlan.action === "already_connected"',
    );
    expect(postHandler).toContain("WORKSPACE_ALREADY_CONNECTED_ERROR");
    expect(postHandler).not.toContain(
      "Company created, but failed to connect your profile.",
    );
  });

  it("does not add service_role to application code", () => {
    for (const source of [route, helper, createCompanyPage, serverClient]) {
      expect(source).not.toMatch(
        /service_role|SERVICE_ROLE|createAdminClient|secret key/i,
      );
    }

    expect(serverClient).toContain("NEXT_PUBLIC_SUPABASE_ANON_KEY");
    expect(route).toContain(
      'import { createClient } from "@/lib/supabase/server"',
    );
    expect(route).not.toContain('.from("organization_memberships")');
  });

  it("does not expose raw provider errors after a partial write", () => {
    expect(route).toContain("WORKSPACE_BOOTSTRAP_INCOMPLETE_ERROR");
    expect(route).not.toContain("error.message");
    expect(route).not.toContain("bootstrapError.message");
    expect(createCompanyPage).toContain("getFriendlyWorkspaceCreateError");
    expect(createCompanyPage).not.toContain("signupError.message");
  });
});
