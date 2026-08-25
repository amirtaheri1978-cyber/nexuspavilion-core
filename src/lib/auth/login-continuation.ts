export const DEFAULT_POST_LOGIN_PATH = "/dashboard";
export const DEFAULT_POST_COMPANY_CREATE_PATH = "/company/settings";
export const COMPANY_SETUP_PATH = "/create-company";

const ATTENTION_AUTH_STATUS = "attention";

const SAFE_LOGIN_STATUS_MESSAGES = [
  "Your secure workspace session has expired. Please sign in again to continue.",
  "This secure authentication link is incomplete. Please request a new link or sign in again.",
  "This secure authentication link has expired or is no longer valid. Please request a new link.",
  "We could not complete your secure sign-in. Please try again.",
] as const;

export function isInternalNextPath(
  next: string | null | undefined,
): next is string {
  if (!next) return false;
  if (!next.startsWith("/")) return false;
  if (next.startsWith("//")) return false;
  if (next.includes("\\")) return false;

  return true;
}

export function getSafeNextPath(next: string | null | undefined) {
  if (!isInternalNextPath(next)) return DEFAULT_POST_LOGIN_PATH;

  return next;
}

export function getSignupHref(next: string | null | undefined) {
  const safeNextPath = getSafeNextPath(next);

  if (safeNextPath === DEFAULT_POST_LOGIN_PATH) {
    return "/signup";
  }

  return `/signup?next=${encodeURIComponent(safeNextPath)}`;
}

function isCompanySetupPath(path: string) {
  return path === COMPANY_SETUP_PATH || path.startsWith(`${COMPANY_SETUP_PATH}?`);
}

export function getCompanyOnboardingPath(next: string | null | undefined) {
  const safeNextPath = getSafeNextPath(next);

  if (safeNextPath === DEFAULT_POST_LOGIN_PATH) {
    return COMPANY_SETUP_PATH;
  }

  if (isCompanySetupPath(safeNextPath)) {
    return safeNextPath;
  }

  return getSafeNextPath(
    `${COMPANY_SETUP_PATH}?next=${encodeURIComponent(safeNextPath)}`,
  );
}

export function getPostCompanyCreatePath(
  next: string | null | undefined,
  fallback: string = DEFAULT_POST_COMPANY_CREATE_PATH,
) {
  if (!isInternalNextPath(next)) {
    return fallback;
  }

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
