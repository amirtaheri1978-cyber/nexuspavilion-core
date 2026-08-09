import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const ALLOWED_STATUSES = new Set([
  "unverified",
  "pending_review",
  "verified",
  "rejected",
  "invalidated",
]);

type StatusResult = {
  success?: boolean;
  status?: unknown;
  error_code?: unknown;
};

function failure(errorCode: string, status: number) {
  return NextResponse.json({ success: false, errorCode }, { status });
}

export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return failure("AUTHENTICATION_REQUIRED", 401);
  }

  const { searchParams } = new URL(request.url);
  const companyId = searchParams.get("companyId");

  if (
    searchParams.size !== 1 ||
    !companyId ||
    !UUID_PATTERN.test(companyId)
  ) {
    return failure("INVALID_COMPANY_ID", 422);
  }

  const { data, error } = await supabase.rpc(
    "get_company_representative_verification_status",
    { p_company_id: companyId },
  );

  if (error) {
    console.error("Representative verification status RPC failed.");
    return failure("INTERNAL_SERVER_ERROR", 500);
  }

  const result = data as StatusResult | null;

  if (
    result?.success === true &&
    typeof result.status === "string" &&
    ALLOWED_STATUSES.has(result.status)
  ) {
    return NextResponse.json({ success: true, status: result.status });
  }

  if (
    result?.success === false &&
    typeof result.error_code === "string" &&
    result.error_code === "AUTHENTICATION_REQUIRED"
  ) {
    return failure("AUTHENTICATION_REQUIRED", 401);
  }

  if (
    result?.success === false &&
    typeof result.error_code === "string" &&
    result.error_code === "STATUS_NOT_AUTHORIZED"
  ) {
    return failure("STATUS_NOT_AUTHORIZED", 403);
  }

  return failure("INTERNAL_SERVER_ERROR", 500);
}
