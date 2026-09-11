import { NextResponse } from "next/server";

import { sendEmail } from "@/lib/email/send-email";
import {
  awardNotificationEmail,
  supplierAwardNotificationEmail,
} from "@/lib/email/templates/award-notification-email";
import { joinPublicSitePath } from "@/lib/ops/public-site-url";
import { reportCriticalApiFailure } from "@/lib/ops/report-critical-api-failure";
import { createClient } from "@/lib/supabase/server";

type AwardRequestBody = {
  quoteId?: string;
};

type AwardedQuoteRecord = {
  id: string;
  rfq_id: string;
  company_id: string | null;
  user_id: string | null;
  amount: number | string | null;
  timeline: string | null;
  message: string | null;
  status: string | null;
  decision: string | null;
  awarded_at?: string | null;
};

type AwardedRfqRecord = {
  id: string;
  title: string | null;
  slug: string;
  status: string | null;
  company_id: string;
  awarded_quote_id: string | null;
  awarded_at: string | null;
};

type AwardRpcResult = {
  success?: boolean;
  error_code?: string;
  error_message?: string;
  awarded_quote?: AwardedQuoteRecord;
  rfq?: AwardedRfqRecord;
};

const ERROR_STATUS_BY_CODE: Record<string, number> = {
  AUTHENTICATION_REQUIRED: 401,
  COMPANY_PROFILE_REQUIRED: 403,
  AWARD_NOT_PERMITTED: 403,
  NOT_RFQ_COMPANY: 403,
  SELF_AWARD_NOT_ALLOWED: 403,
  QUOTE_NOT_FOUND: 404,
  RFQ_NOT_FOUND: 404,
  QUOTE_ID_REQUIRED: 400,
  QUOTE_ALREADY_AWARDED: 400,
  RFQ_ALREADY_AWARDED: 400,
  QUOTE_INELIGIBLE: 400,
};

function formatCurrency(
  value: number | string | null | undefined,
) {
  const amount = Number(value);

  if (!Number.isFinite(amount)) {
    return "$0";
  }

  return `$${amount.toLocaleString()}`;
}

function collectAwardRecipientEmail(recipientRows: unknown) {
  const recipientEmail = Array.isArray(recipientRows)
    ? String(
        (recipientRows[0] as { email?: string | null } | undefined)?.email ||
          "",
      ).trim()
    : String(
        (recipientRows as { email?: string | null } | null | undefined)?.email ||
          "",
      ).trim();

  return recipientEmail;
}

type AwardEmailDeliveryResult = {
  sent: boolean;
  skipped: boolean;
  id: string | null;
  error: string | null;
};

function skippedAwardEmail(
  error: string | null = null,
): AwardEmailDeliveryResult {
  return {
    sent: false,
    skipped: true,
    id: null,
    error,
  };
}

function failedAwardEmail(
  error: string,
): AwardEmailDeliveryResult {
  return {
    sent: false,
    skipped: false,
    id: null,
    error,
  };
}

