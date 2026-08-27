import { NextResponse } from "next/server";

import { getActiveMembershipForUserCompany } from "@/lib/auth/membership";
import { canCreateCompanyRfq } from "@/lib/procurement/procurement-write-authorization";
import { createClient } from "@/lib/supabase/server";

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
    .select("id, company_id")
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

  return NextResponse.json({ success: true, addendum: data });
}
