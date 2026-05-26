import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
try {
const supabase = await createClient();
const body = await request.json();

const { slug, amount, timeline, message } = body;

const { data: rfq, error: rfqError } = await supabase
.from("rfqs")
.select("*")
.eq("slug", slug)
.single();

if (rfqError || !rfq) {
return NextResponse.json(
{ error: "RFQ not found." },
{ status: 404 }
);
}

const { error: quoteError } = await supabase.from("quotes").insert({
rfq_id: rfq.id,
amount,
timeline,
message,
decision: "pending",
});

if (quoteError) {
return NextResponse.json(
{ error: quoteError.message },
{ status: 500 }
);
}

await supabase.from("notifications").insert({
title: "New Quote Submitted",
message: `A new quote was submitted for ${rfq.title}.`,
type: "quote",
is_read: false,
});

return NextResponse.json({ success: true });
} catch {
return NextResponse.json(
{ error: "Server error." },
{ status: 500 }
);
}
}