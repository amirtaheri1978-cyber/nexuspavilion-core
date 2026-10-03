"use client";

import { useRouter } from "next/navigation";
import { useId, useState } from "react";

import type {
  MembershipStatus,
  WorkspaceRole,
} from "@/lib/auth/membership";
import { formatMemberRemovalSubject } from "@/lib/auth/professional-identity-display";
import {
  canChangeWorkspaceRoles,
  canManageWorkspaceMembers,
} from "@/lib/authorization/workspace-permissions";
import {
  EXECUTIVE_BUTTON_DESTRUCTIVE,
  EXECUTIVE_BUTTON_SECONDARY,
  EXECUTIVE_FEEDBACK_ERROR,
  EXECUTIVE_FEEDBACK_SUCCESS,
  EXECUTIVE_FEEDBACK_WARNING,
  EXECUTIVE_FOCUS_CYAN,
  EXECUTIVE_FORM_HELPER,
  EXECUTIVE_FORM_SELECT,
} from "@/lib/design-system/executive-contract";

type EditableWorkspaceRole =
  | "admin"
  | "member"
  | "viewer";

type MemberActionsProps = {
  memberId: string;
  memberLabel: string | null;
  memberEmail: string | null;

  memberWorkspaceRole: WorkspaceRole | null;
  memberMembershipStatus: MembershipStatus | null;

  currentUserId: string;
  currentUserWorkspaceRole: WorkspaceRole | null;
  currentUserMembershipStatus: MembershipStatus | null;
};

type ApiResponse = {
  success?: boolean;
  workspaceRole?: WorkspaceRole;
  error?: string;
};

const ROLE_OPTIONS: {
  value: EditableWorkspaceRole;
  label: string;
}[] = [
  {
    value: "admin",
    label: "Administrator",
  },
  {
    value: "member",
    label: "Standard",
  },
  {
    value: "viewer",
    label: "Read Only",
  },
];

function normalizeWorkspaceRole(
  role: WorkspaceRole | null,
): EditableWorkspaceRole {
  if (role === "admin") {
    return "admin";
  }

  if (role === "viewer") {
    return "viewer";
  }

  return "member";
}

function getAccessLevelLabel(role: WorkspaceRole | null) {
  if (role === "owner") return "Owner";
  if (role === "admin") return "Administrator";
  if (role === "member") return "Standard";
  if (role === "viewer") return "Read Only";
  return "Access Level Pending";
}

function getPermissionMessage({
  isCurrentUser,
  isOwner,
  canManageMemberAccess,
  canChangeMemberRoles,
}: {
  isCurrentUser: boolean;
  isOwner: boolean;
  canManageMemberAccess: boolean;
  canChangeMemberRoles: boolean;
}) {
  if (isCurrentUser) {
    return "You cannot manage your own membership from this panel.";
  }

  if (isOwner) {
    return "Owner access is protected. Use the ownership transfer workflow to change this membership.";
  }

  if (!canManageMemberAccess && !canChangeMemberRoles) {
    return "Your Access Level has read-only access to member management.";
  }

  if (!canManageMemberAccess) {
    return "You can review this member, but removal requires elevated workspace authority.";
  }

  if (!canChangeMemberRoles) {
    return "You can review this member, but you cannot change Access Levels.";
  }

  return "Member management is restricted for your current Access Level.";
}

