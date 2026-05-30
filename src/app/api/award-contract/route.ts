import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
try {
const body = await request.json();

const quoteId = body.quoteId;

const supabase = await createClient();

const { data: selectedQuote } = await supabase
.from("quotes")
.select("*")
.eq("id", quoteId)
.single();

if (!selectedQuote) {
return NextResponse.json(
{ error: "Quote not found" },
{ status: 404 }
);
}

const { data: rfq } = await supabase
.from("rfqs")
.select("*")
.eq("id", selectedQuote.rfq_id)
.single();

await supabase
.from("quotes")
.update({
decision: "rejected",
})
.eq("rfq_id", selectedQuote.rfq_id);

await supabase
.from("quotes")
.update({
decision: "awarded",
})
.eq("id", quoteId);

// Professional Notification

await supabase
.from("notifications")
.insert({
title: "Contract Awarded",
message: `${rfq?.title ?? "Project"} procurement contract has been awarded at $${Number(
selectedQuote.amount
).toLocaleString()}.`,
type: "award",
is_read: false,
});

// Audit Log

await supabase
.from("audit_logs")
.insert({
action: "CONTRACT_AWARDED",
entity_type: "quote",
entity_id: quoteId,
metadata: {
rfq_title: rfq?.title,
rfq_id: selectedQuote.rfq_id,
awarded_amount: selectedQuote.amount,
awarded_quote_id: quoteId,
},
});

return NextResponse.json({
success: true,
});
} catch (error) {
console.error(error);

return NextResponse.json(
{
error: "Internal server error",
},
{
status: 500,
}
);
}
}