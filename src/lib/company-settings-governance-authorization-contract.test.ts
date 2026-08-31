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

describe("company settings governance authorization contract", () => {
  it("derives settings governance from the canonical active workspace membership", () => {
    expect(settingsPage).not.toMatch(/function canManageWorkspace\s*\(/);
    expect(settingsPage).not.toMatch(/function canDeleteWorkspace\s*\(/);
    expect(settingsPage).not.toMatch(
      /can(?:Manage|Delete)\w*\s*=.*currentProfile\.role/,
    );
    expect(settingsPage).toContain("getCurrentWorkspaceContext(supabase)");
    expect(settingsPage).toContain("workspace.companyId === companyId");
    expect(settingsPage).toContain("canManageCompanyWorkspace(permissionContext)");
    expect(settingsPage).toContain("canDeleteCompanyWorkspace(permissionContext)");
    expect(settingsPage).toContain("canInviteWorkspaceMembers(permissionContext)");
  });

  it("passes explicit management booleans without reconstructing legacy role authority", () => {
    expect(settingsForm).toContain("canUpdateCompany: boolean");
    expect(settingsForm).not.toContain("currentUserRole");
    expect(settingsForm).not.toMatch(/===\s*["'](?:owner|admin|buyer)["']/);
    expect(membersCenter).toContain("canUpdateCompany={canManage}");
    expect(membersCenter).toContain("canManageBranding={canManage}");
    expect(membersCenter).not.toContain("currentUserRole=");
  });

  it("blocks unauthorized branding changes before the first Storage operation", () => {
    expect(logoUpload).toContain("canManageBranding: boolean");
    expect(logoUpload).toContain("disabled={uploading || !canManageBranding}");

    const guard = logoUpload.indexOf("if (!canManageBranding)");
    const firstStorageOperation = logoUpload.indexOf("supabase.storage");

    expect(guard).toBeGreaterThan(-1);
    expect(firstStorageOperation).toBeGreaterThan(-1);
    expect(guard).toBeLessThan(firstStorageOperation);
  });

  it("keeps server API authorization and invitation domains intact", () => {
    expect(companyRoute).toContain("canManageCompanyWorkspace");
    expect(companyRoute).toContain("canDeleteCompanyWorkspace");
    expect(logoRoute).toContain("canManageCompanyWorkspace");
    expect(membersCenter).toContain("Workspace Administration");
    expect(membersCenter).toContain("pending workspace invitations");
    expect(membersCenter).toContain("RFQ_CREATED");
    expect(membersCenter).not.toContain("RFQ Invitation");
  });
});
