import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

import { sendEmail } from "@/lib/email/send-email";
import { awardNotificationEmail } from "@/lib/email/templates/award-notification-email";

type AwardRequestBody = {
quoteId?: string;
};

function formatCurrency(value: number | string | null | undefined) {
const amount = Number(value);

if (!Number.isFinite(amount)) {
return "$0";
}

return `$${amount.toLocaleString()}`;
}

export async function POST(request: Request) {
try {
const body = (await request.json()) as AwardRequestBody;
const quoteId = String(body.quoteId || "");

if (!quoteId) {
return NextResponse.json(
{ error: "Quote ID is required." },
{ status: 400 }
);
}

const supabase = await createClient();

const {
data: { user },
error: userError,
} = await supabase.auth.getUser();

if (userError || !user) {
return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
}

const { data: profile } = await supabase
.from("profiles")
.select("id, email, role, company_id")
.eq("id", user.id)
.single();

if (!profile?.company_id) {
return NextResponse.json(
{ error: "No company assigned." },
{ status: 400 }
);
}

if (profile.role !== "admin" && profile.role !== "buyer") {
return NextResponse.json(
{ error: "Only buyers and admins can award contracts." },
{ status: 403 }
);
}

const { data: selectedQuote, error: quoteError } = await supabase
.from("quotes")
.select(
`
id,
rfq_id,
company_id,
user_id,
amount,
timeline,
message,
status,
decision
`
)
.eq("id", quoteId)
.single();

if (quoteError || !selectedQuote) {
return NextResponse.json({ error: "Quote not found." }, { status: 404 });
}

const { data: rfq, error: rfqError } = await supabase
.from("rfqs")
.select("id, title, slug, status, company_id, awarded_quote_id, awarded_at")
.eq("id", selectedQuote.rfq_id)
.single();

if (rfqError || !rfq) {
return NextResponse.json({ error: "RFQ not found." }, { status: 404 });
}

if (rfq.company_id !== profile.company_id) {
return NextResponse.json(
{ error: "You can only award RFQs owned by your company." },
{ status: 403 }
);
}

if (rfq.status === "awarded" || rfq.awarded_quote_id || rfq.awarded_at) {
return NextResponse.json(
{ error: "This RFQ has already been awarded." },
{ status: 400 }
);
}

const { data: existingAward } = await supabase
.from("quotes")
.select("id")
.eq("rfq_id", selectedQuote.rfq_id)
.eq("decision", "awarded")
.maybeSingle();

if (existingAward) {
return NextResponse.json(
{ error: "This RFQ already has an awarded quote." },
{ status: 400 }
);
}

const awardedAt = new Date().toISOString();

const { data: updatedRfq, error: rfqUpdateError } = await supabase
.from("rfqs")
.update({
status: "awarded",
awarded_quote_id: quoteId,
awarded_at: awardedAt,
})
.eq("id", rfq.id)
.eq("company_id", profile.company_id)
.select("id, title, slug, status, company_id, awarded_quote_id, awarded_at")
.single();

if (rfqUpdateError || !updatedRfq) {
console.error("RFQ award update error:", rfqUpdateError);

return NextResponse.json(
{
error:
rfqUpdateError?.message ||
"Failed to update RFQ status. Contract was not awarded.",
},
{ status: 500 }
);
}

const { error: rejectError } = await supabase
.from("quotes")
.update({
decision: "rejected",
})
.eq("rfq_id", selectedQuote.rfq_id)
.neq("id", quoteId);

if (rejectError) {
console.error("Competing quote rejection error:", rejectError);

await supabase
.from("rfqs")
.update({
status: "open",
awarded_quote_id: null,
awarded_at: null,
})
.eq("id", rfq.id);

return NextResponse.json(
{ error: rejectError.message || "Failed to reject competing quotes." },
{ status: 500 }
);
}

const { data: awardedQuote, error: awardError } = await supabase
.from("quotes")
.update({
decision: "awarded",
awarded_at: awardedAt,
})
.eq("id", quoteId)
.select()
.single();

if (awardError || !awardedQuote) {
console.error("Selected quote award error:", awardError);

await supabase
.from("rfqs")
.update({
status: "open",
awarded_quote_id: null,
awarded_at: null,
})
.eq("id", rfq.id);

await supabase
.from("quotes")
.update({
decision: "pending",
awarded_at: null,
})
.eq("rfq_id", selectedQuote.rfq_id);

return NextResponse.json(
{ error: awardError?.message || "Failed to award contract." },
{ status: 500 }
);
}

const { error: notificationError } = await supabase
.from("notifications")
.insert({
title: "Contract Awarded",
message: `${rfq.title ?? "Project"} procurement contract has been awarded at ${formatCurrency(
selectedQuote.amount
)}.`,
type: "award",
is_read: false,
});

const { error: auditError } = await supabase.from("audit_logs").insert({
action: "CONTRACT_AWARDED",
entity_type: "quote",
entity_id: quoteId,
user_id: user.id,
company_id: rfq.company_id,
metadata: {
rfq_id: rfq.id,
rfq_slug: rfq.slug,
rfq_title: rfq.title,
awarded_amount: selectedQuote.amount,
awarded_quote_id: quoteId,
awarded_company_id: selectedQuote.company_id,
awarded_at: awardedAt,
},
});

try {
if (user.email) {
await sendEmail({
to: user.email,
subject: `Contract Awarded: ${rfq.title ?? "Project"}`,
html: awardNotificationEmail({
rfqTitle: rfq.title ?? "Project",
amount: formatCurrency(selectedQuote.amount),
awardUrl: `${process.env.NEXT_PUBLIC_SITE_URL}/rfq/${rfq.slug}/compare`,
}),
});
}
} catch (error) {
console.error("Award notification email failed:", error);
}


return NextResponse.json({
success: true,
awardedQuote,
rfq: updatedRfq,
redirectTo: `/rfq/${rfq.slug}`,
warnings: {
notification: notificationError?.message || null,
audit: auditError?.message || null,
},
});
} catch (error) {
console.error(error);

return NextResponse.json(
{ error: "Internal server error." },
{ status: 500 }
);
}
}