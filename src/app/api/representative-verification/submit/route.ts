import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const statusByErrorCode: Record<string, number> = {
  AUTHENTICATION_REQUIRED: 401,
  SUBMISSION_NOT_AUTHORIZED: 403,
  DUPLICATE_PENDING_CASE: 409,
  ALREADY_VERIFIED: 409,
  OWNERSHIP_STATE_INCONSISTENT: 422,
};

type SubmitResult = {
  success?: boolean;
  case_id?: string;
  status?: string;
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

export async function POST(request: Request) {
  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return failure("AUTHENTICATION_REQUIRED", 401);
  }

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return failure("INVALID_COMPANY_ID", 422);
  }

  const companyId =
    body && typeof body === "object" && !Array.isArray(body)
      ? (body as { companyId?: unknown }).companyId
      : undefined;

  if (typeof companyId !== "string" || !UUID_PATTERN.test(companyId)) {
    return failure("INVALID_COMPANY_ID", 422);
  }

  const { data, error } = await supabase.rpc(
    "submit_representative_verification",
    {
      p_company_id: companyId,
    },
  );

  if (error) {
    console.error("Representative verification submission RPC failed.");

    return failure("INTERNAL_SERVER_ERROR", 500);
  }

  const result = data as SubmitResult | null;

  if (result?.success === true && result.case_id && result.status) {
    return NextResponse.json({
      success: true,
      caseId: result.case_id,
      status: result.status,
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