import { NextRequest, NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

type RequestOwnershipTransferBody = {
  target_user_id: string;
  previous_owner_next_role?: "admin" | "member" | "viewer";
  transfer_reason?: string;
  expires_in_hours?: number;
};

const statusByErrorCode: Record<string, number> = {
  UNAUTHENTICATED: 401,

  TARGET_NOT_FOUND: 404,

  TARGET_NOT_ACTIVE: 400,
  TARGET_ALREADY_OWNER: 400,
  SELF_TRANSFER_NOT_ALLOWED: 400,

  INVALID_NEXT_ROLE: 400,
  INVALID_EXPIRATION: 400,
  INVALID_TRANSFER_REASON: 400,

  OWNER_MEMBERSHIP_REQUIRED: 403,

  OWNER_STATE_INCONSISTENT: 409,
  PENDING_TRANSFER_EXISTS: 409,

  REQUEST_CREATION_FAILED: 500,
};

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        {
          error: "Unauthorized.",
        },
        {
          status: 401,
        }
      );
    }

    let body: RequestOwnershipTransferBody;

    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        {
          error: "Invalid request body.",
        },
        {
          status: 400,
        }
      );
    }

    const {
      target_user_id,
      previous_owner_next_role = "admin",
      transfer_reason = null,
      expires_in_hours = 72,
    } = body;

    if (
      typeof target_user_id !== "string" ||
      target_user_id.trim().length === 0
    ) {
      return NextResponse.json(
        {
          error: "target_user_id is required.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      !["admin", "member", "viewer"].includes(
        previous_owner_next_role
      )
    ) {
      return NextResponse.json(
        {
          error:
            "previous_owner_next_role must be admin, member, or viewer.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      typeof expires_in_hours !== "number" ||
      !Number.isInteger(expires_in_hours)
    ) {
      return NextResponse.json(
        {
          error: "expires_in_hours must be an integer.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      transfer_reason !== null &&
      transfer_reason !== undefined &&
      typeof transfer_reason !== "string"
    ) {
      return NextResponse.json(
        {
          error: "transfer_reason must be a string.",
        },
        {
          status: 400,
        }
      );
    }

    const { data, error } = await supabase.rpc(
      "request_company_ownership_transfer",
      {
        target_user_id: target_user_id.trim(),
        previous_owner_next_role,
        transfer_reason,
        expires_in_hours,
      }
    );

    if (error) {
      console.error(error);

      return NextResponse.json(
        {
          error: error.message,
        },
        {
          status: 500,
        }
      );
    }

    if (!data?.success) {
      const status =
        statusByErrorCode[data.error_code] ?? 400;

      return NextResponse.json(
        {
          error: data.error_message,
          code: data.error_code,
        },
        {
          status,
        }
      );
    }

    return NextResponse.json(data, {
      status: 200,
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      {
        error: "Internal server error.",
      },
      {
        status: 500,
      }
    );
  }
}