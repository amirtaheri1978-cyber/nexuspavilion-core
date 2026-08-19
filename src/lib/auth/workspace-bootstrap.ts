import {
  JOB_TITLE_MAX_LENGTH,
  PROFESSIONAL_NAME_MAX_LENGTH,
  PROFESSIONAL_NAME_SYNC_ERROR,
} from "@/lib/auth/professional-names";

export { PROFESSIONAL_NAME_SYNC_ERROR };

export const WORKSPACE_ALREADY_CONNECTED_ERROR =
  "This account is already connected to a company.";

export const WORKSPACE_RECOVERY_REQUIRED_ERROR =
  "This account already has more than one company. Workspace recovery is required before you can continue.";

export const WORKSPACE_BOOTSTRAP_INCOMPLETE_ERROR =
  "Your company was saved, but your workspace could not be finished. Do not create another company. Sign in again or contact support if this continues.";

export const WORKSPACE_CREATE_FAILED_ERROR = "Failed to create company.";

export const WORKSPACE_ELIGIBILITY_ERROR =
  "We could not verify your workspace eligibility. Please try again.";

const BOUNDED_FOUNDER_IDENTITY_ERRORS = [
  PROFESSIONAL_NAME_SYNC_ERROR,
  "First name is required.",
  "Last name is required.",
  `First name must not exceed ${PROFESSIONAL_NAME_MAX_LENGTH} characters.`,
  `Last name must not exceed ${PROFESSIONAL_NAME_MAX_LENGTH} characters.`,
  "Job title is required.",
  `Job title must not exceed ${JOB_TITLE_MAX_LENGTH} characters.`,
];

export type OwnedCompanyResolution =
  | { action: "already_connected" }
  | { action: "recovery_required" }
  | { action: "recover"; companyId: string }
  | { action: "create" };

export function planOwnedCompanyResolution({
  profileCompanyId,
  ownedCompanyIds,
}: {
  profileCompanyId: string | null | undefined;
  ownedCompanyIds: string[];
}): OwnedCompanyResolution {
  if (profileCompanyId) {
    return { action: "already_connected" };
  }

  const uniqueOwnedCompanyIds = [
    ...new Set(ownedCompanyIds.filter(Boolean)),
  ];

  if (uniqueOwnedCompanyIds.length > 1) {
    return { action: "recovery_required" };
  }

  const onlyOwnedCompanyId = uniqueOwnedCompanyIds[0];

  if (uniqueOwnedCompanyIds.length === 1 && onlyOwnedCompanyId) {
    return {
      action: "recover",
      companyId: onlyOwnedCompanyId,
    };
  }

  return { action: "create" };
}

export function getFriendlyWorkspaceCreateError(message?: string) {
  const raw = String(message || "").trim();
  const normalized = raw.toLowerCase();

  if (!raw) {
    return "We could not create your workspace securely. Please review your details and try again.";
  }

  if (
    raw === WORKSPACE_ALREADY_CONNECTED_ERROR ||
    normalized.includes("already connected to a company")
  ) {
    return WORKSPACE_ALREADY_CONNECTED_ERROR;
  }

  if (BOUNDED_FOUNDER_IDENTITY_ERRORS.includes(raw)) {
    return raw;
  }

  if (
    raw === WORKSPACE_RECOVERY_REQUIRED_ERROR ||
    normalized.includes("workspace recovery is required")
  ) {
    return WORKSPACE_RECOVERY_REQUIRED_ERROR;
  }

  if (
    raw === WORKSPACE_BOOTSTRAP_INCOMPLETE_ERROR ||
    normalized.includes("do not create another company")
  ) {
    return WORKSPACE_BOOTSTRAP_INCOMPLETE_ERROR;
  }

  if (normalized.includes("unauthorized")) {
    return "Please sign in to continue creating your workspace.";
  }

  if (normalized.includes("duplicate") || normalized.includes("already")) {
    return "A workspace with similar company details may already exist. Please review your company name or contact your administrator.";
  }

  if (normalized.includes("network") || normalized.includes("fetch")) {
    return "We could not reach the secure workspace service. Please check your connection and try again.";
  }

  return "We could not create your workspace securely. Please review your details and try again.";
}
