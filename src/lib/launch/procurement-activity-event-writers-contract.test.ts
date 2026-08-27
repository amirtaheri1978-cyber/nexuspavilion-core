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
