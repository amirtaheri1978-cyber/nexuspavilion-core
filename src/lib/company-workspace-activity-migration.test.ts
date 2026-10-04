import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const migrationPath =
  "supabase/migrations/20261004221500_record_company_workspace_activity.sql";
const routePath = "src/app/api/companies/create/route.ts";

const sql = readFileSync(resolve(process.cwd(), migrationPath), "utf8").replace(
  /\r\n/g,
  "\n",
);
const normalized = sql.replace(/\s+/g, " ").trim().toLowerCase();
const route = readFileSync(resolve(process.cwd(), routePath), "utf8").replace(
  /\r\n/g,
  "\n",
);
const functionBody = sql.slice(
  sql.indexOf(
    "create or replace function public.record_company_workspace_activity",
  ),
  sql.indexOf(
    "comment on function public.record_company_workspace_activity",
  ),
);

describe("Company Workspace trusted activity writer", () => {
  it("keeps the writer inside a narrow SECURITY DEFINER boundary", () => {
    expect(functionBody).toContain("security definer");
    expect(functionBody).toContain("set search_path = ''");
    expect(functionBody).toContain("actor_user_id uuid := auth.uid();");
    expect(functionBody).toContain("activity_kind <> 'company_created'");
    expect(functionBody).not.toContain("p_user_id");
    expect(functionBody).not.toContain("p_action");
    expect(functionBody).not.toContain("p_title");
    expect(functionBody).not.toContain("p_message");
    expect(functionBody).not.toContain("p_metadata");
  });

  it("verifies owned Company Workspace founder authority from stored state", () => {
    expect(functionBody).toContain("c.user_id = actor_user_id");
    expect(functionBody).toContain("p.id = actor_user_id");
    expect(functionBody).toContain("p.company_id = c.id");
    expect(functionBody).toContain("om.user_id = actor_user_id");
    expect(functionBody).toContain("om.company_id = c.id");
    expect(functionBody).toContain("om.workspace_role = 'owner'");
    expect(functionBody).toContain("om.membership_type = 'founder'");
    expect(functionBody).toContain("om.membership_status = 'active'");
    expect(functionBody).toContain(
      "'error_code', 'COMPANY_WORKSPACE_NOT_AUTHORIZED'",
    );
  });

  it("records audit and notification atomically with retry idempotency", () => {
    expect(functionBody).toContain("pg_advisory_xact_lock");
    expect(functionBody).toContain("'company_created:' || p_company_id::text");
    expect(functionBody).toContain("a.action = 'COMPANY_CREATED'");
    expect(functionBody).toContain("a.entity_id = p_company_id");
    expect(functionBody).toContain("insert into public.audit_logs");
    expect(functionBody).toContain("insert into public.notifications");
    expect(functionBody).toContain("'idempotent', true");
    expect(functionBody).toContain("'idempotent', false");
  });

  it("does not reopen direct authenticated writes to governed activity tables", () => {
    expect(normalized).not.toMatch(
      /grant\s+insert\s+on\s+table\s+public\.(audit_logs|notifications)/,
    );
    expect(normalized).not.toContain("for insert");
    expect(sql).toContain(
      "revoke all\non function public.record_company_workspace_activity(text, uuid)\nfrom public;",
    );
    expect(sql).toContain(
      "revoke all\non function public.record_company_workspace_activity(text, uuid)\nfrom anon;",
    );
    expect(sql).toContain(
      "grant execute\non function public.record_company_workspace_activity(text, uuid)\nto authenticated;",
    );
  });

  it("routes company-created activity through the trusted writer only", () => {
    expect(route).toContain('"record_company_workspace_activity"');
    expect(route).toContain('p_activity_kind: "company_created"');
    expect(route).toContain("p_company_id: company.id");
    expect(route).not.toContain('.from("notifications")');
    expect(route).not.toContain('.from("audit_logs")');
  });
});
