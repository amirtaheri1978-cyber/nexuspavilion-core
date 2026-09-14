import { NextResponse } from "next/server";

import { getActiveMembershipForUserCompany } from "@/lib/auth/membership";
import { isRfqAttachmentType } from "@/lib/procurement/rfq-attachment-types";
import { canCreateCompanyRfq } from "@/lib/procurement/procurement-write-authorization";
import { createClient } from "@/lib/supabase/server";

function normalizeText(value: unknown) {
  return String(value || "").trim();
}

function normalizeAttachmentType(value: unknown) {
  const normalized = normalizeText(value);

  return isRfqAttachmentType(normalized) ? normalized : "supporting";
}

type AmendmentRpcResult = {
  success?: boolean;
  error_code?: string;
  error_message?: string;
  addendum_id?: string;
};

type GovernedAttachmentRemovalEvidence = {
  addendumId: string;
  rfqId: string;
  companyId: string;
  filePath: string;
};

type PendingAttachmentCleanupRow = {
  attachment_id?: unknown;
  addendum_id?: unknown;
  rfq_id?: unknown;
  company_id?: unknown;
  file_name?: unknown;
  file_path?: unknown;
  file_size?: unknown;
  attachment_type?: unknown;
  revision_label?: unknown;
  created_at?: unknown;
};

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function getAmendmentEvidence(body: Record<string, unknown>) {
  return {
    title: normalizeText(body.addendumTitle),
    reason: normalizeText(body.amendmentReason),
    description: normalizeText(body.addendumDescription),
  };
}

