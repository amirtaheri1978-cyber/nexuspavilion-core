import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { WorkspaceRole } from "@/lib/auth/membership";

export type WorkspaceCommandFailureCode =
  | "UNAUTHENTICATED"
  | "FORBIDDEN"
  | "MEMBER_NOT_FOUND"
  | "SELF_MUTATION_NOT_ALLOWED"
  | "OWNER_PROTECTED"
  | "LAST_OWNER_PROTECTED"
  | "INVALID_ROLE"
  | "COMMAND_FAILED";

export class WorkspaceCommandError extends Error {
  constructor(
    message: string,
    public readonly code: WorkspaceCommandFailureCode,
    public readonly cause?: unknown,
  ) {
    super(message);
    this.name = "WorkspaceCommandError";
  }
}

type CommandResponse = {
  success?: boolean;
  error_code?: string;
  error_message?: string;
};

type RemoveWorkspaceMemberInput = {
  targetUserId: string;
};

type UpdateWorkspaceRoleInput = {
  targetUserId: string;
  workspaceRole: Exclude<WorkspaceRole, "owner">;
};

function normalizeUserId(value: string) {
  return value.trim();
}

function mapCommandErrorCode(
  value: string | undefined,
): WorkspaceCommandFailureCode {
  switch (value) {
    case "UNAUTHENTICATED":
    case "FORBIDDEN":
    case "MEMBER_NOT_FOUND":
    case "SELF_MUTATION_NOT_ALLOWED":
    case "OWNER_PROTECTED":
    case "LAST_OWNER_PROTECTED":
    case "INVALID_ROLE":
      return value;

    default:
      return "COMMAND_FAILED";
  }
}

function assertSuccessfulCommand(
  data: CommandResponse | null,
  error: unknown,
  fallbackMessage: string,
) {
  if (error) {
    throw new WorkspaceCommandError(
      fallbackMessage,
      "COMMAND_FAILED",
      error,
    );
  }

  if (!data?.success) {
    throw new WorkspaceCommandError(
      data?.error_message || fallbackMessage,
      mapCommandErrorCode(data?.error_code),
    );
  }
}

export async function removeWorkspaceMember(
  supabase: SupabaseClient,
  input: RemoveWorkspaceMemberInput,
): Promise<void> {
  const targetUserId = normalizeUserId(input.targetUserId);

  if (!targetUserId) {
    throw new WorkspaceCommandError(
      "A target member is required.",
      "MEMBER_NOT_FOUND",
    );
  }

  const { data, error } = await supabase.rpc(
    "remove_organization_member",
    {
      target_user_id: targetUserId,
    },
  );

  assertSuccessfulCommand(
    data as CommandResponse | null,
    error,
    "Unable to remove the workspace member.",
  );
}

export async function updateWorkspaceMemberRole(
  supabase: SupabaseClient,
  input: UpdateWorkspaceRoleInput,
): Promise<void> {
  const targetUserId = normalizeUserId(input.targetUserId);

  if (!targetUserId) {
    throw new WorkspaceCommandError(
      "A target member is required.",
      "MEMBER_NOT_FOUND",
    );
  }

  const { data, error } = await supabase.rpc(
    "update_organization_member_role",
    {
      target_user_id: targetUserId,
      next_workspace_role: input.workspaceRole,
    },
  );

  assertSuccessfulCommand(
    data as CommandResponse | null,
    error,
    "Unable to update the workspace member role.",
  );
}