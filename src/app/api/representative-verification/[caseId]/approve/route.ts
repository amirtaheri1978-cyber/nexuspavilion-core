import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const statusByErrorCode: Record<string, number> = {
  AUTHENTICATION_REQUIRED: 401,
  REVIEWER_NOT_AUTHORIZED: 403,
  CASE_NOT_FOUND: 404,
  CASE_NOT_PENDING: 409,
  CASE_INVALIDATED: 409,
};

type RouteContext = {
  params: Promise<{
    caseId: string;
  }>;
};

type ApprovalResult = {
  success?: boolean;
  case_id?: string;
  status?: string;
  idempotent?: boolean;
  error_code?: string;
};

function failure(errorCode: string, status: number) {
  return NextResponse.json(
    {
      success: false,
      errorCode,
    },
    {
      status,
    },
  );
}

export async function POST(_request: Request, { params }: RouteContext) {
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

  const { data, error } = await supabase.rpc(
    "approve_representative_verification",
    {
      p_case_id: caseId,
    },
  );

  if (error) {
    console.error("Representative verification approval RPC failed.");

    return failure("INTERNAL_SERVER_ERROR", 500);
  }

  const result = data as ApprovalResult | null;

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