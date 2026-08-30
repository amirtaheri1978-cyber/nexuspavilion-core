import { NextResponse } from "next/server";

import {
  getCurrentWorkspaceContext,
  WorkspaceContextError,
  type WorkspaceContext,
} from "@/lib/auth/workspace-context";
import {
  COMPANY_DOCUMENTS_BUCKET,
  COMPANY_DOCUMENT_SIGNED_DOWNLOAD_TTL_SECONDS,
  isUuid,
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

    console.error("Company document download workspace context lookup failed.", {
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

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { id, documentId } = await context.params;
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
            "An active workspace membership is required to download company documents.",
        },
        { status: 403 },
      );
    }

    if (workspace.companyId !== id) {
      return NextResponse.json(
        {
          error:
            "You can only download documents for your own company workspace.",
        },
        { status: 403 },
      );
    }

    if (!isUuid(documentId)) {
      return NextResponse.json(
        { error: "A valid document ID is required." },
        { status: 400 },
      );
    }

    const { data: document, error: lookupError } = await supabase
      .from("company_documents")
      .select("id, company_id, file_path")
      .eq("id", documentId)
      .eq("company_id", id)
      .maybeSingle();

    if (lookupError) {
      console.error("Company document download lookup failed.", {
        companyId: id,
        documentId,
        userId: workspace.userId,
        operation: "download",
        errorCode: toSafeErrorCode(lookupError),
      });

      return NextResponse.json(
        { error: "Failed to prepare the document download." },
        { status: 500 },
      );
    }

    if (!document) {
      return NextResponse.json(
        { error: "Document not found." },
        { status: 404 },
      );
    }

    const { data, error } = await supabase.storage
      .from(COMPANY_DOCUMENTS_BUCKET)
      .createSignedUrl(
        document.file_path,
        COMPANY_DOCUMENT_SIGNED_DOWNLOAD_TTL_SECONDS,
      );

    if (error || !data?.signedUrl) {
      console.error("Company document signed download failed.", {
        companyId: id,
        documentId,
        userId: workspace.userId,
        operation: "download",
        errorCode: toSafeErrorCode(error),
      });

      return NextResponse.json(
        { error: "Failed to prepare the document download." },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      expiresIn: COMPANY_DOCUMENT_SIGNED_DOWNLOAD_TTL_SECONDS,
      downloadUrl: data.signedUrl,
    });
  } catch (error) {
    console.error("Unexpected company document download failure.", {
      errorName: toSafeErrorName(error),
      errorCode: toSafeErrorCode(error),
    });

    return NextResponse.json(
      { error: "Internal server error." },
      { status: 500 },
    );
  }
}
