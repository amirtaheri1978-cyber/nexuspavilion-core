import { NextResponse } from "next/server";

import {
  getCurrentWorkspaceContext,
  WorkspaceContextError,
  type WorkspaceContext,
} from "@/lib/auth/workspace-context";
import { canManageCompanyWorkspace } from "@/lib/authorization/workspace-permissions";
import {
  countGroupedCapabilities,
  groupCompanyCapabilities,
  normalizeGroupedCapabilities,
  type CompanyCapabilityRecord,
  type GroupedCompanyCapabilities,
} from "@/lib/company/capabilities";
import { createClient } from "@/lib/supabase/server";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

type ReplaceCapabilitiesResult = {
  success?: boolean;
  error_code?: string;
  error_message?: string;
  company_id?: string;
  capability_count?: number;
};

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

    console.error("Company capabilities workspace context lookup failed.", error);

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

function mapRpcErrorToStatus(errorCode: string | undefined) {
  if (errorCode === "UNAUTHENTICATED") {
    return 401;
  }

  if (
    errorCode === "FORBIDDEN" ||
    errorCode === "INVALID_COMPANY"
  ) {
    return 403;
  }

  return 400;
}

async function fetchGroupedCapabilities(
  supabase: Awaited<ReturnType<typeof createClient>>,
  companyId: string,
): Promise<GroupedCompanyCapabilities> {
  const { data, error } = await supabase
    .from("company_capabilities")
    .select(
      "id, company_id, capability_type, label, sort_order, created_at, updated_at",
    )
    .eq("company_id", companyId)
    .order("sort_order", { ascending: true })
    .order("label", { ascending: true });

  if (error) {
    throw error;
  }

  return groupCompanyCapabilities(
    (data ?? []) as CompanyCapabilityRecord[],
  );
}

export async function GET(
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

    if (!workspace.membership || workspace.membershipStatus !== "active") {
      return NextResponse.json(
        {
          error:
            "An active workspace membership is required to view company capabilities.",
        },
        { status: 403 },
      );
    }

    if (workspace.companyId !== id) {
      return NextResponse.json(
        {
          error: "You can only view capabilities for your own company workspace.",
        },
        { status: 403 },
      );
    }

    const capabilities = await fetchGroupedCapabilities(supabase, id);

    return NextResponse.json({
      success: true,
      capabilities,
    });
  } catch (error) {
    console.error("Unexpected company capabilities read failure.", error);

    return NextResponse.json(
      { error: "Internal server error." },
      { status: 500 },
    );
  }
}

export async function PUT(
  request: Request,
  context: RouteContext,
) {
  try {
    const { id } = await context.params;

    let body: unknown;

    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "A valid request body is required." },
        { status: 400 },
      );
    }

    const payload =
      body &&
      typeof body === "object" &&
      !Array.isArray(body) &&
      "capabilities" in body
        ? (body as { capabilities: unknown }).capabilities
        : body;

    const normalized = normalizeGroupedCapabilities(payload);

    if (normalized.error) {
      return NextResponse.json(
        { error: normalized.error },
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
            "Only active organization owners and administrators can update company capabilities.",
        },
        { status: 403 },
      );
    }

    if (workspace.companyId !== id) {
      return NextResponse.json(
        {
          error:
            "You can only update capabilities for your own company workspace.",
        },
        { status: 403 },
      );
    }

    const { data: rpcResult, error: rpcError } = await supabase.rpc(
      "replace_company_capabilities",
      {
        p_company_id: id,
        p_capabilities: normalized.capabilities,
      },
    );

    if (rpcError) {
      console.error("Company capabilities replacement failed.", {
        companyId: id,
        userId: workspace.userId,
        error: rpcError,
      });

      return NextResponse.json(
        { error: "Failed to update company capabilities." },
        { status: 500 },
      );
    }

    const result = (rpcResult ?? {}) as ReplaceCapabilitiesResult;

    if (!result.success) {
      return NextResponse.json(
        {
          error:
            result.error_message ||
            "Failed to update company capabilities.",
          errorCode: result.error_code,
        },
        { status: mapRpcErrorToStatus(result.error_code) },
      );
    }

    const capabilityCount = countGroupedCapabilities(normalized.capabilities);

    const { error: auditError } = await supabase.from("audit_logs").insert({
      action: "COMPANY_CAPABILITIES_UPDATED",
      entity_type: "company",
      entity_id: id,
      user_id: workspace.userId,
      company_id: id,
      metadata: {
        capability_count: capabilityCount,
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
      console.error("Company capabilities update audit failed.", {
        companyId: id,
        userId: workspace.userId,
        error: auditError,
      });
    }

    return NextResponse.json({
      success: true,
      capabilities: normalized.capabilities,
      capabilityCount,
    });
  } catch (error) {
    console.error("Unexpected company capabilities update failure.", error);

    return NextResponse.json(
      { error: "Internal server error." },
      { status: 500 },
    );
  }
}
