import { NextResponse } from "next/server";

import { sendEmail } from "@/lib/email/send-email";
import { quoteSubmittedEmail } from "@/lib/email/templates/quote-submitted-email";
import { getActiveMembershipForUserCompany } from "@/lib/auth/membership";
import { joinPublicSitePath } from "@/lib/ops/public-site-url";
import {
  canRespondToRfqSourcing,
  isPublicSourcingMethod,
} from "@/lib/procurement/rfq-access-contract";
import { canSubmitCompanyQuote } from "@/lib/procurement/procurement-write-authorization";
import { recordTrustedProcurementActivity } from "@/lib/procurement/record-procurement-activity";
import { createClient } from "@/lib/supabase/server";

const VALIDITY_DAY_OPTIONS = [30, 60, 90, 120];

function calculateScore(amount: number, timeline: string) {
const timelineValue = timeline.toLowerCase();

let timelineScore = 50;

if (timelineValue.includes("q1")) timelineScore = 100;
if (timelineValue.includes("q2")) timelineScore = 85;
if (timelineValue.includes("q3")) timelineScore = 70;
if (timelineValue.includes("q4")) timelineScore = 55;
if (timelineValue.includes("week")) timelineScore = 85;
if (timelineValue.includes("fast") || timelineValue.includes("quick")) {
timelineScore = 90;
}

const priceScore = amount > 0 ? 70 : 0;

return Math.min(priceScore + Math.round(timelineScore * 0.3), 100);
}

function normalizeAmount(value: string | number) {
const amount = Number(String(value).replace(/[^0-9.]/g, ""));

if (!Number.isFinite(amount) || amount <= 0) {
return null;
}

return amount;
}

function normalizeValidityDays(value: unknown) {
const validityDays = Number(value || 30);

if (VALIDITY_DAY_OPTIONS.includes(validityDays)) {
return validityDays;
}

return 30;
}

function hasDeadlinePassed(deadline: string | null | undefined) {
if (!deadline) return false;

const deadlineDate = new Date(deadline);

if (Number.isNaN(deadlineDate.getTime())) {
return false;
}

const now = new Date();

return now.getTime() > deadlineDate.getTime();
}

function formatDeadline(deadline: string | null | undefined) {
if (!deadline) return "Not specified";

const deadlineDate = new Date(deadline);

if (Number.isNaN(deadlineDate.getTime())) {
return deadline;
}

return deadlineDate.toLocaleString("en-US", {
year: "numeric",
month: "long",
day: "numeric",
hour: "2-digit",
minute: "2-digit",
});
}

function isOpenForQuotes(rfq: {
status: string | null;
awarded_quote_id?: string | null;
awarded_at?: string | null;
deadline?: string | null;
}) {
const status = String(rfq.status || "open").toLowerCase();

if (status !== "open") return false;
if (rfq.awarded_quote_id) return false;
if (rfq.awarded_at) return false;
if (hasDeadlinePassed(rfq.deadline)) return false;

return true;
}

