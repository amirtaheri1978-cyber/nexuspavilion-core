import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ||
  "http://localhost:3000";

type AcceptInvitationResponse = {
  success?: boolean;
  error_code?: string;
  error_message?: string;
};

function redirectTo(path: string) {
  return NextResponse.redirect(
    new URL(path, SITE_URL),
  );
}

function getFailureRedirect(
  token: string,
  errorCode: string | undefined,
) {
  switch (errorCode) {
    case "UNAUTHENTICATED":
      return redirectTo(
        `/login?next=${encodeURIComponent(
          `/invite/${token}`,
        )}`,
      );

    case "RECIPIENT_MISMATCH":
      return redirectTo(
        `/invite/${token}?error=recipient-mismatch`,
      );

    case "INVITATION_EXPIRED":
      return redirectTo(
        `/invite/${token}?error=expired`,
      );

    case "INVITATION_NOT_PENDING":
      return redirectTo(
        `/invite/${token}?error=not-pending`,
      );

    case "INVITATION_NOT_FOUND":
    case "INVALID_TOKEN":
      return redirectTo(
        "/dashboard?error=invalid-invitation",
      );

    default:
      return redirectTo(
        `/invite/${token}?error=accept-failed`,
      );
  }
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();

    const token = String(
      formData.get("token") || "",
    ).trim();

    if (!token) {
      return redirectTo(
        "/dashboard?error=invalid-invitation",
      );
    }

    const supabase = await createClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return redirectTo(
        `/login?next=${encodeURIComponent(
          `/invite/${token}`,
        )}`,
      );
    }

    const { data, error } = await supabase.rpc(
      "accept_organization_invitation",
      {
        invitation_token: token,
      },
    );

    if (error) {
      console.error(
        "Invitation acceptance RPC failed.",
        {
          token,
          userId: user.id,
          error,
        },
      );

      return redirectTo(
        `/invite/${token}?error=accept-failed`,
      );
    }

    const result =
      data as AcceptInvitationResponse | null;

    if (!result?.success) {
      console.warn(
        "Invitation acceptance was rejected.",
        {
          token,
          userId: user.id,
          errorCode: result?.error_code,
          errorMessage: result?.error_message,
        },
      );

      return getFailureRedirect(
        token,
        result?.error_code,
      );
    }

    return redirectTo("/dashboard");
  } catch (error) {
    console.error(
      "Unexpected invitation acceptance failure.",
      error,
    );

    return redirectTo(
      "/dashboard?error=invitation-acceptance-failed",
    );
  }
}