import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

function createSlug(title: string) {
return `${title
.toLowerCase()
.trim()
.replace(/[^a-z0-9]+/g, "-")
.replace(/^-+|-+$/g, "")}-${Date.now()}`;
}

export async function POST(request: Request) {
try {
const supabase = await createClient();
const body = await request.json();

const slug = createSlug(body.title);

const { data: rfq, error } = await supabase
.from("rfqs")
.insert({
title: body.title,
slug,
description: body.description,
category: body.category,
location: body.location,
budget: body.budget,
deadline: body.deadline,
status: "open",
})
.select()
.single();

if (error || !rfq) {
console.error("RFQ insert error:", error);

return NextResponse.json(
{ error: error?.message || "Failed to create RFQ" },
{ status: 500 }
);
}

await supabase.from("notifications").insert({
title: "New RFQ Created",
message: `${body.title} procurement opportunity has been published.`,
type: "rfq",
is_read: false,
});

return NextResponse.json({
success: true,
slug: rfq.slug,
});
} catch (error) {
console.error("RFQ API error:", error);

return NextResponse.json(
{ error: "Server error" },
{ status: 500 }
);
}
}