import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

import {
  awardNotificationEmail,
  supplierAwardNotificationEmail,
} from "@/lib/email/templates/award-notification-email";

function readSource(relativePath: string) {
  return readFileSync(resolve(process.cwd(), relativePath), "utf8").replace(
    /\r\n/g,
    "\n",
  );
}

const awardRoute = readSource("src/app/api/award-contract/route.ts");
const templateSource = readSource(
  "src/lib/email/templates/award-notification-email.ts",
);
const notificationMigration = readSource(
  "supabase/migrations/20260909083600_resolve_rfq_award_notification_recipient.sql",
);
const workspaceUrl = "https://app.example.test/rfq/harbor-point-package";

describe("14-07 Award notification contract", () => {
  it("preserves Buyer confirmation and wires independent Supplier notification after award", () => {
    expect(awardRoute).toContain('from "@/lib/email/send-email"');
    expect(awardRoute).toContain("awardNotificationEmail({");
    expect(awardRoute).toContain("supplierAwardNotificationEmail({");
    expect(awardRoute).toContain("to: user.email");
    expect(awardRoute).toContain(
      "subject: `Contract Awarded: ${\n            updatedRfq.title ?? \"Project\"\n          }`",
    );
    expect(awardRoute).toContain('rpc(\n      "award_rfq_quote"');
    expect(awardRoute).toContain(
      'rpc(\n    "resolve_rfq_award_notification_recipient"',
    );
    expect(awardRoute).toContain("p_quote_id: quoteId");
    expect(awardRoute).toContain("deliverSupplierAwardNotificationEmail");
    expect(awardRoute).toContain(
      "joinPublicSitePath(`/rfq/${updatedRfq.slug}`)",
    );
    expect(awardRoute).toContain("joinPublicSitePath(`/rfq/${rfqSlug}`)");
    expect(awardRoute).not.toContain(
      "joinPublicSitePath(`/rfq/${rfqSlug}/compare`)",
    );
    expect(awardRoute).not.toContain(
      "joinPublicSitePath(`/rfq/${updatedRfq.slug}/compare`)",
    );
    expect(awardRoute).toContain("redirectTo: `/rfq/${updatedRfq.slug}`");
    expect(awardRoute).not.toContain("createServiceRoleClient");
    expect(awardRoute).not.toContain("service_role");
    expect(awardRoute).not.toContain('.from("profiles")');
    expect(awardRoute).toContain(
      'console.error(\n        "Award notification email failed:"',
    );
    expect(awardRoute).toContain(
      'console.error(\n        "Award Supplier notification email failed:"',
    );

    const postStart = awardRoute.indexOf("export async function POST");
    const awardRpcStart = awardRoute.indexOf('"award_rfq_quote"', postStart);
    const buyerEmailStart = awardRoute.indexOf(
      "awardNotificationEmail({",
      postStart,
    );
    const supplierDeliverStart = awardRoute.indexOf(
      "deliverSupplierAwardNotificationEmail({",
      postStart,
    );
    const successStart = awardRoute.indexOf("success: true,", postStart);

    expect(postStart).toBeGreaterThan(-1);
    expect(awardRpcStart).toBeGreaterThan(postStart);
    expect(buyerEmailStart).toBeGreaterThan(awardRpcStart);
    expect(supplierDeliverStart).toBeGreaterThan(buyerEmailStart);
    expect(successStart).toBeGreaterThan(supplierDeliverStart);

    const buyerCatch = awardRoute.indexOf(
      "Award notification email failed:",
      buyerEmailStart,
    );
    expect(buyerCatch).toBeGreaterThan(buyerEmailStart);
    expect(buyerCatch).toBeLessThan(supplierDeliverStart);
  });

  it("reports truthful Buyer and Supplier delivery outcomes without failing Award mutation", () => {
    expect(awardRoute).toContain("const emailResult = await sendEmail({");
    expect(awardRoute).toContain("buyerEmail = {");
    expect(awardRoute).toContain("supplierEmail = await deliverSupplierAwardNotificationEmail({");
    expect(awardRoute).toContain("email: {\n        buyer: buyerEmail,\n        supplier: supplierEmail,\n      }");
    expect(awardRoute).toContain("ownerNotification");
    expect(awardRoute).toContain("supplierNotification");
    expect(awardRoute).toContain("notificationWarning");
    expect(awardRoute).toContain(
      "Contract awarded, but Buyer notification email delivery failed.",
    );
    expect(awardRoute).toContain(
      "Contract awarded, but Supplier notification email delivery failed.",
    );
    expect(awardRoute).toContain("success: true,");
    expect(awardRoute).not.toContain(
      "notification: null,\n        audit: null,\n        ownerNotification: null,\n        supplierNotification: null,",
    );
    expect(awardRoute).not.toContain("recipientEmail:");
    expect(awardRoute).not.toContain("emails:");
    expect(awardRoute).not.toContain("resubmit");
    expect(awardRoute).not.toContain("create another");
  });

  it("secures the purpose-bound award Supplier recipient RPC", () => {
    expect(notificationMigration).toContain(
      "create or replace function public.resolve_rfq_award_notification_recipient(",
    );
    expect(notificationMigration).toContain("p_quote_id uuid");
    expect(notificationMigration).toContain("returns table (\n  email text\n)");
    expect(notificationMigration).toContain("language plpgsql");
    expect(notificationMigration).toContain("stable");
    expect(notificationMigration).toContain("security definer");
    expect(notificationMigration).toContain("set search_path = ''");
    expect(notificationMigration).toContain("auth.uid()");
    expect(notificationMigration).toContain("raise exception 'Unauthorized'");
    expect(notificationMigration).toContain("q.decision = 'awarded'");
    expect(notificationMigration).toContain("r.awarded_quote_id = q.id");
    expect(notificationMigration).toContain("r.status = 'awarded'");
    expect(notificationMigration).toContain("q.company_id <> r.company_id");
    expect(notificationMigration).toContain(
      "join public.companies as issuer_company",
    );
    expect(notificationMigration).toContain(
      "issuer_company.id = r.company_id",
    );
    expect(notificationMigration).toContain(
      "issuer_company.status = 'verified'",
    );
    expect(notificationMigration).toContain(
      "issuer_company.workspace_status = 'active'",
    );
    expect(notificationMigration).toContain(
      "issuer_om.workspace_role in ('owner', 'admin')",
    );
    expect(notificationMigration).toContain(
      "issuer_om.membership_status = 'active'",
    );
    expect(notificationMigration).toContain(
      "supplier_om.membership_status = 'active'",
    );
    expect(notificationMigration).toContain("supplier_om.user_id = q.user_id");
    expect(notificationMigration).toContain("p.id = q.user_id");
    expect(notificationMigration).toContain(
      "nullif(lower(btrim(p.email)), '')",
    );
    expect(notificationMigration).toContain("limit 1");
    expect(notificationMigration).not.toContain("p_user_id");
    expect(notificationMigration).not.toContain("p_company_id");
    expect(notificationMigration).not.toContain("p_email");
    expect(notificationMigration).toContain(
      "revoke all\non function public.resolve_rfq_award_notification_recipient(uuid)\nfrom public;",
    );
    expect(notificationMigration).toContain(
      "revoke all\non function public.resolve_rfq_award_notification_recipient(uuid)\nfrom anon;",
    );
    expect(notificationMigration).toContain(
      "grant execute\non function public.resolve_rfq_award_notification_recipient(uuid)\nto authenticated;",
    );
  });

  it("keeps Buyer award confirmation semantics intact", () => {
    const html = awardNotificationEmail({
      rfqTitle: "Harbor Point Mixed-Use Development",
      amount: "$125,000",
      awardUrl: workspaceUrl,
    });

    expect(html).toContain("Contract Award Confirmed");
    expect(html).toContain("Harbor Point Mixed-Use Development");
    expect(html).toContain("$125,000");
    expect(html).toContain("Awarded");
    expect(html).toContain(`href="${workspaceUrl}"`);
    expect(templateSource).toContain("export function awardNotificationEmail({");
  });

  it("renders Supplier Contract Award receipt without competitor or buyer-private data", () => {
    const email = supplierAwardNotificationEmail({
      rfqTitle: "Harbor Point Mixed-Use Development",
      amount: "$125,000",
      awardUrl: workspaceUrl,
    });

    expect(email.subject).toBe(
      "Contract Award: Harbor Point Mixed-Use Development",
    );
    expect(email.html).toContain("Nexus Pavilion");
    expect(email.html).toContain("Contract Award");
    expect(email.html).toContain(
      "Your quotation has been selected for Contract Award.",
    );
    expect(email.html).toContain("Harbor Point Mixed-Use Development");
    expect(email.html).toContain("$125,000");
    expect(email.html).toContain("Awarded");
    expect(email.html).toContain(`href="${workspaceUrl}"`);
    expect(email.html).toContain("Review Award");
    expect(email.html).toContain("Open RFQ Workspace");
    expect(email.html).toContain("not itself an executed legal contract");
    expect(email.html).not.toContain("/compare");
    expect(email.html).not.toContain("ranking");
    expect(email.html).not.toContain("evaluation score");
    expect(email.html).not.toContain("Competitor");
    expect(email.html).not.toContain("supplier list");
    expect(email.html).not.toContain("executive recommendation");
    expect(email.html).not.toContain("RFI");
    expect(email.html).not.toContain("Addendum #");
    expect(email.html).not.toContain("invitation");
    expect(email.html).not.toContain("messageId");
    expect(email.text).toContain("Status: Awarded");
    expect(email.text).toContain(workspaceUrl);
    expect(email.text).not.toContain("/compare");

    expect(templateSource).toContain(
      "export function supplierAwardNotificationEmail({",
    );
    expect(templateSource).not.toContain("competitorAmount");
    expect(templateSource).not.toContain("evaluationScore");
    expect(templateSource).not.toContain("invitationToken");
  });

  it("skips Supplier delivery when canonical public site URL is unavailable", () => {
    expect(awardRoute).toContain("if (!awardUrl)");
    expect(awardRoute).toContain(
      "Award Supplier email skipped because the public site URL is not configured.",
    );
    expect(awardRoute).toContain("if (!recipientEmail)");
  });
});
