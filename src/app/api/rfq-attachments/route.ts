import { NextResponse } from "next/server";

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
{ status: 500 }
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
const companyId = normalizeText(body.companyId);
const fileName = normalizeText(body.fileName);
const fileUrl = normalizeText(body.fileUrl);
const filePath = normalizeText(body.filePath);
const fileType = normalizeText(body.fileType);
const fileSize = Number(body.fileSize || 0);
const attachmentType = normalizeAttachmentType(body.attachmentType);
const revisionLabel = normalizeText(body.revisionLabel) || "Rev 0";

if (!rfqId || !companyId || !fileName || !fileUrl || !filePath) {
return NextResponse.json(
{ error: "RFQ ID, company ID, file name, file URL, and file path are required." },
{ status: 400 }
);
}

const { data, error } = await supabase
.from("rfq_attachments")
.insert({
rfq_id: rfqId,
company_id: companyId,
uploaded_by: user.id,
file_name: fileName,
file_url: fileUrl,
file_path: filePath,
file_type: fileType || null,
file_size: Number.isFinite(fileSize) ? fileSize : 0,
attachment_type: attachmentType,
revision_label: revisionLabel,
})
.select()
.single();

if (error || !data) {
return NextResponse.json(
{ error: error?.message || "Failed to save attachment." },
{ status: 500 }
);
}

return NextResponse.json({ success: true, attachment: data });
}