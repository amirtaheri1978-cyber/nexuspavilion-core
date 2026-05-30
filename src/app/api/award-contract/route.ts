import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

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
.select("*")
.eq("id", selectedQuote.rfq_id)
.single();

if (rfqError || !rfq) {
return NextResponse.json({ error: "RFQ not found" }, { status: 404 });
}

if (rfq.status === "awarded") {
return NextResponse.json(
{ error: "This RFQ has already been awarded" },
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
{ error: "Contract already awarded" },
{ status: 400 }
);
}

const awardedAt = new Date().toISOString();

const { error: rejectError } = await supabase
.from("quotes")
.update({
decision: "rejected",
})
.eq("rfq_id", selectedQuote.rfq_id)
.neq("id", quoteId);

if (rejectError) {
return NextResponse.json(
{ error: rejectError.message || "Failed to reject other quotes" },
{ status: 500 }
);
}

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

const rfqUpdatePayload: Record<string, string> = {
status: "awarded",
};

if ("awarded_quote_id" in rfq) {
rfqUpdatePayload.awarded_quote_id = quoteId;
}

if ("awarded_at" in rfq) {
rfqUpdatePayload.awarded_at = awardedAt;
}

const { error: rfqUpdateError } = await supabase
.from("rfqs")
.update(rfqUpdatePayload)
.eq("id", selectedQuote.rfq_id);

if (rfqUpdateError) {
return NextResponse.json(
{ error: rfqUpdateError.message || "Failed to update RFQ status" },
{ status: 500 }
);
}

const notificationPayload = {
title: "Contract Awarded",
message: `${rfq.title ?? "Project"} procurement contract has been awarded at ${formatCurrency(
selectedQuote.amount
)}.`,
type: "award",
is_read: false,
};

const { error: notificationError } = await supabase
.from("notifications")
.insert(notificationPayload);

const auditPayload = {
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
awarded_at: awardedAt,
},
};

const { error: auditError } = await supabase
.from("audit_logs")
.insert(auditPayload);

return NextResponse.json({
success: true,
awardedQuoteId: quoteId,
rfqId: selectedQuote.rfq_id,
rfqSlug: rfq.slug,
awardedAmount: selectedQuote.amount,
warnings: {
notification: notificationError?.message || null,
audit: auditError?.message || null,
},
});
} catch (error) {
console.error(error);

return NextResponse.json(
{ error: "Internal server error" },
{ status: 500 }
);
}
}