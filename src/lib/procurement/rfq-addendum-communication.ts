import { createHash } from "node:crypto";

import { sendEmail } from "@/lib/email/send-email";
import { buildRfqAddendumEmail } from "@/lib/email/templates/rfq-addendum-email";
import { joinPublicSitePath } from "@/lib/ops/public-site-url";
import { recordTrustedProcurementActivity } from "@/lib/procurement/record-procurement-activity";
import { createClient } from "@/lib/supabase/server";

export type AddendumEmailDeliverySummary = {
  recipients: number;
  sent: number;
  skipped: number;
  failed: number;
  error: string | null;
};

type AddendumCommunicationInput = {
  addendumId: string;
  rfqTitle: string | null | undefined;
  rfqSlug: string | null | undefined;
  publishedNumber: number | string | null | undefined;
  publishedTitle: string | null | undefined;
  requiresAcknowledgement: boolean;
  supabase: Awaited<ReturnType<typeof createClient>>;
};

type PublishedAddendumCommunicationInput = AddendumCommunicationInput & {
  userId: string;
  companyId: string;
};

function hashAddendumEmailRecipient(recipientEmail: string) {
  return createHash("sha256").update(recipientEmail).digest("hex");
}

function buildAddendumEmailIdempotencyKey(
  addendumId: string,
  recipientHash: string,
) {
  return createHash("sha256")
    .update(`rfq-addendum-email:v1:${addendumId}:${recipientHash}`)
    .digest("hex");
}

export function emptyAddendumEmailSummary(
  error: string | null = null,
): AddendumEmailDeliverySummary {
  return {
    recipients: 0,
    sent: 0,
    skipped: 0,
    failed: 0,
    error,
  };
}

function collectRecipientEmails(recipientRows: unknown): string[] {
  const rows = Array.isArray(recipientRows)
    ? recipientRows
    : recipientRows
      ? [recipientRows]
      : [];

  const emails = new Set<string>();

  for (const row of rows) {
    const email = String(
      (row as { email?: string | null } | null | undefined)?.email || "",
    )
      .trim()
      .toLowerCase();

    if (email) {
      emails.add(email);
    }
  }

  return [...emails];
}

export async function deliverAddendumNotificationEmails({
  addendumId,
  rfqTitle,
  rfqSlug,
  publishedNumber,
  publishedTitle,
  requiresAcknowledgement,
  supabase,
}: AddendumCommunicationInput): Promise<AddendumEmailDeliverySummary> {
  const { data: recipientRows, error: recipientError } = await supabase.rpc(
    "resolve_rfq_addendum_notification_recipients",
    { p_addendum_id: addendumId },
  );

  if (recipientError) {
    console.error("RFQ Addendum notification recipient resolution failed.");

    return {
      recipients: 0,
      sent: 0,
      skipped: 0,
      failed: 0,
      error: "Addendum notification recipients could not be resolved.",
    };
  }

  const recipientEmails = collectRecipientEmails(recipientRows);

  if (recipientEmails.length === 0) {
    return emptyAddendumEmailSummary(null);
  }

  const workspaceUrl = rfqSlug
    ? joinPublicSitePath(`/rfq/${rfqSlug}`)
    : null;

  if (!workspaceUrl) {
    console.warn(
      "RFQ Addendum email skipped because the public site URL is not configured.",
    );

    return {
      recipients: recipientEmails.length,
      sent: 0,
      skipped: recipientEmails.length,
      failed: 0,
      error: "One or more Addendum notification emails were skipped.",
    };
  }

  const email = buildRfqAddendumEmail({
    rfqTitle: rfqTitle || "Procurement RFQ",
    addendumNumber: publishedNumber ?? "—",
    addendumTitle: publishedTitle || "Addendum",
    requiresAcknowledgement,
    workspaceUrl,
  });

  let sent = 0;
  let skipped = 0;
  let failed = 0;

  for (const recipientEmail of recipientEmails) {
    const recipientHash = hashAddendumEmailRecipient(recipientEmail);

    try {
      const result = await sendEmail({
        to: recipientEmail,
        subject: email.subject,
        html: email.html,
        text: email.text,
        idempotencyKey: buildAddendumEmailIdempotencyKey(
          addendumId,
          recipientHash,
        ),
      });

      if (result.success) {
        sent += 1;
      } else if (result.skipped) {
        skipped += 1;
      } else {
        failed += 1;
      }
    } catch {
      failed += 1;
      console.error("RFQ Addendum notification email delivery failed.");
    }
  }

  let error: string | null = null;

  if (failed > 0) {
    error = "One or more Addendum notification emails could not be delivered.";
  } else if (skipped > 0) {
    error = "One or more Addendum notification emails were skipped.";
  }

  return {
    recipients: recipientEmails.length,
    sent,
    skipped,
    failed,
    error,
  };
}

export async function recordAndDeliverAddendumCommunication({
  userId,
  companyId,
  ...deliveryInput
}: PublishedAddendumCommunicationInput) {
  await recordTrustedProcurementActivity(
    deliveryInput.supabase,
    "addendum_published",
    deliveryInput.addendumId,
    { userId, companyId },
  );

  try {
    return await deliverAddendumNotificationEmails(deliveryInput);
  } catch {
    console.error("RFQ Addendum notification failed after publication.");
    return emptyAddendumEmailSummary(
      "Addendum published, but email notification failed.",
    );
  }
}
