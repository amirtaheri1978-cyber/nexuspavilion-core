import * as Sentry from "@sentry/nextjs";

import {
  getSentryErrorTrackingOptions,
  resolveSentryDsn,
} from "@/lib/ops/sentry-error-tracking";

Sentry.init(
  getSentryErrorTrackingOptions(
    resolveSentryDsn(process.env.SENTRY_DSN, process.env.NEXT_PUBLIC_SENTRY_DSN),
  ),
);
