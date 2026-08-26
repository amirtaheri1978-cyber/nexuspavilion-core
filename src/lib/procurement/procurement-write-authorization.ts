import type { OrganizationMembership } from "@/lib/auth/membership";
import {
  isOrganizationVerified,
  type OrganizationVerificationStatus,
  type WorkspaceStatus,
} from "@/lib/permissions";

function isActiveMembershipForCompany(
  membership: OrganizationMembership | null,
  companyId: string,
): membership is OrganizationMembership {
  const normalizedCompanyId = companyId.trim();

  return (
    membership !== null &&
    membership.membershipStatus === "active" &&
    Boolean(normalizedCompanyId) &&
    membership.companyId === normalizedCompanyId
  );
}

export function canCreateCompanyRfq(
  membership: OrganizationMembership | null,
  companyId: string,
): membership is OrganizationMembership {
  return (
    isActiveMembershipForCompany(membership, companyId) &&
    (membership.workspaceRole === "owner" ||
      membership.workspaceRole === "admin" ||
      membership.procurementFunction === "buyer")
  );
}

export function canInviteCompanySuppliers(
  membership: OrganizationMembership | null,
  companyId: string,
): membership is OrganizationMembership {
  return canCreateCompanyRfq(membership, companyId);
}

export function canSubmitCompanyQuote(
  membership: OrganizationMembership | null,
  companyId: string,
): membership is OrganizationMembership {
  // Layer 2 respondent prerequisite: active acting-company membership.
  // procurement_function is not a global RFQ-response permission.
  return isActiveMembershipForCompany(membership, companyId);
}

export function canDecideCompanyQuotes(
  membership: OrganizationMembership | null,
  companyId: string,
): membership is OrganizationMembership {
  return (
    isActiveMembershipForCompany(membership, companyId) &&
    (membership.workspaceRole === "owner" ||
      membership.workspaceRole === "admin")
  );
}

export function canAwardVerifiedCompanyContract({
  membership,
  companyId,
  workspaceStatus,
  verificationStatus,
}: {
  membership: OrganizationMembership | null;
  companyId: string;
  workspaceStatus: WorkspaceStatus;
  verificationStatus: OrganizationVerificationStatus;
}): boolean {
  return (
    canDecideCompanyQuotes(membership, companyId) &&
    workspaceStatus === "active" &&
    isOrganizationVerified(verificationStatus)
  );
}
