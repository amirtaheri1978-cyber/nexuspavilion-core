import type {
  MembershipStatus,
  WorkspaceRole,
} from "@/lib/auth/membership";

export type WorkspacePermissionContext = {
  workspaceRole: WorkspaceRole | null | undefined;
  membershipStatus: MembershipStatus | null | undefined;
};

function hasActiveWorkspaceRole(
  context: WorkspacePermissionContext,
  allowedRoles: WorkspaceRole[],
) {
  return (
    context.membershipStatus === "active" &&
    Boolean(
      context.workspaceRole &&
        allowedRoles.includes(context.workspaceRole),
    )
  );
}

export function canManageCompanyWorkspace(
  context: WorkspacePermissionContext,
) {
  return hasActiveWorkspaceRole(context, ["owner", "admin"]);
}

export function canInviteWorkspaceMembers(
  context: WorkspacePermissionContext,
) {
  return hasActiveWorkspaceRole(context, ["owner", "admin"]);
}

export function canManageWorkspaceMembers(
  context: WorkspacePermissionContext,
) {
  return hasActiveWorkspaceRole(context, ["owner", "admin"]);
}

export function canChangeWorkspaceRoles(
  context: WorkspacePermissionContext,
) {
  return hasActiveWorkspaceRole(context, ["owner", "admin"]);
}

export function canDeleteCompanyWorkspace(
  context: WorkspacePermissionContext,
) {
  return hasActiveWorkspaceRole(context, ["owner", "admin"]);
}

export function canTransferWorkspaceOwnership(
  context: WorkspacePermissionContext,
) {
  return hasActiveWorkspaceRole(context, ["owner"]);
}

export function canViewWorkspaceGovernance(
  context: WorkspacePermissionContext,
) {
  return hasActiveWorkspaceRole(context, ["owner", "admin"]);
}

export function canViewWorkspace(
  context: WorkspacePermissionContext,
) {
  return hasActiveWorkspaceRole(context, [
    "owner",
    "admin",
    "member",
    "viewer",
  ]);
}