import { NextResponse } from "next/server";

import {
  getCurrentWorkspaceContext,
  WorkspaceContextError,
} from "@/lib/auth/workspace-context";
import { canInviteWorkspaceMembers } from "@/lib/authorization/workspace-permissions";
import { createClient } from "@/lib/supabase/server";

type RevokeInvitationRpcResult = {
  success?: boolean;
  error_code?: string;
  error_message?: string;
  invitation?: {
    id: string;
    company_id: string;
    email: string | null;
    role: string | null;
    status: string;
  };
};

const revokeInvitationStatusByErrorCode: Record<string, number> = {
  UNAUTHENTICATED: 401,
  ACTIVE_MEMBERSHIP_REQUIRED: 403,
  AMBIGUOUS_WORKSPACE_CONTEXT: 403,
  FORBIDDEN: 403,
  INVALID_INVITATION: 400,
  INVITATION_NOT_FOUND: 404,
  INVITATION_NOT_PENDING: 400,
  INVITATION_REVOKE_FAILED: 500,
};

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const invitationId = String(body.invitationId || "").trim();

    if (!invitationId) {
      return NextResponse.json(
        { error: "Invitation ID is required." },
        { status: 400 },
      );
    }

    const supabase = await createClient();

    let workspace;

    try {
      workspace = await getCurrentWorkspaceContext(supabase);
    } catch (error) {
      if (
        error instanceof WorkspaceContextError &&
        error.code === "UNAUTHENTICATED"
      ) {
        return NextResponse.json(
          { error: "Unauthorized." },
          { status: 401 },
        );
      }

      console.error(
        "Company invitation revoke workspace context lookup failed.",
        error,
      );

      return NextResponse.json(
        { error: "Workspace access could not be verified." },
        { status: 403 },
      );
    }

    if (!workspace.companyId || !workspace.membership) {
      return NextResponse.json(
        { error: "No company assigned." },
        { status: 400 },
      );
    }

    if (
      !canInviteWorkspaceMembers({
        workspaceRole: workspace.workspaceRole,
        membershipStatus: workspace.membershipStatus,
      })
    ) {
      return NextResponse.json(
        { error: "You do not have permission to manage invitations." },
        { status: 403 },
      );
    }

    const { data: rpcData, error: rpcError } = await supabase.rpc(
      "revoke_company_workspace_invitation",
      {
        p_invitation_id: invitationId,
      },
    );

    if (rpcError) {
      console.error(rpcError);

      return NextResponse.json(
        { error: "Failed to revoke invitation." },
        { status: 500 },
      );
    }

    const result = rpcData as RevokeInvitationRpcResult | null;

    if (!result?.success) {
      const errorCode = result?.error_code || "INVITATION_REVOKE_FAILED";

      return NextResponse.json(
        {
          error:
            result?.error_message || "Failed to revoke invitation.",
          errorCode,
        },
        {
          status:
            revokeInvitationStatusByErrorCode[errorCode] ?? 500,
        },
      );
    }

    const invitation = result.invitation;

    if (!invitation) {
      return NextResponse.json(
        { error: "Failed to revoke invitation." },
        { status: 500 },
      );
    }

    const commandCompanyId = invitation.company_id;

    await supabase.from("audit_logs").insert({
      action: "INVITATION_REVOKED",
      entity_type: "invitation",
      entity_id: invitation.id,
      user_id: workspace.userId,
      company_id: commandCompanyId,
      metadata: {
        email: invitation.email,
        role: invitation.role,
        revoked_by: {
          id: workspace.userId,
          email: workspace.email,
          workspace_role: workspace.workspaceRole,
        },
        revoked_at: new Date().toISOString(),
      },
    });

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      { error: "Internal server error." },
      { status: 500 },
    );
  }
}
