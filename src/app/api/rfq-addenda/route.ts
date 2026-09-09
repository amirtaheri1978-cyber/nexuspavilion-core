import { NextResponse } from "next/server";

import { getActiveMembershipForUserCompany } from "@/lib/auth/membership";
import { sendEmail } from "@/lib/email/send-email";
import { buildRfqAddendumEmail } from "@/lib/email/templates/rfq-addendum-email";
import { joinPublicSitePath } from "@/lib/ops/public-site-url";
import { canCreateCompanyRfq } from "@/lib/procurement/procurement-write-authorization";
import { recordTrustedProcurementActivity } from "@/lib/procurement/record-procurement-activity";
import { createClient } from "@/lib/supabase/server";

type AddendumEmailDeliverySummary = {
  recipients: number;
  sent: number;
  skipped: number;
  failed: number;
  error: string | null;
};

function emptyAddendumEmailSummary(
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

async function deliverAddendumNotificationEmails({
  addendumId,
  rfqTitle,
  rfqSlug,
  publishedNumber,
  publishedTitle,
  requiresAcknowledgement,
  supabase,
}: {
  addendumId: string;
  rfqTitle: string | null | undefined;
  rfqSlug: string | null | undefined;
  publishedNumber: number | string | null | undefined;
  publishedTitle: string | null | undefined;
  requiresAcknowledgement: boolean;
  supabase: Awaited<ReturnType<typeof createClient>>;
}): Promise<AddendumEmailDeliverySummary> {
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
    try {
      const result = await sendEmail({
        to: recipientEmail,
        subject: email.subject,
        html: email.html,
        text: email.text,
      });

      if (result.success) {
        sent += 1;
        continue;
      }

      if (result.skipped) {
        skipped += 1;
        continue;
      }

      failed += 1;
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

function normalizeText(value: unknown) {
  return String(value || "").trim();
}

function normalizeBoolean(value: unknown) {
  return value === true || value === "true";
}

export async function GET(request: Request) {
  const supabase = await createClient();
  const { searchParams } = new URL(request.url);
  const rfqId = normalizeText(searchParams.get("rfqId"));

  if (!rfqId) {
    return NextResponse.json({ error: "RFQ ID is required." }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("rfq_addenda")
    .select("*")
    .eq("rfq_id", rfqId)
    .order("addendum_number", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json(
      { error: error.message || "Failed to load addenda." },
      { status: 500 },
    );
  }

  return NextResponse.json({ addenda: data || [] });
}

export async function POST(request: Request) {
  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const body = await request.json();

  const rfqId = normalizeText(body.rfqId);
  const title = normalizeText(body.title);
  const description = normalizeText(body.description);
  const affectedDocuments = normalizeText(body.affectedDocuments);
  const requiresAcknowledgement = normalizeBoolean(
    body.requiresAcknowledgement ?? true,
  );

  if (!rfqId || !title) {
    return NextResponse.json(
      { error: "RFQ ID and title are required." },
      { status: 400 },
    );
  }

  const { data: rfq, error: rfqError } = await supabase
    .from("rfqs")
    .select("id, company_id, title, slug")
    .eq("id", rfqId)
    .maybeSingle();

  if (rfqError || !rfq) {
    return NextResponse.json({ error: "RFQ not found." }, { status: 404 });
  }

  let membership;

  try {
    membership = await getActiveMembershipForUserCompany(
      supabase,
      user.id,
      rfq.company_id,
    );
  } catch (membershipError) {
    console.error("Addenda create membership lookup failed:", membershipError);

    return NextResponse.json(
      { error: "Unable to verify organization membership." },
      { status: 500 },
    );
  }

  if (!canCreateCompanyRfq(membership, rfq.company_id)) {
    return NextResponse.json(
      {
        error:
          "Only owners, admins, and buyers for the issuing company can create addenda.",
      },
      { status: 403 },
    );
  }

  const { data, error } = await supabase
    .from("rfq_addenda")
    .insert({
      rfq_id: rfqId,
      title,
      description: description || null,
      affected_documents: affectedDocuments || null,
      requires_acknowledgement: requiresAcknowledgement,
    })
    .select()
    .single();

  if (error || !data) {
    return NextResponse.json(
      { error: error?.message || "Failed to create addendum." },
      { status: 500 },
    );
  }

  await recordTrustedProcurementActivity(
    supabase,
    "addendum_published",
    data.id,
    {
      userId: user.id,
      companyId: rfq.company_id,
    },
  );

  let email: AddendumEmailDeliverySummary = emptyAddendumEmailSummary();

  try {
    email = await deliverAddendumNotificationEmails({
      addendumId: data.id,
      rfqTitle: rfq.title,
      rfqSlug: rfq.slug,
      publishedNumber: data.addendum_number,
      publishedTitle: data.title,
      requiresAcknowledgement: Boolean(data.requires_acknowledgement),
      supabase,
    });
  } catch {
    console.error("RFQ Addendum notification failed after publication.");
    email = {
      recipients: 0,
      sent: 0,
      skipped: 0,
      failed: 0,
      error: "Addendum published, but email notification failed.",
    };
  }

  return NextResponse.json({ success: true, addendum: data, email });
}
