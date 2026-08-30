import { NextResponse } from "next/server";

import {
  getCurrentWorkspaceContext,
  WorkspaceContextError,
  type WorkspaceContext,
} from "@/lib/auth/workspace-context";
import { canManageCompanyWorkspace } from "@/lib/authorization/workspace-permissions";
import {
  loadCompanyDocuments,
  normalizeCreateDocumentInputForCompany,
  toSafeErrorCode,
  toSafeErrorName,
  type CompanyDocumentRecord,
} from "@/lib/company/documents";
import { createClient } from "@/lib/supabase/server";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

type DocumentMutationResult = {
  success?: boolean;
  error_code?: string;
  error_message?: string;
  company_id?: string;
  document_id?: string;
  document_count?: number;
  audited?: boolean;
};

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

    console.error("Company documents workspace context lookup failed.", {
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

  if (errorCode === "DOCUMENT_NOT_FOUND") {
    return 404;
  }

  return 400;
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
            "An active workspace membership is required to view company documents.",
        },
        { status: 403 },
      );
    }

    if (workspace.companyId !== id) {
      return NextResponse.json(
        {
          error:
            "You can only view documents for your own company workspace.",
        },
        { status: 403 },
      );
    }

    const documents = await loadCompanyDocuments(supabase, id);

    return NextResponse.json({
      success: true,
      documents,
    });
  } catch (error) {
    console.error("Unexpected company documents read failure.", {
      errorName: toSafeErrorName(error),
      errorCode: toSafeErrorCode(error),
    });

    return NextResponse.json(
      { error: "Internal server error." },
      { status: 500 },
    );
  }
}

export async function POST(request: Request, context: RouteContext) {
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
            "Only active organization owners and administrators can create company documents.",
        },
        { status: 403 },
      );
    }

    if (workspace.companyId !== id) {
      return NextResponse.json(
        {
          error:
            "You can only create documents for your own company workspace.",
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

    const normalized = normalizeCreateDocumentInputForCompany(body, id);

    if (normalized.error) {
      return NextResponse.json({ error: normalized.error }, { status: 400 });
    }

    const { data: rpcResult, error: rpcError } = await supabase.rpc(
      "create_company_document",
      {
        p_company_id: id,
        p_document_id: normalized.document.id,
        p_document_type: normalized.document.document_type,
        p_title: normalized.document.title,
        p_file_name: normalized.document.file_name,
        p_file_path: normalized.document.file_path,
        p_file_type: normalized.document.file_type,
        p_file_size: normalized.document.file_size,
        p_issued_on: normalized.document.issued_on,
        p_expires_on: normalized.document.expires_on,
      },
    );

    if (rpcError) {
      console.error("Company document create failed.", {
        companyId: id,
        documentId: normalized.document.id,
        userId: workspace.userId,
        operation: "create",
        errorCode: toSafeErrorCode(rpcError),
      });

      return NextResponse.json(
        { error: "Failed to save the company document." },
        { status: 500 },
      );
    }

    const result = (rpcResult ?? {}) as DocumentMutationResult;

    if (!result.success) {
      return NextResponse.json(
        {
          error: result.error_message || "Failed to save the company document.",
          errorCode: result.error_code,
        },
        { status: mapRpcErrorToStatus(result.error_code) },
      );
    }

    const documents = (await loadCompanyDocuments(
      supabase,
      id,
    )) as CompanyDocumentRecord[];

    return NextResponse.json({
      success: true,
      documentId: result.document_id,
      documentCount: result.document_count,
      documents,
    });
  } catch (error) {
    console.error("Unexpected company document create failure.", {
      errorName: toSafeErrorName(error),
      errorCode: toSafeErrorCode(error),
    });

    return NextResponse.json(
      { error: "Internal server error." },
      { status: 500 },
    );
  }
}
