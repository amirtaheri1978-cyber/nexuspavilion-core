type WorkspaceInvitationActivityKind = "created" | "resent" | "revoked";
type WorkspaceInvitationDeliveryStatus = "sent" | "skipped" | "failed";

type WorkspaceInvitationActivityClient = {
  rpc: (
    fn: string,
    args: Record<string, unknown>,
  ) => PromiseLike<{
    data: unknown;
    error: unknown;
  }>;
};

type WorkspaceInvitationActivityResult = {
  success?: boolean;
  error_code?: string;
  error_message?: string;
};

function describeRpcError(error: unknown) {
  if (error && typeof error === "object") {
    const record = error as { code?: unknown; message?: unknown };

    return {
      code: typeof record.code === "string" ? record.code : null,
      message:
        typeof record.message === "string" ? record.message : "unknown",
    };
  }

  return { code: null, message: "unknown" };
}

export async function recordWorkspaceInvitationActivity(
  supabase: WorkspaceInvitationActivityClient,
  input: {
    activityKind: WorkspaceInvitationActivityKind;
    invitationId: string;
    deliveryStatus?: WorkspaceInvitationDeliveryStatus;
  },
) {
  try {
    const { data, error } = await supabase.rpc(
      "record_company_workspace_invitation_activity",
      {
        p_activity_kind: input.activityKind,
        p_invitation_id: input.invitationId,
        p_delivery_status: input.deliveryStatus ?? null,
      },
    );

    if (error) {
      console.error("Workspace invitation activity was not recorded.", {
        invitationId: input.invitationId,
        activityKind: input.activityKind,
        error: describeRpcError(error),
      });
      return false;
    }

    const result = (data ?? {}) as WorkspaceInvitationActivityResult;

    if (result.success === true) {
      return true;
    }

    console.error("Workspace invitation activity was not recorded.", {
      invitationId: input.invitationId,
      activityKind: input.activityKind,
      error: {
        code: result.error_code ?? null,
        message: result.error_message ?? "unknown",
      },
    });

    return false;
  } catch (failure) {
    console.error("Workspace invitation activity was not recorded.", {
      invitationId: input.invitationId,
      activityKind: input.activityKind,
      error: describeRpcError(failure),
    });
    return false;
  }
}
