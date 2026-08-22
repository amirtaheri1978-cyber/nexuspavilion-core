const GITHUB_DEV_HOST_SUFFIX = ".github.dev";

export const PUBLIC_SITE_URL_UNCONFIGURED =
  "Public site URL is not configured.";

/**
 * Canonical public origin for emails, invite links, and auth redirects.
 * Returns null when unset or unsafe. Never falls back to a leftover
 * Codespace / github.dev host.
 */
export function getPublicSiteUrl(
  value: string | undefined | null = process.env.NEXT_PUBLIC_SITE_URL,
): string | null {
  const trimmed = String(value ?? "")
    .trim()
    .replace(/\/+$/, "");

  if (!trimmed) {
    return null;
  }

  try {
    const parsed = new URL(trimmed);

    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return null;
    }

    if (parsed.hostname.endsWith(GITHUB_DEV_HOST_SUFFIX)) {
      return null;
    }

    return trimmed;
  } catch {
    return null;
  }
}

export function resolveRequestSiteUrl(requestUrl: string): string {
  return getPublicSiteUrl() ?? new URL(requestUrl).origin;
}

export function joinPublicSitePath(pathname: string): string | null {
  const origin = getPublicSiteUrl();

  if (!origin) {
    return null;
  }

  const path = pathname.startsWith("/") ? pathname : `/${pathname}`;
  return `${origin}${path}`;
}
