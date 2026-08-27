import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

function readSource(relativePath: string) {
  return readFileSync(resolve(process.cwd(), relativePath), "utf8").replace(
    /\r\n/g,
    "\n",
  );
}

const migration = readSource(
  "supabase/migrations/20260835000000_expand_procurement_activity_event_writers.sql",
);
const fanoutMigration = readSource(
  "supabase/migrations/20260836000000_deliver_addendum_respondent_activity.sql",
);
const helper = readSource(
  "src/lib/procurement/record-procurement-activity.ts",
);
const invitesRoute = readSource("src/app/api/invites/route.ts");
const rfiRoute = readSource("src/app/api/rfq-rfis/route.ts");
const addendaRoute = readSource("src/app/api/rfq-addenda/route.ts");
const acknowledgementRoute = readSource(
  "src/app/api/rfq-addendum-acknowledgements/route.ts",
);
const quotesRoute = readSource("src/app/api/quotes/route.ts");
const awardRoute = readSource("src/app/api/award-contract/route.ts");
const notificationsPage = readSource("src/app/notifications/page.tsx");
const companyInvitationsRoute = readSource(
  "src/app/api/company-invitations/route.ts",
);

const functionBody = migration.slice(
  migration.indexOf("create or replace function public.record_procurement_activity"),
  migration.indexOf(
    "comment on function public.record_procurement_activity",
  ),
);

const fanoutFunctionBody = fanoutMigration.slice(
  fanoutMigration.indexOf(
    "create or replace function public.record_procurement_activity",
  ),
  fanoutMigration.indexOf(
    "comment on function public.record_procurement_activity",
  ),
);

const addendumPublishedBranch = fanoutFunctionBody.slice(
  fanoutFunctionBody.indexOf("-- addendum_published"),
  fanoutFunctionBody.indexOf("-- addendum_acknowledged"),
);

