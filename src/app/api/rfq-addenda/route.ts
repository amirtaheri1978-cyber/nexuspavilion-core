import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

function normalizeText(value: unknown) {
return String(value || "").trim();
}

function normalizeBoolean(value: unknown) {
return value === true || value === "true";
}

function normalizeNumber(value: unknown) {
const numberValue = Number(value);

if (!Number.isFinite(numberValue) || numberValue < 1) {
return 1;
}

return Math.round(numberValue);
}

export async function GET(request: Request) {
const supabase = await createClient();
const { searchParams } = new URL(request.url);
const rfqId = normalizeText(searchParams.get("rfqId"));

if (!rfqId) {
return NextResponse.json({ error: "RFQ ID is required." }, { status: 400 });
}

const { data, error } = await supabase
.from("rfq_addenda")
.select("*")
.eq("rfq_id", rfqId)
.order("addendum_number", { ascending: false })
.order("created_at", { ascending: false });

if (error) {
return NextResponse.json(
{ error: error.message || "Failed to load addenda." },
{ status: 500 }
);
}

return NextResponse.json({ addenda: data || [] });
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
const title = normalizeText(body.title);
const description = normalizeText(body.description);
const affectedDocuments = normalizeText(body.affectedDocuments);
const requiresAcknowledgement = normalizeBoolean(
body.requiresAcknowledgement ?? true
);

if (!rfqId || !companyId || !title) {
return NextResponse.json(
{ error: "RFQ ID, company ID, and title are required." },
{ status: 400 }
);
}

const { count } = await supabase
.from("rfq_addenda")
.select("id", { count: "exact", head: true })
.eq("rfq_id", rfqId);

const addendumNumber = normalizeNumber((count || 0) + 1);

const { data, error } = await supabase
.from("rfq_addenda")
.insert({
rfq_id: rfqId,
company_id: companyId,
created_by: user.id,
title,
description: description || null,
addendum_number: addendumNumber,
affected_documents: affectedDocuments || null,
requires_acknowledgement: requiresAcknowledgement,
})
.select()
.single();

if (error || !data) {
return NextResponse.json(
{ error: error?.message || "Failed to create addendum." },
{ status: 500 }
);
}

return NextResponse.json({ success: true, addendum: data });
}