function amendmentFailure(
  result: AmendmentRpcResult | null,
  fallback: string,
) {
  const status =
    result?.error_code === "UNAUTHENTICATED"
      ? 401
      : result?.error_code === "FORBIDDEN"
        ? 403
        : result?.error_code === "RFQ_NOT_FOUND"
          ? 404
          : 409;

  return NextResponse.json(
    { error: result?.error_message || fallback },
    { status },
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isValidAttachmentPath(
  filePath: string,
  companyId: string,
  rfqId: string,
) {
  const pathSegments = filePath.split("/");

  return (
    pathSegments.length >= 4 &&
    pathSegments[0] === companyId &&
    pathSegments[1] === rfqId &&
    pathSegments.every(
      (segment) => segment.length > 0 && segment !== "." && segment !== "..",
    ) &&
    !filePath.includes("\\")
  );
}

function getSafeStorageErrorCode(error: unknown) {
  if (!isRecord(error)) return "UNKNOWN_STORAGE_ERROR";

  const code = error.statusCode ?? error.status ?? error.name;
  return typeof code === "string" || typeof code === "number"
    ? String(code)
    : "UNKNOWN_STORAGE_ERROR";
}

async function findGovernedRemovalEvidence(
  supabase: Awaited<ReturnType<typeof createClient>>,
  attachmentId: string,
): Promise<GovernedAttachmentRemovalEvidence | null> {
  const affectedKey = `attachment:${attachmentId}`;
  const { data, error } = await supabase
    .from("rfq_addenda")
    .select(
      "id, rfq_id, company_id, affected_fields, amendment_before, amendment_after, addendum_number",
    )
    .contains("affected_fields", [affectedKey])
    .order("addendum_number", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data) return null;

  const before = isRecord(data.amendment_before)
    ? data.amendment_before
    : null;
  const after = isRecord(data.amendment_after) ? data.amendment_after : null;
  const attachmentBefore = before?.[affectedKey];

  if (
    !Array.isArray(data.affected_fields) ||
    !data.affected_fields.includes(affectedKey) ||
    !isRecord(attachmentBefore) ||
    !after ||
    !Object.prototype.hasOwnProperty.call(after, affectedKey) ||
    after[affectedKey] !== null
  ) {
    return null;
  }

  const rfqId = normalizeText(data.rfq_id);
  const companyId = normalizeText(data.company_id);
  const addendumId = normalizeText(data.id);
  const filePath = normalizeText(attachmentBefore.file_path);

  if (
    normalizeText(attachmentBefore.id) !== attachmentId ||
    normalizeText(attachmentBefore.rfq_id) !== rfqId ||
    normalizeText(attachmentBefore.company_id) !== companyId ||
    !UUID_PATTERN.test(addendumId) ||
    !UUID_PATTERN.test(rfqId) ||
    !UUID_PATTERN.test(companyId) ||
    !isValidAttachmentPath(filePath, companyId, rfqId)
  ) {
    return null;
  }

  return {
    addendumId,
    rfqId,
    companyId,
    filePath,
  };
}

async function removeGovernedStorageObject({
  supabase,
  attachmentId,
  rfqId,
  userId,
  filePath,
  operation,
}: {
  supabase: Awaited<ReturnType<typeof createClient>>;
  attachmentId: string;
  rfqId: string;
  userId: string;
  filePath: string;
  operation: "initial_cleanup" | "retry_cleanup";
}) {
  const { error } = await supabase.storage
    .from("rfq-attachments")
    .remove([filePath]);

  if (error) {
    console.error("Governed RFQ attachment storage cleanup failed.", {
      rfqId,
      attachmentId,
      userId,
      operation,
      errorCode: getSafeStorageErrorCode(error),
    });
  }

  return error;
}

function governedStorageCleanupFailure(
  attachmentId: string,
  addendumId: string | undefined,
) {
  return NextResponse.json(
    {
      error:
        "The governed attachment record was removed, but storage cleanup is pending. Retry cleanup; no additional Addendum will be created.",
      attachmentId,
      addendumId,
      storageCleanupPending: true,
      retryable: true,
    },
    { status: 502 },
  );
}

export async function GET(request: Request) {
  const supabase = await createClient();
  const { searchParams } = new URL(request.url);
  const rfqId = normalizeText(searchParams.get("rfqId"));

  if (!UUID_PATTERN.test(rfqId)) {
    return NextResponse.json(
      { error: "A valid RFQ ID is required." },
      { status: 400 },
    );
  }

  const { data, error } = await supabase
    .from("rfq_attachments")
    .select("*")
    .eq("rfq_id", rfqId)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json(
      { error: error.message || "Failed to load attachments." },
      { status: 500 },
    );
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  let pendingCleanupAttachments: Array<Record<string, unknown>> = [];

  if (user) {
    const { data: pendingData, error: pendingError } = await supabase.rpc(
      "list_pending_rfq_attachment_cleanups",
      { p_rfq_id: rfqId },
    );

    if (pendingError) {
      console.error("Pending RFQ attachment cleanup discovery failed.", {
        rfqId,
        userId: user.id,
      });

      return NextResponse.json(
        { error: "Unable to load pending attachment cleanup state." },
        { status: 500 },
      );
    }

    const pendingRows = Array.isArray(pendingData) ? pendingData : [];

    pendingCleanupAttachments = pendingRows.reduce<Array<Record<string, unknown>>>(
      (accumulator, row) => {
        if (!isRecord(row)) return accumulator;

        const pending = row as PendingAttachmentCleanupRow;
        const attachmentId = normalizeText(pending.attachment_id);
        const addendumId = normalizeText(pending.addendum_id);
        const pendingRfqId = normalizeText(pending.rfq_id);
        const companyId = normalizeText(pending.company_id);
        const fileName = normalizeText(pending.file_name);
        const filePath = normalizeText(pending.file_path);
        const rawFileSize = Number(pending.file_size);

        if (
          !UUID_PATTERN.test(attachmentId) ||
          !UUID_PATTERN.test(addendumId) ||
          pendingRfqId !== rfqId ||
          !UUID_PATTERN.test(companyId) ||
          !fileName ||
          !isValidAttachmentPath(filePath, companyId, rfqId)
        ) {
          return accumulator;
        }

        accumulator.push({
          id: attachmentId,
          file_name: fileName,
          file_path: filePath,
          file_size:
            Number.isFinite(rawFileSize) && rawFileSize >= 0
              ? rawFileSize
              : null,
          attachment_type: normalizeAttachmentType(pending.attachment_type),
          revision_label: normalizeText(pending.revision_label) || "Rev 0",
          created_at: normalizeText(pending.created_at) || null,
          cleanup_pending: true,
          cleanup_addendum_id: addendumId,
        });

        return accumulator;
      },
      [],
    );
  }

  return NextResponse.json({
    attachments: [...(data || []), ...pendingCleanupAttachments],
  });
}

export async function POST(request: Request) {
  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const body = (await request.json()) as Record<string, unknown>;

  const rfqId = normalizeText(body.rfqId);
  const fileName = normalizeText(body.fileName);
  const filePath = normalizeText(body.filePath);
  const fileType = normalizeText(body.fileType);
  const fileSize = Number(body.fileSize || 0);
  const attachmentType = normalizeAttachmentType(body.attachmentType);
  const revisionLabel = normalizeText(body.revisionLabel) || "Rev 0";

  if (!rfqId || !fileName || !filePath) {
    return NextResponse.json(
      {
        error: "RFQ ID, file name, and file path are required.",
      },
      { status: 400 },
    );
  }

  const { data: rfq, error: rfqError } = await supabase
    .from("rfqs")
    .select("id, company_id, status")
    .eq("id", rfqId)
    .maybeSingle();

  if (rfqError || !rfq) {
    return NextResponse.json({ error: "RFQ not found." }, { status: 404 });
  }

  let membership;

  try {
    membership = await getActiveMembershipForUserCompany(
      supabase,
      user.id,
      rfq.company_id,
    );
  } catch (membershipError) {
    console.error(
      "Attachment create membership lookup failed:",
      membershipError,
    );

    return NextResponse.json(
      { error: "Unable to verify organization membership." },
      { status: 500 },
    );
  }

  if (!canCreateCompanyRfq(membership, rfq.company_id)) {
    return NextResponse.json(
      {
        error:
          "Only owners, admins, and buyers for the issuing company can upload attachments.",
      },
      { status: 403 },
    );
  }

  if (rfq.status !== "draft") {
    const evidence = getAmendmentEvidence(body);

    if (!evidence.title || !evidence.reason) {
      return NextResponse.json(
        {
          error:
            "Published RFQ attachment changes require an Addendum title and amendment reason.",
        },
        { status: 400 },
      );
    }

    const { data: rpcData, error: rpcError } = await supabase.rpc(
      "amend_published_rfq_package",
      {
        p_rfq_id: rfqId,
        p_change: {
          operation: "add_attachment",
          file_name: fileName,
          file_path: filePath,
          file_type: fileType || null,
          file_size:
            Number.isFinite(fileSize) && fileSize >= 0 ? fileSize : 0,
          attachment_type: attachmentType,
          revision_label: revisionLabel,
        },
        p_reason: evidence.reason,
        p_title: evidence.title,
        p_description: evidence.description || null,
        p_requires_acknowledgement: true,
      },
    );
    const result = rpcData as AmendmentRpcResult | null;

    if (rpcError || !result?.success) {
      return amendmentFailure(
        result,
        rpcError?.message || "Failed to register governed RFQ attachment.",
      );
    }

    const { data: attachment, error: attachmentError } = await supabase
      .from("rfq_attachments")
      .select("*")
      .eq("file_path", filePath)
      .maybeSingle();

    if (attachmentError || !attachment) {
      return NextResponse.json(
        {
          error:
            "The governed attachment was registered, but its record could not be reloaded.",
        },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      attachment,
      addendumId: result.addendum_id,
    });
  }

  const { data, error } = await supabase
    .from("rfq_attachments")
    .insert({
      rfq_id: rfqId,
      file_name: fileName,
      file_path: filePath,
      file_type: fileType || null,
      file_size: Number.isFinite(fileSize) && fileSize >= 0 ? fileSize : 0,
      attachment_type: attachmentType,
      revision_label: revisionLabel,
    })
    .select()
    .single();

  if (error || !data) {
    return NextResponse.json(
      { error: error?.message || "Failed to save attachment." },
      { status: 500 },
    );
  }

  return NextResponse.json({ success: true, attachment: data });
}

export async function DELETE(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const body = (await request.json()) as Record<string, unknown>;
  const attachmentId = normalizeText(body.attachmentId);

  if (!UUID_PATTERN.test(attachmentId)) {
    return NextResponse.json(
      { error: "A valid attachment ID is required." },
      { status: 400 },
    );
  }

  const { data: attachment, error: attachmentError } = await supabase
    .from("rfq_attachments")
    .select("id, rfq_id, file_path")
    .eq("id", attachmentId)
    .maybeSingle();

  if (attachmentError) {
    return NextResponse.json(
      { error: "Unable to load the RFQ attachment." },
      { status: 500 },
    );
  }

  const retryEvidence = attachment
    ? null
    : await findGovernedRemovalEvidence(supabase, attachmentId);

  if (!attachment && !retryEvidence) {
    return NextResponse.json(
      { error: "Eligible governed attachment cleanup was not found." },
      { status: 404 },
    );
  }

  const rfqId = attachment?.rfq_id ?? retryEvidence!.rfqId;
  const expectedCompanyId = retryEvidence?.companyId;

  const { data: rfq, error: rfqError } = await supabase
    .from("rfqs")
    .select("id, company_id, status")
    .eq("id", rfqId)
    .maybeSingle();

  if (
    rfqError ||
    !rfq ||
    (expectedCompanyId && rfq.company_id !== expectedCompanyId)
  ) {
    return NextResponse.json({ error: "RFQ not found." }, { status: 404 });
  }

  let membership;

  try {
    membership = await getActiveMembershipForUserCompany(
      supabase,
      user.id,
      rfq.company_id,
    );
  } catch {
    return NextResponse.json(
      { error: "Unable to verify organization membership." },
      { status: 500 },
    );
  }

  if (!canCreateCompanyRfq(membership, rfq.company_id)) {
    return NextResponse.json(
      {
        error:
          "Only owners, admins, and buyers for the issuing company can remove attachments.",
      },
      { status: 403 },
    );
  }

  if (retryEvidence) {
    if (rfq.status === "draft") {
      return NextResponse.json(
        { error: "Governed attachment cleanup is not valid for a draft RFQ." },
        { status: 409 },
      );
    }

    const storageError = await removeGovernedStorageObject({
      supabase,
      attachmentId,
      rfqId: rfq.id,
      userId: user.id,
      filePath: retryEvidence.filePath,
      operation: "retry_cleanup",
    });

    if (storageError) {
      return governedStorageCleanupFailure(
        attachmentId,
        retryEvidence.addendumId,
      );
    }

    return NextResponse.json({
      success: true,
      attachmentId,
      addendumId: retryEvidence.addendumId,
      storageCleanupRetried: true,
    });
  }

  if (!attachment) {
    return NextResponse.json(
      { error: "Eligible governed attachment cleanup was not found." },
      { status: 404 },
    );
  }

  let addendumId: string | undefined;

  if (rfq.status === "draft") {
    const { error } = await supabase
      .from("rfq_attachments")
      .delete()
      .eq("id", attachment.id);

    if (error) {
      return NextResponse.json(
        { error: error.message || "Failed to remove attachment." },
        { status: 500 },
      );
    }

    const { error: storageError } = await supabase.storage
      .from("rfq-attachments")
      .remove([attachment.file_path]);

    return NextResponse.json({
      success: true,
      attachmentId: attachment.id,
      storageCleanupPending: Boolean(storageError),
    });
  } else {
    const evidence = getAmendmentEvidence(body);

    if (!evidence.title || !evidence.reason) {
      return NextResponse.json(
        {
          error:
            "Published RFQ attachment changes require an Addendum title and amendment reason.",
        },
        { status: 400 },
      );
    }

    const { data: rpcData, error: rpcError } = await supabase.rpc(
      "amend_published_rfq_package",
      {
        p_rfq_id: rfq.id,
        p_change: {
          operation: "remove_attachment",
          attachment_id: attachment.id,
        },
        p_reason: evidence.reason,
        p_title: evidence.title,
        p_description: evidence.description || null,
        p_requires_acknowledgement: true,
      },
    );
    const result = rpcData as AmendmentRpcResult | null;

    if (rpcError || !result?.success) {
      return amendmentFailure(
        result,
        rpcError?.message || "Failed to remove governed RFQ attachment.",
      );
    }

    addendumId = result.addendum_id;
  }

  const storageError = await removeGovernedStorageObject({
    supabase,
    attachmentId: attachment.id,
    rfqId: rfq.id,
    userId: user.id,
    filePath: attachment.file_path,
    operation: "initial_cleanup",
  });

  if (storageError) {
    return governedStorageCleanupFailure(attachment.id, addendumId);
  }

  return NextResponse.json({
    success: true,
    attachmentId: attachment.id,
    addendumId,
    storageCleanupPending: false,
  });
}
