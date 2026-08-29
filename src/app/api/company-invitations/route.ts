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

type Company = {
  id: string;
  name: string | null;
};

type InviteRole = "admin" | "buyer" | "vendor";

type WorkspaceInvitation = {
  id: string;
  company_id: string;
  email: string;
  role: string;
  status: string;
  token: string;
  expires_at: string | null;
  created_at: string;
};

type CreateInvitationRpcResult = {
  success?: boolean;
  error_code?: string;
  error_message?: string;
  invitation?: WorkspaceInvitation;
};

const createInvitationStatusByErrorCode: Record<string, number> = {
  UNAUTHENTICATED: 401,
  ACTIVE_MEMBERSHIP_REQUIRED: 403,
  AMBIGUOUS_WORKSPACE_CONTEXT: 403,
  FORBIDDEN: 403,
  INVALID_EMAIL: 400,
  INVALID_ROLE: 400,
  ALREADY_MEMBER: 409,
  INVITATION_ALREADY_PENDING: 409,
  INVITATION_CREATE_FAILED: 500,
};

function normalizeEmail(email: unknown) {
  return String(email || "").trim().toLowerCase();
}

function normalizeRole(role: unknown): InviteRole {
  const value = String(role || "").trim().toLowerCase();

  if (value === "admin") return "admin";
  if (value === "buyer") return "buyer";

  return "vendor";
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const email = normalizeEmail(body.email);
    const role = normalizeRole(body.role);

    if (!email) {
      return NextResponse.json(
        { error: "Email is required." },
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
        "Company invitation workspace context lookup failed.",
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
        { error: "You do not have permission to invite company users." },
        { status: 403 },
      );
    }

    const { data: rpcData, error: rpcError } = await supabase.rpc(
      "create_company_workspace_invitation",
      {
        p_email: email,
        p_role: role,
      },
    );

    if (rpcError) {
      console.error(rpcError);

      return NextResponse.json(
        { error: "Failed to create invitation." },
        { status: 500 },
      );
    }

    const result = rpcData as CreateInvitationRpcResult | null;

    if (!result?.success) {
      const errorCode = result?.error_code || "INVITATION_CREATE_FAILED";

      return NextResponse.json(
        {
          error:
            result?.error_message || "Failed to create invitation.",
          errorCode,
        },
        {
          status:
            createInvitationStatusByErrorCode[errorCode] ?? 500,
        },
      );
    }

    const invitation = result.invitation;

    if (!invitation?.token) {
      return NextResponse.json(
        { error: "Invitation token was not generated." },
        { status: 500 },
      );
    }

    const commandCompanyId = invitation.company_id;

    const { data: companyData } = await supabase
      .from("companies")
      .select("id, name")
      .eq("id", commandCompanyId)
      .single();

    const company = companyData as Company | null;

    if (!company) {
      return NextResponse.json(
        { error: "Company workspace not found." },
        { status: 404 },
      );
    }

    const companyName = company.name || "Your company";
    const publicSiteUrl = getPublicSiteUrl();
    const inviteUrl = publicSiteUrl
      ? `${publicSiteUrl}/invite/${invitation.token}`
      : `/invite/${invitation.token}`;

    const invitationEmail = buildCompanyInvitationEmail({
      companyName,
      invitedEmail: email,
      invitedRole: role,
      inviteUrl,
    });

    const emailResult = publicSiteUrl
      ? await sendEmail({
          to: email,
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

    await supabase.from("notifications").insert({
      title: "Invitation Created",
      message: `${email} was invited to ${companyName} as ${role}.`,
      type: "invitation",
      is_read: false,
      company_id: commandCompanyId,
    });

    await supabase.from("audit_logs").insert({
      action: "INVITATION_CREATED",
      entity_type: "invitation",
      entity_id: invitation.id,
      user_id: workspace.userId,
      company_id: commandCompanyId,
      metadata: {
        email,
        role,
        invite_url: inviteUrl,
        email_sent: emailResult.success,
        email_skipped: emailResult.skipped,
        email_id: emailResult.id,
        email_error: emailResult.error,
        invited_by: {
          id: workspace.userId,
          email: workspace.email,
          workspace_role: workspace.workspaceRole,
        },
        created_at: new Date().toISOString(),
      },
    });

    return NextResponse.json({
      success: true,
      invitation,
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
