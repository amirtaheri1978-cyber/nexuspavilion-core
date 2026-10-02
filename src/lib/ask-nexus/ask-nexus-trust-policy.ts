/**
 * Ask Nexus trust policy — domain-neutral interaction safety only.
 *
 * This module never performs state changes, never constructs routes, and never
 * infers permissionGranted from caller identity, UI copy, or model output.
 * Existing domain authorization remains authoritative at execution time.
 */

export type AskNexusInteractionKind =
  | "explain"
  | "navigate"
  | "advise"
  | "consequential_action";

export type AskNexusTrustPolicyStatus =
  | "informational"
  | "navigation_ready"
  | "confirmation_required"
  | "permission_denied"
  | "eligible_for_authorized_execution"
  | "navigation_unavailable";

export type AskNexusTrustPolicyInput = {
  kind: AskNexusInteractionKind;
  permissionGranted?: boolean;
  explicitConfirmation?: boolean;
  authorizedNavigationHref?: string | null;
};

export type AskNexusTrustPolicyResult = {
  kind: AskNexusInteractionKind;
  allowed: boolean;
  status: AskNexusTrustPolicyStatus;
  requiresConfirmation: boolean;
  requiresPermission: boolean;
  requiresExecutionRevalidation: boolean;
  authorizedNavigationHref: string | null;
  nonBinding: boolean;
};

function normalizedAuthorizedHref(
  value: string | null | undefined,
): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function informationalResult(
  kind: Extract<AskNexusInteractionKind, "explain" | "advise">,
): AskNexusTrustPolicyResult {
  return {
    kind,
    allowed: true,
    status: "informational",
    requiresConfirmation: false,
    requiresPermission: false,
    requiresExecutionRevalidation: false,
    authorizedNavigationHref: null,
    nonBinding: true,
  };
}

/**
 * Resolve Ask Nexus interaction trust posture from caller-supplied signals only.
 * Does not execute actions or authorize domain mutations.
 */
export function resolveAskNexusTrustPolicy(
  input: AskNexusTrustPolicyInput,
): AskNexusTrustPolicyResult {
  switch (input.kind) {
    case "explain":
      return informationalResult("explain");

    case "advise":
      return informationalResult("advise");

    case "navigate": {
      const authorizedNavigationHref = normalizedAuthorizedHref(
        input.authorizedNavigationHref,
      );

      if (!authorizedNavigationHref) {
        return {
          kind: "navigate",
          allowed: false,
          status: "navigation_unavailable",
          requiresConfirmation: false,
          requiresPermission: false,
          requiresExecutionRevalidation: false,
          authorizedNavigationHref: null,
          nonBinding: true,
        };
      }

      return {
        kind: "navigate",
        allowed: true,
        status: "navigation_ready",
        requiresConfirmation: false,
        requiresPermission: false,
        requiresExecutionRevalidation: false,
        authorizedNavigationHref,
        nonBinding: true,
      };
    }

    case "consequential_action": {
      if (input.permissionGranted !== true) {
        return {
          kind: "consequential_action",
          allowed: false,
          status: "permission_denied",
          requiresConfirmation: false,
          requiresPermission: true,
          requiresExecutionRevalidation: true,
          authorizedNavigationHref: null,
          nonBinding: false,
        };
      }

      if (input.explicitConfirmation !== true) {
        return {
          kind: "consequential_action",
          allowed: false,
          status: "confirmation_required",
          requiresConfirmation: true,
          requiresPermission: true,
          requiresExecutionRevalidation: true,
          authorizedNavigationHref: null,
          nonBinding: false,
        };
      }

      return {
        kind: "consequential_action",
        allowed: true,
        status: "eligible_for_authorized_execution",
        requiresConfirmation: true,
        requiresPermission: true,
        requiresExecutionRevalidation: true,
        authorizedNavigationHref: null,
        nonBinding: false,
      };
    }

    default: {
      const exhaustive: never = input.kind;
      return exhaustive;
    }
  }
}
