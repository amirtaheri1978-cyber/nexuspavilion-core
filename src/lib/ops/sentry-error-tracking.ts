/**
 * Shared Sentry error-tracking options for Task 15-01.
 * Observational only — missing DSN / provider failure must remain fail-open.
 */

export type SentryErrorTrackingInitOptions = {
  dsn: string | undefined;
  tracesSampleRate: number;
  sendDefaultPii: false;
  enableLogs: false;
  dataCollection: {
    userInfo: false;
    cookies: false;
    httpHeaders: {
      request: false;
      response: false;
    };
    httpBodies: [];
    urlQueryParams: false;
    graphQL: {
      document: false;
      variables: false;
    };
    genAI: {
      inputs: false;
      outputs: false;
    };
    databaseQueryData: false;
    stackFrameVariables: false;
    frameContextLines: 0;
  };
};

export function resolveSentryDsn(
  preferred?: string | null,
  fallback?: string | null,
): string | undefined {
  const candidate = preferred?.trim() || fallback?.trim() || "";
  return candidate.length > 0 ? candidate : undefined;
}

/**
 * Sanitize request paths before they are forwarded to Sentry.
 * Strips query/hash and redacts invitation token path segments only.
 * Does not rewrite application URLs — Sentry reporting representation only.
 */
export function sanitizeSentryRequestPath(path: string): string {
  if (typeof path !== "string") {
    return "/";
  }

  const withoutQueryOrHash = path.split(/[?#]/, 2)[0] || "/";
  const pathname = withoutQueryOrHash.startsWith("/")
    ? withoutQueryOrHash
    : `/${withoutQueryOrHash}`;

  // RFQ Invitation: /rfq/invite/[token] — distinct from Workspace Invitation.
  const rfqInviteMatch = pathname.match(/^(\/rfq\/invite\/)[^/]+(.*)$/);
  if (rfqInviteMatch) {
    return `${rfqInviteMatch[1]}[redacted]${rfqInviteMatch[2]}`;
  }

  // Workspace / Organization Invitation: /invite/[token].
  const workspaceInviteMatch = pathname.match(/^(\/invite\/)[^/]+(.*)$/);
  if (workspaceInviteMatch) {
    return `${workspaceInviteMatch[1]}[redacted]${workspaceInviteMatch[2]}`;
  }

  return pathname;
}

export function getSentryErrorTrackingOptions(
  dsn: string | undefined,
): SentryErrorTrackingInitOptions {
  return {
    dsn,
    // Task 15-01: error capture only — no performance tracing.
    tracesSampleRate: 0,
    sendDefaultPii: false,
    enableLogs: false,
    dataCollection: {
      userInfo: false,
      cookies: false,
      httpHeaders: {
        request: false,
        response: false,
      },
      httpBodies: [],
      urlQueryParams: false,
      graphQL: {
        document: false,
        variables: false,
      },
      genAI: {
        inputs: false,
        outputs: false,
      },
      databaseQueryData: false,
      stackFrameVariables: false,
      frameContextLines: 0,
    },
  };
}
