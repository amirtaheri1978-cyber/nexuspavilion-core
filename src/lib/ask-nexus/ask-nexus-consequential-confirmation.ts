/**
 * Ask Nexus consequential confirmation — interaction-level gates only.
 *
 * Projects caller-supplied permission and explicit confirmation through
 * resolveAskNexusTrustPolicy. Never executes mutations, never revalidates
 * domain authorization, and never persists confirmation state.
 */

import { resolveAskNexusTrustPolicy } from "@/lib/ask-nexus/ask-nexus-trust-policy";

export type AskNexusConsequentialActionKind =
  | "deadline_change"
  | "submission"
  | "award"
  | "permission_change"
  | "other";

export type AskNexusConsequentialActionInput = {
  id: string;
  kind: AskNexusConsequentialActionKind;
  title: string;
  description: string;
  permissionGranted: boolean;
  explicitConfirmation: boolean;
};

export type AskNexusConsequentialConfirmationStatus =
  | "permission_denied"
  | "confirmation_required"
  | "eligible_for_authorized_execution";

export type AskNexusConsequentialConfirmation = {
  id: string;
  kind: AskNexusConsequentialActionKind;
  title: string;
  description: string;
  status: AskNexusConsequentialConfirmationStatus;
  allowed: boolean;
  requiresPermission: true;
  requiresConfirmation: true;
  requiresExecutionRevalidation: true;
  confirmed: boolean;
  nonBinding: false;
};

function normalizedText(value: string | null | undefined): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function mapConsequentialStatus(
  status: string,
): AskNexusConsequentialConfirmationStatus {
  switch (status) {
    case "permission_denied":
      return "permission_denied";
    case "confirmation_required":
      return "confirmation_required";
    case "eligible_for_authorized_execution":
      return "eligible_for_authorized_execution";
    default: {
      // Fail closed if trust policy returns an unexpected status.
      return "permission_denied";
    }
  }
}

/**
 * Resolve interaction-level confirmation for a consequential assistant action.
 * Returns null when id, title, or description is empty after trim.
 * Eligibility never executes the requested action.
 */
export function resolveAskNexusConsequentialConfirmation(
  input: AskNexusConsequentialActionInput,
): AskNexusConsequentialConfirmation | null {
  const id = normalizedText(input.id);
  const title = normalizedText(input.title);
  const description = normalizedText(input.description);

  if (!id || !title || !description) {
    return null;
  }

  const permissionGranted = input.permissionGranted === true;
  const explicitConfirmation = input.explicitConfirmation === true;

  const trust = resolveAskNexusTrustPolicy({
    kind: "consequential_action",
    permissionGranted,
    explicitConfirmation,
  });

  const status = mapConsequentialStatus(trust.status);
  const allowed =
    status === "eligible_for_authorized_execution" && trust.allowed === true;
  const confirmed = permissionGranted && explicitConfirmation;

  return {
    id,
    kind: input.kind,
    title,
    description,
    status,
    allowed,
    requiresPermission: true,
    requiresConfirmation: true,
    requiresExecutionRevalidation: true,
    confirmed,
    nonBinding: false,
  };
}