async function deliverSupplierAwardNotificationEmail({
  quoteId,
  rfqTitle,
  rfqSlug,
  amount,
  supabase,
}: {
  quoteId: string;
  rfqTitle: string | null | undefined;
  rfqSlug: string | null | undefined;
  amount: number | string | null | undefined;
  supabase: Awaited<ReturnType<typeof createClient>>;
}): Promise<AwardEmailDeliveryResult> {
  const { data: recipientRows, error: recipientError } = await supabase.rpc(
    "resolve_rfq_award_notification_recipient",
    { p_quote_id: quoteId },
  );

  if (recipientError) {
    console.error("Award Supplier notification recipient resolution failed.");
    return failedAwardEmail(
      "Award Supplier notification recipient could not be resolved.",
    );
  }

  const recipientEmail = collectAwardRecipientEmail(recipientRows);

  if (!recipientEmail) {
    return skippedAwardEmail(
      "Award Supplier notification recipient was unavailable.",
    );
  }

  const awardUrl = rfqSlug
    ? joinPublicSitePath(`/rfq/${rfqSlug}`)
    : null;

  if (!awardUrl) {
    console.warn(
      "Award Supplier email skipped because the public site URL is not configured.",
    );
    return skippedAwardEmail("Public site URL is not configured.");
  }

  const email = supplierAwardNotificationEmail({
    rfqTitle: rfqTitle || "Procurement Opportunity",
    amount: formatCurrency(amount),
    awardUrl,
  });

  const result = await sendEmail({
    to: recipientEmail,
    subject: email.subject,
    html: email.html,
    text: email.text,
  });

  return {
    sent: Boolean(result.success),
    skipped: Boolean(result.skipped),
    id: result.id ?? null,
    error: result.error ?? null,
  };
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as AwardRequestBody;
    const quoteId = String(body.quoteId || "").trim();

    if (!quoteId) {
      return NextResponse.json(
        { error: "Quote ID is required." },
        { status: 400 },
      );
    }

    const supabase = await createClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        { error: "Unauthorized." },
        { status: 401 },
      );
    }

    const { data: rpcData, error: rpcError } = await supabase.rpc(
      "award_rfq_quote",
      {
        p_quote_id: quoteId,
      },
    );

    if (rpcError) {
      reportCriticalApiFailure({
        domain: "contract_award",
        operation: "award",
        failureStage: "award_rpc",
        route: "/api/award-contract",
        method: "POST",
        error: rpcError,
      });

      return NextResponse.json(
        {
          error:
            rpcError.message || "Failed to award contract.",
        },
        { status: 500 },
      );
    }

    const result = (rpcData ?? {}) as AwardRpcResult;

    if (!result.success) {
      const errorCode = String(result.error_code || "");

      return NextResponse.json(
        {
          error:
            result.error_message ||
            "Failed to award contract.",
        },
        {
          status: ERROR_STATUS_BY_CODE[errorCode] ?? 400,
        },
      );
    }

    const awardedQuote = result.awarded_quote;
    const updatedRfq = result.rfq;

    if (!awardedQuote || !updatedRfq) {
      reportCriticalApiFailure({
        domain: "contract_award",
        operation: "award",
        failureStage: "award_result_incomplete",
        route: "/api/award-contract",
        method: "POST",
        error: new Error("AwardResultIncomplete"),
      });

      return NextResponse.json(
        {
          error: "Failed to award contract.",
        },
        { status: 500 },
      );
    }

    let buyerEmail: AwardEmailDeliveryResult = skippedAwardEmail();

    try {
      const awardUrl = joinPublicSitePath(`/rfq/${updatedRfq.slug}`);
      if (user.email && awardUrl) {
        const emailResult = await sendEmail({
          to: user.email,
          subject: `Contract Awarded: ${
            updatedRfq.title ?? "Project"
          }`,
          html: awardNotificationEmail({
            rfqTitle: updatedRfq.title ?? "Project",
            amount: formatCurrency(
              awardedQuote.amount,
            ),
            awardUrl,
          }),
        });

        buyerEmail = {
          sent: Boolean(emailResult.success),
          skipped: Boolean(emailResult.skipped),
          id: emailResult.id ?? null,
          error: emailResult.error ?? null,
        };
      } else {
        buyerEmail = skippedAwardEmail(
          !user.email
            ? "Award confirmation recipient was unavailable."
            : "Public site URL is not configured.",
        );
      }
    } catch (error) {
      console.error(
        "Award notification email failed:",
        error,
      );
      buyerEmail = failedAwardEmail(
        "Contract awarded, but Buyer notification email delivery failed.",
      );
    }

    let supplierEmail: AwardEmailDeliveryResult = skippedAwardEmail();

    try {
      supplierEmail = await deliverSupplierAwardNotificationEmail({
        quoteId: awardedQuote.id,
        rfqTitle: updatedRfq.title,
        rfqSlug: updatedRfq.slug,
        amount: awardedQuote.amount,
        supabase,
      });
    } catch (error) {
      console.error(
        "Award Supplier notification email failed:",
        error,
      );
      supplierEmail = failedAwardEmail(
        "Contract awarded, but Supplier notification email delivery failed.",
      );
    }

    const ownerNotification =
      buyerEmail.sent
        ? null
        : buyerEmail.error ||
          "Contract awarded, but Buyer notification was not sent.";
    const supplierNotification =
      supplierEmail.sent
        ? null
        : supplierEmail.error ||
          "Contract awarded, but Supplier notification was not sent.";
    const notificationWarning = [ownerNotification, supplierNotification]
      .filter(Boolean)
      .join(" ");

    return NextResponse.json({
      success: true,
      awardedQuote,
      rfq: updatedRfq,
      redirectTo: `/rfq/${updatedRfq.slug}`,
      email: {
        buyer: buyerEmail,
        supplier: supplierEmail,
      },
      warnings: {
        notification: notificationWarning || null,
        audit: null,
        ownerNotification,
        supplierNotification,
        ownerAudit: null,
        supplierAudit: null,
      },
    });
  } catch (error) {
    reportCriticalApiFailure({
      domain: "contract_award",
      operation: "award",
      failureStage: "outer_catch",
      route: "/api/award-contract",
      method: "POST",
      error,
    });

    return NextResponse.json(
      { error: "Internal server error." },
      { status: 500 },
    );
  }
}
