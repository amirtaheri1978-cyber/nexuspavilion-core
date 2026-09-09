import * as Sentry from "@sentry/nextjs";
import type { Instrumentation } from "next/dist/server/instrumentation/types";

import { sanitizeSentryRequestPath } from "@/lib/ops/sentry-error-tracking";

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("./sentry.server.config");
  }

  if (process.env.NEXT_RUNTIME === "edge") {
    await import("./sentry.edge.config");
  }
}

// Captures unhandled Server Component / Route Handler / Server Action / middleware errors.
// Sanitize invitation-token path segments and query/hash before provider capture.
export const onRequestError: Instrumentation.onRequestError = (
  error,
  request,
  context,
) => {
  Sentry.captureRequestError(
    error,
    {
      path: sanitizeSentryRequestPath(request.path),
      method: request.method,
      headers: request.headers,
    },
    context,
  );
};
