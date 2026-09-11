import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

function readSource(relativePath: string) {
  return readFileSync(resolve(process.cwd(), relativePath), "utf8").replace(
    /\r\n/g,
    "\n",
  );
}

const addendaRoute = readSource("src/app/api/rfq-addenda/route.ts");
const acknowledgementRoute = readSource(
  "src/app/api/rfq-addendum-acknowledgements/route.ts",
);
const quotesRoute = readSource("src/app/api/quotes/route.ts");
const activityFanoutMigration = readSource(
  "supabase/legacy-migrations/pre-baseline-v2/20260836000000_deliver_addendum_respondent_activity.sql",
);
const notificationMigration = readSource(
  "supabase/legacy-migrations/pre-baseline-v2/20260909050709_resolve_rfq_addendum_notification_recipients.sql",
);

describe("14-05 RFQ Addendum email notification contract", () => {
  it("wires Addendum email delivery after successful publication and activity", () => {
    expect(addendaRoute).toContain('from "@/lib/email/send-email"');
    expect(addendaRoute).toContain(
      'from "@/lib/email/templates/rfq-addendum-email"',
    );
    expect(addendaRoute).toContain("buildRfqAddendumEmail({");
    expect(addendaRoute).toContain("joinPublicSitePath(`/rfq/${rfqSlug}`)");
    expect(addendaRoute).toContain('select("id, company_id, title, slug")');
    expect(addendaRoute).toContain(
      'recordTrustedProcurementActivity(\n    supabase,\n    "addendum_published"',
    );
    expect(addendaRoute).toContain("deliverAddendumNotificationEmails");
    expect(addendaRoute).toContain(
      'rpc(\n    "resolve_rfq_addendum_notification_recipients"',
    );
    expect(addendaRoute).toContain("p_addendum_id: addendumId");
    expect(addendaRoute).toContain("await sendEmail({");
    expect(addendaRoute).toContain(
      "success: true, addendum: data, email",
    );
    expect(addendaRoute).toContain("recipients:");
    expect(addendaRoute).toContain("sent:");
    expect(addendaRoute).toContain("skipped:");
    expect(addendaRoute).toContain("failed:");
    expect(addendaRoute).not.toContain("createServiceRoleClient");
    expect(addendaRoute).not.toContain("service_role");
    expect(addendaRoute).not.toContain('.from("profiles")');
    expect(addendaRoute).not.toMatch(
      /buildRfqAddendumEmail\(\{[^}]*description/,
    );
    expect(addendaRoute).not.toMatch(
      /buildRfqAddendumEmail\(\{[^}]*affected/,
    );
    expect(addendaRoute).not.toContain("to: recipientEmails");
    expect(addendaRoute).not.toContain("email: recipientEmail");
    expect(addendaRoute).not.toContain("emails:");

    const postStart = addendaRoute.indexOf("export async function POST");
    const insertStart = addendaRoute.indexOf(
      ".insert({\n      rfq_id: rfqId,",
      postStart,
    );
    const activityStart = addendaRoute.indexOf(
      '"addendum_published"',
      postStart,
    );
    const deliverStart = addendaRoute.indexOf(
      "deliverAddendumNotificationEmails",
      postStart,
    );

    expect(postStart).toBeGreaterThan(-1);
    expect(insertStart).toBeGreaterThan(-1);
    expect(activityStart).toBeGreaterThan(insertStart);
    expect(deliverStart).toBeGreaterThan(activityStart);
  });

  it("keeps Addendum email aggregate summary privacy-safe and non-provider-leaking", () => {
    expect(addendaRoute).not.toContain("lastError = result.error");
    expect(addendaRoute).not.toContain("result.error ?? lastError");
    expect(addendaRoute).not.toContain("error: result.error");
    expect(addendaRoute).not.toContain("id: result.id");
    expect(addendaRoute).toContain(
      'error = "One or more Addendum notification emails could not be delivered."',
    );
    expect(addendaRoute).toContain(
      'error = "One or more Addendum notification emails were skipped."',
    );
    expect(addendaRoute).toContain(
      "return emptyAddendumEmailSummary(null);",
    );
    expect(addendaRoute).not.toContain(
      "No established Addendum notification recipients were available.",
    );
    expect(addendaRoute).toContain("for (const recipientEmail of recipientEmails)");
    expect(addendaRoute).toContain("failed += 1;");
    expect(addendaRoute).toContain("skipped += 1;");
    expect(addendaRoute).toContain("continue;");
    expect(addendaRoute).toMatch(
      /return \{\s*recipients: recipientEmails\.length,\s*sent,\s*skipped,\s*failed,\s*error,\s*\}/,
    );
    expect(addendaRoute).not.toMatch(
      /return \{\s*success: true,\s*addendum: data,\s*email:[\s\S]*recipientEmail/,
    );
    expect(addendaRoute).not.toContain("emails:");
    expect(addendaRoute).toContain(
      "Addendum notification recipients could not be resolved.",
    );
  });

  it("secures the purpose-bound Addendum notification recipient RPC", () => {
    expect(notificationMigration).toContain(
      "create or replace function public.resolve_rfq_addendum_notification_recipients(",
    );
    expect(notificationMigration).toContain("p_addendum_id uuid");
    expect(notificationMigration).toContain("returns table (\n  email text\n)");
    expect(notificationMigration).toContain("security definer");
    expect(notificationMigration).toContain("set search_path = ''");
    expect(notificationMigration).toContain("auth.uid()");
    expect(notificationMigration).toContain("raise exception 'Unauthorized'");
    expect(notificationMigration).toContain("a.created_by = v_uid");
    expect(notificationMigration).toContain(
      "om.membership_status = 'active'",
    );
    expect(notificationMigration).toContain(
      "om.workspace_role in ('owner', 'admin')",
    );
    expect(notificationMigration).toContain(
      "om.procurement_function = 'buyer'",
    );
    expect(notificationMigration).toContain("join public.rfq_invites as i");
    expect(notificationMigration).toContain(
      "i.status in ('sent', 'invited')",
    );
    expect(notificationMigration).toContain("join public.quotes as q");
    expect(notificationMigration).toContain("join public.rfq_rfis as rfi");
    expect(notificationMigration).toContain(
      "join public.rfq_addendum_acknowledgements as ack",
    );
    expect(notificationMigration).toContain(
      "join public.organization_memberships as om",
    );
    expect(notificationMigration).toContain("join public.profiles as p");
    expect(notificationMigration).toContain("nullif(lower(btrim(");
    expect(notificationMigration).toContain("union");
    expect(notificationMigration).toContain("issuer_emails");
    expect(notificationMigration).not.toContain("p_user_id");
    expect(notificationMigration).not.toContain("p_email");
    expect(notificationMigration).not.toContain("p_company_id");
    expect(notificationMigration).not.toContain("sourcing_method = 'open'");
    expect(notificationMigration).toContain(
      "revoke all\non function public.resolve_rfq_addendum_notification_recipients(uuid)\nfrom public;",
    );
    expect(notificationMigration).toContain(
      "revoke all\non function public.resolve_rfq_addendum_notification_recipients(uuid)\nfrom anon;",
    );
    expect(notificationMigration).toContain(
      "grant execute\non function public.resolve_rfq_addendum_notification_recipients(uuid)\nto authenticated;",
    );
  });

  it("preserves Addendum acknowledgement, quote enforcement, and Activity fanout contracts", () => {
    expect(acknowledgementRoute).toContain("insert({");
    expect(acknowledgementRoute).toContain("addendum_id: addendumId");
    expect(acknowledgementRoute).toContain("company_id: profile.company_id");
    expect(acknowledgementRoute).not.toContain("sendEmail");
    expect(acknowledgementRoute).not.toContain(
      "resolve_rfq_addendum_notification_recipients",
    );

    expect(quotesRoute).toContain(
      "Required RFQ addenda must be acknowledged before submitting a quotation.",
    );
    expect(quotesRoute).toContain('eq("requires_acknowledgement", true)');

    expect(activityFanoutMigration).toContain(
      "-- Established respondent fanout: S1 quotes + S2 RFIs + S3 prior",
    );
    expect(activityFanoutMigration).toContain(
      "if activity_kind = 'addendum_published' then",
    );
    expect(activityFanoutMigration).not.toContain(
      "resolve_rfq_addendum_notification_recipients",
    );
  });
});
