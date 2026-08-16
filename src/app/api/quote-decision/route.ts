import { NextResponse } from "next/server";

import { getActiveMembershipForUserCompany } from "@/lib/auth/membership";
import { canDecideCompanyQuotes } from "@/lib/procurement/procurement-write-authorization";
import { createClient } from "@/lib/supabase/server";

type QuoteDecision = "approved" | "rejected";

type RequestBody = {
  quoteId?: unknown;
  decision?: unknown;
};

function isQuoteDecision(value: string): value is QuoteDecision {
  return value === "approved" || value === "rejected";
}



export async function POST(request: Request) {
  try {
    let body: RequestBody;

    try {
      body = (await request.json()) as RequestBody;
    } catch {
      return NextResponse.json(
        { error: "A valid request body is required." },
        { status: 400 },
      );
    }

    const quoteId = String(body.quoteId || "").trim();
    const decision = String(body.decision || "").trim();

    if (!quoteId) {
      return NextResponse.json(
        { error: "Quote ID is required." },
        { status: 400 },
      );
    }

    if (!isQuoteDecision(decision)) {
      return NextResponse.json(
        { error: "Decision must be approved or rejected." },
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

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("id, company_id")
      .eq("id", user.id)
      .maybeSingle();

    if (profileError || !profile?.company_id) {
      return NextResponse.json(
        { error: "An active company profile is required." },
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
      console.error("Quote decision membership lookup failed.", {
        userId: user.id,
        companyId: profile.company_id,
        error: membershipError,
      });

      return NextResponse.json(
        { error: "Unable to verify organization membership." },
        { status: 500 },
      );
    }

    if (!canDecideCompanyQuotes(membership, profile.company_id)) {
      return NextResponse.json(
        {
          error:
            "Only organization owners and administrators can update quote decisions.",
        },
        { status: 403 },
      );
    }

    const { data: quote, error: quoteError } = await supabase
      .from("quotes")
      .select("id, rfq_id, decision, company_id")
      .eq("id", quoteId)
      .maybeSingle();

    if (quoteError) {
      console.error("Quote decision lookup failed.", {
        quoteId,
        userId: user.id,
        error: quoteError,
      });

      return NextResponse.json(
        { error: "We could not verify this quote." },
        { status: 500 },
      );
    }

    if (!quote) {
      return NextResponse.json(
        { error: "Quote not found." },
        { status: 404 },
      );
    }

    const { data: rfq, error: rfqError } = await supabase
      .from("rfqs")
      .select("id, company_id, status")
      .eq("id", quote.rfq_id)
      .maybeSingle();

    if (rfqError) {
      console.error("Quote decision RFQ lookup failed.", {
        quoteId,
        rfqId: quote.rfq_id,
        userId: user.id,
        error: rfqError,
      });

      return NextResponse.json(
        { error: "We could not verify the RFQ ownership." },
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
            "You can only update decisions for RFQs owned by your organization.",
        },
        { status: 403 },
      );
    }

    const previousDecision = quote.decision || "pending";

    if (previousDecision === decision) {
      return NextResponse.json({
        success: true,
        quoteId,
        decision,
        unchanged: true,
      });
    }

    const { data: updatedQuote, error: updateError } = await supabase
      .from("quotes")
      .update({
        decision,
      })
      .eq("id", quoteId)
      .select("id, rfq_id, company_id, decision")
      .maybeSingle();

    if (updateError || !updatedQuote) {
      console.error("Quote decision update failed.", {
        quoteId,
        rfqId: quote.rfq_id,
        userId: user.id,
        companyId: profile.company_id,
        decision,
        error: updateError,
      });

      return NextResponse.json(
        { error: "Failed to update quote decision." },
        { status: 500 },
      );
    }

    const { error: auditError } = await supabase
      .from("audit_logs")
      .insert({
        action: "QUOTE_DECISION_UPDATED",
        entity_type: "quote",
        entity_id: quoteId,
        user_id: user.id,
        company_id: profile.company_id,
        metadata: {
          rfq_id: quote.rfq_id,
          previous_decision: previousDecision,
          new_decision: decision,
          actor_workspace_role: membership.workspaceRole,
          actor_procurement_function: membership.procurementFunction,
          updated_at: new Date().toISOString(),
        },
      });

    if (auditError) {
      console.error("Quote decision audit logging failed.", {
        quoteId,
        rfqId: quote.rfq_id,
        userId: user.id,
        companyId: profile.company_id,
        error: auditError,
      });

      return NextResponse.json(
        {
          error:
            "The quote decision was updated, but the governance record could not be completed.",
        },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      quote: updatedQuote,
    });
  } catch (error) {
    console.error("Unexpected quote decision failure.", error);

    return NextResponse.json(
      { error: "Internal server error." },
      { status: 500 },
    );
  }
}