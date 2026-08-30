import { NextResponse } from "next/server";

import {
  getCurrentWorkspaceContext,
  WorkspaceContextError,
  type WorkspaceContext,
} from "@/lib/auth/workspace-context";
import { canManageCompanyWorkspace } from "@/lib/authorization/workspace-permissions";
import {
  COMPANY_DOCUMENTS_BUCKET,
  isUuid,
  isValidCompanyDocumentPath,
  loadCompanyDocuments,
  normalizeDocumentMetadataPatch,
  toSafeErrorCode,
  toSafeErrorName,
} from "@/lib/company/documents";
import { createClient } from "@/lib/supabase/server";

type RouteContext = {
  params: Promise<{
    id: string;
    documentId: string;
  }>;
};

type DocumentMutationResult = {
  success?: boolean;
  error_code?: string;
  error_message?: string;
  company_id?: string;
  document_id?: string;
  old_file_path?: string | null;
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

    console.error("Company document item workspace context lookup failed.", {
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

async function authorizeManager(
  supabase: Awaited<ReturnType<typeof createClient>>,
  companyId: string,
) {
  const contextResult = await loadWorkspaceContext(supabase, companyId);

  if (contextResult.response) {
    return contextResult;
  }

  const workspace = contextResult.workspace;

  if (
    !workspace.membership ||
    !canManageCompanyWorkspace({
      workspaceRole: workspace.workspaceRole,
      membershipStatus: workspace.membershipStatus,
    })
  ) {
    return {
      workspace: null,
      response: NextResponse.json(
        {
          error:
            "Only active organization owners and administrators can manage company documents.",
        },
        { status: 403 },
      ),
    };
  }

  if (workspace.companyId !== companyId) {
    return {
      workspace: null,
      response: NextResponse.json(
        {
          error:
            "You can only manage documents for your own company workspace.",
        },
        { status: 403 },
      ),
    };
  }

  return {
    workspace,
    response: null,
  };
}

async function removeStorageObject(
  supabase: Awaited<ReturnType<typeof createClient>>,
  companyId: string,
  documentId: string,
  userId: string,
  operation: "replace_cleanup" | "delete_cleanup",
  filePath: string,
) {
  const { error } = await supabase.storage
    .from(COMPANY_DOCUMENTS_BUCKET)
    .remove([filePath]);

  if (error) {
    console.error("Company document storage cleanup failed.", {
      companyId,
      documentId,
      userId,
      operation,
      errorCode: "COMPANY_DOCUMENT_STORAGE_CLEANUP_FAILED",
    });
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { id, documentId } = await context.params;
    const supabase = await createClient();

    // Authorization is fully resolved before the payload is inspected so that
    // unauthorized callers never receive payload-shaped feedback.
    const contextResult = await authorizeManager(supabase, id);

    if (contextResult.response || !contextResult.workspace) {
      return contextResult.response;
    }

    const workspace = contextResult.workspace;

    if (!isUuid(documentId)) {
      return NextResponse.json(
        { error: "A valid document ID is required." },
        { status: 400 },
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

    const normalized = normalizeDocumentMetadataPatch(body);

    if (normalized.error || !normalized.patch) {
      return NextResponse.json(
        { error: normalized.error || "Document payload is invalid." },
        { status: 400 },
      );
    }

    if (
      normalized.patch.replacement &&
      !isValidCompanyDocumentPath(
        normalized.patch.replacement.file_path,
        id,
        documentId,
        normalized.patch.replacement.file_name,
      )
    ) {
      return NextResponse.json(
        { error: "File path is invalid." },
        { status: 400 },
      );
    }

    const { data: rpcResult, error: rpcError } = await supabase.rpc(
      "update_company_document",
      {
        p_company_id: id,
        p_document_id: documentId,
        p_document_type: normalized.patch.document_type,
        p_title: normalized.patch.title,
        p_file_name: normalized.patch.replacement?.file_name ?? null,
        p_file_path: normalized.patch.replacement?.file_path ?? null,
        p_file_type: normalized.patch.replacement?.file_type ?? null,
        p_file_size: normalized.patch.replacement?.file_size ?? null,
        p_issued_on: normalized.patch.issued_on,
        p_expires_on: normalized.patch.expires_on,
      },
    );

    if (rpcError) {
      console.error("Company document update failed.", {
        companyId: id,
        documentId,
        userId: workspace.userId,
        operation: "update",
        errorCode: toSafeErrorCode(rpcError),
      });

      return NextResponse.json(
        { error: "Failed to update the company document." },
        { status: 500 },
      );
    }

    const result = (rpcResult ?? {}) as DocumentMutationResult;

    if (!result.success) {
      return NextResponse.json(
        {
          error:
            result.error_message || "Failed to update the company document.",
          errorCode: result.error_code,
        },
        { status: mapRpcErrorToStatus(result.error_code) },
      );
    }

    if (result.old_file_path) {
      await removeStorageObject(
        supabase,
        id,
        documentId,
        workspace.userId,
        "replace_cleanup",
        result.old_file_path,
      );
    }

    const documents = await loadCompanyDocuments(supabase, id);

    return NextResponse.json({
      success: true,
      documentId: result.document_id,
      documentCount: result.document_count,
      documents,
    });
  } catch (error) {
    console.error("Unexpected company document update failure.", {
      errorName: toSafeErrorName(error),
      errorCode: toSafeErrorCode(error),
    });

    return NextResponse.json(
      { error: "Internal server error." },
      { status: 500 },
    );
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const { id, documentId } = await context.params;
    const supabase = await createClient();
    const contextResult = await authorizeManager(supabase, id);

    if (contextResult.response || !contextResult.workspace) {
      return contextResult.response;
    }

    const workspace = contextResult.workspace;

    if (!isUuid(documentId)) {
      return NextResponse.json(
        { error: "A valid document ID is required." },
        { status: 400 },
      );
    }

    const { data: rpcResult, error: rpcError } = await supabase.rpc(
      "delete_company_document",
      {
        p_company_id: id,
        p_document_id: documentId,
      },
    );

    if (rpcError) {
      console.error("Company document delete failed.", {
        companyId: id,
        documentId,
        userId: workspace.userId,
        operation: "delete",
        errorCode: toSafeErrorCode(rpcError),
      });

      return NextResponse.json(
        { error: "Failed to delete the company document." },
        { status: 500 },
      );
    }

    const result = (rpcResult ?? {}) as DocumentMutationResult;

    if (!result.success) {
      return NextResponse.json(
        {
          error:
            result.error_message || "Failed to delete the company document.",
          errorCode: result.error_code,
        },
        { status: mapRpcErrorToStatus(result.error_code) },
      );
    }

    if (result.old_file_path) {
      await removeStorageObject(
        supabase,
        id,
        documentId,
        workspace.userId,
        "delete_cleanup",
        result.old_file_path,
      );
    }

    const documents = await loadCompanyDocuments(supabase, id);

    return NextResponse.json({
      success: true,
      documentId: result.document_id,
      documentCount: result.document_count,
      documents,
    });
  } catch (error) {
    console.error("Unexpected company document delete failure.", {
      errorName: toSafeErrorName(error),
      errorCode: toSafeErrorCode(error),
    });

    return NextResponse.json(
      { error: "Internal server error." },
      { status: 500 },
    );
  }
}
