import { NextResponse } from "next/server";

import {
  getCurrentWorkspaceContext,
  WorkspaceContextError,
  type WorkspaceContext,
} from "@/lib/auth/workspace-context";
import { canManageCompanyWorkspace } from "@/lib/authorization/workspace-permissions";
import {
  countGroupedQualifications,
  countPublicGroupedQualifications,
  groupCompanyQualifications,
  normalizeGroupedQualifications,
  type CompanyQualificationRecord,
  type GroupedCompanyQualifications,
} from "@/lib/company/qualifications";
import { createClient } from "@/lib/supabase/server";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

type ReplaceQualificationsResult = {
  success?: boolean;
  error_code?: string;
  error_message?: string;
  company_id?: string;
  qualification_count?: number;
  public_count?: number;
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

    console.error("Company qualifications workspace context lookup failed.", {
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

  if (
    errorCode === "FORBIDDEN" ||
    errorCode === "INVALID_COMPANY"
  ) {
    return 403;
  }

  return 400;
}

async function fetchGroupedQualifications(
  supabase: Awaited<ReturnType<typeof createClient>>,
  companyId: string,
): Promise<GroupedCompanyQualifications> {
  const { data, error } = await supabase
    .from("company_qualifications")
    .select(
      "id, company_id, qualification_type, name, issuer, credential_identifier, issued_on, expires_on, is_public, sort_order, created_at, updated_at",
    )
    .eq("company_id", companyId)
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });

  if (error) {
    throw error;
  }

  return groupCompanyQualifications(
    (data ?? []) as CompanyQualificationRecord[],
  );
}

export async function GET(
  _request: Request,
  context: RouteContext,
) {
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
            "An active workspace membership is required to view company qualifications.",
        },
        { status: 403 },
      );
    }

    if (workspace.companyId !== id) {
      return NextResponse.json(
        {
          error:
            "You can only view qualifications for your own company workspace.",
        },
        { status: 403 },
      );
    }

    const qualifications = await fetchGroupedQualifications(supabase, id);

    return NextResponse.json({
      success: true,
      qualifications,
    });
  } catch (error) {
    console.error("Unexpected company qualifications read failure.", {
      errorName: toSafeErrorName(error),
      errorCode: toSafeErrorCode(error),
    });

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
            "Only active organization owners and administrators can update company qualifications.",
        },
        { status: 403 },
      );
    }

    if (workspace.companyId !== id) {
      return NextResponse.json(
        {
          error:
            "You can only update qualifications for your own company workspace.",
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
      "qualifications" in body
        ? (body as { qualifications: unknown }).qualifications
        : body;

    const normalized = normalizeGroupedQualifications(payload);

    if (normalized.error) {
      return NextResponse.json(
        { error: normalized.error },
        { status: 400 },
      );
    }

    const { data: rpcResult, error: rpcError } = await supabase.rpc(
      "replace_company_qualifications",
      {
        p_company_id: id,
        p_qualifications: normalized.qualifications,
      },
    );

    if (rpcError) {
      console.error("Company qualifications replacement failed.", {
        companyId: id,
        userId: workspace.userId,
        errorCode: toSafeErrorCode(rpcError),
      });

      return NextResponse.json(
        { error: "Failed to update company qualifications." },
        { status: 500 },
      );
    }

    const result = (rpcResult ?? {}) as ReplaceQualificationsResult;

    if (!result.success) {
      return NextResponse.json(
        {
          error:
            result.error_message ||
            "Failed to update company qualifications.",
          errorCode: result.error_code,
        },
        { status: mapRpcErrorToStatus(result.error_code) },
      );
    }

    // replace_company_qualifications() writes the COMPANY_QUALIFICATIONS_UPDATED
    // audit row in its own transaction, so RPC success is the authoritative
    // write-and-audit result and the route must not emit a second event.
    const qualificationCount =
      result.qualification_count ??
      countGroupedQualifications(normalized.qualifications);
    const publicCount =
      result.public_count ??
      countPublicGroupedQualifications(normalized.qualifications);

    return NextResponse.json({
      success: true,
      qualifications: normalized.qualifications,
      qualificationCount,
      publicCount,
    });
  } catch (error) {
    console.error("Unexpected company qualifications update failure.", {
      errorName: toSafeErrorName(error),
      errorCode: toSafeErrorCode(error),
    });

    return NextResponse.json(
      { error: "Internal server error." },
      { status: 500 },
    );
  }
}