export async function POST(request: Request) {
try {
const supabase = await createClient();

const {
data: { user },
error: userError,
} = await supabase.auth.getUser();

if (userError || !user) {
return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

const body = await request.json();

const slug = String(body.slug || "").trim();
const rfqId = String(body.rfqId || "").trim();
const amount = normalizeAmount(body.amount || "");
const timeline = String(body.timeline || "").trim();
const message = String(body.message || "").trim();
const validityDays = normalizeValidityDays(body.validity_days);

if ((!slug && !rfqId) || !amount || !timeline || !message) {
return NextResponse.json(
{ error: "Invalid quote submission" },
{ status: 400 }
);
}

const { data: profile, error: profileError } = await supabase
.from("profiles")
.select("id, company_id, email")
.eq("id", user.id)
.single();

if (profileError || !profile?.company_id) {
return NextResponse.json(
{ error: profileError?.message || "No company linked to profile" },
{ status: 400 }
);
}

let membership;

try {
membership = await getActiveMembershipForUserCompany(
supabase,
user.id,
profile.company_id
);
} catch (membershipError) {
console.error("Quote submit membership lookup failed:", membershipError);

return NextResponse.json(
{ error: "Unable to verify organization membership." },
{ status: 500 }
);
}

if (!canSubmitCompanyQuote(membership, profile.company_id)) {
  return NextResponse.json(
    {
      error:
        "You must belong to an active company to submit a quotation.",
    },
    { status: 403 },
  );
}

const rfqQuery = supabase
.from("rfqs")
.select(
"id, title, slug, status, company_id, awarded_quote_id, awarded_at, deadline, sourcing_method"
);

const { data: rfq, error: rfqError } = rfqId
? await rfqQuery.eq("id", rfqId).single()
: await rfqQuery.eq("slug", slug).single();

if (rfqError || !rfq) {
return NextResponse.json({ error: "RFQ not found" }, { status: 404 });
}

if (hasDeadlinePassed(rfq.deadline)) {
return NextResponse.json(
{
error: `This RFQ deadline has passed. Late submissions are not accepted. Deadline: ${formatDeadline(
rfq.deadline
)}.`,
},
{ status: 403 }
);
}

if (!isOpenForQuotes(rfq)) {
return NextResponse.json(
{ error: "This RFQ is no longer accepting quotes." },
{ status: 400 }
);
}

if (rfq.company_id === profile.company_id) {
return NextResponse.json(
{ error: "Your company cannot submit a quote to its own RFQ." },
{ status: 403 }
);
}

let hasRestrictedRfqAccess = false;

if (!isPublicSourcingMethod(rfq.sourcing_method)) {
  const { data: restrictedAccess, error: accessError } = await supabase.rpc(
    "current_user_has_supplier_rfq_access",
    { p_rfq_id: rfq.id },
  );

  if (accessError) {
    console.error("Quote submit RFQ access lookup failed:", accessError);

    return NextResponse.json(
      { error: "Unable to verify RFQ access." },
      { status: 500 },
    );
  }

  hasRestrictedRfqAccess = restrictedAccess === true;
}

if (!canRespondToRfqSourcing(rfq.sourcing_method, hasRestrictedRfqAccess)) {
  return NextResponse.json(
    {
      error: "You do not have access to submit a quotation for this RFQ.",
    },
    { status: 403 },
  );
}

const { data: existingQuote } = await supabase
.from("quotes")
.select("id")
.eq("rfq_id", rfq.id)
.eq("company_id", profile.company_id)
.maybeSingle();

if (existingQuote) {
return NextResponse.json(
{ error: "Your company has already submitted a quote for this RFQ." },
{ status: 409 }
);
}

const { data: requiredAddenda, error: requiredAddendaError } = await supabase
.from("rfq_addenda")
.select("id")
.eq("rfq_id", rfq.id)
.eq("requires_acknowledgement", true);

if (requiredAddendaError) {
console.error(
"Quote submit required addenda lookup failed:",
requiredAddendaError
);

return NextResponse.json(
{ error: "Unable to verify required RFQ addenda acknowledgements." },
{ status: 500 }
);
}

if ((requiredAddenda || []).length > 0) {
const requiredIds = (requiredAddenda || []).map((item) => item.id);

const { data: acknowledgements, error: acknowledgementError } =
await supabase
.from("rfq_addendum_acknowledgements")
.select("addendum_id")
.eq("company_id", profile.company_id)
.in("addendum_id", requiredIds);

if (acknowledgementError) {
console.error(
"Quote submit addendum acknowledgement lookup failed:",
acknowledgementError
);

return NextResponse.json(
{ error: "Unable to verify required RFQ addenda acknowledgements." },
{ status: 500 }
);
}

const acknowledgedIds = new Set(
(acknowledgements || []).map((item) => item.addendum_id)
);
const missingRequired = requiredIds.some((id) => !acknowledgedIds.has(id));

if (missingRequired) {
return NextResponse.json(
{
error:
"Required RFQ addenda must be acknowledged before submitting a quotation.",
},
{ status: 403 }
);
}
}

const score = calculateScore(amount, timeline);

const { data: quote, error: quoteError } = await supabase
.from("quotes")
.insert({
rfq_id: rfq.id,
company_id: profile.company_id,
user_id: user.id,
amount,
timeline,
message,
validity_days: validityDays,
status: "submitted",
decision: "pending",
score,
})
.select()
.single();

if (quoteError || !quote) {
return NextResponse.json(
{ error: quoteError?.message || "Failed to submit quote" },
{ status: 500 }
);
}

await recordTrustedProcurementActivity(
supabase,
"quote_submitted",
quote.id,
{
userId: user.id,
companyId: profile.company_id,
},
);

try {
const quoteUrl = joinPublicSitePath(`/rfq/${rfq.slug}/compare`);
if (user.email && quoteUrl) {
await sendEmail({
to: user.email,
subject: `Quote Submitted: ${rfq.title}`,
html: quoteSubmittedEmail({
rfqTitle: rfq.title || "RFQ",
amount: amount ? String(amount) : "Not specified",
timeline: timeline || "Not specified",
validityDays: `${validityDays} days`,
quoteUrl,
}),
});
}
} catch (error) {
console.error("Quote submitted email failed:", error);
}

return NextResponse.json({
success: true,
quote,
redirectTo: `/rfq/${rfq.slug}`,
});
} catch (error) {
console.error(error);

return NextResponse.json(
{ error: "Internal server error" },
{ status: 500 }
);
}
}