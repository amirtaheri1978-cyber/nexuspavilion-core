import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

function readSource(relativePath: string) {
  return fs.readFileSync(path.join(process.cwd(), relativePath), "utf8");
}

function normalizeSql(value: string) {
  return value.replace(/\s+/g, " ").trim().toLowerCase();
}

const migration = readSource(
  "supabase/migrations/20260846000000_company_workspace_lifecycle_contract.sql",
);
const normalizedMigration = normalizeSql(migration);
const companyRoute = readSource("src/app/api/companies/[id]/route.ts");
const settingsPage = readSource("src/app/company/settings/page.tsx");
const companyWorkspacePage = readSource("src/app/company/page.tsx");
const membersCenter = readSource("src/components/company-members-center.tsx");
const ownershipPanel = readSource("src/components/ownership/ownership-panel.tsx");
const lifecycleButton = readSource(
  "src/components/connections/DeleteCompanyButton.tsx",
);
const membership = readSource("src/lib/auth/membership.ts");
const permissions = readSource(
  "src/lib/authorization/workspace-permissions.ts",
);
const workspaceCommands = readSource("src/lib/workspace/commands.ts");
const documentDownload = readSource(
  "src/app/api/companies/[id]/documents/[documentId]/download/route.ts",
);
const publicCompanyPage = readSource("src/app/company/[slug]/page.tsx");

const companyPost = companyRoute.slice(
  companyRoute.indexOf("export async function POST("),
  companyRoute.indexOf("export async function PATCH("),
);

const companyDelete = companyRoute.slice(
  companyRoute.indexOf("export async function DELETE("),
  companyRoute.indexOf("export async function POST("),
);

