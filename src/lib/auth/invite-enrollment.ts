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
