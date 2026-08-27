import { NextResponse } from "next/server";

import { getActiveMembershipForUserCompany } from "@/lib/auth/membership";
import { canCreateCompanyRfq } from "@/lib/procurement/procurement-write-authorization";
import { createClient } from "@/lib/supabase/server";

const VALID_ATTACHMENT_TYPES = [
  "drawing",
  "specification",
  "boq",
  "photo",
  "addenda",
  "supporting",
];

function normalizeText(value: unknown) {
  return String(value || "").trim();
}

function normalizeAttachmentType(value: unknown) {
  const normalized = normalizeText(value);

  if (VALID_ATTACHMENT_TYPES.includes(normalized)) {
    return normalized;
  }

  return "supporting";
}

export async function GET(request: Request) {
  const supabase = await createClient();
  const { searchParams } = new URL(request.url);
  const rfqId = normalizeText(searchParams.get("rfqId"));

  if (!rfqId) {
    return NextResponse.json({ error: "RFQ ID is required." }, { status: 400 });
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

  return NextResponse.json({ attachments: data || [] });
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

  const body = await request.json();

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
    .select("id, company_id")
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
