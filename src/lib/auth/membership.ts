import type { SupabaseClient } from "@supabase/supabase-js";

export type WorkspaceRole =
  | "owner"
  | "admin"
  | "member"
  | "viewer";

export type ProcurementFunction =
  | "buyer"
  | "supplier"
  | "consultant"
  | "none";

export type MembershipType =
  | "founder"
  | "employee"
  | "external_consultant"
  | "procurement_agent"
  | "temporary_staff";

export type MembershipStatus =
  | "pending"
  | "active"
  | "suspended"
  | "revoked";

export type OrganizationMembership = {
  id: string;
  userId: string;
  companyId: string;

  workspaceRole: WorkspaceRole;
  procurementFunction: ProcurementFunction;
  membershipType: MembershipType;
  membershipStatus: MembershipStatus;

  jobTitle: string | null;
  jobFunction: string | null;
  invitedBy: string | null;
  joinedAt: string | null;
};

type MembershipRow = {
  id: string;
  user_id: string;
  company_id: string;

  workspace_role: WorkspaceRole;
  procurement_function: ProcurementFunction;
  membership_type: MembershipType;
  membership_status: MembershipStatus;

  job_title: string | null;
  job_function: string | null;
  invited_by: string | null;
  joined_at: string | null;
};

export class MembershipLookupError extends Error {
  constructor(
    message: string,
    public readonly cause?: unknown,
  ) {
    super(message);
    this.name = "MembershipLookupError";
  }
}

function mapMembership(
  row: MembershipRow,
): OrganizationMembership {
  return {
    id: row.id,
    userId: row.user_id,
    companyId: row.company_id,

    workspaceRole: row.workspace_role,
    procurementFunction: row.procurement_function,
    membershipType: row.membership_type,
    membershipStatus: row.membership_status,

    jobTitle: row.job_title,
    jobFunction: row.job_function,
    invitedBy: row.invited_by,
    joinedAt: row.joined_at,
  };
}

export async function getActiveMembershipForUser(
  supabase: SupabaseClient,
  userId: string,
): Promise<OrganizationMembership | null> {
  const normalizedUserId = userId.trim();

  if (!normalizedUserId) {
    return null;
  }

  const { data, error } = await supabase
    .from("organization_memberships")
    .select(
      `
      id,
      user_id,
      company_id,
      workspace_role,
      procurement_function,
      membership_type,
      membership_status,
      job_title,
      job_function,
      invited_by,
      joined_at
      `,
    )
    .eq("user_id", normalizedUserId)
    .eq("membership_status", "active")
    .maybeSingle();

  if (error) {
    throw new MembershipLookupError(
      "Unable to load the active organization membership.",
      error,
    );
  }

  return data
    ? mapMembership(data as MembershipRow)
    : null;
}

export function isMembershipActive(
  membership: OrganizationMembership | null,
) {
  return membership?.membershipStatus === "active";
}

export function isWorkspaceOwner(
  membership: OrganizationMembership | null,
) {
  return (
    isMembershipActive(membership) &&
    membership?.workspaceRole === "owner"
  );
}

export function isWorkspaceAdmin(
  membership: OrganizationMembership | null,
) {
  return (
    isMembershipActive(membership) &&
    membership?.workspaceRole === "admin"
  );
}

export function canManageWorkspace(
  membership: OrganizationMembership | null,
) {
  return (
    isWorkspaceOwner(membership) ||
    isWorkspaceAdmin(membership)
  );
}