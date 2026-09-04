import { NextResponse } from "next/server";

import { getActiveMembershipForUserCompany } from "@/lib/auth/membership";
import {
  isRfqAttachmentType,
  type RfqAttachmentType,
} from "@/lib/procurement/rfq-attachment-types";
import { canCreateCompanyRfq } from "@/lib/procurement/procurement-write-authorization";
import { createClient } from "@/lib/supabase/server";

function normalizeText(value: unknown) {
  return String(value ?? "").trim();
}

async function resolveAuthorizedIssuerContext({
  rfqId,
  userId,
  supabase,
}: {
  rfqId: string;
  userId: string;
  supabase: Awaited<ReturnType<typeof createClient>>;
}) {
  const { data: rfq, error: rfqError } = await supabase
    .from("rfqs")
    .select("id, company_id")
    .eq("id", rfqId)
    .maybeSingle();

  if (rfqError || !rfq?.company_id) {
    return {
      ok: false as const,
      response: NextResponse.json({ error: "RFQ not found." }, { status: 404 }),
    };
  }

  try {
    const membership = await getActiveMembershipForUserCompany(
      supabase,
      userId,
      rfq.company_id,
    );

    if (!canCreateCompanyRfq(membership, rfq.company_id)) {
      return {
        ok: false as const,
        response: NextResponse.json(
          {
            error:
              "Only owners, admins, and buyers for the issuing company can manage RFQ document requirements.",
          },
          { status: 403 },
        ),
      };
    }
  } catch (membershipError) {
    console.error(
      "RFQ document requirement membership lookup failed:",
      membershipError,
    );

    return {
      ok: false as const,
      response: NextResponse.json(
        { error: "Unable to verify organization membership." },
        { status: 500 },
      ),
    };
  }

  return {
    ok: true as const,
    rfq,
  };
}

function parseRequirementBody(body: unknown) {
  const input = (body ?? {}) as Record<string, unknown>;
  const rfqId = normalizeText(input.rfqId);
  const attachmentType = normalizeText(input.attachmentType);

  if (!rfqId || !attachmentType) {
    return {
      ok: false as const,
      response: NextResponse.json(
        { error: "RFQ ID and attachment type are required." },
        { status: 400 },
      ),
    };
  }

  if (!isRfqAttachmentType(attachmentType)) {
    return {
      ok: false as const,
      response: NextResponse.json(
        { error: "Unsupported RFQ attachment type." },
        { status: 400 },
      ),
    };
  }

  return {
    ok: true as const,
    rfqId,
    attachmentType: attachmentType as RfqAttachmentType,
  };
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

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const parsed = parseRequirementBody(body);
  if (!parsed.ok) return parsed.response;

  const authorization = await resolveAuthorizedIssuerContext({
    rfqId: parsed.rfqId,
    userId: user.id,
    supabase,
  });

  if (!authorization.ok) return authorization.response;

  const { data, error } = await supabase
    .from("rfq_document_requirements")
    .insert({
      rfq_id: parsed.rfqId,
      attachment_type: parsed.attachmentType,
    })
    .select("id, rfq_id, attachment_type, created_by, created_at")
    .single();

  if (error?.code === "23505") {
    const { data: existing, error: existingError } = await supabase
      .from("rfq_document_requirements")
      .select("id, rfq_id, attachment_type, created_by, created_at")
      .eq("rfq_id", parsed.rfqId)
      .eq("attachment_type", parsed.attachmentType)
      .maybeSingle();

    if (existingError) {
      return NextResponse.json(
        { error: "Failed to confirm existing document requirement." },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      changed: false,
      status: "already_declared",
      requirement: existing ?? null,
    });
  }

  if (error || !data) {
    return NextResponse.json(
      { error: error?.message || "Failed to declare document requirement." },
      { status: 500 },
    );
  }

  return NextResponse.json(
    {
      success: true,
      changed: true,
      status: "declared",
      requirement: data,
    },
    { status: 201 },
  );
}

export async function DELETE(request: Request) {
  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const parsed = parseRequirementBody(body);
  if (!parsed.ok) return parsed.response;

  const authorization = await resolveAuthorizedIssuerContext({
    rfqId: parsed.rfqId,
    userId: user.id,
    supabase,
  });

  if (!authorization.ok) return authorization.response;

  const { data, error } = await supabase
    .from("rfq_document_requirements")
    .delete()
    .eq("rfq_id", parsed.rfqId)
    .eq("attachment_type", parsed.attachmentType)
    .select("id");

  if (error) {
    return NextResponse.json(
      { error: error.message || "Failed to remove document requirement." },
      { status: 500 },
    );
  }

  const changed = (data ?? []).length > 0;

  if (changed) {
    return NextResponse.json({
      success: true,
      changed: true,
      status: "removed",
    });
  }

  return NextResponse.json({
    success: true,
    changed: false,
    status: "already_not_declared",
  });
}
