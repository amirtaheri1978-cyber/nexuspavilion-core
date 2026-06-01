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

const {
data: { user },
} = await supabase.auth.getUser();

if (!user) {
return NextResponse.json(
{ error: "Unauthorized" },
{ status: 401 }
);
}

const { data: profile } = await supabase
.from("profiles")
.select("*")
.eq("id", user.id)
.single();

if (!profile?.company_id) {
return NextResponse.json(
{ error: "No company linked to profile" },
{ status: 400 }
);
}

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
company_id: profile.company_id,
user_id: user.id,
})
.select()
.single();

if (error || !rfq) {
return NextResponse.json(
{ error: error?.message || "Failed to create RFQ" },
{ status: 500 }
);
}

await supabase.from("audit_logs").insert({
action: "RFQ_CREATED",
entity_type: "rfq",
entity_id: rfq.id,
user_id: user.id,
company_id: profile.company_id,
metadata: {
title: rfq.title,
budget: rfq.budget,
category: rfq.category,
},
});

await supabase.from("notifications").insert({
title: "RFQ Created",
message: `${rfq.title} procurement opportunity has been published.`,
type: "rfq",
is_read: false,
});

return NextResponse.json({
success: true,
rfq,
});
} catch (error) {
console.error(error);

return NextResponse.json(
{ error: "Internal server error" },
{ status: 500 }
);
}
}