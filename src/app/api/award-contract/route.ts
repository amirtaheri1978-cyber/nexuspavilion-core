import { NextResponse } from "next/server";

import { sendEmail } from "@/lib/email/send-email";
import { awardNotificationEmail } from "@/lib/email/templates/award-notification-email";
import { getActiveMembershipForUserCompany } from "@/lib/auth/membership";
import {
  type OrganizationVerificationStatus,
  type WorkspaceStatus,
} from "@/lib/permissions";
import { canAwardVerifiedCompanyContract } from "@/lib/procurement/procurement-write-authorization";
import { createClient } from "@/lib/supabase/server";

type AwardRequestBody = {
  quoteId?: string;
};

type QuoteRecord = {
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

type RfqRecord = {
  id: string;
  title: string | null;
  slug: string;
  status: string | null;
  company_id: string;
  awarded_quote_id: string | null;
  awarded_at: string | null;
};

type CompanyTrustRecord = {
  status: string | null;
  workspace_status: string;
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

    const { data: profile, error: profileError } =
      await supabase
        .from("profiles")
        .select("id, email, company_id")
        .eq("id", user.id)
        .maybeSingle();

    if (profileError || !profile?.company_id) {
      return NextResponse.json(
        {
          error:
            "Company profile is required to award contracts.",
        },
        { status: 403 },
      );
    }

    let membership;

    try {
      membership = await getActiveMembershipForUserCompany(
        supabase,
        user.id,
        profile.company_id,
      );
    } catch (membershipError) {
      console.error(
        "Award contract membership lookup failed.",
        membershipError,
      );

      return NextResponse.json(
        {
          error: "Unable to verify organization membership.",
        },
        { status: 500 },
      );
    }

    const { data: company, error: companyError } =
      await supabase
        .from("companies")
        .select("status, workspace_status")
        .eq("id", profile.company_id)
        .maybeSingle<CompanyTrustRecord>();

    if (companyError) {
      console.error(
        "Company trust-state lookup error:",
        companyError,
      );

      return NextResponse.json(
        {
          error:
            companyError.message ||
            "Failed to read company workspace status.",
        },
        { status: 500 },
      );
    }

    if (!company) {
      return NextResponse.json(
        { error: "Company workspace not found." },
        { status: 403 },
      );
    }

    if (
      !canAwardVerifiedCompanyContract({
        membership,
        companyId: profile.company_id,
        workspaceStatus:
          company.workspace_status as WorkspaceStatus,
        verificationStatus:
          company.status as OrganizationVerificationStatus,
      }) ||
      !membership
    ) {
      return NextResponse.json(
        {
          error:
            "Your organization is not permitted to award contracts.",
        },
        { status: 403 },
      );
    }

    const { data: selectedQuote, error: quoteError } =
      await supabase
        .from("quotes")
        .select(
          "id, rfq_id, company_id, user_id, amount, timeline, message, status, decision, awarded_at",
        )
        .eq("id", quoteId)
        .maybeSingle<QuoteRecord>();

    if (quoteError) {
      console.error("Quote lookup error:", quoteError);

      return NextResponse.json(
        {
          error:
            quoteError.message || "Failed to read quote.",
        },
        { status: 500 },
      );
    }

    if (!selectedQuote) {
      return NextResponse.json(
        { error: "Quote not found." },
        { status: 404 },
      );
    }

    if (selectedQuote.decision === "awarded") {
      return NextResponse.json(
        { error: "This quote has already been awarded." },
        { status: 400 },
      );
    }

    if (selectedQuote.decision === "rejected") {
      return NextResponse.json(
        { error: "Rejected quotes cannot be awarded." },
        { status: 400 },
      );
    }

    const { data: rfq, error: rfqError } = await supabase
      .from("rfqs")
      .select(
        "id, title, slug, status, company_id, awarded_quote_id, awarded_at",
      )
      .eq("id", selectedQuote.rfq_id)
      .maybeSingle<RfqRecord>();

    if (rfqError) {
      console.error("RFQ lookup error:", rfqError);

      return NextResponse.json(
        {
          error:
            rfqError.message || "Failed to read RFQ.",
        },
        { status: 500 },
      );
    }

    if (!rfq) {
      return NextResponse.json(
        { error: "RFQ not found." },
        { status: 404 },
      );
    }

    if (rfq.company_id !== profile.company_id) {
      return NextResponse.json(
        {
          error:
            "You can only award RFQs owned by your company.",
        },
        { status: 403 },
      );
    }

    if (
      rfq.status === "awarded" ||
      rfq.awarded_quote_id ||
      rfq.awarded_at
    ) {
      return NextResponse.json(
        {
          error: "This RFQ has already been awarded.",
        },
        { status: 400 },
      );
    }

    if (
      selectedQuote.company_id &&
      selectedQuote.company_id === rfq.company_id
    ) {
      return NextResponse.json(
        {
          error: "Your company cannot award its own quote.",
        },
        { status: 403 },
      );
    }

    const {
      data: existingAwards,
      error: existingAwardError,
    } = await supabase
      .from("quotes")
      .select("id")
      .eq("rfq_id", selectedQuote.rfq_id)
      .eq("decision", "awarded")
      .limit(1);

    if (existingAwardError) {
      console.error(
        "Existing award lookup error:",
        existingAwardError,
      );

      return NextResponse.json(
        {
          error:
            existingAwardError.message ||
            "Failed to check existing awards.",
        },
        { status: 500 },
      );
    }

    if ((existingAwards || []).length > 0) {
      return NextResponse.json(
        {
          error: "This RFQ already has an awarded quote.",
        },
        { status: 400 },
      );
    }

    const awardedAt = new Date().toISOString();

    const { data: updatedRfqs, error: rfqUpdateError } =
      await supabase
        .from("rfqs")
        .update({
          status: "awarded",
          awarded_quote_id: quoteId,
          awarded_at: awardedAt,
        })
        .eq("id", rfq.id)
        .select(
          "id, title, slug, status, company_id, awarded_quote_id, awarded_at",
        );

    if (rfqUpdateError) {
      console.error(
        "RFQ award update error:",
        rfqUpdateError,
      );

      return NextResponse.json(
        {
          error:
            rfqUpdateError.message ||
            "Failed to update RFQ status. Contract was not awarded.",
        },
        { status: 500 },
      );
    }

    const updatedRfq = (updatedRfqs || [])[0] as
      | RfqRecord
      | undefined;

    if (!updatedRfq) {
      return NextResponse.json(
        {
          error:
            "Failed to update RFQ status. No matching RFQ was updated.",
        },
        { status: 500 },
      );
    }

    const { error: rejectError } = await supabase
      .from("quotes")
      .update({
        decision: "rejected",
      })
      .eq("rfq_id", selectedQuote.rfq_id)
      .neq("id", quoteId);

    if (rejectError) {
      console.error(
        "Competing quote rejection error:",
        rejectError,
      );

      await supabase
        .from("rfqs")
        .update({
          status: "open",
          awarded_quote_id: null,
          awarded_at: null,
        })
        .eq("id", rfq.id);

      return NextResponse.json(
        {
          error:
            rejectError.message ||
            "Failed to reject competing quotes.",
        },
        { status: 500 },
      );
    }

    const { data: awardedQuotes, error: awardError } =
      await supabase
        .from("quotes")
        .update({
          decision: "awarded",
          awarded_at: awardedAt,
        })
        .eq("id", quoteId)
        .select();

    if (awardError) {
      console.error(
        "Selected quote award error:",
        awardError,
      );

      await supabase
        .from("rfqs")
        .update({
          status: "open",
          awarded_quote_id: null,
          awarded_at: null,
        })
        .eq("id", rfq.id);

      await supabase
        .from("quotes")
        .update({
          decision: "pending",
          awarded_at: null,
        })
        .eq("rfq_id", selectedQuote.rfq_id);

      return NextResponse.json(
        {
          error:
            awardError.message ||
            "Failed to award contract.",
        },
        { status: 500 },
      );
    }

    const awardedQuote = (awardedQuotes || [])[0] as
      | QuoteRecord
      | undefined;

    if (!awardedQuote) {
      console.error(
        "Selected quote award error: no quote row was updated.",
      );

      await supabase
        .from("rfqs")
        .update({
          status: "open",
          awarded_quote_id: null,
          awarded_at: null,
        })
        .eq("id", rfq.id);

      await supabase
        .from("quotes")
        .update({
          decision: "pending",
          awarded_at: null,
        })
        .eq("rfq_id", selectedQuote.rfq_id);

      return NextResponse.json(
        {
          error:
            "Failed to award contract. No quote row was updated.",
        },
        { status: 500 },
      );
    }

    const { error: notificationError } = await supabase
      .from("notifications")
      .insert({
        title: "Contract Awarded",
        message: `${
          rfq.title ?? "Project"
        } procurement contract has been awarded at ${formatCurrency(
          selectedQuote.amount,
        )}.`,
        type: "award",
        is_read: false,
        company_id: rfq.company_id,
      });

    if (notificationError) {
      console.error(
        "Award notification creation failed:",
        notificationError,
      );
    }

    const { error: auditError } = await supabase
      .from("audit_logs")
      .insert({
        action: "CONTRACT_AWARDED",
        entity_type: "quote",
        entity_id: quoteId,
        user_id: user.id,
        company_id: rfq.company_id,
        metadata: {
          rfq_id: rfq.id,
          rfq_slug: rfq.slug,
          rfq_title: rfq.title,
          awarded_amount: selectedQuote.amount,
          awarded_quote_id: quoteId,
          awarded_company_id: selectedQuote.company_id,
          awarded_user_id: selectedQuote.user_id,
          awarded_by_workspace_role: membership.workspaceRole,
          awarded_by_procurement_function:
            membership.procurementFunction,
          awarded_at: awardedAt,
          workspace_status: company.workspace_status,
          organization_verification_status:
            company.status,
        },
      });

    if (auditError) {
      console.error(
        "Contract award audit logging failed:",
        auditError,
      );
    }

    try {
      if (user.email) {
        await sendEmail({
          to: user.email,
          subject: `Contract Awarded: ${
            rfq.title ?? "Project"
          }`,
          html: awardNotificationEmail({
            rfqTitle: rfq.title ?? "Project",
            amount: formatCurrency(
              selectedQuote.amount,
            ),
            awardUrl: `${process.env.NEXT_PUBLIC_SITE_URL}/rfq/${rfq.slug}`,
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
      redirectTo: `/rfq/${rfq.slug}`,
      warnings: {
        notification:
          notificationError?.message || null,
        audit: auditError?.message || null,
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