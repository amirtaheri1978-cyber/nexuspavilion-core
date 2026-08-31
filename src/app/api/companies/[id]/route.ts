import { NextResponse } from "next/server";

import {
  getCurrentWorkspaceContext,
  WorkspaceContextError,
  type WorkspaceContext,
} from "@/lib/auth/workspace-context";
import {
  canDeleteCompanyWorkspace,
  canManageCompanyWorkspace,
} from "@/lib/authorization/workspace-permissions";
import { createClient } from "@/lib/supabase/server";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

const ALLOWED_CATEGORIES = [
  "Developer",
  "General Contractor",
  "Engineering Consultant",
  "Manufacturer",
  "Vendor / Supplier",
  "Subcontractor",
  "Architect",
  "Mixed-Use Development",
  "Infrastructure Engineering",
  "Supplier",
  "Painting",
];

const ALLOWED_NETWORK_ROLES = [
  "Owner / Developer",
  "General Contractor",
  "Architect / Designer",
  "Manufacturer",
  "Vendor / Supplier",
  "Consultant",
];

function normalizeText(value: unknown) {
  return String(value || "").trim();
}

function normalizeCategory(value: string) {
  if (!value) {
    return "Vendor / Supplier";
  }

  if (
    value === "Mixed Use Development" ||
    value === "Mixed-use Development"
  ) {
    return "Mixed-Use Development";
  }

  if (ALLOWED_CATEGORIES.includes(value)) {
    return value;
  }

  return "Vendor / Supplier";
}

function normalizeNetworkRole(value: string) {
  if (!value) {
    return "Vendor / Supplier";
  }

  if (ALLOWED_NETWORK_ROLES.includes(value)) {
    return value;
  }

  return "Vendor / Supplier";
}

async function loadWorkspaceContext(
  supabase: Parameters<typeof getCurrentWorkspaceContext>[0],
): Promise<
  | {
      workspace: WorkspaceContext;
      response: null;
    }
  | {
      workspace: null;
      response: NextResponse;
    }
> {
  try {
    const workspace = await getCurrentWorkspaceContext(supabase);

    return {
      workspace,
      response: null,
    };
  } catch (error) {
    if (
      error instanceof WorkspaceContextError &&
      error.code === "UNAUTHENTICATED"
    ) {
      return {
        workspace: null,
        response: NextResponse.json(
          { error: "Unauthorized." },
          { status: 401 },
        ),
      };
    }

    console.error("Company workspace context lookup failed.", error);

    return {
      workspace: null,
      response: NextResponse.json(
        {
          error: "Unable to verify your workspace membership.",
        },
        { status: 403 },
      ),
    };
  }
}

/*
 * 7-10D-DELETE is deliberately outside 7-10D-R47.
 *
 * This DELETE implementation is preserved from the published base so the
 * R-47 patch does not silently change a separate retention/lifecycle domain.
 * It is not represented as fixed or production-ready by 7-10D.
 */
