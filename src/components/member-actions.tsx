"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import type {
  MembershipStatus,
  WorkspaceRole,
} from "@/lib/auth/membership";
import { formatMemberRemovalSubject } from "@/lib/auth/professional-identity-display";
import {
  canChangeWorkspaceRoles,
  canManageWorkspaceMembers,
} from "@/lib/authorization/workspace-permissions";
import { EXECUTIVE_FOCUS_CYAN } from "@/lib/design-system/executive-contract";

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
    label: "Admin",
  },
  {
    value: "member",
    label: "Member",
  },
  {
    value: "viewer",
    label: "Viewer",
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
    return "Your workspace role has read-only access to member management.";
  }

  if (!canManageMemberAccess) {
    return "You can review this member, but removal requires elevated workspace authority.";
  }

  if (!canChangeMemberRoles) {
    return "You can review this member, but you cannot change workspace roles.";
  }

  return "Member management is restricted for your current workspace role.";
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

  async function handleUpdateRole() {
    if (!canChangeMemberRoles) {
      setError(
        "You do not have permission to update workspace roles.",
      );
      return;
    }

    if (!roleHasChanged) {
      setMessage("No workspace role changes to save.");
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
            "Failed to update the workspace role.",
        );
        return;
      }

      setMessage(
        "Workspace role updated successfully.",
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
      `Remove ${formatMemberRemovalSubject(
        memberLabel,
        memberEmail,
      )} from this company workspace?`,
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
      <div className="mt-4 rounded-[22px] border border-white/10 bg-white/[0.035] px-4 py-3">
        <p className="text-xs font-bold leading-5 text-slate-400">
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
    <div className="mt-4 rounded-[22px] border border-white/10 bg-[#061426]/80 p-4">
      <div className="grid gap-3 sm:grid-cols-[1fr_auto_auto]">
        <select
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
          className={`rounded-2xl border border-white/10 bg-[#07111F] px-3 py-2 text-xs font-black uppercase tracking-[0.15em] text-white outline-none transition focus:border-[#2CC4E8]/40 disabled:cursor-not-allowed disabled:opacity-50 ${EXECUTIVE_FOCUS_CYAN}`}
        >
          {ROLE_OPTIONS.map((option) => (
            <option
              key={option.value}
              value={option.value}
              className="bg-[#061426]"
            >
              {option.label}
            </option>
          ))}
        </select>

        <button
          type="button"
          onClick={handleUpdateRole}
          disabled={
            !canChangeMemberRoles ||
            !roleHasChanged ||
            loadingAction === "role"
          }
          className={`rounded-full border border-[#C8A646]/25 bg-[#C8A646]/10 px-4 py-2 text-xs font-black text-[#F5D77B] transition hover:bg-[#C8A646]/15 disabled:cursor-not-allowed disabled:opacity-50 ${EXECUTIVE_FOCUS_CYAN}`}
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
          className={`rounded-full border border-red-300/20 bg-red-400/10 px-4 py-2 text-xs font-black text-red-200 transition hover:bg-red-400/15 disabled:cursor-not-allowed disabled:opacity-50 ${EXECUTIVE_FOCUS_CYAN}`}
        >
          {loadingAction === "remove"
            ? "Removing..."
            : "Remove"}
        </button>
      </div>

      <p className="mt-3 text-xs font-semibold leading-5 text-slate-400">
        This control changes workspace authority only.
        Procurement function remains unchanged.
      </p>

      {memberMembershipStatus !== "active" ? (
        <p className="mt-3 text-xs font-bold leading-5 text-orange-300">
          This membership is not currently active.
        </p>
      ) : null}

      {message ? (
        <p className="mt-3 text-xs font-bold leading-5 text-emerald-300">
          {message}
        </p>
      ) : null}

      {error ? (
        <p className="mt-3 text-xs font-bold leading-5 text-red-300">
          {error}
        </p>
      ) : null}
    </div>
  );
}