describe("Cursor 05B procurement activity event writers", () => {
  it("extends the helper union with five new activity kinds", () => {
    expect(helper).toContain('"rfq_invitation_sent"');
    expect(helper).toContain('"rfi_submitted"');
    expect(helper).toContain('"rfi_responded"');
    expect(helper).toContain('"addendum_published"');
    expect(helper).toContain('"addendum_acknowledged"');
    expect(helper).toContain('"rfq_created"');
    expect(helper).toContain('"quote_submitted"');
  });

  it("routes RFQ invitations through the trusted activity helper only", () => {
    expect(invitesRoute).toContain("recordTrustedProcurementActivity");
    expect(invitesRoute).toContain('"rfq_invitation_sent"');
    expect(invitesRoute).not.toContain('.from("audit_logs")');
    expect(invitesRoute).not.toContain('.from("notifications")');
    expect(invitesRoute).toContain("existingInvite");
    expect(invitesRoute).toContain(
      "Supplier has already been invited to this RFQ.",
    );

    const existingInviteBlock = invitesRoute.slice(
      invitesRoute.indexOf("if (existingInvite)"),
      invitesRoute.indexOf("const token = generateToken()"),
    );
    expect(existingInviteBlock).not.toContain(
      "recordTrustedProcurementActivity",
    );
  });

  it("records RFI submit and respond activity with the correct kinds", () => {
    expect(rfiRoute).toContain("recordTrustedProcurementActivity");
    expect(rfiRoute).toContain('"rfi_submitted"');
    expect(rfiRoute).toContain('"rfi_responded"');
    expect(rfiRoute).not.toContain('.from("notifications")');
    expect(rfiRoute).not.toContain('.from("audit_logs")');
  });

  it("records addendum publish and new acknowledgement activity only", () => {
    expect(addendaRoute).toContain("recordTrustedProcurementActivity");
    expect(addendaRoute).toContain('"addendum_published"');
    expect(acknowledgementRoute).toContain("recordTrustedProcurementActivity");
    expect(acknowledgementRoute).toContain('"addendum_acknowledged"');

    const activityCallSites = (
      acknowledgementRoute.match(
        /await recordTrustedProcurementActivity\(/g,
      ) || []
    ).length;
    expect(activityCallSites).toBe(1);

    const newAckBlock = acknowledgementRoute.slice(
      acknowledgementRoute.indexOf("if (!error && data)"),
      acknowledgementRoute.indexOf("if (isUniqueViolation(error))"),
    );
    expect(newAckBlock).toContain("recordTrustedProcurementActivity");
    expect(newAckBlock).toContain('"addendum_acknowledged"');
    expect(newAckBlock).toContain("idempotent: false");

    const idempotentBlock = acknowledgementRoute.slice(
      acknowledgementRoute.indexOf("if (isUniqueViolation(error))"),
    );
    expect(idempotentBlock).toContain("idempotent: true");
    expect(idempotentBlock).not.toContain("recordTrustedProcurementActivity");
  });

  it("keeps the migration as a trusted SECURITY DEFINER writer", () => {
    expect(functionBody).toContain("security definer");
    expect(functionBody).toContain("set search_path = ''");
    expect(functionBody).toContain("actor_user_id uuid := auth.uid()");
    expect(functionBody).toContain("'rfq_invitation_sent'");
    expect(functionBody).toContain("'rfi_submitted'");
    expect(functionBody).toContain("'rfi_responded'");
    expect(functionBody).toContain("'addendum_published'");
    expect(functionBody).toContain("'addendum_acknowledged'");
    expect(functionBody).toContain("'RFQ_INVITATION_SENT'");
    expect(functionBody).toContain("'RFI_SUBMITTED'");
    expect(functionBody).toContain("'RFI_RESPONDED'");
    expect(functionBody).toContain("'ADDENDUM_PUBLISHED'");
    expect(functionBody).toContain("'ADDENDUM_ACKNOWLEDGED'");
    expect(functionBody).toContain("'invitation'");
    expect(functionBody).toContain("'rfi'");
    expect(functionBody).toContain("'rfi_response'");
    expect(functionBody).toContain("'addendum'");
    expect(functionBody).toContain("'addendum_acknowledgement'");
    expect(functionBody).toContain("buyer_company_id");
    expect(migration).not.toMatch(
      /grant\s+insert\s+on\s+table\s+public\.(notifications|audit_logs)/i,
    );
    expect(migration).not.toContain(
      'create policy "Company members can create company notifications"',
    );
    expect(migration).not.toContain(
      'create policy "Company members can create company audit logs"',
    );
  });

  it("counts invitation type and invitation tone for Activity Center", () => {
    expect(notificationsPage).toContain("isInvitationNotification");
    expect(notificationsPage).toContain('value.includes("invitation")');
    expect(notificationsPage).toContain('value.includes("invite")');
    expect(notificationsPage).toContain(
      "isInvitationNotification(notification.type)",
    );
  });

  it("preserves quote buyer-only audience and award flow unchanged", () => {
    expect(quotesRoute).toContain('"quote_submitted"');
    expect(quotesRoute).toContain("recordTrustedProcurementActivity");
    expect(functionBody).toContain("buyer_company_id");
    expect(functionBody).toContain(
      "'quote',\n      false,\n      buyer_company_id",
    );
    expect(awardRoute).toContain('"award_rfq_quote"');
    expect(awardRoute).not.toContain("recordTrustedProcurementActivity");
    expect(migration).not.toContain("award_rfq_quote");
    expect(migration).not.toContain("record_rfq_award_workspace_activity");
  });

  it("leaves workspace invitation flows untouched", () => {
    expect(companyInvitationsRoute).not.toContain(
      "recordTrustedProcurementActivity",
    );
    expect(migration).not.toContain("accept_organization_invitation");
    expect(migration).not.toContain("company-invitations");
  });
});

describe("Cursor 05G R-43 addendum respondent activity fanout", () => {
  it("fans out from S1 quotes, S2 rfq_rfis, and S3 acknowledgements only", () => {
    expect(addendumPublishedBranch).toContain("from public.quotes q");
    expect(addendumPublishedBranch).toContain("q.company_id");
    expect(addendumPublishedBranch).toContain(
      "where q.rfq_id = addendum_row.rfq_id",
    );
    expect(addendumPublishedBranch).toContain("from public.rfq_rfis rfi");
    expect(addendumPublishedBranch).toContain("rfi.respondent_company_id");
    expect(addendumPublishedBranch).toContain(
      "where rfi.rfq_id = addendum_row.rfq_id",
    );
    expect(addendumPublishedBranch).toContain(
      "from public.rfq_addendum_acknowledgements ack",
    );
    expect(addendumPublishedBranch).toContain("ack.company_id");
    expect(addendumPublishedBranch).toContain(
      "where ack.rfq_id = addendum_row.rfq_id",
    );
    expect(addendumPublishedBranch).toContain(
      "select distinct established.company_id",
    );
    expect(addendumPublishedBranch).toContain(
      "and q.company_id <> issuer_company_id",
    );
    expect(addendumPublishedBranch).toContain(
      "and rfi.respondent_company_id <> issuer_company_id",
    );
    expect(addendumPublishedBranch).toContain(
      "and ack.company_id <> issuer_company_id",
    );
  });

  it("does not use invitation email bridges or open-market broadcast", () => {
    const fanoutLoop = addendumPublishedBranch.slice(
      addendumPublishedBranch.indexOf("for respondent_company_id in"),
    );

    expect(fanoutLoop).not.toContain("profiles.company_id");
    expect(fanoutLoop).not.toContain("from public.profiles");
    expect(fanoutLoop).not.toContain("from public.rfq_invites");
    expect(fanoutLoop).not.toContain("from public.organization_memberships");
    expect(fanoutLoop).not.toContain("network_role");
    expect(fanoutLoop).not.toContain("from public.companies");
    expect(addendumPublishedBranch).not.toContain("profiles.company_id");
    expect(addendumPublishedBranch).not.toContain("from public.rfq_invites");
  });

  it("classifies required open Addenda as addendum_action_required", () => {
    expect(addendumPublishedBranch).toContain(
      "addendum_row.requires_acknowledgement = true",
    );
    expect(addendumPublishedBranch).toContain("rfq_row.status = 'open'");
    expect(addendumPublishedBranch).toContain(
      "notification_type := 'addendum_action_required'",
    );
    expect(addendumPublishedBranch).toContain(
      "'Addendum Acknowledgement Required'",
    );
    expect(addendumPublishedBranch).toContain(
      "Acknowledgement is required before quote submission.",
    );
    expect(addendumPublishedBranch).not.toContain("deadline");
    expect(addendumPublishedBranch).not.toContain("urgent");
  });

  it("uses informational addendum type when acknowledgement is not required or RFQ is not open", () => {
    expect(addendumPublishedBranch).toContain(
      "notification_type := 'addendum'",
    );
    expect(addendumPublishedBranch).toContain("'Addendum Published'");

    const fanoutTypeBlock = addendumPublishedBranch.slice(
      addendumPublishedBranch.indexOf(
        "if addendum_row.requires_acknowledgement = true",
      ),
      addendumPublishedBranch.lastIndexOf("insert into public.notifications ("),
    );
    expect(fanoutTypeBlock).toContain(
      "notification_type := 'addendum_action_required'",
    );
    expect(fanoutTypeBlock).toContain("else");
    expect(fanoutTypeBlock).toContain("notification_type := 'addendum'");
  });

  it("preserves issuer publish behavior and early ADDENDUM_PUBLISHED idempotency", () => {
    expect(addendumPublishedBranch).toContain(
      "audit_action := 'ADDENDUM_PUBLISHED'",
    );
    expect(addendumPublishedBranch).toContain(
      "notification_company_id := issuer_company_id",
    );
    expect(addendumPublishedBranch).toContain(
      "notification_type := 'addendum'",
    );
    expect(addendumPublishedBranch).toContain("'idempotent', true");
    expect(
      addendumPublishedBranch.indexOf("if existing_audit_id is not null"),
    ).toBeLessThan(
      addendumPublishedBranch.indexOf("for respondent_company_id in"),
    );
    expect(
      addendumPublishedBranch.indexOf("insert into public.audit_logs"),
    ).toBeLessThan(
      addendumPublishedBranch.indexOf("for respondent_company_id in"),
    );
  });

  it("does not add per-recipient audit actions or new activity kinds", () => {
    expect(fanoutMigration).not.toContain("ADDENDUM_RESPONDENT_NOTIFIED");
    expect(fanoutFunctionBody).toMatch(
      /activity_kind not in \(\s*'rfq_created',\s*'quote_submitted',\s*'rfq_invitation_sent',\s*'rfi_submitted',\s*'rfi_responded',\s*'addendum_published',\s*'addendum_acknowledged'\s*\)/,
    );
    expect(helper).not.toContain("addendum_action_required");
    expect(fanoutFunctionBody).not.toMatch(
      /activity_kind not in \([^)]*'addendum_action_required'/,
    );
  });

  it("keeps trusted writer privileges without restoring client INSERT", () => {
    expect(fanoutFunctionBody).toContain("security definer");
    expect(fanoutFunctionBody).toContain("set search_path = ''");
    expect(fanoutFunctionBody).toContain("actor_user_id uuid := auth.uid()");
    expect(fanoutMigration).toContain(
      "grant execute\non function public.record_procurement_activity(text, uuid)\nto authenticated;",
    );
    expect(fanoutMigration).toContain(
      "revoke all\non function public.record_procurement_activity(text, uuid)\nfrom anon;",
    );
    expect(fanoutMigration).not.toMatch(
      /grant\s+insert\s+on\s+table\s+public\.(notifications|audit_logs)/i,
    );
    expect(fanoutMigration).not.toContain(
      'create policy "Company members can create company notifications"',
    );
    expect(fanoutMigration).not.toContain(
      'create policy "Company members can create company audit logs"',
    );
  });
});
