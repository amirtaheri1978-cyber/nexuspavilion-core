import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
try {
const body = await request.json();
const quoteId = body.quoteId;

if (!quoteId) {
return NextResponse.json(
{ error: "Quote ID is required" },
{ status: 400 }
);
}

const supabase = await createClient();

const {
data: { user },
error: userError,
} = await supabase.auth.getUser();

if (userError || !user) {
return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

const { data: selectedQuote, error: quoteError } = await supabase
.from("quotes")
.select("*")
.eq("id", quoteId)
.single();

if (quoteError || !selectedQuote) {
return NextResponse.json({ error: "Quote not found" }, { status: 404 });
}

const { data: rfq, error: rfqError } = await supabase
.from("rfqs")
.select("id, title, company_id")
.eq("id", selectedQuote.rfq_id)
.single();

if (rfqError || !rfq) {
return NextResponse.json({ error: "RFQ not found" }, { status: 404 });
}

const { data: existingAward } = await supabase
.from("quotes")
.select("id")
.eq("rfq_id", selectedQuote.rfq_id)
.eq("decision", "awarded")
.maybeSingle();

if (existingAward && existingAward.id !== quoteId) {
return NextResponse.json(
{ error: "Contract already awarded" },
{ status: 400 }
);
}

const awardedAt = new Date().toISOString();

await supabase
.from("quotes")
.update({
decision: "rejected",
})
.eq("rfq_id", selectedQuote.rfq_id);

const { error: awardError } = await supabase
.from("quotes")
.update({
decision: "awarded",
awarded_at: awardedAt,
})
.eq("id", quoteId);

if (awardError) {
return NextResponse.json(
{ error: awardError.message || "Failed to award contract" },
{ status: 500 }
);
}

await supabase
.from("rfqs")
.update({
status: "awarded",
awarded_quote_id: quoteId,
awarded_at: awardedAt,
})
.eq("id", selectedQuote.rfq_id);

await supabase.from("notifications").insert({
company_id: rfq.company_id,
title: "Contract Awarded",
message: `${rfq.title} procurement contract has been awarded at $${Number(
selectedQuote.amount
).toLocaleString()}.`,
type: "award",
is_read: false,
});

await supabase.from("audit_logs").insert({
action: "CONTRACT_AWARDED",
entity_type: "quote",
entity_id: quoteId,
user_id: user.id,
company_id: rfq.company_id,
metadata: {
rfq_id: rfq.id,
rfq_title: rfq.title,
amount: selectedQuote.amount,
timeline: selectedQuote.timeline,
awarded_at: awardedAt,
},
});

return NextResponse.json({
success: true,
awardedQuoteId: quoteId,
});
} catch (error) {
console.error(error);

return NextResponse.json(
{ error: "Internal server error" },
{ status: 500 }
);
}
}