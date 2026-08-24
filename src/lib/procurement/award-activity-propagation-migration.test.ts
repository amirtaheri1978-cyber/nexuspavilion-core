import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const migrationPath =
  "supabase/migrations/20260830000000_record_award_workspace_activity.sql";
const priorAwardMigrationPath =
  "supabase/migrations/20260829000000_restrict_issuer_quote_select_until_commercial_unlock.sql";
const accessMigrationPath =
  "supabase/migrations/20260828000000_enable_company_scoped_audit_and_notification_access.sql";
const awardRoutePath = "src/app/api/award-contract/route.ts";
const notificationsPagePath = "src/app/notifications/page.tsx";
const companyCommandPath = "src/app/company/page.tsx";
const membersCenterPath = "src/components/company-members-center.tsx";

const sql = readFileSync(resolve(process.cwd(), migrationPath), "utf8").replace(
  /\r\n/g,
  "\n",
);
const priorAwardSql = readFileSync(
  resolve(process.cwd(), priorAwardMigrationPath),
  "utf8",
).replace(/\r\n/g, "\n");
const accessSql = readFileSync(
  resolve(process.cwd(), accessMigrationPath),
  "utf8",
).replace(/\r\n/g, "\n");
const awardRoute = readFileSync(resolve(process.cwd(), awardRoutePath), "utf8");
const notificationsPage = readFileSync(
  resolve(process.cwd(), notificationsPagePath),
  "utf8",
);
const companyCommand = readFileSync(
  resolve(process.cwd(), companyCommandPath),
  "utf8",
);
const membersCenter = readFileSync(
  resolve(process.cwd(), membersCenterPath),
  "utf8",
);

const helperBody = sql.slice(
  sql.indexOf(
    "create or replace function public.record_rfq_award_workspace_activity",
  ),
  sql.indexOf("create or replace function public.award_rfq_quote"),
);
const awardBody = sql.slice(
  sql.indexOf("create or replace function public.award_rfq_quote(p_quote_id uuid)"),
  sql.indexOf("comment on function public.award_rfq_quote"),
);

describe("award workspace activity propagation", () => {
  it("keeps authenticated SELECT-only on audit_logs and notifications", () => {
    expect(accessSql.toLowerCase()).not.toContain("for insert");
    expect(accessSql).toContain(
      "grant select\non table public.notifications\nto authenticated;",
    );
    expect(accessSql).toContain(
      "grant select\non table public.audit_logs\nto authenticated;",
    );
    expect(sql.toLowerCase()).not.toContain("for insert");
    expect(sql.toLowerCase()).not.toContain(
      "grant insert on table public.audit_logs",
    );
    expect(sql.toLowerCase()).not.toContain(
      "grant insert on table public.notifications",
    );
  });

  it("writes owner and supplier activity from a trusted helper that cannot choose company_id", () => {
    expect(helperBody).toContain("security definer");
    expect(helperBody).toContain("set search_path = ''");
    expect(helperBody).not.toContain("p_company_id");
    expect(helperBody).toContain("'CONTRACT_AWARDED'");
    expect(helperBody).toContain("'CONTRACT_AWARD_RECEIVED'");
    expect(helperBody).toContain("rfq_row.company_id");
    expect(helperBody).toContain("awarded_quote.company_id");
    expect(helperBody).toContain("'Contract Awarded'");
    expect(helperBody).toContain("'award'");
    expect(helperBody).toContain("contract award was received at");
    expect(helperBody).not.toContain("the supplier awarded");
    expect(sql).toContain(
      "revoke all\non function public.record_rfq_award_workspace_activity(uuid, uuid, text)\nfrom authenticated;",
    );
    expect(sql).not.toContain(
      "grant execute\non function public.record_rfq_award_workspace_activity",
    );
  });

  it("keeps award_rfq_quote authorization, deadline lock, and transactional activity writes", () => {
    expect(awardBody).toContain("parse_rfq_deadline_timestamptz");
    expect(awardBody).toContain(
      "Commercial evaluation remains locked until the RFQ deadline.",
    );
    expect(awardBody).toContain("SELF_AWARD_NOT_ALLOWED");
    expect(awardBody).toContain("om.workspace_role in ('owner', 'admin')");
    expect(awardBody).toContain(
      "perform public.record_rfq_award_workspace_activity(\n    selected_quote.id,\n    actor_user_id,\n    membership_role\n  );",
    );

    const quoteAwardedAt = awardBody.indexOf("decision = 'awarded'");
    const activityAt = awardBody.indexOf(
      "perform public.record_rfq_award_workspace_activity",
    );
    const successReturnAt = awardBody.indexOf("'success', true");

    expect(quoteAwardedAt).toBeGreaterThan(-1);
    expect(activityAt).toBeGreaterThan(quoteAwardedAt);
    expect(successReturnAt).toBeGreaterThan(activityAt);
  });

  it("does not rewrite 280/290 and preserves the prior award function body as history", () => {
    expect(sql).not.toContain(
      "20260828000000_enable_company_scoped_audit_and_notification_access.sql",
    );
    expect(priorAwardSql).toContain(
      "create or replace function public.award_rfq_quote(p_quote_id uuid)",
    );
    expect(priorAwardSql).toContain("parse_rfq_deadline_timestamptz");
    expect(sql).toContain("Do not re-apply 20260828000000 or 20260829000000");
  });

  it("stops the award route from inserting activity through the user-scoped client", () => {
    expect(awardRoute).toContain('"award_rfq_quote"');
    expect(awardRoute).toContain("p_quote_id: quoteId");
    expect(awardRoute).not.toContain('.from("audit_logs")');
    expect(awardRoute).not.toContain('.from("notifications")');
    expect(awardRoute).not.toContain("awardedQuote.company_id");
    expect(awardRoute).toContain("ownerNotification: null");
    expect(awardRoute).toContain("supplierNotification: null");
    expect(awardRoute).toContain("ownerAudit: null");
    expect(awardRoute).toContain("supplierAudit: null");
    expect(awardRoute).toContain("sendEmail");
  });

  it("keeps Activity Center and Company Command on company-scoped reads", () => {
    expect(notificationsPage).toContain('.from("notifications")');
    expect(notificationsPage).toContain('.eq("company_id", profile.company_id)');
    expect(notificationsPage).toContain(
      'String(notification.type || "").toLowerCase().includes("award")',
    );
    expect(companyCommand).toContain('.from("audit_logs")');
    expect(companyCommand).toContain('.eq("company_id", companyId)');
    expect(membersCenter).toContain('action === "CONTRACT_AWARD_RECEIVED"');
    expect(membersCenter).toContain("Award Received");
  });

  it("backfills missing award activity without deleting historical rows", () => {
    expect(sql).toContain("backfilled");
    expect(sql).toContain("'CONTRACT_AWARD_RECEIVED'");
    expect(sql.toLowerCase()).not.toMatch(/delete\s+from\s+public\.audit_logs/);
    expect(sql.toLowerCase()).not.toMatch(
      /delete\s+from\s+public\.notifications/,
    );
    expect(sql).toContain("and not exists (");
  });
});
