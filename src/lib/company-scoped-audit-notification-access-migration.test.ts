import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const migrationPath =
  "supabase/migrations/20260828000000_enable_company_scoped_audit_and_notification_access.sql";
const notificationsPagePath = "src/app/notifications/page.tsx";
const companySettingsPath = "src/app/company/settings/page.tsx";
const rfqRoutePath = "src/app/api/rfqs/route.ts";
const quoteRoutePath = "src/app/api/quotes/route.ts";
const invitationRpcMigrationPath =
  "supabase/migrations/20260827000000_enable_professional_identity_primitives.sql";

const sql = readFileSync(resolve(process.cwd(), migrationPath), "utf8").replace(
  /\r\n/g,
  "\n",
);
const normalized = sql.replace(/\s+/g, " ").trim().toLowerCase();
const functionBody = sql.slice(
  sql.indexOf("create or replace function public.record_procurement_activity"),
  sql.indexOf("comment on function public.record_procurement_activity"),
);
const notificationsPage = readFileSync(
  resolve(process.cwd(), notificationsPagePath),
  "utf8",
);
const companySettings = readFileSync(
  resolve(process.cwd(), companySettingsPath),
  "utf8",
);
const rfqRoute = readFileSync(resolve(process.cwd(), rfqRoutePath), "utf8");
const quoteRoute = readFileSync(resolve(process.cwd(), quoteRoutePath), "utf8");
const invitationRpcMigration = readFileSync(
  resolve(process.cwd(), invitationRpcMigrationPath),
  "utf8",
);

function policyBlock(policyName: string) {
  const marker = `create policy "${policyName.toLowerCase()}"`;
  const start = sql.toLowerCase().indexOf(marker);
  expect(start, `missing policy ${policyName}`).toBeGreaterThan(-1);
  const rest = sql.slice(start);
  const lowerRest = rest.toLowerCase();
  const candidates = [
    lowerRest.indexOf("\ndrop policy", marker.length),
    lowerRest.indexOf("\ncreate policy", marker.length),
    lowerRest.indexOf("\ngrant ", marker.length),
    lowerRest.indexOf("\ncreate or replace function", marker.length),
    lowerRest.indexOf("\ncommit;", marker.length),
    rest.length,
  ].filter((value) => value > 0);
  return rest.slice(0, Math.min(...candidates));
}

