import {
  normalizeJobTitle,
  normalizeProfessionalName,
  validateFounderJobTitle,
  validateProfessionalName,
} from "@/lib/auth/professional-names";

export const FRIENDLY_INVITE_SIGNIN_INVALID_CREDENTIALS =
  "The email or password entered does not match an active Nexus Pavilion account.";
export const FRIENDLY_INVITE_SIGNIN_EMAIL_UNCONFIRMED =
  "Please verify your email address before signing in.";
export const FRIENDLY_INVITE_SIGNIN_RATE_LIMIT =
  "Too many sign-in attempts. Please wait a moment and try again.";
export const FRIENDLY_INVITE_SIGNIN_NETWORK =
  "We could not reach the authentication service. Please check your connection and try again.";
export const FRIENDLY_INVITE_SIGNIN_GENERIC =
  "We could not sign you in securely. Please review your details and try again.";
export const FRIENDLY_INVITE_ACCEPT_FAILED =
  "Workspace access could not be activated. Return to the invitation to continue.";
export const FRIENDLY_INVITE_IDENTITY_REQUIRED =
  "Please enter your first name, last name, and job title to complete enrollment.";

export const INVITE_ACCEPT_AUTHORITY_FIELD_NAMES = [
  "userId",
  "companyId",
  "role",
  "workspaceRole",
  "procurementFunction",
  "membershipType",
] as const;

export function getInvitationRecoveryPath(token: string) {
  return `/invite/${token}`;
}

export function getFriendlyInviteSignInError(
  message: string | null | undefined,
) {
  const normalized = (message || "").toLowerCase();

  if (normalized.includes("invalid login credentials")) {
    return FRIENDLY_INVITE_SIGNIN_INVALID_CREDENTIALS;
  }

  if (normalized.includes("email not confirmed")) {
    return FRIENDLY_INVITE_SIGNIN_EMAIL_UNCONFIRMED;
  }

  if (normalized.includes("too many requests")) {
    return FRIENDLY_INVITE_SIGNIN_RATE_LIMIT;
  }

  if (normalized.includes("network") || normalized.includes("fetch")) {
    return FRIENDLY_INVITE_SIGNIN_NETWORK;
  }

  return FRIENDLY_INVITE_SIGNIN_GENERIC;
}

export function isSuccessfulInvitationAcceptDestination(
  url: string | null | undefined,
) {
  if (!url) return false;

  try {
    const parsed = new URL(url, "http://localhost");
    return (
      parsed.pathname === "/dashboard" && !parsed.searchParams.has("error")
    );
  } catch {
    return false;
  }
}

export type InvitationAcceptInput = {
  token: string;
  firstName: string;
  lastName: string;
  jobTitle: string;
};

function readAcceptValue(
  source: FormData | Record<string, unknown>,
  key: string,
) {
  if (source instanceof FormData) {
    return source.get(key);
  }

  return source[key];
}

export function parseInvitationAcceptInput(
  source: FormData | Record<string, unknown>,
): InvitationAcceptInput {
  return {
    token: String(readAcceptValue(source, "token") ?? "").trim(),
    firstName: normalizeProfessionalName(readAcceptValue(source, "firstName")),
    lastName: normalizeProfessionalName(readAcceptValue(source, "lastName")),
    jobTitle: normalizeJobTitle(readAcceptValue(source, "jobTitle")),
  };
}

export function buildInviteSignupTransitMetadata(
  firstName: string,
  lastName: string,
) {
  return {
    first_name: firstName,
    last_name: lastName,
  };
}

export function buildInvitationAcceptRpcArgs(
  token: string,
  jobTitle: string,
) {
  return {
    invitation_token: token,
    p_job_title: jobTitle || null,
  };
}

export function invitationAcceptInputContainsAuthorityFields(
  source: FormData | Record<string, unknown>,
) {
  return INVITE_ACCEPT_AUTHORITY_FIELD_NAMES.some((field) => {
    const value = readAcceptValue(source, field);
    return value != null && String(value) !== "";
  });
}

export function validateInvitationEnrollmentIdentity({
  firstName,
  lastName,
  jobTitle,
}: {
  firstName: string;
  lastName: string;
  jobTitle: string;
}) {
  return {
    firstNameError: validateProfessionalName(firstName, "First name", {
      required: true,
    }),
    lastNameError: validateProfessionalName(lastName, "Last name", {
      required: true,
    }),
    jobTitleError: validateFounderJobTitle(jobTitle, { required: true }),
  };
}
