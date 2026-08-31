import { NextResponse } from "next/server";

import {
  getCurrentWorkspaceContext,
  WorkspaceContextError,
  type WorkspaceContext,
} from "@/lib/auth/workspace-context";
import {
  canArchiveCompanyWorkspace,
  canManageCompanyWorkspace,
  canReactivateCompanyWorkspace,
} from "@/lib/authorization/workspace-permissions";
import {
  getWorkspaceMembershipForUserCompany,
  MembershipLookupError,
} from "@/lib/auth/membership";
import { createClient } from "@/lib/supabase/server";
import {
  archiveCompanyWorkspace,
  reactivateCompanyWorkspace,
  WorkspaceCommandError,
} from "@/lib/workspace/commands";

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

function lifecycleCommandErrorResponse(error: unknown) {
  if (!(error instanceof WorkspaceCommandError)) {
    return NextResponse.json(
      { error: "Internal server error." },
      { status: 500 },
    );
  }

  const status =
    error.code === "UNAUTHENTICATED"
      ? 401
      : error.code === "FORBIDDEN"
        ? 403
        : error.code === "WORKSPACE_NOT_FOUND"
          ? 404
          : error.code === "INVALID_WORKSPACE_STATE" ||
              error.code === "OWNERSHIP_TRANSFER_PENDING"
            ? 409
            : 500;

  return NextResponse.json(
    { error: error.message },
    { status },
  );
}

export async function DELETE() {
  return NextResponse.json(
    {
      error:
        "Physical company deletion is disabled. Archive the workspace instead.",
    },
    {
      status: 405,
      headers: { Allow: "POST, PATCH" },
    },
  );
}

export async function POST(
  request: Request,
  context: RouteContext,
) {
  try {
    const { id } = await context.params;
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "Unauthorized." },
        { status: 401 },
      );
    }

    let membership;

    try {
      membership = await getWorkspaceMembershipForUserCompany(
        supabase,
        user.id,
        id,
      );
    } catch (error) {
      if (error instanceof MembershipLookupError) {
        console.error("Company lifecycle membership lookup failed.", {
          companyId: id,
          userId: user.id,
          error: error.cause,
        });
      }

      return NextResponse.json(
        { error: "Unable to verify lifecycle authority." },
        { status: 500 },
      );
    }

    if (!membership) {
      return NextResponse.json(
        { error: "Workspace lifecycle authority is not available." },
        { status: 403 },
      );
    }

    let body: { action?: unknown };

    try {
      body = (await request.json()) as { action?: unknown };
    } catch {
      return NextResponse.json(
        { error: "A lifecycle action is required." },
        { status: 400 },
      );
    }

    const action = String(body.action || "").trim().toLowerCase();
    const permissionContext = {
      workspaceRole: membership.workspaceRole,
      membershipStatus: membership.membershipStatus,
    };

    if (action === "archive") {
      if (!canArchiveCompanyWorkspace(permissionContext)) {
        return NextResponse.json(
          { error: "Only the active workspace owner can archive this workspace." },
          { status: 403 },
        );
      }

      try {
        await archiveCompanyWorkspace(supabase, { companyId: id });
      } catch (error) {
        return lifecycleCommandErrorResponse(error);
      }

      return NextResponse.json({
        success: true,
        workspaceStatus: "archived",
      });
    }

    if (action === "reactivate") {
      if (!canReactivateCompanyWorkspace(permissionContext)) {
        return NextResponse.json(
          { error: "Only the archived workspace owner can reactivate this workspace." },
          { status: 403 },
        );
      }

      try {
        await reactivateCompanyWorkspace(supabase, { companyId: id });
      } catch (error) {
        return lifecycleCommandErrorResponse(error);
      }

      return NextResponse.json({
        success: true,
        workspaceStatus: "active",
      });
    }

    return NextResponse.json(
      { error: "Lifecycle action must be archive or reactivate." },
      { status: 400 },
    );
  } catch (error) {
    console.error("Unexpected company lifecycle failure.", error);

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
