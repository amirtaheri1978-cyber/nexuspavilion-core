import { NextRequest, NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        { error: "Unauthorized." },
        { status: 401 }
      );
    }

    const body = await request.json();

    const {
      transfer_request_id,
      rejection_reason = null,
    } = body;

    if (!transfer_request_id) {
      return NextResponse.json(
        {
          error: "transfer_request_id is required.",
        },
        {
          status: 400,
        }
      );
    }

    const { data, error } = await supabase.rpc(
      "reject_company_ownership_transfer",
      {
        p_transfer_request_id: transfer_request_id,
        p_rejection_reason: rejection_reason,
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
      return NextResponse.json(
        {
          error: data?.error_message,
          code: data?.error_code,
        },
        {
          status: 400,
        }
      );
    }

    return NextResponse.json(data);
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