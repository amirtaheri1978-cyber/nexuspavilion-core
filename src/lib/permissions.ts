export type UserRole =
  | "owner"
  | "admin"
  | "buyer"
  | "vendor"
  | null
  | undefined;

export type WorkspaceStatus =
  | "setup"
  | "active"
  | "restricted"
  | "suspended"
  | "archived"
  | null
  | undefined;

export type OrganizationVerificationStatus =
  | "provisional"
  | "pending_review"
  | "verified"
  | "rejected"
  | "disputed"
  | null
  | undefined;

function normalizeRole(role: UserRole) {
  return String(role || "").trim().toLowerCase();
}

function hasRole(role: UserRole, allowedRoles: string[]) {
  return allowedRoles.includes(normalizeRole(role));
}

export function isWorkspaceOperational(status: WorkspaceStatus) {
  return status === "active" || status === "setup";
}

export function isOrganizationVerified(
  status: OrganizationVerificationStatus,
) {
  return status === "verified";
}

/**
 * Organization administration
 */

export function canCompleteCompanyProfile(role: UserRole) {
  return hasRole(role, ["owner", "admin", "buyer"]);
}

export function canManageCompany(role: UserRole) {
  return hasRole(role, ["owner", "admin"]);
}

export function canInviteUsers(role: UserRole) {
  return hasRole(role, ["owner", "admin"]);
}

export function canManageMembers(role: UserRole) {
  return hasRole(role, ["owner", "admin"]);
}

export function canChangeRoles(role: UserRole) {
  return hasRole(role, ["owner", "admin"]);
}

export function canDeleteCompany(role: UserRole) {
  return hasRole(role, ["owner", "admin"]);
}

export function canTransferOwnership(role: UserRole) {
  return hasRole(role, ["owner"]);
}

export function canViewGovernance(role: UserRole) {
  return hasRole(role, ["owner", "admin"]);
}

/**
 * RFQ governance
 */

export function canCreateRfqDraft(role: UserRole) {
  return hasRole(role, ["owner", "admin", "buyer"]);
}

export function canEditRfqDraft(role: UserRole) {
  return hasRole(role, ["owner", "admin", "buyer"]);
}

export function canSubmitRfqForApproval(role: UserRole) {
  return hasRole(role, ["owner", "admin", "buyer"]);
}

export function canApproveRfq(role: UserRole) {
  return hasRole(role, ["owner", "admin"]);
}

export function canPublishRfq(role: UserRole) {
  return hasRole(role, ["owner", "admin"]);
}

export function canCloseOrCancelRfq(role: UserRole) {
  return hasRole(role, ["owner", "admin"]);
}

/**
 * Quotation governance
 */

export function canSubmitQuote(role: UserRole) {
  return hasRole(role, ["vendor"]);
}

export function canEditOwnQuote(role: UserRole) {
  return hasRole(role, ["vendor"]);
}

export function canViewCompanyQuotes(role: UserRole) {
  return hasRole(role, ["owner", "admin", "buyer"]);
}

export function canUpdateQuoteDecision(role: UserRole) {
  return hasRole(role, ["owner", "admin"]);
}

/**
 * Award governance
 */

export function canRecommendAward(role: UserRole) {
  return hasRole(role, ["owner", "admin", "buyer"]);
}

export function canAwardContract(role: UserRole) {
  return hasRole(role, ["owner", "admin"]);
}

/**
 * Reporting and commercial data
 */

export function canViewExecutiveReports(role: UserRole) {
  return hasRole(role, ["owner", "admin", "buyer"]);
}

export function canExportCommercialData(role: UserRole) {
  return hasRole(role, ["owner", "admin", "buyer"]);
}

/**
 * Context-aware trust policies
 *
 * Subscription entitlement is intentionally excluded.
 * Subscription determines feature availability, not authority or trust.
 */

export function canPublishVerifiedOrganizationRfq({
  role,
  workspaceStatus,
  verificationStatus,
}: {
  role: UserRole;
  workspaceStatus: WorkspaceStatus;
  verificationStatus: OrganizationVerificationStatus;
}) {
  return (
    canPublishRfq(role) &&
    workspaceStatus === "active" &&
    isOrganizationVerified(verificationStatus)
  );
}

export function canSubmitVerifiedSupplierQuote({
  role,
  workspaceStatus,
  verificationStatus,
}: {
  role: UserRole;
  workspaceStatus: WorkspaceStatus;
  verificationStatus: OrganizationVerificationStatus;
}) {
  return (
    canSubmitQuote(role) &&
    workspaceStatus === "active" &&
    isOrganizationVerified(verificationStatus)
  );
}

export function canAwardVerifiedOrganizationContract({
  role,
  workspaceStatus,
  verificationStatus,
}: {
  role: UserRole;
  workspaceStatus: WorkspaceStatus;
  verificationStatus: OrganizationVerificationStatus;
}) {
  return (
    canAwardContract(role) &&
    workspaceStatus === "active" &&
    isOrganizationVerified(verificationStatus)
  );
}