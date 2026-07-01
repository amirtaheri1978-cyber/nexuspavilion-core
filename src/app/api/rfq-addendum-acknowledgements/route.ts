import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

function normalizeText(value: unknown) {
return String(value || "").trim();
}

export async function GET(request: Request) {
const supabase = await createClient();
const { searchParams } = new URL(request.url);

const rfqId = normalizeText(searchParams.get("rfqId"));
const companyId = normalizeText(searchParams.get("companyId"));

if (!rfqId) {
return NextResponse.json({ error: "RFQ ID is required." }, { status: 400 });
}

let query = supabase
.from("rfq_addendum_acknowledgements")
.select("*")
.eq("rfq_id", rfqId)
.order("acknowledged_at", { ascending: false });

if (companyId) {
query = query.eq("company_id", companyId);
}

const { data, error } = await query;

if (error) {
return NextResponse.json(
{ error: error.message || "Failed to load acknowledgements." },
{ status: 500 }
);
}

return NextResponse.json({ acknowledgements: data || [] });
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

const { data: profile, error: profileError } = await supabase
.from("profiles")
.select("company_id")
.eq("id", user.id)
.single();

if (profileError || !profile?.company_id) {
return NextResponse.json(
{ error: "No company linked to profile." },
{ status: 400 }
);
}

const body = await request.json();

const rfqId = normalizeText(body.rfqId);
const addendumId = normalizeText(body.addendumId);

if (!rfqId || !addendumId) {
return NextResponse.json(
{ error: "RFQ ID and addendum ID are required." },
{ status: 400 }
);
}

const { data, error } = await supabase
.from("rfq_addendum_acknowledgements")
.upsert(
{
rfq_id: rfqId,
addendum_id: addendumId,
company_id: profile.company_id,
acknowledged_by: user.id,
acknowledged_at: new Date().toISOString(),
},
{
onConflict: "addendum_id,company_id",
}
)
.select()
.single();

if (error || !data) {
return NextResponse.json(
{ error: error?.message || "Failed to acknowledge addendum." },
{ status: 500 }
);
}

return NextResponse.json({
success: true,
acknowledgement: data,
});
}