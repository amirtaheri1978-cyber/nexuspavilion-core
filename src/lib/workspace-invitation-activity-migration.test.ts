import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  resolve(
    process.cwd(),
    "supabase/migrations/20261005005500_record_workspace_invitation_activity.sql",
  ),
  "utf8",
).replace(/\r\n/g, "\n");

const createRoute = readFileSync(
  resolve(process.cwd(), "src/app/api/company-invitations/route.ts"),
  "utf8",
);
const resendRoute = readFileSync(
  resolve(process.cwd(), "src/app/api/company-invitations/resend/route.ts"),
  "utf8",
);
const revokeRoute = readFileSync(
  resolve(process.cwd(), "src/app/api/company-invitations/revoke/route.ts"),
  "utf8",
);

describe("Company Workspace invitation trusted activity writer", () => {
  it("keeps activity inside an authenticated owner/admin SECURITY DEFINER boundary", () => {
    expect(migration).toContain("security definer");
    expect(migration).toContain("set search_path = ''");
    expect(migration).toContain("actor_user_id uuid := auth.uid()");
    expect(migration).toContain(
      "actor_workspace_role not in ('owner', 'admin')",
    );
    expect(migration).toContain(
      "from public.resolve_company_workspace_invitation_context()",
    );
    expect(migration).toContain(
      "activity_kind not in ('created', 'resent', 'revoked')",
    );
  });

  it("derives invitation content from stored state and never accepts arbitrary audit payloads", () => {
    expect(migration).toContain("from public.invitations i");
    expect(migration).toContain("invitation_record.email");
    expect(migration).toContain("invitation_record.role");
    expect(migration).not.toContain("p_email");
    expect(migration).not.toContain("p_role");
    expect(migration).not.toContain("p_metadata");
    expect(migration).not.toContain("p_action");
    expect(migration).not.toContain("p_message");
  });

  it("preserves direct-write denial and idempotency for create/revoke", () => {
    expect(migration).toContain("pg_advisory_xact_lock");
    expect(migration).toContain("action_name || ':' || p_invitation_id::text");
    expect(migration).toContain("'INVITATION_CREATED'");
    expect(migration).toContain("'INVITATION_RESENT'");
    expect(migration).toContain("'INVITATION_REVOKED'");
    expect(migration).toContain("insert into public.audit_logs");
    expect(migration).toContain("insert into public.notifications");
    expect(migration).not.toMatch(
      /grant\s+insert\s+on\s+table\s+public\.(audit_logs|notifications)/i,
    );
    expect(migration).toContain("from anon;");
    expect(migration).toContain("to authenticated;");
  });

  it("routes create, resend, and revoke through the trusted writer", () => {
    for (const route of [createRoute, resendRoute, revokeRoute]) {
      expect(route).toContain("recordWorkspaceInvitationActivity");
      expect(route).not.toContain('.from("audit_logs").insert');
    }

    expect(createRoute).not.toContain('.from("notifications").insert');
    expect(createRoute).toContain('activityKind: "created"');
    expect(resendRoute).toContain('activityKind: "resent"');
    expect(revokeRoute).toContain('activityKind: "revoked"');
  });
});
