import { NextResponse } from "next/server";

import {
  getCurrentWorkspaceContext,
  WorkspaceContextError,
} from "@/lib/auth/workspace-context";
import { canManageCompanyWorkspace } from "@/lib/authorization/workspace-permissions";
import { createClient } from "@/lib/supabase/server";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

function normalizeLogoUrl(value: unknown) {
  return String(value || "").trim();
}

function isAllowedLogoUrl(value: string) {
  if (!value || value.length > 2048) {
    return false;
  }

  try {
    const url = new URL(value);
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

    if (url.protocol !== "https:" || !supabaseUrl) {
      return false;
    }

    const allowedOrigin = new URL(supabaseUrl).origin;

    return (
      url.origin === allowedOrigin &&
      url.pathname.includes(
        "/storage/v1/object/public/Company-logos/",
      )
    );
  } catch {
    return false;
  }
}

export async function PATCH(
  request: Request,
  context: RouteContext,
) {
  try {
    const { id } = await context.params;

    let body: { logoUrl?: unknown };

    try {
      body = (await request.json()) as {
        logoUrl?: unknown;
      };
    } catch {
      return NextResponse.json(
        { error: "A valid request body is required." },
        { status: 400 },
      );
    }

    const logoUrl = normalizeLogoUrl(body.logoUrl);

    if (!isAllowedLogoUrl(logoUrl)) {
      return NextResponse.json(
        {
          error:
            "A valid Nexus Pavilion company logo URL is required.",
        },
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

      console.error("Company logo workspace context lookup failed.", {
        companyId: id,
        error,
      });

      return NextResponse.json(
        {
          error: "Unable to verify your workspace membership.",
        },
        { status: 403 },
      );
    }

    if (
      !workspace.membership ||
      !canManageCompanyWorkspace({
        workspaceRole: workspace.workspaceRole,
        membershipStatus: workspace.membershipStatus,
      })
    ) {
      return NextResponse.json(
        {
          error:
            "Only active organization owners and administrators can update company branding.",
        },
        { status: 403 },
      );
    }

    if (workspace.companyId !== id) {
      return NextResponse.json(
        {
          error:
            "You can only update branding for your own organization.",
        },
        { status: 403 },
      );
    }

    const { data: company, error: companyError } =
      await supabase
        .from("companies")
        .select("id, name, logo_url")
        .eq("id", id)
        .maybeSingle();

    if (companyError) {
      console.error("Company logo lookup failed.", {
        companyId: id,
        userId: workspace.userId,
        error: companyError,
      });

      return NextResponse.json(
        { error: "We could not verify the organization." },
        { status: 500 },
      );
    }

    if (!company) {
      return NextResponse.json(
        { error: "Company not found." },
        { status: 404 },
      );
    }

    const { data: updatedCompany, error: updateError } =
      await supabase
        .from("companies")
        .update({
          logo_url: logoUrl,
        })
        .eq("id", id)
        .select("id, name, logo_url")
        .maybeSingle();

    if (updateError || !updatedCompany) {
      console.error("Company logo update failed.", {
        companyId: id,
        userId: workspace.userId,
        error: updateError,
      });

      return NextResponse.json(
        { error: "Failed to update the company logo." },
        { status: 500 },
      );
    }

    const { error: auditError } = await supabase
      .from("audit_logs")
      .insert({
        action: "COMPANY_LOGO_UPDATED",
        entity_type: "company",
        entity_id: id,
        user_id: workspace.userId,
        company_id: id,
        metadata: {
          previous_logo_url: company.logo_url,
          new_logo_url: logoUrl,
          updated_by: {
            id: workspace.userId,
            email: workspace.email,
            workspace_role: workspace.workspaceRole,
            membership_type: workspace.membershipType,
          },
          updated_at: new Date().toISOString(),
        },
      });

    if (auditError) {
      console.error("Company logo audit failed.", {
        companyId: id,
        userId: workspace.userId,
        error: auditError,
      });
    }

    return NextResponse.json({
      success: true,
      company: updatedCompany,
    });
  } catch (error) {
    console.error("Unexpected company logo failure.", error);

    return NextResponse.json(
      { error: "Internal server error." },
      { status: 500 },
    );
  }
}