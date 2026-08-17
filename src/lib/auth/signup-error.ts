export const FRIENDLY_SIGNUP_ALREADY_REGISTERED =
  "An account already exists for this email address. Please sign in or use password recovery.";
export const FRIENDLY_SIGNUP_PASSWORD =
  "Please choose a stronger password that meets the account security requirements.";
export const FRIENDLY_SIGNUP_EMAIL =
  "Please enter a valid work email address.";
export const FRIENDLY_SIGNUP_RATE_LIMIT =
  "Too many account creation attempts. Please wait a moment and try again.";
export const FRIENDLY_SIGNUP_NETWORK =
  "We could not reach the secure account service. Please check your connection and try again.";
export const FRIENDLY_SIGNUP_GENERIC =
  "We could not create your account securely. Please review your details and try again.";

export function isExistingAccountSignupError(
  message: string | null | undefined,
) {
  const normalized = (message || "").toLowerCase();

  return (
    normalized.includes("already registered") ||
    normalized.includes("already exists") ||
    normalized.includes("already")
  );
}

export function getFriendlySignupError(
  message: string | null | undefined,
) {
  const normalized = (message || "").toLowerCase();

  if (
    normalized.includes("already registered") ||
    normalized.includes("already exists")
  ) {
    return FRIENDLY_SIGNUP_ALREADY_REGISTERED;
  }

  if (normalized.includes("password")) {
    return FRIENDLY_SIGNUP_PASSWORD;
  }

  if (normalized.includes("email")) {
    return FRIENDLY_SIGNUP_EMAIL;
  }

  if (normalized.includes("rate") || normalized.includes("too many")) {
    return FRIENDLY_SIGNUP_RATE_LIMIT;
  }

  if (normalized.includes("network") || normalized.includes("fetch")) {
    return FRIENDLY_SIGNUP_NETWORK;
  }

  return FRIENDLY_SIGNUP_GENERIC;
}
