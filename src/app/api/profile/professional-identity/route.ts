import { NextResponse } from "next/server";

import {
  FRIENDLY_IDENTITY_SAVE_FAILED,
  buildOwnJobTitleRpcArgs,
  getFriendlyProfessionalIdentityError,
  parseProfessionalIdentitySaveInput,
  validateProfessionalIdentitySaveInput,
} from "@/lib/auth/professional-identity-settings";
import {
  PROFESSIONAL_NAME_SYNC_ERROR,
  PROFESSIONAL_NAME_UNAUTHENTICATED_ERROR,
  syncCurrentUserProfessionalNames,
} from "@/lib/auth/professional-names";
import { createClient } from "@/lib/supabase/server";

type JobTitleRpcResponse = {
  success?: boolean;
  error_code?: string;
  error_message?: string;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Record<string, unknown>;
    const input = parseProfessionalIdentitySaveInput(body);
    const validation = validateProfessionalIdentitySaveInput(input);

    if (
      validation.firstNameError ||
      validation.lastNameError ||
      validation.jobTitleError
    ) {
      return NextResponse.json(
        {
          error:
            validation.firstNameError ||
            validation.lastNameError ||
            validation.jobTitleError,
          firstNameError: validation.firstNameError,
          lastNameError: validation.lastNameError,
          jobTitleError: validation.jobTitleError,
        },
        { status: 400 },
      );
    }

    const supabase = await createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        { error: PROFESSIONAL_NAME_UNAUTHENTICATED_ERROR },
        { status: 401 },
      );
    }

    const nameSync = await syncCurrentUserProfessionalNames(supabase, {
      firstName: input.firstName,
      lastName: input.lastName,
      requireNames: true,
    });

    if (!nameSync.ok) {
      return NextResponse.json(
        {
          error:
            nameSync.error === PROFESSIONAL_NAME_UNAUTHENTICATED_ERROR
              ? PROFESSIONAL_NAME_UNAUTHENTICATED_ERROR
              : nameSync.error || PROFESSIONAL_NAME_SYNC_ERROR,
        },
        {
          status:
            nameSync.error === PROFESSIONAL_NAME_UNAUTHENTICATED_ERROR
              ? 401
              : 400,
        },
      );
    }

    const { data, error } = await supabase.rpc(
      "update_own_workspace_job_title",
      buildOwnJobTitleRpcArgs(input.jobTitle),
    );

    if (error) {
      console.error("Own workspace job title RPC failed.", {
        userId: user.id,
        error,
      });
      return NextResponse.json(
        { error: FRIENDLY_IDENTITY_SAVE_FAILED },
        { status: 500 },
      );
    }

    const result = data as JobTitleRpcResponse | null;

    if (!result?.success) {
      return NextResponse.json(
        {
          error: getFriendlyProfessionalIdentityError(
            result?.error_code,
            result?.error_message,
          ),
          errorCode: result?.error_code || null,
        },
        { status: 400 },
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Unexpected professional identity save failure.", error);

    return NextResponse.json(
      { error: FRIENDLY_IDENTITY_SAVE_FAILED },
      { status: 500 },
    );
  }
}
