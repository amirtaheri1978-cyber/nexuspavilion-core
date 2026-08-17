export const DEFAULT_POST_LOGIN_PATH = "/dashboard";

const ATTENTION_AUTH_STATUS = "attention";

const SAFE_LOGIN_STATUS_MESSAGES = [
  "Your secure workspace session has expired. Please sign in again to continue.",
  "This secure authentication link is incomplete. Please request a new link or sign in again.",
  "This secure authentication link has expired or is no longer valid. Please request a new link.",
  "We could not complete your secure sign-in. Please try again.",
] as const;

export function getSafeNextPath(next: string | null | undefined) {
  if (!next) return DEFAULT_POST_LOGIN_PATH;
  if (!next.startsWith("/")) return DEFAULT_POST_LOGIN_PATH;
  if (next.startsWith("//")) return DEFAULT_POST_LOGIN_PATH;
  if (next.includes("\\")) return DEFAULT_POST_LOGIN_PATH;

  return next;
}

export function getSafeLoginStatusMessage(
  authStatus: string | null | undefined,
  message: string | null | undefined,
) {
  if (authStatus !== ATTENTION_AUTH_STATUS) {
    return null;
  }

  if (!message) {
    return null;
  }

  if (
    SAFE_LOGIN_STATUS_MESSAGES.includes(
      message as (typeof SAFE_LOGIN_STATUS_MESSAGES)[number],
    )
  ) {
    return message;
  }

  return null;
}
