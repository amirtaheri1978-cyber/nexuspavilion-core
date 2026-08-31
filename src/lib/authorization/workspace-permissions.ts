import type {
  MembershipStatus,
  WorkspaceRole,
} from "@/lib/auth/membership";

export type WorkspacePermissionContext = {
  workspaceRole: WorkspaceRole | null | undefined;
  membershipStatus: MembershipStatus | null | undefined;
};

function hasActiveMembership(
  context: WorkspacePermissionContext,
) {
  return context.membershipStatus === "active";
}

function hasActiveWorkspaceRole(
  context: WorkspacePermissionContext,
  allowedRoles: WorkspaceRole[],
) {
  return (
    hasActiveMembership(context) &&
    Boolean(
      context.workspaceRole &&
        allowedRoles.includes(context.workspaceRole),
    )
  );
}

/**
 * Company workspace administration
 */

export function canManageCompanyWorkspace(
  context: WorkspacePermissionContext,
) {
  return hasActiveWorkspaceRole(context, [
    "owner",
    "admin",
  ]);
}

export function canInviteWorkspaceMembers(
  context: WorkspacePermissionContext,
) {
  return hasActiveWorkspaceRole(context, [
    "owner",
    "admin",
  ]);
}

export function canManageWorkspaceMembers(
  context: WorkspacePermissionContext,
) {
  return hasActiveWorkspaceRole(context, [
    "owner",
    "admin",
  ]);
}

export function canChangeWorkspaceRoles(
  context: WorkspacePermissionContext,
) {
  return hasActiveWorkspaceRole(context, [
    "owner",
    "admin",
  ]);
}

export function canArchiveCompanyWorkspace(
  context: WorkspacePermissionContext,
) {
  return hasActiveWorkspaceRole(context, ["owner"]);
}

export function canReactivateCompanyWorkspace(
  context: WorkspacePermissionContext,
) {
  return (
    context.membershipStatus === "archived" &&
    context.workspaceRole === "owner"
  );
}

export function canTransferWorkspaceOwnership(
  context: WorkspacePermissionContext,
) {
  return hasActiveWorkspaceRole(context, [
    "owner",
  ]);
}

export function canViewWorkspaceGovernance(
  context: WorkspacePermissionContext,
) {
  return hasActiveWorkspaceRole(context, [
    "owner",
    "admin",
  ]);
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