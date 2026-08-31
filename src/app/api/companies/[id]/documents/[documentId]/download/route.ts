import { NextResponse } from "next/server";

import {
  getWorkspaceMembershipForUserCompany,
} from "@/lib/auth/membership";
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

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { id, documentId } = await context.params;
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

    let lifecycleMembership;

    try {
      lifecycleMembership =
        await getWorkspaceMembershipForUserCompany(
          supabase,
          user.id,
          id,
        );
    } catch (error) {
      console.error(
        "Company document lifecycle membership lookup failed.",
        {
          companyId: id,
          userId: user.id,
          operation: "download",
          errorName: toSafeErrorName(error),
          errorCode: toSafeErrorCode(error),
        },
      );

      return NextResponse.json(
        { error: "Unable to verify document access." },
        { status: 500 },
      );
    }

    if (
      !lifecycleMembership ||
      !["active", "archived"].includes(
        lifecycleMembership.membershipStatus,
      )
    ) {
      return NextResponse.json(
        {
          error:
            "An active or archived workspace membership is required to download retained company documents.",
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
        userId: user.id,
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
        userId: user.id,
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
