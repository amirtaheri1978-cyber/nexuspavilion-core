import { NextResponse } from "next/server";

import { getActiveMembershipForUserCompany } from "@/lib/auth/membership";
import {
  canRespondToRfqSourcing,
  isPublicSourcingMethod,
} from "@/lib/procurement/rfq-access-contract";
import {
  canCreateCompanyRfq,
  canSubmitCompanyQuote,
} from "@/lib/procurement/procurement-write-authorization";
import { createClient } from "@/lib/supabase/server";

function normalizeText(value: unknown) {
  return String(value || "").trim();
}

function hasDeadlinePassed(deadline: string | null | undefined) {
  if (!deadline) return true;

  const deadlineDate = new Date(deadline);

  if (Number.isNaN(deadlineDate.getTime())) {
    return true;
  }

  return Date.now() > deadlineDate.getTime();
}

async function resolveEffectiveRfiDeadline(
  supabase: Awaited<ReturnType<typeof createClient>>,
  rfq: {
    rfi_deadline?: string | null;
    deadline?: string | null;
  },
): Promise<
  | { ok: true; deadline: string }
  | { ok: false; status: 403 | 500; error: string }
> {
  if (rfq.rfi_deadline) {
    const parsed = new Date(rfq.rfi_deadline);
    if (!Number.isNaN(parsed.getTime())) {
      return { ok: true, deadline: rfq.rfi_deadline };
    }
  }

  const { data, error } = await supabase.rpc(
    "parse_rfq_deadline_timestamptz",
    { p_deadline: rfq.deadline ?? null },
  );

  if (error) {
    console.error("RFI deadline parse RPC failed:", error);
    return {
      ok: false,
      status: 500,
      error: "Unable to verify the RFI deadline.",
    };
  }

  if (!data) {
    return {
      ok: false,
      status: 403,
      error:
        "The RFI deadline has passed or cannot be resolved. Late RFI submissions are not accepted.",
    };
  }

  return { ok: true, deadline: String(data) };
}

export async function GET(request: Request) {
  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const rfqId = normalizeText(searchParams.get("rfqId"));

  if (!rfqId) {
    return NextResponse.json({ error: "RFQ ID is required." }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("rfq_rfis")
    .select("*")
    .eq("rfq_id", rfqId)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json(
      { error: error.message || "Failed to load RFIs." },
      { status: 500 },
    );
  }

  return NextResponse.json({ rfis: data || [] });
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
  const question = normalizeText(body.question);

  if (!rfqId || !question) {
    return NextResponse.json(
      { error: "RFQ ID and question are required." },
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
    console.error("RFI submit membership lookup failed:", membershipError);

    return NextResponse.json(
      { error: "Unable to verify organization membership." },
      { status: 500 },
    );
  }

  if (!canSubmitCompanyQuote(membership, profile.company_id)) {
    return NextResponse.json(
      {
        error: "You must belong to an active company to submit an RFI.",
      },
      { status: 403 },
    );
  }

  const { data: rfq, error: rfqError } = await supabase
    .from("rfqs")
    .select("id, company_id, status, sourcing_method, deadline, rfi_deadline")
    .eq("id", rfqId)
    .maybeSingle();

  if (rfqError || !rfq) {
    return NextResponse.json({ error: "RFQ not found." }, { status: 404 });
  }

  if (String(rfq.status || "").toLowerCase() !== "open") {
    return NextResponse.json(
      { error: "This RFQ is not open for RFI submissions." },
      { status: 400 },
    );
  }

  if (rfq.company_id === profile.company_id) {
    return NextResponse.json(
      {
        error:
          "Issuing companies cannot submit private respondent RFIs on their own RFQ.",
      },
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
      console.error("RFI submit RFQ access lookup failed:", accessError);

      return NextResponse.json(
        { error: "Unable to verify RFQ access." },
        { status: 500 },
      );
    }

    hasRestrictedRfqAccess = restrictedAccess === true;
  }

  if (!canRespondToRfqSourcing(rfq.sourcing_method, hasRestrictedRfqAccess)) {
    return NextResponse.json(
      { error: "You do not have access to submit an RFI for this RFQ." },
      { status: 403 },
    );
  }

  const effectiveDeadlineResult = await resolveEffectiveRfiDeadline(
    supabase,
    rfq,
  );

  if (!effectiveDeadlineResult.ok) {
    return NextResponse.json(
      { error: effectiveDeadlineResult.error },
      { status: effectiveDeadlineResult.status },
    );
  }

  if (hasDeadlinePassed(effectiveDeadlineResult.deadline)) {
    return NextResponse.json(
      {
        error:
          "The RFI deadline has passed or cannot be resolved. Late RFI submissions are not accepted.",
      },
      { status: 403 },
    );
  }

  const { data, error } = await supabase
    .from("rfq_rfis")
    .insert({
      rfq_id: rfqId,
      respondent_company_id: profile.company_id,
      question,
    })
    .select()
    .single();

  if (error || !data) {
    return NextResponse.json(
      { error: error?.message || "Failed to submit RFI." },
      { status: 500 },
    );
  }

  return NextResponse.json({ success: true, rfi: data });
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
  const rfiId = normalizeText(body.rfiId);
  const responseText = normalizeText(body.responseText);

  if (!rfiId || !responseText) {
    return NextResponse.json(
      { error: "RFI ID and response text are required." },
      { status: 400 },
    );
  }

  const { data: existing, error: existingError } = await supabase
    .from("rfq_rfis")
    .select("id, rfq_id, status")
    .eq("id", rfiId)
    .maybeSingle();

  if (existingError || !existing) {
    return NextResponse.json({ error: "RFI not found." }, { status: 404 });
  }

  if (existing.status !== "open") {
    return NextResponse.json(
      { error: "Only open RFIs can receive a response." },
      { status: 400 },
    );
  }

  const { data: rfq, error: rfqError } = await supabase
    .from("rfqs")
    .select("id, company_id")
    .eq("id", existing.rfq_id)
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
    console.error("RFI answer membership lookup failed:", membershipError);

    return NextResponse.json(
      { error: "Unable to verify organization membership." },
      { status: 500 },
    );
  }

  if (!canCreateCompanyRfq(membership, rfq.company_id)) {
    return NextResponse.json(
      {
        error:
          "Only owners, admins, and buyers for the issuing company can answer RFIs.",
      },
      { status: 403 },
    );
  }

  const { data, error } = await supabase
    .from("rfq_rfis")
    .update({ response_text: responseText })
    .eq("id", rfiId)
    .select()
    .single();

  if (error || !data) {
    return NextResponse.json(
      { error: error?.message || "Failed to answer RFI." },
      { status: 500 },
    );
  }

  return NextResponse.json({ success: true, rfi: data });
}
