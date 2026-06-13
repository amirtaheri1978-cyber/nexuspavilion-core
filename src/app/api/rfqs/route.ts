import { NextResponse } from "next/server";

import { rfqCreatedEmail } from "@/lib/email/templates/rfq-created-email";
import { sendEmail } from "@/lib/email/send-email";
import { logCompanyActivity } from "@/lib/activity/log-company-activity";
import { createClient } from "@/lib/supabase/server";

function createSlug(title: string) {
return `${title
.toLowerCase()
.trim()
.replace(/[^a-z0-9]+/g, "-")
.replace(/^-+|-+$/g, "")}-${Date.now()}`;
}

function canCreateRfq(role: string | null | undefined) {
return ["owner", "admin", "buyer"].includes(String(role || "").toLowerCase());
}

export async function POST(request: Request) {
try {
const supabase = await createClient();

const {
data: { user },
error: userError,
} = await supabase.auth.getUser();

if (userError || !user) {
return NextResponse.json(
{ error: "Unauthorized. Please sign in again on this workspace URL." },
{ status: 401 }
);
}

const { data: profile, error: profileError } = await supabase
.from("profiles")
.select("id, email, role, company_id")
.eq("id", user.id)
.single();

if (profileError || !profile?.company_id) {
return NextResponse.json(
{ error: "No company linked to profile." },
{ status: 400 }
);
}

if (!canCreateRfq(profile.role)) {
return NextResponse.json(
{ error: "Only owners, admins, and buyers can create RFQs." },
{ status: 403 }
);
}

const body = await request.json();

const title = String(body.title || "").trim();

if (!title) {
return NextResponse.json(
{ error: "RFQ title is required." },
{ status: 400 }
);
}

const slug = createSlug(title);

const { data: rfq, error } = await supabase
.from("rfqs")
.insert({
title,
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
{ error: error?.message || "Failed to create RFQ." },
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
slug: rfq.slug,
},
});

await logCompanyActivity({
supabase,
companyId: profile.company_id,
actorId: user.id,
action: "RFQ_CREATED",
entityType: "rfq",
entityId: rfq.id,
metadata: {
title: rfq.title,
budget: rfq.budget,
category: rfq.category,
location: rfq.location,
slug: rfq.slug,
},
});

await supabase.from("notifications").insert({
title: "RFQ Created",
message: `${rfq.title} procurement opportunity has been published.`,
type: "rfq",
is_read: false,
company_id: profile.company_id,
});

try {
if (user.email) {
await sendEmail({
to: user.email,
subject: `RFQ Created: ${rfq.title}`,
html: rfqCreatedEmail({
rfqTitle: rfq.title || "New RFQ",
category: rfq.category || "Procurement",
budget: rfq.budget ? String(rfq.budget) : "Not specified",
rfqUrl: `${process.env.NEXT_PUBLIC_SITE_URL}/rfq/${rfq.slug}`,
}),
});
}
} catch (emailError) {
console.error("RFQ created email failed:", emailError);
}

return NextResponse.json({
success: true,
rfq,
});
} catch (error) {
console.error(error);

return NextResponse.json(
{ error: "Internal server error." },
{ status: 500 }
);
}
}