describe("company-scoped audit and notification access migration", () => {
  it("adds nullable notifications.company_id with a companies FK", () => {
    expect(sql).toContain(
      "alter table public.notifications\n  add column if not exists company_id uuid;",
    );
    expect(sql).toContain(
      "add constraint notifications_company_id_fkey\n  foreign key (company_id) references public.companies(id);",
    );
    expect(sql).toContain(
      "create index if not exists notifications_company_id_idx\n  on public.notifications (company_id);",
    );
    expect(normalized).not.toContain("notifications.company_id uuid not null");
    expect(normalized).not.toContain("alter column company_id set not null");
  });

  it("enables RLS and grants authenticated SELECT only after company-scoped read policies", () => {
    const notificationsRls = sql.indexOf(
      "alter table public.notifications\n  enable row level security;",
    );
    const auditRls = sql.indexOf(
      "alter table public.audit_logs\n  enable row level security;",
    );
    const firstPolicy = sql.indexOf(
      'create policy "Company members can read company notifications"',
    );
    const notificationsGrant = sql.indexOf(
      "grant select\non table public.notifications\nto authenticated;",
    );
    const auditGrant = sql.indexOf(
      "grant select\non table public.audit_logs\nto authenticated;",
    );

    expect(notificationsRls).toBeGreaterThan(-1);
    expect(auditRls).toBeGreaterThan(notificationsRls);
    expect(firstPolicy).toBeGreaterThan(auditRls);
    expect(notificationsGrant).toBeGreaterThan(firstPolicy);
    expect(auditGrant).toBeGreaterThan(notificationsGrant);
    expect(normalized).not.toContain("force row level security");
  });

  it("does not grant authenticated INSERT or other client write privileges", () => {
    expect(normalized).not.toMatch(
      /grant\s+insert\s+on\s+table\s+public\.(audit_logs|notifications)/,
    );
    expect(normalized).not.toMatch(
      /grant\s+select\s*,\s*insert\s+on\s+table\s+public\.(audit_logs|notifications)/,
    );
    expect(normalized).not.toMatch(
      /grant\s+(all|update|delete|truncate|trigger|references|maintain)\b/,
    );
    expect(sql.toLowerCase()).not.toContain("for insert");
    expect(sql.toLowerCase()).not.toContain(
      'create policy "company members can create company notifications"',
    );
    expect(sql.toLowerCase()).not.toContain(
      'create policy "company members can create company audit logs"',
    );
    expect(normalized).not.toContain("to anon;");
    expect(normalized).not.toContain(
      "grant execute on function public.record_procurement_activity(text, uuid) to anon;",
    );
    expect(normalized).toContain(
      "grant execute on function public.record_procurement_activity(text, uuid) to authenticated;",
    );
  });

  it("scopes authenticated SELECT so company A cannot read company B activity", () => {
    for (const policyName of [
      "Company members can read company notifications",
      "Company members can read company audit logs",
    ]) {
      const policy = policyBlock(policyName).replace(/\s+/g, " ").toLowerCase();

      expect(policy).toContain("for select");
      expect(policy).toContain("to authenticated");
      expect(policy).toContain("company_id is not null");
      expect(policy).toContain("from public.organization_memberships om");
      expect(policy).toContain("om.user_id = auth.uid()");
      expect(policy).toContain("om.membership_status = 'active'");
      expect(policy).not.toContain("public.profiles");
      expect(policy).not.toContain("company_members");
    }

    expect(
      policyBlock("Company members can read company notifications")
        .replace(/\s+/g, " ")
        .toLowerCase(),
    ).toContain("om.company_id = notifications.company_id");
    expect(
      policyBlock("Company members can read company audit logs")
        .replace(/\s+/g, " ")
        .toLowerCase(),
    ).toContain("om.company_id = audit_logs.company_id");
  });

  it("records only allowlisted RFQ and quote events through a trusted SECURITY DEFINER writer", () => {
    expect(functionBody).toContain("security definer");
    expect(functionBody).toContain("set search_path = ''");
    expect(functionBody).toContain("actor_user_id uuid := auth.uid();");
    expect(functionBody).not.toContain("p_company_id");
    expect(functionBody).not.toContain("p_action");
    expect(functionBody).not.toContain("p_title");
    expect(functionBody).not.toContain("p_message");
    expect(functionBody).not.toContain("p_metadata");
    expect(functionBody).toContain("activity_kind not in ('rfq_created', 'quote_submitted')");
    expect(functionBody).toContain("'RFQ_CREATED'");
    expect(functionBody).toContain("'RFQ Created'");
    expect(functionBody).toContain("'QUOTE_SUBMITTED'");
    expect(functionBody).toContain("'Quote Submitted'");
    expect(functionBody).toContain("om.company_id = r.company_id");
    expect(functionBody).toContain("om.company_id = q.company_id");
    expect(functionBody).toContain("r.user_id = actor_user_id");
    expect(functionBody).toContain("q.user_id = actor_user_id");
    expect(functionBody).toContain(
      "om.procurement_function in ('supplier', 'consultant')",
    );
    expect(sql).toContain(
      "revoke all\non function public.record_procurement_activity(text, uuid)\nfrom anon;",
    );
    expect(sql).not.toContain(
      "grant execute\non function public.record_procurement_activity(text, uuid)\nto anon;",
    );
  });

  it("supports supplier quote notifications for the buyer RFQ company without client INSERT", () => {
    expect(functionBody).toContain("buyer_company_id");
    expect(functionBody).toContain("where r.id = quote_row.rfq_id");
    expect(functionBody).toContain("buyer_company_id");
    expect(functionBody).toContain("'quote',\n    false,\n    buyer_company_id");
    expect(quoteRoute).toContain('recordTrustedProcurementActivity');
    expect(quoteRoute).toContain('"quote_submitted"');
    expect(quoteRoute).not.toContain('.from("audit_logs")');
    expect(quoteRoute).not.toContain('.from("notifications")');
  });

  it("keeps invitation SECURITY DEFINER notification writes compatible without company_id", () => {
    expect(invitationRpcMigration).toContain("insert into public.notifications (");
    expect(invitationRpcMigration).toContain("security definer");
    expect(sql).not.toContain("accept_organization_invitation");
    expect(normalized).not.toContain("alter column company_id set not null");
    expect(normalized).not.toContain("force row level security");
  });

  it("keeps Activity Center and Recent Workspace Activity company scoped", () => {
    expect(notificationsPage).toContain('.from("notifications")');
    expect(notificationsPage).toContain(
      '"id, title, message, type, is_read, created_at, company_id, source_rfq_id"',
    );
    expect(notificationsPage).toContain('.eq("company_id", profile.company_id)');
    expect(companySettings).toContain('.from("audit_logs")');
    expect(companySettings).toContain(
      '.select("id, action, entity_type, created_at")',
    );
    expect(companySettings).toContain('.eq("company_id", companyId)');
    expect(rfqRoute).toContain('recordTrustedProcurementActivity');
    expect(rfqRoute).toContain('"rfq_created"');
    expect(rfqRoute).not.toContain('.from("audit_logs")');
    expect(rfqRoute).not.toContain('.from("notifications")');
  });
});
