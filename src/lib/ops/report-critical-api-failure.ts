import "server-only";

import * as Sentry from "@sentry/nextjs";

import { sanitizeSentryRequestPath } from "@/lib/ops/sentry-error-tracking";

/**
 * Task 15-02 — report unexpected critical API failures that are caught and
 * converted into 5xx / failure redirects (bypassing 15-01 onRequestError).
 *
 * Observational only. Never rethrow. Never log raw exception text or objects.
 */

export const CRITICAL_API_DOMAINS = [
  "quotation",
  "contract_award",
  "rfq",
  "rfq_invitation",
  "workspace_invitation",
  "company_workspace",
  "contact",
  "rfi",
  "addendum",
] as const;

export type CriticalApiDomain = (typeof CRITICAL_API_DOMAINS)[number];

export type ReportCriticalApiFailureInput = {
  domain: CriticalApiDomain;
  /** Static operation identifier, e.g. "submit" */
  operation: string;
  /** Static failure stage, e.g. "outer_catch" */
  failureStage: string;
  /** Static App Router path, e.g. "/api/quotes" */
  route: string;
  method: string;
  /** Used only to derive sanitized name/code — never logged raw */
  error: unknown;
};

export type SafeCriticalApiFailureContext = {
  domain: CriticalApiDomain;
  operation: string;
  failure_stage: string;
  route: string;
  method: string;
  error_name: string;
  provider_code: string | null;
};

const MAX_TOKEN_LENGTH = 64;
const SAFE_TOKEN = /^[A-Za-z][A-Za-z0-9_.-]{0,63}$/;
const SAFE_PROVIDER_CODE = /^[A-Za-z0-9][A-Za-z0-9_.-]{0,63}$/;

function truncate(value: string, max: number): string {
  return value.length <= max ? value : value.slice(0, max);
}

function normalizeStaticToken(
  value: string,
  fallback: string,
): string {
  const trimmed = value.trim();
  if (SAFE_TOKEN.test(trimmed)) {
    return truncate(trimmed, MAX_TOKEN_LENGTH);
  }

  const cleaned = trimmed
    .replace(/[^A-Za-z0-9_.-]+/g, "_")
    .replace(/^_+|_+$/g, "");

  if (cleaned.length === 0) {
    return fallback;
  }

  const withLetter = /^[A-Za-z]/.test(cleaned) ? cleaned : `x_${cleaned}`;
  return truncate(withLetter, MAX_TOKEN_LENGTH);
}

export function normalizeCriticalErrorName(error: unknown): string {
  let name: string | undefined;

  if (error instanceof Error && typeof error.name === "string") {
    name = error.name;
  } else if (error && typeof error === "object") {
    const record = error as { name?: unknown; constructor?: { name?: unknown } };
    if (typeof record.name === "string") {
      name = record.name;
    } else if (typeof record.constructor?.name === "string") {
      name = record.constructor.name;
    }
  }

  if (!name || name === "Object" || name === "Error") {
    if (error instanceof Error) {
      return "Error";
    }
    return "UnknownError";
  }

  return normalizeStaticToken(name, "UnknownError");
}

/**
 * Retain only short code-like provider codes. Reject prose / messages.
 */
export function normalizeCriticalProviderCode(error: unknown): string | null {
  if (!error || typeof error !== "object") {
    return null;
  }

  const record = error as { code?: unknown };
  if (typeof record.code !== "string") {
    return null;
  }

  const trimmed = record.code.trim();
  if (!SAFE_PROVIDER_CODE.test(trimmed)) {
    return null;
  }

  // Reject values that look like prose (spaces already banned) or long SQL-ish text.
  if (trimmed.includes(" ") || trimmed.length > MAX_TOKEN_LENGTH) {
    return null;
  }

  return truncate(trimmed, MAX_TOKEN_LENGTH);
}

export function buildSafeCriticalApiFailureContext(
  input: ReportCriticalApiFailureInput,
): SafeCriticalApiFailureContext {
  return {
    domain: input.domain,
    operation: normalizeStaticToken(input.operation, "operation"),
    failure_stage: normalizeStaticToken(input.failureStage, "failure_stage"),
    route: sanitizeSentryRequestPath(input.route),
    method: normalizeStaticToken(input.method.toUpperCase(), "METHOD"),
    error_name: normalizeCriticalErrorName(input.error),
    provider_code: normalizeCriticalProviderCode(input.error),
  };
}

function captureSanitizedCriticalFailure(
  context: SafeCriticalApiFailureContext,
): void {
  Sentry.withScope((scope) => {
    scope.setTag("nexus.domain", context.domain);
    scope.setTag("nexus.operation", context.operation);
    scope.setTag("nexus.failure_stage", context.failure_stage);
    scope.setContext("critical_api_failure", {
      route: context.route,
      method: context.method,
      error_name: context.error_name,
      provider_code: context.provider_code,
    });
    Sentry.captureMessage(
      `Critical API failure: ${context.domain}.${context.operation}`,
      "error",
    );
  });
}

/**
 * Report a caught critical API failure. Call only when returning 5xx / failure
 * redirect — never before rethrowing.
 */
export function reportCriticalApiFailure(
  input: ReportCriticalApiFailureInput,
): void {
  const context = buildSafeCriticalApiFailureContext(input);

  console.error("[critical-api-failure]", context);

  try {
    captureSanitizedCriticalFailure(context);
  } catch {
    // Fail-open: observability must never change API behavior.
  }
}
