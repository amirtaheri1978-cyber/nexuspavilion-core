import { NextResponse } from "next/server";

import {
  getCurrentWorkspaceContext,
  WorkspaceContextError,
} from "@/lib/auth/workspace-context";
import { canInviteWorkspaceMembers } from "@/lib/authorization/workspace-permissions";
import { buildCompanyInvitationEmail } from "@/lib/email/templates/company-invitation-email";
import { sendEmail } from "@/lib/email/send-email";
import {
  getPublicSiteUrl,
  PUBLIC_SITE_URL_UNCONFIGURED,
} from "@/lib/ops/public-site-url";
import { createClient } from "@/lib/supabase/server";

type WorkspaceInvitation = {
  id: string;
  company_id: string;
  email: string;
  role: string;
  status: string;
  token: string;
  expires_at: string | null;
};

type ResendInvitationRpcResult = {
  success?: boolean;
  error_code?: string;
  error_message?: string;
  invitation?: WorkspaceInvitation;
};

const resendInvitationStatusByErrorCode: Record<string, number> = {
  UNAUTHENTICATED: 401,
  ACTIVE_MEMBERSHIP_REQUIRED: 403,
  AMBIGUOUS_WORKSPACE_CONTEXT: 403,
  FORBIDDEN: 403,
  INVALID_INVITATION: 400,
  INVITATION_NOT_FOUND: 404,
  INVITATION_NOT_PENDING: 400,
  INVITATION_INCOMPLETE: 400,
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
        "Company invitation resend workspace context lookup failed.",
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
      "get_company_workspace_invitation_for_resend",
      {
        p_invitation_id: invitationId,
      },
    );

    if (rpcError) {
      console.error(rpcError);

      return NextResponse.json(
        { error: "Failed to load invitation." },
        { status: 500 },
      );
    }

    const result = rpcData as ResendInvitationRpcResult | null;

    if (!result?.success) {
      const errorCode = result?.error_code || "INVITATION_NOT_FOUND";

      return NextResponse.json(
        {
          error:
            result?.error_message ||
            "Invitation not found in your company workspace.",
          errorCode,
        },
        {
          status:
            resendInvitationStatusByErrorCode[errorCode] ?? 500,
        },
      );
    }

    const invitation = result.invitation;

    if (!invitation?.email || !invitation.token) {
      return NextResponse.json(
        { error: "Invitation is missing required delivery details." },
        { status: 400 },
      );
    }

    const commandCompanyId = invitation.company_id;

    const { data: company } = await supabase
      .from("companies")
      .select("id, name")
      .eq("id", commandCompanyId)
      .single();

    if (!company) {
      return NextResponse.json(
        { error: "Company workspace not found." },
        { status: 404 },
      );
    }

    const publicSiteUrl = getPublicSiteUrl();
    const inviteUrl = publicSiteUrl
      ? `${publicSiteUrl}/invite/${invitation.token}`
      : `/invite/${invitation.token}`;

    const invitationEmail = buildCompanyInvitationEmail({
      companyName: company.name || "Your company",
      invitedEmail: invitation.email,
      invitedRole: invitation.role || "",
      inviteUrl,
    });

    const emailResult = publicSiteUrl
      ? await sendEmail({
          to: invitation.email,
          subject: invitationEmail.subject,
          html: invitationEmail.html,
          text: invitationEmail.text,
        })
      : {
          success: false,
          skipped: true,
          id: null,
          error: PUBLIC_SITE_URL_UNCONFIGURED,
        };

    await supabase.from("audit_logs").insert({
      action: "INVITATION_RESENT",
      entity_type: "invitation",
      entity_id: invitation.id,
      user_id: workspace.userId,
      company_id: commandCompanyId,
      metadata: {
        email: invitation.email,
        role: invitation.role,
        invite_url: inviteUrl,
        email_sent: emailResult.success,
        email_skipped: emailResult.skipped,
        email_id: emailResult.id,
        email_error: emailResult.error,
        resent_by: {
          id: workspace.userId,
          email: workspace.email,
          workspace_role: workspace.workspaceRole,
        },
        resent_at: new Date().toISOString(),
      },
    });

    return NextResponse.json({
      success: true,
      inviteUrl,
      email: {
        sent: emailResult.success,
        skipped: emailResult.skipped,
        id: emailResult.id,
        error: emailResult.error,
      },
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      { error: "Internal server error." },
      { status: 500 },
    );
  }
}
