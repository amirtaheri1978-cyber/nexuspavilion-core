import { createHash } from "node:crypto";

import { NextResponse } from "next/server";

import { getActiveMembershipForUserCompany } from "@/lib/auth/membership";
import { sendEmail } from "@/lib/email/send-email";
import { buildRfqAddendumEmail } from "@/lib/email/templates/rfq-addendum-email";
import { joinPublicSitePath } from "@/lib/ops/public-site-url";
import { reportCriticalApiFailure } from "@/lib/ops/report-critical-api-failure";
import { canCreateCompanyRfq } from "@/lib/procurement/procurement-write-authorization";
import { recordTrustedProcurementActivity } from "@/lib/procurement/record-procurement-activity";
import { createClient } from "@/lib/supabase/server";

const ADDENDUM_EMAIL_SAFE_RETRY_WINDOW_MS = 23 * 60 * 60 * 1000;

type AddendumEmailDeliverySummary = {
  recipients: number;
  sent: number;
  skipped: number;
  failed: number;
  error: string | null;
};

type AddendumRecord = {
  id: string;
  addendum_number: number | string | null;
  title: string | null;
  requires_acknowledgement: boolean | null;
};

type AmendmentRpcResult = {
  success?: boolean;
  error_code?: string;
  error_message?: string;
  addendum_id?: string;
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
    reportCriticalApiFailure({
      domain: "addendum",
      operation: "list",
      failureStage: "addenda_load",
      route: "/api/rfq-addenda",
      method: "GET",
      error,
    });

    return NextResponse.json(
      { error: error.message || "Failed to load addenda." },
      { status: 500 },
    );
  }

  return NextResponse.json({ addenda: data || [] });
}

export async function PATCH(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const body = await request.json();
  const addendumId = normalizeText(body.addendumId);

  if (!addendumId) {
    return NextResponse.json(
      { error: "Addendum ID is required." },
      { status: 400 },
    );
  }

  const { data: addendum, error: addendumError } = await supabase
    .from("rfq_addenda")
    .select(
      "id, rfq_id, addendum_number, title, requires_acknowledgement, created_at",
    )
    .eq("id", addendumId)
    .maybeSingle();

  if (addendumError || !addendum) {
    return NextResponse.json({ error: "Addendum not found." }, { status: 404 });
  }

  const { data: rfq, error: rfqError } = await supabase
    .from("rfqs")
    .select("id, company_id, title, slug")
    .eq("id", addendum.rfq_id)
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
    reportCriticalApiFailure({
      domain: "addendum",
      operation: "retry_email_delivery",
      failureStage: "membership_lookup",
      route: "/api/rfq-addenda",
      method: "PATCH",
      error: membershipError,
    });

    return NextResponse.json(
      { error: "Unable to verify organization membership." },
      { status: 500 },
    );
  }

  if (!canCreateCompanyRfq(membership, rfq.company_id)) {
    return NextResponse.json(
      {
        error:
          "Only owners, admins, and buyers for the issuing company can retry Addendum delivery.",
      },
      { status: 403 },
    );
  }

  const addendumCreatedAt = new Date(addendum.created_at).getTime();
  const retryAgeMs = Date.now() - addendumCreatedAt;

  if (
    !Number.isFinite(addendumCreatedAt) ||
    retryAgeMs < 0 ||
    retryAgeMs >= ADDENDUM_EMAIL_SAFE_RETRY_WINDOW_MS
  ) {
    return NextResponse.json(
      {
        success: false,
        error_code: "SAFE_RETRY_WINDOW_EXPIRED",
        error:
          "Addendum email delivery can no longer be safely retried automatically.",
      },
      { status: 409 },
    );
  }

  const email = await deliverAddendumNotificationEmails({
    addendumId: addendum.id,
    rfqTitle: rfq.title,
    rfqSlug: rfq.slug,
    publishedNumber: addendum.addendum_number,
    publishedTitle: addendum.title,
    requiresAcknowledgement: Boolean(addendum.requires_acknowledgement),
    supabase,
  });

  if (email.failed > 0) {
    return NextResponse.json(
      {
        success: false,
        error_code: "ADDENDUM_EMAIL_DELIVERY_FAILED",
        error: "One or more Addendum notification emails could not be delivered.",
        email,
      },
      { status: 502 },
    );
  }

  if (email.skipped > 0) {
    return NextResponse.json(
      {
        success: false,
        error_code: "ADDENDUM_EMAIL_DELIVERY_SKIPPED",
        error: "One or more Addendum notification emails were skipped.",
        email,
      },
      { status: 503 },
    );
  }

  if (email.error) {
    return NextResponse.json(
      {
        success: false,
        error_code: "ADDENDUM_EMAIL_RETRY_FAILED",
        error: "Addendum email delivery could not be retried.",
        email,
      },
      { status: 502 },
    );
  }

  return NextResponse.json({ success: true, addendumId, email });
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
  const amendmentReason = normalizeText(body.amendmentReason);
  const governedChanges =
    body.changes &&
    typeof body.changes === "object" &&
    !Array.isArray(body.changes)
      ? (body.changes as Record<string, unknown>)
      : null;
  const hasGovernedChanges =
    governedChanges !== null && Object.keys(governedChanges).length > 0;
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
    .select("id, company_id, title, slug, status")
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
    reportCriticalApiFailure({
      domain: "addendum",
      operation: "create",
      failureStage: "membership_lookup",
      route: "/api/rfq-addenda",
      method: "POST",
      error: membershipError,
    });

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

  let data: AddendumRecord | null = null;
  let persistenceError: { message?: string } | null = null;

  if (hasGovernedChanges) {
    if (rfq.status === "draft") {
      return NextResponse.json(
        {
          error:
            "Draft RFQ fields must be edited through the existing draft workflow.",
        },
        { status: 409 },
      );
    }

    if (!title || !amendmentReason) {
      return NextResponse.json(
        {
          error:
            "Published RFQ changes require an Addendum title and amendment reason.",
        },
        { status: 400 },
      );
    }

    const { data: rpcData, error: rpcError } = await supabase.rpc(
      "amend_published_rfq",
      {
        p_rfq_id: rfqId,
        p_changes: governedChanges,
        p_reason: amendmentReason,
        p_title: title,
        p_description: description || null,
        p_affected_documents: affectedDocuments || null,
        p_requires_acknowledgement: true,
      },
    );
    const result = rpcData as AmendmentRpcResult | null;

    if (rpcError || !result?.success || !result.addendum_id) {
      const status =
        result?.error_code === "UNAUTHENTICATED"
          ? 401
          : result?.error_code === "FORBIDDEN"
            ? 403
            : result?.error_code === "RFQ_NOT_FOUND"
              ? 404
              : 409;

      return NextResponse.json(
        {
          error:
            result?.error_message ||
            rpcError?.message ||
            "Failed to amend published RFQ.",
        },
        { status },
      );
    }

    const addendumResult = await supabase
      .from("rfq_addenda")
      .select("*")
      .eq("id", result.addendum_id)
      .single();

    data = addendumResult.data as AddendumRecord | null;
    persistenceError = addendumResult.error;
  } else {
    const insertResult = await supabase
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

    data = insertResult.data as AddendumRecord | null;
    persistenceError = insertResult.error;
  }

  if (persistenceError || !data) {
    reportCriticalApiFailure({
      domain: "addendum",
      operation: "create",
      failureStage: "addendum_insert",
      route: "/api/rfq-addenda",
      method: "POST",
      error: persistenceError ?? new Error("AddendumInsertMissing"),
    });

    return NextResponse.json(
      { error: persistenceError?.message || "Failed to create addendum." },
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
