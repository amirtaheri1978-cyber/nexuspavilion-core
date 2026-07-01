import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

type RFQ = {
id: string;
title: string | null;
description: string | null;
category: string | null;
location: string | null;
budget: number | string | null;
deadline: string | null;
company_id: string | null;
procurement_scope: string | null;
sourcing_method: string | null;
contract_framework: string | null;
nda_required?: boolean | null;
insurance_required?: boolean | null;
performance_bond_required?: boolean | null;
bid_bond_required?: boolean | null;
};

type Attachment = {
attachment_type: string | null;
};

function normalizeText(value: unknown) {
return String(value || "").trim();
}

function getRiskLevel(score: number) {
if (score >= 85) return "low";
if (score >= 65) return "medium";
return "high";
}

function hasAttachmentType(attachments: Attachment[], type: string) {
return attachments.some((attachment) => attachment.attachment_type === type);
}

function buildAiReview(rfq: RFQ, attachments: Attachment[]) {
let score = 45;

const missingItems: string[] = [];
const recommendations: string[] = [];

if (rfq.title && rfq.title.length > 3) score += 8;
else missingItems.push("RFQ title is missing or too short.");

if (rfq.description && rfq.description.length > 80) score += 14;
else {
missingItems.push("Scope of work is not detailed enough.");
recommendations.push(
"Expand the scope of work with inclusions, exclusions, site conditions, and quote expectations."
);
}

if (rfq.category) score += 6;
else missingItems.push("Category / trade is missing.");

if (rfq.location) score += 6;
else missingItems.push("Project location is missing.");

if (Number(rfq.budget || 0) > 0) score += 7;
else recommendations.push("Add a budget or target range to improve quote quality.");

if (rfq.deadline) score += 7;
else missingItems.push("Submission deadline is missing.");

if (rfq.procurement_scope) score += 5;
if (rfq.sourcing_method) score += 5;
if (rfq.contract_framework) score += 5;

const hasDrawings = hasAttachmentType(attachments, "drawing");
const hasSpecifications = hasAttachmentType(attachments, "specification");
const hasBoq = hasAttachmentType(attachments, "boq");
const hasPhotos = hasAttachmentType(attachments, "photo");
const hasAddenda = hasAttachmentType(attachments, "addenda");

if (hasDrawings) score += 8;
else recommendations.push("Upload drawings when available to reduce supplier assumptions.");

if (hasSpecifications) score += 7;
else recommendations.push("Upload technical specifications for larger or regulated packages.");

if (hasBoq) score += 6;
else recommendations.push("Upload a BOQ or pricing form to standardize supplier submissions.");

if (hasPhotos) score += 3;
if (hasAddenda) score += 2;

if (rfq.nda_required) score += 2;
if (rfq.insurance_required) score += 2;
if (rfq.performance_bond_required || rfq.bid_bond_required) score += 2;

const readinessScore = Math.max(0, Math.min(100, score));
const riskLevel = getRiskLevel(readinessScore);

const executiveSummary =
readinessScore >= 85
? "This RFQ appears well structured for supplier pricing and executive procurement review."
: readinessScore >= 65
? "This RFQ is usable, but several improvements would increase supplier response quality and reduce procurement risk."
: "This RFQ has material completeness gaps that may reduce quote accuracy, supplier confidence, and procurement comparability.";

if (recommendations.length === 0) {
recommendations.push("RFQ package is in strong condition for market release.");
}

if (missingItems.length === 0) {
missingItems.push("No critical required items detected.");
}

return {
readinessScore,
riskLevel,
executiveSummary,
missingItems,
recommendations,
};
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

if (!rfqId) {
return NextResponse.json({ error: "RFQ ID is required." }, { status: 400 });
}

const { data: rfqData, error: rfqError } = await supabase
.from("rfqs")
.select("*")
.eq("id", rfqId)
.single();

const rfq = rfqData as RFQ | null;

if (rfqError || !rfq?.company_id) {
return NextResponse.json(
{ error: rfqError?.message || "RFQ not found." },
{ status: 404 }
);
}

const { data: attachmentsData } = await supabase
.from("rfq_attachments")
.select("attachment_type")
.eq("rfq_id", rfqId);

const review = buildAiReview(rfq, (attachmentsData || []) as Attachment[]);

const { data, error } = await supabase
.from("rfq_ai_reviews")
.insert({
rfq_id: rfq.id,
company_id: rfq.company_id,
created_by: user.id,
readiness_score: review.readinessScore,
risk_level: review.riskLevel,
executive_summary: review.executiveSummary,
missing_items: review.missingItems.join("\n"),
recommendations: review.recommendations.join("\n"),
})
.select()
.single();

if (error || !data) {
return NextResponse.json(
{ error: error?.message || "Failed to create AI review." },
{ status: 500 }
);
}

return NextResponse.json({
success: true,
review: data,
});
}