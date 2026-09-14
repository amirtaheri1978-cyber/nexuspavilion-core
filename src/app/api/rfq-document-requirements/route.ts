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

type AmendmentRpcResult = {
  success?: boolean;
  error_code?: string;
  error_message?: string;
  addendum_id?: string;
};

function getAmendmentEvidence(body: unknown) {
  const input = (body ?? {}) as Record<string, unknown>;

  return {
    title: normalizeText(input.addendumTitle),
    reason: normalizeText(input.amendmentReason),
  };
}

function amendmentFailure(
  result: AmendmentRpcResult | null,
  fallback: string,
) {
  const status =
    result?.error_code === "UNAUTHENTICATED"
      ? 401
      : result?.error_code === "FORBIDDEN"
        ? 403
        : result?.error_code === "RFQ_NOT_FOUND"
          ? 404
          : 409;

  return NextResponse.json(
    { error: result?.error_message || fallback },
    { status },
  );
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
    .select("id, company_id, status")
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

  if (authorization.rfq.status !== "draft") {
    const evidence = getAmendmentEvidence(body);

    if (!evidence.title || !evidence.reason) {
      return NextResponse.json(
        {
          error:
            "Published RFQ requirement changes require an Addendum title and amendment reason.",
        },
        { status: 400 },
      );
    }

    const { data: rpcData, error: rpcError } = await supabase.rpc(
      "amend_published_rfq_package",
      {
        p_rfq_id: parsed.rfqId,
        p_change: {
          operation: "add_document_requirement",
          attachment_type: parsed.attachmentType,
        },
        p_reason: evidence.reason,
        p_title: evidence.title,
        p_description: null,
        p_requires_acknowledgement: true,
      },
    );
    const result = rpcData as AmendmentRpcResult | null;

    if (rpcError || !result?.success) {
      return amendmentFailure(
        result,
        rpcError?.message || "Failed to declare governed document requirement.",
      );
    }

    const { data: requirement, error: requirementError } = await supabase
      .from("rfq_document_requirements")
      .select("id, rfq_id, attachment_type, created_by, created_at")
      .eq("rfq_id", parsed.rfqId)
      .eq("attachment_type", parsed.attachmentType)
      .maybeSingle();

    if (requirementError || !requirement) {
      return NextResponse.json(
        {
          error:
            "The governed requirement was declared, but its record could not be reloaded.",
        },
        { status: 500 },
      );
    }

    return NextResponse.json(
      {
        success: true,
        changed: true,
        status: "declared",
        requirement,
        addendumId: result.addendum_id,
      },
      { status: 201 },
    );
  }

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

  if (authorization.rfq.status !== "draft") {
    const evidence = getAmendmentEvidence(body);

    if (!evidence.title || !evidence.reason) {
      return NextResponse.json(
        {
          error:
            "Published RFQ requirement changes require an Addendum title and amendment reason.",
        },
        { status: 400 },
      );
    }

    const { data: rpcData, error: rpcError } = await supabase.rpc(
      "amend_published_rfq_package",
      {
        p_rfq_id: parsed.rfqId,
        p_change: {
          operation: "remove_document_requirement",
          attachment_type: parsed.attachmentType,
        },
        p_reason: evidence.reason,
        p_title: evidence.title,
        p_description: null,
        p_requires_acknowledgement: true,
      },
    );
    const result = rpcData as AmendmentRpcResult | null;

    if (rpcError || !result?.success) {
      return amendmentFailure(
        result,
        rpcError?.message || "Failed to remove governed document requirement.",
      );
    }

    return NextResponse.json({
      success: true,
      changed: true,
      status: "removed",
      addendumId: result.addendum_id,
    });
  }

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