export async function DELETE(
  _request: Request,
  context: RouteContext,
) {
  try {
    const { id } = await context.params;
    const supabase = await createClient();

    const contextResult = await loadWorkspaceContext(supabase);

    if (contextResult.response) {
      return contextResult.response;
    }

    const workspace = contextResult.workspace;

    if (
      !workspace.membership ||
      !canDeleteCompanyWorkspace({
        workspaceRole: workspace.workspaceRole,
        membershipStatus: workspace.membershipStatus,
      })
    ) {
      return NextResponse.json(
        {
          error:
            "Only active organization owners and administrators can delete a company workspace.",
        },
        { status: 403 },
      );
    }

    if (workspace.companyId !== id) {
      return NextResponse.json(
        {
          error:
            "You can only delete your own company workspace.",
        },
        { status: 403 },
      );
    }

    const { data: company, error: companyError } =
      await supabase
        .from("companies")
        .select("id, name")
        .eq("id", id)
        .maybeSingle();

    if (companyError) {
      console.error("Company deletion lookup failed.", {
        companyId: id,
        userId: workspace.userId,
        error: companyError,
      });

      return NextResponse.json(
        { error: "We could not verify the company workspace." },
        { status: 500 },
      );
    }

    if (!company) {
      return NextResponse.json(
        { error: "Company not found." },
        { status: 404 },
      );
    }

    const { error: deleteError } = await supabase
      .from("companies")
      .delete()
      .eq("id", id);

    if (deleteError) {
      console.error("Company deletion failed.", {
        companyId: id,
        userId: workspace.userId,
        error: deleteError,
      });

      return NextResponse.json(
        { error: "Failed to delete company." },
        { status: 500 },
      );
    }

    const { error: auditError } = await supabase
      .from("audit_logs")
      .insert({
        action: "COMPANY_DELETED",
        entity_type: "company",
        entity_id: id,
        user_id: workspace.userId,
        company_id: id,
        metadata: {
          company_name: company.name,
          deleted_by: {
            id: workspace.userId,
            email: workspace.email,
            workspace_role: workspace.workspaceRole,
            membership_type: workspace.membershipType,
          },
          deleted_at: new Date().toISOString(),
        },
      });

    if (auditError) {
      console.error("Company deletion audit failed.", {
        companyId: id,
        userId: workspace.userId,
        error: auditError,
      });
    }

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error("Unexpected company deletion failure.", error);

    return NextResponse.json(
      { error: "Internal server error." },
      { status: 500 },
    );
  }
}

export async function PATCH(
  request: Request,
  context: RouteContext,
) {
  try {
    const { id } = await context.params;

    let body: Record<string, unknown>;

    try {
      body = (await request.json()) as Record<string, unknown>;
    } catch {
      return NextResponse.json(
        { error: "A valid request body is required." },
        { status: 400 },
      );
    }

    const name = normalizeText(body.name);
    const category = normalizeCategory(
      normalizeText(body.category),
    );
    const location =
      normalizeText(body.location) || "Location N/A";
    const networkRole = normalizeNetworkRole(
      normalizeText(body.networkRole),
    );

    if (!name) {
      return NextResponse.json(
        { error: "Company name is required." },
        { status: 400 },
      );
    }

    const supabase = await createClient();
    const contextResult = await loadWorkspaceContext(supabase);

    if (contextResult.response) {
      return contextResult.response;
    }

    const workspace = contextResult.workspace;

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
            "Only active organization owners and administrators can update company workspace details.",
        },
        { status: 403 },
      );
    }

    if (workspace.companyId !== id) {
      return NextResponse.json(
        {
          error:
            "You can only update your own company workspace.",
        },
        { status: 403 },
      );
    }

    const { data: existingCompany, error: companyError } =
      await supabase
        .from("companies")
        .select("id")
        .eq("id", id)
        .maybeSingle();

    if (companyError) {
      console.error("Company update lookup failed.", {
        companyId: id,
        userId: workspace.userId,
        error: companyError,
      });

      return NextResponse.json(
        { error: "We could not verify the company workspace." },
        { status: 500 },
      );
    }

    if (!existingCompany) {
      return NextResponse.json(
        { error: "Company not found." },
        { status: 404 },
      );
    }

    const { data: updatedCompany, error: updateError } =
      await supabase
        .from("companies")
        .update({
          name,
          category,
          location,
          network_role: networkRole,
        })
        .eq("id", id)
        .select(
          "id, name, slug, category, location, network_role, status",
        )
        .maybeSingle();

    if (updateError || !updatedCompany) {
      console.error("Company update failed.", {
        companyId: id,
        userId: workspace.userId,
        error: updateError,
      });

      return NextResponse.json(
        { error: "Failed to update company." },
        { status: 500 },
      );
    }

    /*
     * 7-10D-R47 contract:
     * COMPANY_UPDATED audit evidence and the Company Profile Updated
     * notification are written by the database update-integrity trigger in
     * the same transaction as the protected company profile mutation.
     *
     * Do not reintroduce best-effort direct inserts into audit_logs or
     * notifications here.
     */

    return NextResponse.json({
      success: true,
      company: updatedCompany,
    });
  } catch (error) {
    console.error("Unexpected company update failure.", error);

    return NextResponse.json(
      { error: "Internal server error." },
      { status: 500 },
    );
  }
}
