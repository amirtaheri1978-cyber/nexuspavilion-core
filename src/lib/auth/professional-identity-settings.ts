import {
  JOB_TITLE_MAX_LENGTH,
  PROFESSIONAL_NAME_SYNC_ERROR,
  PROFESSIONAL_NAME_UNAUTHENTICATED_ERROR,
  normalizeJobTitle,
  normalizeProfessionalName,
  validateFounderJobTitle,
  validateProfessionalName,
} from "@/lib/auth/professional-names";

export const FRIENDLY_IDENTITY_SAVE_FAILED =
  "We could not save your professional identity. Please review your details and try again.";

export const FRIENDLY_IDENTITY_NO_ACTIVE_MEMBERSHIP =
  "An active workspace membership is required to update your job title.";

export const FRIENDLY_IDENTITY_AMBIGUOUS_WORKSPACE =
  "Your job title cannot be updated while multiple active workspace memberships exist. Contact a workspace administrator.";

export const FRIENDLY_IDENTITY_JOB_TITLE_TOO_LONG =
  `Job title must not exceed ${JOB_TITLE_MAX_LENGTH} characters.`;

export type ProfessionalIdentitySaveInput = {
  firstName: string;
  lastName: string;
  jobTitle: string;
};

export type OwnJobTitleRpcArgs = {
  p_job_title: string | null;
};

export function parseProfessionalIdentitySaveInput(
  source: Record<string, unknown>,
): ProfessionalIdentitySaveInput {
  return {
    firstName: normalizeProfessionalName(source.firstName),
    lastName: normalizeProfessionalName(source.lastName),
    jobTitle: normalizeJobTitle(source.jobTitle),
  };
}

export function validateProfessionalIdentitySaveInput(
  input: ProfessionalIdentitySaveInput,
) {
  return {
    firstNameError: validateProfessionalName(input.firstName, "First name", {
      required: true,
    }),
    lastNameError: validateProfessionalName(input.lastName, "Last name", {
      required: true,
    }),
    jobTitleError: validateFounderJobTitle(input.jobTitle, {
      required: false,
    }),
  };
}

export function buildOwnJobTitleRpcArgs(
  jobTitle: string,
): OwnJobTitleRpcArgs {
  return {
    p_job_title: jobTitle || null,
  };
}

export function getFriendlyProfessionalIdentityError(
  errorCode: string | null | undefined,
  fallbackMessage?: string | null,
) {
  switch (errorCode) {
    case "UNAUTHENTICATED":
      return PROFESSIONAL_NAME_UNAUTHENTICATED_ERROR;
    case "NO_ACTIVE_MEMBERSHIP":
      return FRIENDLY_IDENTITY_NO_ACTIVE_MEMBERSHIP;
    case "AMBIGUOUS_WORKSPACE":
      return FRIENDLY_IDENTITY_AMBIGUOUS_WORKSPACE;
    case "JOB_TITLE_TOO_LONG":
      return FRIENDLY_IDENTITY_JOB_TITLE_TOO_LONG;
    case "NAME_SYNC_FAILED":
      return fallbackMessage || PROFESSIONAL_NAME_SYNC_ERROR;
    default:
      return FRIENDLY_IDENTITY_SAVE_FAILED;
  }
}
