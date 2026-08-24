import { NextResponse } from "next/server";

import { sendEmail } from "@/lib/email/send-email";
import { awardNotificationEmail } from "@/lib/email/templates/award-notification-email";
import { joinPublicSitePath } from "@/lib/ops/public-site-url";
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
      console.error("Award contract RPC error:", rpcError);

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
      return NextResponse.json(
        {
          error: "Failed to award contract.",
        },
        { status: 500 },
      );
    }

    try {
      const awardUrl = joinPublicSitePath(`/rfq/${updatedRfq.slug}`);
      if (user.email && awardUrl) {
        await sendEmail({
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
      }
    } catch (error) {
      console.error(
        "Award notification email failed:",
        error,
      );
    }

    return NextResponse.json({
      success: true,
      awardedQuote,
      rfq: updatedRfq,
      redirectTo: `/rfq/${updatedRfq.slug}`,
      warnings: {
        notification: null,
        audit: null,
        ownerNotification: null,
        supplierNotification: null,
        ownerAudit: null,
        supplierAudit: null,
      },
    });
  } catch (error) {
    console.error("Award contract route failed:", error);

    return NextResponse.json(
      { error: "Internal server error." },
      { status: 500 },
    );
  }
}
