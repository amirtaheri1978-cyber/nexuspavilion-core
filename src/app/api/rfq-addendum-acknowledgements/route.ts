import { NextResponse } from "next/server";

import { getActiveMembershipForUserCompany } from "@/lib/auth/membership";
import {
  canRespondToRfqSourcing,
  isPublicSourcingMethod,
} from "@/lib/procurement/rfq-access-contract";
import { canSubmitCompanyQuote } from "@/lib/procurement/procurement-write-authorization";
import { recordTrustedProcurementActivity } from "@/lib/procurement/record-procurement-activity";
import { createClient } from "@/lib/supabase/server";

function normalizeText(value: unknown) {
  return String(value || "").trim();
}

function isUniqueViolation(error: { code?: string; message?: string } | null) {
  if (!error) return false;
  return error.code === "23505" || /duplicate key/i.test(error.message || "");
}

export async function GET(request: Request) {
  const supabase = await createClient();
  const { searchParams } = new URL(request.url);

  const rfqId = normalizeText(searchParams.get("rfqId"));
  const companyId = normalizeText(searchParams.get("companyId"));

  if (!rfqId) {
    return NextResponse.json({ error: "RFQ ID is required." }, { status: 400 });
  }

  let query = supabase
    .from("rfq_addendum_acknowledgements")
    .select("*")
    .eq("rfq_id", rfqId)
    .order("acknowledged_at", { ascending: false });

  if (companyId) {
    query = query.eq("company_id", companyId);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json(
      { error: error.message || "Failed to load acknowledgements." },
      { status: 500 },
    );
  }

  return NextResponse.json({ acknowledgements: data || [] });
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

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("company_id")
    .eq("id", user.id)
    .single();

  if (profileError || !profile?.company_id) {
    return NextResponse.json(
      { error: "No company linked to profile." },
      { status: 400 },
    );
  }

  const body = await request.json();

  const rfqId = normalizeText(body.rfqId);
  const addendumId = normalizeText(body.addendumId);

  if (!rfqId || !addendumId) {
    return NextResponse.json(
      { error: "RFQ ID and addendum ID are required." },
      { status: 400 },
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
      "Addendum acknowledgement membership lookup failed:",
      membershipError,
    );

    return NextResponse.json(
      { error: "Unable to verify organization membership." },
      { status: 500 },
    );
  }

  if (!canSubmitCompanyQuote(membership, profile.company_id)) {
    return NextResponse.json(
      {
        error:
          "You must belong to an active company to acknowledge RFQ addenda.",
      },
      { status: 403 },
    );
  }

  const { data: rfq, error: rfqError } = await supabase
    .from("rfqs")
    .select("id, company_id, status, sourcing_method")
    .eq("id", rfqId)
    .maybeSingle();

  if (rfqError || !rfq) {
    return NextResponse.json({ error: "RFQ not found." }, { status: 404 });
  }

  if (String(rfq.status || "").toLowerCase() !== "open") {
    return NextResponse.json(
      {
        error: "This RFQ is no longer open for addendum acknowledgement.",
      },
      { status: 403 },
    );
  }

  if (rfq.company_id === profile.company_id) {
    return NextResponse.json(
      { error: "Issuing companies cannot acknowledge their own addenda." },
      { status: 403 },
    );
  }

  let hasRestrictedRfqAccess = false;

  if (!isPublicSourcingMethod(rfq.sourcing_method)) {
    const { data: restrictedAccess, error: accessError } = await supabase.rpc(
      "current_user_has_supplier_rfq_access",
      { p_rfq_id: rfq.id },
    );

    if (accessError) {
      console.error(
        "Addendum acknowledgement RFQ access lookup failed:",
        accessError,
      );

      return NextResponse.json(
        { error: "Unable to verify RFQ access." },
        { status: 500 },
      );
    }

    hasRestrictedRfqAccess = restrictedAccess === true;
  }

  if (!canRespondToRfqSourcing(rfq.sourcing_method, hasRestrictedRfqAccess)) {
    return NextResponse.json(
      { error: "You do not have access to acknowledge addenda for this RFQ." },
      { status: 403 },
    );
  }

  const { data: addendum, error: addendumError } = await supabase
    .from("rfq_addenda")
    .select("id, rfq_id, requires_acknowledgement")
    .eq("id", addendumId)
    .eq("rfq_id", rfqId)
    .maybeSingle();

  if (addendumError || !addendum) {
    return NextResponse.json({ error: "Addendum not found." }, { status: 404 });
  }

  if (!addendum.requires_acknowledgement) {
    return NextResponse.json(
      { error: "This addendum does not require acknowledgement." },
      { status: 400 },
    );
  }

  const { data, error } = await supabase
    .from("rfq_addendum_acknowledgements")
    .insert({
      addendum_id: addendumId,
      company_id: profile.company_id,
    })
    .select()
    .single();

  if (!error && data) {
    await recordTrustedProcurementActivity(
      supabase,
      "addendum_acknowledged",
      data.id,
      {
        userId: user.id,
        companyId: profile.company_id,
      },
    );

    return NextResponse.json({
      success: true,
      acknowledgement: data,
      idempotent: false,
    });
  }

  if (isUniqueViolation(error)) {
    const { data: existing, error: existingError } = await supabase
      .from("rfq_addendum_acknowledgements")
      .select("*")
      .eq("addendum_id", addendumId)
      .eq("company_id", profile.company_id)
      .maybeSingle();

    if (existingError || !existing) {
      return NextResponse.json(
        {
          error:
            existingError?.message ||
            "Acknowledgement already exists but could not be loaded.",
        },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      acknowledgement: existing,
      idempotent: true,
    });
  }

  return NextResponse.json(
    { error: error?.message || "Failed to acknowledge addendum." },
    { status: 500 },
  );
}
