import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
try {
const { quoteId } = await request.json();

if (!quoteId) {
return NextResponse.json(
{ error: "Quote ID is required." },
{ status: 400 }
);
}

const supabase = await createClient();

const { data: quote, error: quoteError } = await supabase
.from("quotes")
.select("*")
.eq("id", quoteId)
.single();

if (quoteError || !quote) {
return NextResponse.json(
{ error: "Quote not found." },
{ status: 404 }
);
}

await supabase
.from("rfqs")
.update({
status: "awarded",
awarded_quote_id: quote.id,
awarded_at: new Date().toISOString(),
})
.eq("id", quote.rfq_id);

await supabase
.from("quotes")
.update({
decision: "rejected",
})
.eq("rfq_id", quote.rfq_id);

await supabase
.from("quotes")
.update({
decision: "approved",
})
.eq("id", quote.id);

return NextResponse.json({ success: true });
} catch (error) {
console.error(error);

return NextResponse.json(
{ error: "Server error." },
{ status: 500 }
);
}
}