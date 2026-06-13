import { NextResponse } from "next/server";

import { sendEmail } from "@/lib/email/send-email";
import { createClient } from "@/lib/supabase/server";

const SITE_URL =
process.env.NEXT_PUBLIC_SITE_URL ||
"https://scaling-invention-5g7q4p5rwrwj3vwq7-3000.app.github.dev";

function generateToken() {
return crypto.randomUUID().replaceAll("-", "");
}

function normalizeEmail(value: string) {
return value.trim().toLowerCase();
}

function isValidEmail(email: string) {
return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function isAllowedProcurementRole(role: string | null | undefined) {
return ["owner", "admin", "buyer"].includes(String(role || "").toLowerCase());
}

function buildRfqInviteEmail({
rfqTitle,
inviteUrl,
}: {
rfqTitle: string;
inviteUrl: string;
}) {
const subject = `RFQ Invitation: ${rfqTitle}`;

const text = `You have been invited to quote on ${rfqTitle}.

Open the secure RFQ invitation link:
${inviteUrl}

Nexus Pavilion`;

const html = `
<div style="font-family: Arial, sans-serif; color: #0f172a; line-height: 1.6;">
<p style="font-size: 12px; letter-spacing: 0.2em; text-transform: uppercase; color: #f97316; font-weight: 800;">
Nexus Pavilion RFQ Invitation
</p>

<h1 style="font-size: 28px; margin: 0 0 16px;">
You have been invited to quote
</h1>

<p>
You have been invited to submit a supplier quote for:
</p>

<p style="font-size: 18px; font-weight: 800;">
${rfqTitle}
</p>

<p>
Open the secure RFQ invitation link below to review the opportunity and submit your quote.
</p>

<p style="margin: 24px 0;">
<a href="${inviteUrl}" style="display: inline-block; background: #020617; color: #ffffff; padding: 12px 20px; border-radius: 999px; text-decoration: none; font-weight: 800;">
Open RFQ Invitation
</a>
</p>

<p style="font-size: 12px; color: #64748b;">
If the button does not work, copy and paste this link into your browser:<br />
${inviteUrl}
</p>
</div>
`;

return { subject, html, text };
}

export async function POST(request: Request) {
try {
const body = await request.json();

const rfqId = String(body.rfqId || "").trim();
const email = normalizeEmail(String(body.email || ""));

if (!rfqId || !email) {
return NextResponse.json(
{ error: "RFQ ID and supplier email are required." },
{ status: 400 }
);
}

if (!isValidEmail(email)) {
return NextResponse.json(
{ error: "Please enter a valid supplier email address." },
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

const { data: profile, error: profileError } = await supabase
.from("profiles")
.select("id, email, role, company_id")
.eq("id", user.id)
.single();

if (profileError || !profile?.company_id) {
return NextResponse.json(
{ error: "Company profile is required to invite suppliers." },
{ status: 403 }
);
}

if (!isAllowedProcurementRole(profile.role)) {
return NextResponse.json(
{ error: "Only authorized procurement users can invite suppliers." },
{ status: 403 }
);
}

const { data: rfq, error: rfqError } = await supabase
.from("rfqs")
.select("id, title, slug, company_id, status")
.eq("id", rfqId)
.single();

if (rfqError || !rfq) {
return NextResponse.json({ error: "RFQ not found." }, { status: 404 });
}

if (rfq.company_id !== profile.company_id) {
return NextResponse.json(
{ error: "You can only invite suppliers to RFQs owned by your company." },
{ status: 403 }
);
}

const { data: existingInvite } = await supabase
.from("rfq_invites")
.select("id, rfq_id, email, token, status, created_at")
.eq("rfq_id", rfq.id)
.eq("email", email)
.maybeSingle();

if (existingInvite) {
const existingInviteUrl = `${SITE_URL}/rfq/invite/${existingInvite.token}`;

return NextResponse.json({
success: true,
invite: existingInvite,
inviteUrl: `/rfq/invite/${existingInvite.token}`,
absoluteInviteUrl: existingInviteUrl,
message: "Supplier has already been invited to this RFQ.",
email: {
sent: false,
skipped: true,
error: "Existing invite reused. Email was not resent.",
},
});
}

const token = generateToken();
const absoluteInviteUrl = `${SITE_URL}/rfq/invite/${token}`;

const { data: invite, error: inviteError } = await supabase
.from("rfq_invites")
.insert({
rfq_id: rfq.id,
email,
token,
status: "sent",
})
.select()
.single();

if (inviteError || !invite) {
console.error(inviteError);

return NextResponse.json(
{ error: inviteError?.message || "Could not create supplier invite." },
{ status: 500 }
);
}

const invitationEmail = buildRfqInviteEmail({
rfqTitle: rfq.title || "Procurement RFQ",
inviteUrl: absoluteInviteUrl,
});

const emailResult = await sendEmail({
to: email,
subject: invitationEmail.subject,
html: invitationEmail.html,
text: invitationEmail.text,
});

await supabase.from("audit_logs").insert({
action: "RFQ_SUPPLIER_INVITED",
entity_type: "rfq_invite",
entity_id: invite.id,
user_id: user.id,
company_id: profile.company_id,
metadata: {
rfq_id: rfq.id,
rfq_title: rfq.title,
supplier_email: email,
invite_token: token,
invite_url: absoluteInviteUrl,
email_sent: emailResult.success,
email_skipped: emailResult.skipped,
email_id: emailResult.id,
email_error: emailResult.error,
created_at: new Date().toISOString(),
},
});

await supabase.from("notifications").insert({
title: "Supplier Invited",
message: `${email} was invited to quote on ${rfq.title}.`,
type: "invitation",
is_read: false,
company_id: profile.company_id,
});

return NextResponse.json({
success: true,
invite,
inviteUrl: `/rfq/invite/${token}`,
absoluteInviteUrl,
email: {
sent: emailResult.success,
skipped: emailResult.skipped,
id: emailResult.id,
error: emailResult.error,
},
});
} catch (error) {
console.error(error);

return NextResponse.json({ error: "Server error." }, { status: 500 });
}
}