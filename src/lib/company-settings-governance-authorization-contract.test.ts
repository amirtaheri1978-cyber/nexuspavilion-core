import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

function readSource(relativePath: string) {
  return fs.readFileSync(path.join(process.cwd(), relativePath), "utf8");
}

const settingsPage = readSource("src/app/company/settings/page.tsx");
const settingsForm = readSource("src/components/company-settings-form.tsx");
const membersCenter = readSource("src/components/company-members-center.tsx");
const logoUpload = readSource("src/components/company-logo-upload.tsx");
const companyRoute = readSource("src/app/api/companies/[id]/route.ts");
const logoRoute = readSource("src/app/api/companies/[id]/logo/route.ts");
const permissions = readSource(
  "src/lib/authorization/workspace-permissions.ts",
);

const companyPatch = companyRoute.slice(
  companyRoute.indexOf("export async function PATCH("),
);
const companyPost = companyRoute.slice(
  companyRoute.indexOf("export async function POST("),
  companyRoute.indexOf("export async function PATCH("),
);

describe("company settings governance authorization contract", () => {
  it("derives active settings governance from canonical workspace membership and lifecycle authority from explicit membership state", () => {
    expect(settingsPage).not.toMatch(/function canManageWorkspace\s*\(/);
    expect(settingsPage).not.toMatch(/function canDeleteWorkspace\s*\(/);
    expect(settingsPage).not.toMatch(
      /can(?:Manage|Archive|Reactivate)\w*\s*=.*currentProfile\.role/,
    );
    expect(settingsPage).toContain("getCurrentWorkspaceContext(supabase)");
    expect(settingsPage).toContain("workspace.companyId === companyId");
    expect(settingsPage).toContain(
      "canManageCompanyWorkspace(permissionContext)",
    );
    expect(settingsPage).toContain(
      "canInviteWorkspaceMembers(permissionContext)",
    );
    expect(settingsPage).toContain(
      "canArchiveCompanyWorkspace(lifecyclePermissionContext)",
    );
    expect(settingsPage).toContain(
      "canReactivateCompanyWorkspace(lifecyclePermissionContext)",
    );
    expect(settingsPage).toContain("workspace_status: string;");
    expect(settingsPage).toContain('company.workspace_status === "archived"');
    expect(settingsPage).toContain("p_company_id: companyId");
  });

  it("does not invoke active-only invitation or active workspace-context resolution for archived settings", () => {
    const invitationRpc = settingsPage.indexOf(
      'supabase.rpc("get_company_workspace_invitations")',
    );
    const invitationGuard = settingsPage.lastIndexOf(
      'if (company.workspace_status !== "archived")',
      invitationRpc,
    );
    const workspaceContextLookup = settingsPage.indexOf(
      "getCurrentWorkspaceContext(supabase)",
    );
    const contextGuard = settingsPage.lastIndexOf(
      'if (company.workspace_status !== "archived")',
      workspaceContextLookup,
    );

    expect(invitationGuard).toBeGreaterThan(-1);
    expect(invitationGuard).toBeLessThan(invitationRpc);
    expect(contextGuard).toBeGreaterThan(-1);
    expect(contextGuard).toBeLessThan(workspaceContextLookup);
  });

  it("passes explicit management and lifecycle booleans without reconstructing legacy role authority", () => {
    expect(settingsForm).toContain("canUpdateCompany: boolean");
    expect(settingsForm).not.toContain("currentUserRole");
    expect(settingsForm).not.toMatch(/===\s*["'](?:owner|admin|buyer)["']/);
    expect(membersCenter).toContain("canUpdateCompany={canManage}");
    expect(membersCenter).toContain("canManageBranding={canManage}");
    expect(membersCenter).toContain("canArchive: boolean");
    expect(membersCenter).toContain("canReactivate: boolean");
    expect(membersCenter).toContain("workspaceStatus: string");
    expect(membersCenter).not.toContain("currentUserRole=");
  });

  it("uses owner-only lifecycle permission primitives instead of physical-delete authority", () => {
    expect(permissions).toContain("canArchiveCompanyWorkspace");
    expect(permissions).toContain("canReactivateCompanyWorkspace");
    expect(permissions).not.toContain("canDeleteCompanyWorkspace");
    expect(permissions).toContain('["owner"]');
    expect(permissions).toContain('membershipStatus === "archived"');

    expect(companyRoute).toContain("canArchiveCompanyWorkspace");
    expect(companyRoute).toContain("canReactivateCompanyWorkspace");
    expect(companyRoute).not.toContain("canDeleteCompanyWorkspace");
    expect(companyPost).toContain("supabase.auth.getUser()");
    expect(companyPost).not.toContain("loadWorkspaceContext(");
  });

  it("blocks unauthorized branding changes before the first Storage operation", () => {
    expect(logoUpload).toContain("canManageBranding: boolean");
    expect(logoUpload).toContain(
      "disabled={uploading || !canManageBranding}",
    );

    const guard = logoUpload.indexOf("if (!canManageBranding)");
    const firstStorageOperation = logoUpload.indexOf("supabase.storage");

    expect(guard).toBeGreaterThan(-1);
    expect(firstStorageOperation).toBeGreaterThan(-1);
    expect(guard).toBeLessThan(firstStorageOperation);
  });

  it("uses the managed immutable company-logo object contract", () => {
    expect(logoUpload).toContain('const LOGO_BUCKET = "Company-logos"');
    expect(logoUpload).toContain(
      "const MAX_LOGO_BYTES = 5 * 1024 * 1024",
    );
    expect(logoUpload).toContain('"image/jpeg": "jpg"');
    expect(logoUpload).toContain('"image/png": "png"');
    expect(logoUpload).toContain('"image/webp": "webp"');
    expect(logoUpload).toContain(
      "`${companyId}/branding/${crypto.randomUUID()}.${extension}`",
    );
    expect(logoUpload).toContain("upsert: false");
    expect(logoUpload).not.toContain("upsert: true");
    expect(logoUpload).toContain(
      'accept="image/jpeg,image/png,image/webp"',
    );
    expect(logoUpload).not.toContain('accept="image/*"');
    expect(logoUpload).toContain(".remove([objectPath])");
  });

  it("validates logo binding against the exact same-company managed path", () => {
    expect(logoRoute).toContain("isAllowedLogoUrl(logoUrl, id)");
    expect(logoRoute).toContain(
      "/storage/v1/object/public/Company-logos/${companyId}/branding/",
    );
    expect(logoRoute).toContain("MANAGED_LOGO_FILE_NAME");
    expect(logoRoute).toContain("url.search");
    expect(logoRoute).toContain("url.hash");
  });

  it("keeps immutable profile and logo audit out of best-effort API side effects", () => {
    expect(companyPatch).not.toContain('.from("notifications")');
    expect(companyPatch).not.toContain('.from("audit_logs")');
    expect(logoRoute).not.toContain('.from("audit_logs")');
  });

  it("keeps workspace invitations and procurement domains distinct while lifecycle remains a workspace concern", () => {
    expect(companyRoute).toContain("canManageCompanyWorkspace");
    expect(logoRoute).toContain("canManageCompanyWorkspace");
    expect(membersCenter).toContain("Workspace Administration");
    expect(membersCenter).toContain("pending workspace invitations");
    expect(membersCenter).toContain("RFQ_CREATED");
    expect(membersCenter).not.toContain("RFQ Invitation");
    expect(companyRoute).not.toContain("record_procurement_activity");
  });
});
