import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const REJECTION_REASON = "REPRESENTATIVE_AUTHORITY_NOT_CONFIRMED";

const statusByErrorCode: Record<string, number> = {
  AUTHENTICATION_REQUIRED: 401,
  REVIEWER_NOT_AUTHORIZED: 403,
  CASE_NOT_FOUND: 404,
  CASE_NOT_PENDING: 409,
  CASE_INVALIDATED: 409,
  CASE_REJECTION_CONFLICT: 409,
  INVALID_REJECTION_REASON: 422,
};

type RouteContext = {
  params: Promise<{
    caseId: string;
  }>;
};

type RejectionResult = {
  success?: boolean;
  case_id?: string;
  status?: string;
  idempotent?: boolean;
  error_code?: string;
};

function failure(errorCode: string, status: number) {
  return NextResponse.json({ success: false, errorCode }, { status });
}

export async function POST(request: Request, { params }: RouteContext) {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return failure("AUTHENTICATION_REQUIRED", 401);
  }

  const { caseId } = await params;
  if (!UUID_PATTERN.test(caseId)) {
    return failure("INVALID_CASE_ID", 422);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return failure("INVALID_REJECTION_REASON", 422);
  }

  if (
    !body ||
    typeof body !== "object" ||
    Array.isArray(body) ||
    Object.keys(body).length !== 1 ||
    !("rejectionReasonCode" in body)
  ) {
    return failure("INVALID_REJECTION_REASON", 422);
  }

  const rejectionReasonCode =
    (body as { rejectionReasonCode?: unknown }).rejectionReasonCode;

  if (rejectionReasonCode !== REJECTION_REASON) {
    return failure("INVALID_REJECTION_REASON", 422);
  }

  const { data, error } = await supabase.rpc(
    "reject_representative_verification",
    {
      p_case_id: caseId,
      p_rejection_reason_code: rejectionReasonCode,
    },
  );

  if (error) {
    console.error("Representative verification rejection RPC failed.");
    return failure("INTERNAL_SERVER_ERROR", 500);
  }

  const result = data as RejectionResult | null;
  if (result?.success === true && result.case_id && result.status) {
    return NextResponse.json({
      success: true,
      caseId: result.case_id,
      status: result.status,
      ...(result.idempotent === true ? { idempotent: true } : {}),
    });
  }

  if (result?.success === false && result.error_code) {
    return failure(
      result.error_code,
      statusByErrorCode[result.error_code] ?? 500,
    );
  }

  return failure("INTERNAL_SERVER_ERROR", 500);
}
