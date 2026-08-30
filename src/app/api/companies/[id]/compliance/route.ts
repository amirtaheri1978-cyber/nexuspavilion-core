import { NextResponse } from "next/server";

import {
  getCurrentWorkspaceContext,
  WorkspaceContextError,
  type WorkspaceContext,
} from "@/lib/auth/workspace-context";
import { canManageCompanyWorkspace } from "@/lib/authorization/workspace-permissions";
import {
  countGroupedCompliance,
  groupCompanyCompliance,
  normalizeGroupedCompliance,
  type CompanyComplianceRecord,
  type GroupedCompanyCompliance,
} from "@/lib/company/compliance";
import { createClient } from "@/lib/supabase/server";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

type ReplaceComplianceResult = {
  success?: boolean;
  error_code?: string;
  error_message?: string;
  company_id?: string;
  compliance_count?: number;
  counts_by_type?: Record<string, number>;
  audited?: boolean;
};

const SAFE_ERROR_TOKEN_PATTERN = /^[A-Za-z0-9_]{1,32}$/;

function readSafeErrorToken(error: unknown, property: "code" | "name"): string {
  const value =
    error && typeof error === "object" && property in error
      ? (error as Record<string, unknown>)[property]
      : undefined;

  if (typeof value === "string" && SAFE_ERROR_TOKEN_PATTERN.test(value)) {
    return value;
  }

  return "UNKNOWN";
}

// Errors raised by Postgres and Supabase can embed record values in their
// message/details/hint, so logs only ever carry structurally safe tokens.
function toSafeErrorCode(error: unknown): string {
  return readSafeErrorToken(error, "code");
}

function toSafeErrorName(error: unknown): string {
  return readSafeErrorToken(error, "name");
}

async function loadWorkspaceContext(
  supabase: Parameters<typeof getCurrentWorkspaceContext>[0],
  companyId: string,
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

    console.error("Company compliance workspace context lookup failed.", {
      companyId,
      errorName: toSafeErrorName(error),
      errorCode: toSafeErrorCode(error),
    });

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

  if (errorCode === "FORBIDDEN" || errorCode === "INVALID_COMPANY") {
    return 403;
  }

  return 400;
}

async function fetchGroupedCompliance(
  supabase: Awaited<ReturnType<typeof createClient>>,
  companyId: string,
): Promise<GroupedCompanyCompliance> {
  const { data, error } = await supabase
    .from("company_compliance")
    .select(
      "id, company_id, compliance_type, name, provider, effective_on, expires_on, sort_order, created_at, updated_at",
    )
    .eq("company_id", companyId)
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });

  if (error) {
    throw error;
  }

  return groupCompanyCompliance((data ?? []) as CompanyComplianceRecord[]);
}

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const supabase = await createClient();
    const contextResult = await loadWorkspaceContext(supabase, id);

    if (contextResult.response) {
      return contextResult.response;
    }

    const workspace = contextResult.workspace;

    if (!workspace.membership || workspace.membershipStatus !== "active") {
      return NextResponse.json(
        {
          error:
            "An active workspace membership is required to view company compliance.",
        },
        { status: 403 },
      );
    }

    if (workspace.companyId !== id) {
      return NextResponse.json(
        {
          error:
            "You can only view compliance for your own company workspace.",
        },
        { status: 403 },
      );
    }

    const compliance = await fetchGroupedCompliance(supabase, id);

    return NextResponse.json({
      success: true,
      compliance,
    });
  } catch (error) {
    console.error("Unexpected company compliance read failure.", {
      errorName: toSafeErrorName(error),
      errorCode: toSafeErrorCode(error),
    });

    return NextResponse.json(
      { error: "Internal server error." },
      { status: 500 },
    );
  }
}

export async function PUT(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const supabase = await createClient();

    // Authorization is fully resolved before the payload is inspected so that
    // unauthorized callers never receive payload-shaped feedback.
    const contextResult = await loadWorkspaceContext(supabase, id);

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
            "Only active organization owners and administrators can update company compliance.",
        },
        { status: 403 },
      );
    }

    if (workspace.companyId !== id) {
      return NextResponse.json(
        {
          error:
            "You can only update compliance for your own company workspace.",
        },
        { status: 403 },
      );
    }

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
      "compliance" in body
        ? (body as { compliance: unknown }).compliance
        : body;

    const normalized = normalizeGroupedCompliance(payload);

    if (normalized.error) {
      return NextResponse.json({ error: normalized.error }, { status: 400 });
    }

    const { data: rpcResult, error: rpcError } = await supabase.rpc(
      "replace_company_compliance",
      {
        p_company_id: id,
        p_compliance: normalized.compliance,
      },
    );

    if (rpcError) {
      console.error("Company compliance replacement failed.", {
        companyId: id,
        userId: workspace.userId,
        errorCode: toSafeErrorCode(rpcError),
      });

      return NextResponse.json(
        { error: "Failed to update company compliance." },
        { status: 500 },
      );
    }

    const result = (rpcResult ?? {}) as ReplaceComplianceResult;

    if (!result.success) {
      return NextResponse.json(
        {
          error:
            result.error_message || "Failed to update company compliance.",
          errorCode: result.error_code,
        },
        { status: mapRpcErrorToStatus(result.error_code) },
      );
    }

    // replace_company_compliance() writes the audit row in its own transaction,
    // so RPC success is the authoritative write-and-audit result and the route
    // must not emit a second event.
    const complianceCount =
      result.compliance_count ?? countGroupedCompliance(normalized.compliance);

    return NextResponse.json({
      success: true,
      compliance: normalized.compliance,
      complianceCount,
    });
  } catch (error) {
    console.error("Unexpected company compliance update failure.", {
      errorName: toSafeErrorName(error),
      errorCode: toSafeErrorCode(error),
    });

    return NextResponse.json(
      { error: "Internal server error." },
      { status: 500 },
    );
  }
}