describe("company workspace lifecycle contract", () => {
  it("replaces physical company deletion with an owner-only archive/reactivate lifecycle", () => {
    expect(normalizedMigration).toContain(
      "create or replace function public.archive_company_workspace( p_company_id uuid )",
    );
    expect(normalizedMigration).toContain(
      "create or replace function public.reactivate_company_workspace( p_company_id uuid )",
    );
    expect(normalizedMigration).toContain("actor_workspace_role <> 'owner'");
    expect(normalizedMigration).toContain("workspace_status = 'archived'");
    expect(normalizedMigration).toContain("workspace_status = 'active'");
    expect(normalizedMigration).toContain("'company_archived'");
    expect(normalizedMigration).toContain("'company_reactivated'");
    expect(normalizedMigration).toContain(
      "ownership_transfer_requests as otr",
    );
    expect(normalizedMigration).toContain("'pending_acceptance'");

    expect(normalizedMigration).not.toContain(
      "delete from public.companies",
    );
    expect(normalizedMigration).not.toContain("record_procurement_activity");
    expect(normalizedMigration).not.toMatch(
      /set\s+status\s*=\s*'archived'/,
    );
  });

  it("serializes lifecycle and membership activation without widening workspace writes", () => {
    expect(normalizedMigration).toContain(
      "enforce_company_workspace_membership_lifecycle",
    );
    expect(normalizedMigration).toContain("pg_try_advisory_xact_lock");
    expect(normalizedMigration).toContain("pg_advisory_xact_lock");
    expect(normalizedMigration).toContain(
      "company workspace lifecycle transition is in progress",
    );
    expect(normalizedMigration).toContain(
      "archived company workspaces cannot activate memberships",
    );
    expect(normalizedMigration).toContain(
      "before insert or update of membership_status, company_id",
    );
  });

  it("removes authenticated physical DELETE authority without widening privileged maintenance", () => {
    expect(normalizedMigration).toContain(
      'drop policy if exists "company owners and admins can delete company" on public.companies',
    );
    expect(normalizedMigration).toContain(
      "revoke delete on table public.companies from public, anon, authenticated",
    );
    expect(normalizedMigration).not.toContain(
      "grant delete on table public.companies",
    );

    expect(normalizedMigration).toContain(
      "has_column_privilege( 'authenticated', 'public.companies', 'workspace_status', 'update' )",
    );
    expect(normalizedMigration).toContain(
      'alter policy "authenticated users can create own company" on public.companies with check',
    );
    expect(normalizedMigration).toContain(
      "and workspace_status = 'active'",
    );

    expect(companyDelete).toContain("export async function DELETE() {");
    expect(companyDelete).not.toContain("_request: Request");
    expect(companyDelete).not.toContain("_context: RouteContext");
    expect(companyDelete).toContain("status: 405");
    expect(companyDelete).toContain("Physical company deletion is disabled");
    expect(companyDelete).not.toContain('.from("companies")');
    expect(companyDelete).not.toContain(".delete()");
    expect(companyDelete).not.toContain('.from("audit_logs")');
  });

  it("uses archived membership as the central mutation cutoff while retaining history", () => {
    expect(membership).toContain('| "archived"');
    expect(membership).toContain("getWorkspaceMembershipForUserCompany");
    expect(membership).toContain(
      '.in("membership_status", ["active", "archived"])',
    );

    expect(normalizedMigration).toContain(
      "membership_status in ( 'pending', 'active', 'archived', 'suspended', 'revoked' )",
    );
    expect(normalizedMigration).toContain("set membership_status = 'archived'");
    expect(normalizedMigration).toContain("and membership_status = 'active'");
    expect(normalizedMigration).toContain("set membership_status = 'active'");
    expect(normalizedMigration).toContain("and membership_status = 'archived'");
  });

  it("preserves archived read-only history with exact installed-policy guards", () => {
    expect(normalizedMigration).toContain(
      "membership_status = any (array[''active''::text, ''archived''::text])",
    );
    expect(normalizedMigration).toContain(
      "expected_occurrences",
    );
    expect(normalizedMigration).toContain(
      "company members can read company-documents objects",
    );
    expect(normalizedMigration).toContain(
      "create or replace function public.get_organization_members( p_company_id uuid )",
    );
    expect(normalizedMigration).toContain(
      "om.company_id = p_company_id",
    );
    expect(normalizedMigration).toContain(
      "om.membership_status in ('active', 'archived')",
    );
    expect(normalizedMigration).toContain(
      "a non-select policy uses current_user_has_supplier_rfq_access without an independent active-membership predicate",
    );

    expect(normalizedMigration).toContain(
      "unexpected non-select policy count for current_user_has_supplier_rfq_access",
    );
    expect(normalizedMigration).toContain(
      "expected supplier write-policy allowlist no longer matches installed state",
    );

    expect(documentDownload).toContain(
      "getWorkspaceMembershipForUserCompany",
    );
    expect(documentDownload).toContain(
      '["active", "archived"].includes',
    );
    expect(documentDownload).toContain("supabase.auth.getUser()");
    expect(documentDownload).not.toContain("getCurrentWorkspaceContext");
  });

  it("keeps Workspace Invitation resolution and mutation contracts isolated from archive reads", () => {
    expect(normalizedMigration).not.toContain(
      "create or replace function public.get_company_workspace_invitations()",
    );
    expect(normalizedMigration).not.toContain(
      "resolve_company_workspace_invitation_context",
    );

    const invitationRpc = settingsPage.indexOf(
      'supabase.rpc("get_company_workspace_invitations")',
    );
    const archivedGuard = settingsPage.lastIndexOf(
      'if (company.workspace_status !== "archived")',
      invitationRpc,
    );

    expect(invitationRpc).toBeGreaterThan(-1);
    expect(archivedGuard).toBeGreaterThan(-1);
    expect(archivedGuard).toBeLessThan(invitationRpc);
  });

  it("keeps archived workspaces out of public company discovery", () => {
    expect(normalizedMigration).toContain(
      "create or replace view public.company_directory with (security_invoker = false) as",
    );
    expect(normalizedMigration).toContain(
      "where workspace_status <> 'archived'",
    );
    expect(settingsPage).toContain("workspace_status: string;");
    expect(settingsPage).toContain("workspace_status");
    expect(publicCompanyPage).toContain('.from("company_directory")');
  });

  it("routes archive and reactivation through authenticated same-company lifecycle membership rather than active workspace context", () => {
    expect(workspaceCommands).toContain("archiveCompanyWorkspace");
    expect(workspaceCommands).toContain("reactivateCompanyWorkspace");
    expect(workspaceCommands).toContain('"archive_company_workspace"');
    expect(workspaceCommands).toContain('"reactivate_company_workspace"');
    expect(workspaceCommands).toContain('"OWNERSHIP_TRANSFER_PENDING"');
    expect(workspaceCommands).toContain('"INVALID_WORKSPACE_STATE"');

    expect(companyPost).toContain("supabase.auth.getUser()");
    expect(companyPost).toContain("getWorkspaceMembershipForUserCompany");
    expect(companyPost).toContain("canArchiveCompanyWorkspace");
    expect(companyPost).toContain("canReactivateCompanyWorkspace");
    expect(companyPost).toContain("archiveCompanyWorkspace");
    expect(companyPost).toContain("reactivateCompanyWorkspace");
    expect(companyPost).not.toContain("loadWorkspaceContext(");
    expect(companyPost).not.toContain('.from("audit_logs")');
    expect(companyPost).not.toContain('.from("notifications")');
  });

  it("uses owner-only lifecycle UI with explicit archive confirmation and reactivation", () => {
    expect(permissions).toContain("canArchiveCompanyWorkspace");
    expect(permissions).toContain("canReactivateCompanyWorkspace");
    expect(permissions).not.toContain("canDeleteCompanyWorkspace");

    expect(settingsPage).toContain("canArchiveCompanyWorkspace");
    expect(settingsPage).toContain("canReactivateCompanyWorkspace");
    expect(settingsPage).toContain('company.workspace_status === "archived"');
    expect(settingsPage).toContain("p_company_id: companyId");

    expect(companyWorkspacePage).toContain("canArchiveCompanyWorkspace");
    expect(companyWorkspacePage).toContain("canReactivateCompanyWorkspace");
    expect(companyWorkspacePage).toContain("workspace_status: string;");
    expect(companyWorkspacePage).toContain(
      "workspaceStatus={company.workspace_status}",
    );
    expect(companyWorkspacePage).toContain("canArchive={canArchive}");
    expect(companyWorkspacePage).toContain("canReactivate={canReactivate}");
    expect(companyWorkspacePage).not.toContain("canDeleteCompanyWorkspace");
    expect(companyWorkspacePage).not.toContain("canDelete={");

    expect(membersCenter).toContain("Archive Workspace");
    expect(membersCenter).toContain("Archived Workspace");
    expect(membersCenter).toContain("COMPANY_ARCHIVED");
    expect(membersCenter).toContain("COMPANY_REACTIVATED");
    expect(membersCenter).toContain("pendingTransfer");
    expect(membersCenter).toContain(
      'membership?.membership_status === "active"',
    );
    expect(membersCenter).toContain(
      'membership_status: "active" as const',
    );
    expect(membersCenter).not.toContain(
      "membership_status: membership!.membership_status",
    );
    expect(ownershipPanel).not.toContain('"archived"');

    expect(lifecycleButton).toContain('mode?: "archive" | "reactivate"');
    expect(lifecycleButton).toContain('mode = "archive",');
    expect(lifecycleButton).toContain("Reactivate Workspace");
    expect(lifecycleButton).toContain("confirmationValue === companyName");
    expect(lifecycleButton).toContain('method: "POST"');
    expect(lifecycleButton).toContain("JSON.stringify({ action: mode })");
    expect(lifecycleButton).not.toContain("window.confirm");
    expect(lifecycleButton).not.toContain("alert(");
    expect(lifecycleButton).not.toContain('method: "DELETE"');
  });
});
