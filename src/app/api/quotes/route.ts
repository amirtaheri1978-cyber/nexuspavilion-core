import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

function calculateScore(amount: number, timeline: string) {
const timelineValue = timeline.toLowerCase();

let timelineScore = 50;

if (timelineValue.includes("q1")) timelineScore = 100;
if (timelineValue.includes("q2")) timelineScore = 85;
if (timelineValue.includes("q3")) timelineScore = 70;
if (timelineValue.includes("q4")) timelineScore = 55;
if (timelineValue.includes("week")) timelineScore = 85;
if (timelineValue.includes("fast") || timelineValue.includes("quick")) {
timelineScore = 90;
}

const priceScore = amount > 0 ? 70 : 0;

return Math.min(priceScore + Math.round(timelineScore * 0.3), 100);
}

export async function POST(request: Request) {
const supabase = await createClient();

const {
data: { user },
error: userError,
} = await supabase.auth.getUser();

if (userError || !user) {
return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

const body = await request.json();

const amount = Number(body.amount);

if (!body.slug || Number.isNaN(amount) || amount <= 0) {
return NextResponse.json(
{ error: "Invalid quote submission" },
{ status: 400 }
);
}

const { data: profile, error: profileError } = await supabase
.from("profiles")
.select("id, company_id, role, email")
.eq("id", user.id)
.single();

if (profileError || !profile?.company_id) {
return NextResponse.json(
{ error: profileError?.message || "No company linked to profile" },
{ status: 400 }
);
}

const { data: rfq, error: rfqError } = await supabase
.from("rfqs")
.select("id, title, slug, company_id")
.eq("slug", body.slug)
.single();

if (rfqError || !rfq) {
return NextResponse.json({ error: "RFQ not found" }, { status: 404 });
}

if (rfq.company_id !== profile.company_id) {
return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}

const score = calculateScore(amount, String(body.timeline || ""));

const { data: quote, error: quoteError } = await supabase
.from("quotes")
.insert({
rfq_id: rfq.id,
company_id: profile.company_id,
user_id: user.id,
amount,
timeline: body.timeline,
message: body.message,
status: "submitted",
decision: "pending",
score,
})
.select()
.single();

if (quoteError || !quote) {
return NextResponse.json(
{ error: quoteError?.message || "Failed to submit quote" },
{ status: 500 }
);
}

await supabase.from("audit_logs").insert({
action: "QUOTE_SUBMITTED",
entity_type: "quote",
entity_id: quote.id,
user_id: user.id,
company_id: profile.company_id,
metadata: {
rfq_id: rfq.id,
rfq_title: rfq.title,
amount,
timeline: body.timeline,
score,
},
});

await supabase.from("notifications").insert({
company_id: profile.company_id,
title: "Quote Submitted",
message: `A new quote was submitted for ${rfq.title}.`,
type: "quote",
is_read: false,
});

return NextResponse.json({
success: true,
quote,
});
}