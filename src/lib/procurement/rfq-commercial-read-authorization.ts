import type { OrganizationMembership } from "@/lib/auth/membership";

/**
 * Application defense-in-depth for issuer commercial quote READ.
 * Mirrors RLS predicate membership status + role/function capability.
 * Commercial opening remains a separate business-state gate.
 */
export function canReadIssuerCommercialQuotes(
  membership: OrganizationMembership | null,
  companyId: string,
): membership is OrganizationMembership {
  const normalizedCompanyId = companyId.trim();

  if (
    membership === null ||
    !normalizedCompanyId ||
    membership.companyId !== normalizedCompanyId
  ) {
    return false;
  }

  if (
    membership.membershipStatus !== "active" &&
    membership.membershipStatus !== "archived"
  ) {
    return false;
  }

  return (
    membership.workspaceRole === "owner" ||
    membership.workspaceRole === "admin" ||
    membership.procurementFunction === "buyer"
  );
}
