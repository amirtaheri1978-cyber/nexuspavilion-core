import { NextResponse } from "next/server";

import {
  FRIENDLY_INVITE_IDENTITY_REQUIRED,
  parseInvitationAcceptInput,
  validateInvitationEnrollmentIdentity,
} from "@/lib/auth/invite-enrollment";
import {
  PROFESSIONAL_NAME_SYNC_ERROR,
  syncCurrentUserProfessionalNames,
  validateFounderJobTitle,
  validateProfessionalName,
} from "@/lib/auth/professional-names";
import { resolveRequestSiteUrl } from "@/lib/ops/public-site-url";
import { createClient } from "@/lib/supabase/server";

let SITE_URL = "";

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

    case "IDENTITY_REQUIRED":
      return redirectTo(
        `/invite/${token}?error=identity-required`,
      );

    default:
      return redirectTo(
        `/invite/${token}?error=accept-failed`,
      );
  }
}

export async function POST(request: Request) {
  try {
    SITE_URL = resolveRequestSiteUrl(request.url);
    const formData = await request.formData();
    const input = parseInvitationAcceptInput(formData);
    const token = input.token;
    const firstName = input.firstName;
    const lastName = input.lastName;
    const jobTitle = input.jobTitle;

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

    const firstNameLengthError = validateProfessionalName(
      firstName,
      "First name",
      { required: false },
    );
    const lastNameLengthError = validateProfessionalName(
      lastName,
      "Last name",
      { required: false },
    );
    const jobTitleError = validateFounderJobTitle(jobTitle, {
      required: true,
    });

    if (firstNameLengthError || lastNameLengthError || jobTitleError) {
      console.warn("Invitation acceptance identity validation failed.", {
        userId: user.id,
        reason: FRIENDLY_INVITE_IDENTITY_REQUIRED,
      });
      return getFailureRedirect(token, "IDENTITY_REQUIRED");
    }

    const nameSync = await syncCurrentUserProfessionalNames(supabase, {
      firstName,
      lastName,
      requireNames: true,
    });

    if (!nameSync.ok) {
      console.warn("Invitation acceptance name sync failed.", {
        userId: user.id,
        reason: nameSync.error || PROFESSIONAL_NAME_SYNC_ERROR,
      });
      return getFailureRedirect(token, "IDENTITY_REQUIRED");
    }

    const identityErrors = validateInvitationEnrollmentIdentity({
      firstName: nameSync.firstName ?? "",
      lastName: nameSync.lastName ?? "",
      jobTitle,
    });

    if (
      identityErrors.firstNameError ||
      identityErrors.lastNameError ||
      identityErrors.jobTitleError
    ) {
      return getFailureRedirect(token, "IDENTITY_REQUIRED");
    }

    const { data, error } = await supabase.rpc(
      "accept_organization_invitation",
      {
        invitation_token: token,
        p_job_title: jobTitle || null,
      },
    );

    if (error) {
      console.error(
        "Invitation acceptance RPC failed.",
        {
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
          userId: user.id,
          errorCode: result?.error_code,
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