export default function MemberActions({
  memberId,
  memberLabel,
  memberEmail,
  memberWorkspaceRole,
  memberMembershipStatus,
  currentUserId,
  currentUserWorkspaceRole,
  currentUserMembershipStatus,
}: MemberActionsProps) {
  const router = useRouter();
  const accessSelectId = useId();
  const helperId = useId();

  const [selectedRole, setSelectedRole] =
    useState<EditableWorkspaceRole>(
      normalizeWorkspaceRole(memberWorkspaceRole),
    );

  const [loadingAction, setLoadingAction] =
    useState("");

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const permissionContext = {
    workspaceRole: currentUserWorkspaceRole,
    membershipStatus: currentUserMembershipStatus,
  };

  const isCurrentUser = memberId === currentUserId;
  const isOwner = memberWorkspaceRole === "owner";

  const canManageMemberAccess =
    canManageWorkspaceMembers(permissionContext) &&
    !isCurrentUser &&
    !isOwner;

  const canChangeMemberRoles =
    canChangeWorkspaceRoles(permissionContext) &&
    !isCurrentUser &&
    !isOwner;

  const roleHasChanged =
    selectedRole !== memberWorkspaceRole;

  const memberSubject = formatMemberRemovalSubject(
    memberLabel,
    memberEmail,
  );

  async function handleUpdateRole() {
    if (!canChangeMemberRoles) {
      setError(
        "You do not have permission to update Access Levels.",
      );
      return;
    }

    if (!roleHasChanged) {
      setMessage("No Access Level changes to save.");
      setError("");
      return;
    }

    setLoadingAction("role");
    setMessage("");
    setError("");

    try {
      const response = await fetch(
        "/api/company-members/update-role",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            memberId,
            workspaceRole: selectedRole,
          }),
        },
      );

      const data =
        (await response.json()) as ApiResponse;

      if (!response.ok) {
        setError(
          data.error ||
            "Failed to update the Access Level.",
        );
        return;
      }

      setMessage(
        "Access level updated successfully.",
      );

      router.refresh();
    } catch {
      setError("Request failed. Please try again.");
    } finally {
      setLoadingAction("");
    }
  }

  async function handleRemoveMember() {
    if (!canManageMemberAccess) {
      setError(
        "You do not have permission to remove workspace members.",
      );
      return;
    }

    const confirmed = window.confirm(
      `Remove ${memberSubject} from this company workspace?`,
    );

    if (!confirmed) {
      return;
    }

    setLoadingAction("remove");
    setMessage("");
    setError("");

    try {
      const response = await fetch(
        "/api/company-members/remove",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            memberId,
          }),
        },
      );

      const data =
        (await response.json()) as ApiResponse;

      if (!response.ok) {
        setError(
          data.error || "Failed to remove member.",
        );
        return;
      }

      setMessage("Member removed from workspace.");
      router.refresh();
    } catch {
      setError("Request failed. Please try again.");
    } finally {
      setLoadingAction("");
    }
  }

  if (
    !canManageMemberAccess &&
    !canChangeMemberRoles
  ) {
    return (
      <div
        role="status"
        className={`mt-4 ${EXECUTIVE_FEEDBACK_WARNING}`}
      >
        <p className="text-xs font-bold leading-5">
          {getPermissionMessage({
            isCurrentUser,
            isOwner,
            canManageMemberAccess,
            canChangeMemberRoles,
          })}
        </p>
      </div>
    );
  }

  return (
    <div className="mt-4 rounded-executive border border-white/10 bg-white/[0.035] p-4">
      <div className="flex flex-wrap items-center gap-2">
        <p className="np-type-meta text-nexus-muted">
          Current Access Level
        </p>
        <p className="np-type-body text-nexus-text-secondary">
          {getAccessLevelLabel(memberWorkspaceRole)}
        </p>
      </div>

      <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_auto_auto] sm:items-end">
        <div className="min-w-0">
          <label
            htmlFor={accessSelectId}
            className="np-type-meta mb-2 block text-nexus-muted"
          >
            Selected Access Level
          </label>
          <select
            id={accessSelectId}
            aria-label={`Access Level for ${formatMemberRemovalSubject(
              memberLabel,
              memberEmail,
            )}`}
            aria-describedby={helperId}
            value={selectedRole}
            onChange={(event) =>
              setSelectedRole(
                event.target
                  .value as EditableWorkspaceRole,
              )
            }
            disabled={
              !canChangeMemberRoles ||
              loadingAction !== ""
            }
            className={`${EXECUTIVE_FORM_SELECT} min-h-11 ${EXECUTIVE_FOCUS_CYAN}`}
          >
            {ROLE_OPTIONS.map((option) => (
              <option
                key={option.value}
                value={option.value}
                className="bg-nexus-navy"
              >
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <button
          type="button"
          onClick={handleUpdateRole}
          disabled={
            !canChangeMemberRoles ||
            !roleHasChanged ||
            loadingAction === "role"
          }
          className={`${EXECUTIVE_BUTTON_SECONDARY} min-h-11 px-4 py-2 text-xs`}
        >
          {loadingAction === "role"
            ? "Saving..."
            : "Save Access"}
        </button>

        <button
          type="button"
          onClick={handleRemoveMember}
          disabled={
            !canManageMemberAccess ||
            loadingAction === "remove"
          }
          className={`${EXECUTIVE_BUTTON_DESTRUCTIVE} min-h-11 px-4 py-2 text-xs`}
        >
          {loadingAction === "remove"
            ? "Removing..."
            : "Remove Member"}
        </button>
      </div>

      <p id={helperId} className={`mt-3 ${EXECUTIVE_FORM_HELPER}`}>
        This control changes workspace access only.
        It does not change Department, Job Title, RFQ
        relationship, or Procurement capability.
      </p>

      {memberMembershipStatus !== "active" ? (
        <p
          role="status"
          className={`mt-3 ${EXECUTIVE_FEEDBACK_WARNING} text-xs font-bold leading-5`}
        >
          This membership is not currently active.
        </p>
      ) : null}

      {message ? (
        <p
          role="status"
          className={`mt-3 ${EXECUTIVE_FEEDBACK_SUCCESS} text-xs font-bold leading-5`}
        >
          {message}
        </p>
      ) : null}

      {error ? (
        <p
          role="alert"
          className={`mt-3 ${EXECUTIVE_FEEDBACK_ERROR} text-xs font-bold leading-5`}
        >
          {error}
        </p>
      ) : null}
    </div>
  );
}
