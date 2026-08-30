import { NextResponse } from "next/server";

import {
  getCurrentWorkspaceContext,
  WorkspaceContextError,
  type WorkspaceContext,
} from "@/lib/auth/workspace-context";
import { canManageCompanyWorkspace } from "@/lib/authorization/workspace-permissions";
import {
  buildCompanyDocumentPath,
  COMPANY_DOCUMENTS_BUCKET,
  isUuid,
  normalizeUploadIntentInput,
  toSafeErrorCode,
  toSafeErrorName,
} from "@/lib/company/documents";
import { createClient } from "@/lib/supabase/server";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
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

    console.error("Company document upload workspace context lookup failed.", {
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
            "Only active organization owners and administrators can upload company documents.",
        },
        { status: 403 },
      );
    }

    if (workspace.companyId !== id) {
      return NextResponse.json(
        {
          error:
            "You can only upload documents for your own company workspace.",
        },
        { status: 403 },
      );
    }

    if (!isUuid(id)) {
      return NextResponse.json(
        { error: "A valid company ID is required." },
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

    const normalized = normalizeUploadIntentInput(body);

    if (normalized.error || !normalized.intent) {
      return NextResponse.json(
        { error: normalized.error || "Upload intent is invalid." },
        { status: 400 },
      );
    }

    if (normalized.intent.documentId) {
      const { data: replacementTarget, error: lookupError } = await supabase
        .from("company_documents")
        .select("id")
        .eq("id", normalized.intent.documentId)
        .eq("company_id", id)
        .maybeSingle();

      if (lookupError) {
        console.error("Company document replacement target lookup failed.", {
          companyId: id,
          documentId: normalized.intent.documentId,
          userId: workspace.userId,
          operation: "replacement_target_lookup",
          errorCode: toSafeErrorCode(lookupError),
        });

        return NextResponse.json(
          { error: "Failed to prepare the document upload." },
          { status: 500 },
        );
      }

      if (!replacementTarget) {
        return NextResponse.json(
          { error: "Document not found." },
          { status: 404 },
        );
      }
    }

    const documentId = normalized.intent.documentId ?? crypto.randomUUID();
    const objectId = crypto.randomUUID();
    const filePath = buildCompanyDocumentPath(
      id,
      documentId,
      objectId,
      normalized.intent.extension,
    );

    const { data, error } = await supabase.storage
      .from(COMPANY_DOCUMENTS_BUCKET)
      .createSignedUploadUrl(filePath);

    if (error || !data?.token || !data.path) {
      console.error("Company document upload intent failed.", {
        companyId: id,
        documentId,
        userId: workspace.userId,
        operation: "upload_intent",
        errorCode: toSafeErrorCode(error),
      });

      return NextResponse.json(
        { error: "Failed to prepare the document upload." },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      documentId,
      path: data.path,
      token: data.token,
    });
  } catch (error) {
    console.error("Unexpected company document upload intent failure.", {
      errorName: toSafeErrorName(error),
      errorCode: toSafeErrorCode(error),
    });

    return NextResponse.json(
      { error: "Internal server error." },
      { status: 500 },
    );
  }
}
