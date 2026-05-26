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

await supabase.from("notifications").insert({
title: "Contract Awarded",
message: `A supplier quote has been awarded for RFQ ${selectedQuote.rfq_id}`,
type: "award",
is_read: false,
});

return NextResponse.json({
success: true,
});
} catch (error) {
console.error(error);

return NextResponse.json(
{ error: "Internal server error" },
{ status: 500 }
);
}
}