import { NextResponse } from "next/server";

import { buildCompanyInvitationEmail } from "@/lib/email/templates/company-invitation-email";
import { sendEmail } from "@/lib/email/send-email";
import { canInviteUsers, type UserRole } from "@/lib/permissions";
import { createClient } from "@/lib/supabase/server";

const SITE_URL =
process.env.NEXT_PUBLIC_SITE_URL ||
"https://scaling-invention-5g7q4p5rwrwj3vwq7-3000.app.github.dev";

export async function POST(request: Request) {
try {
const body = await request.json();
const invitationId = String(body.invitationId || "").trim();

if (!invitationId) {
return NextResponse.json(
{ error: "Invitation ID is required." },
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
.select("id, email, company_id, role")
.eq("id", user.id)
.single();

if (!profile?.company_id) {
return NextResponse.json(
{ error: "No company assigned." },
{ status: 400 }
);
}

if (!canInviteUsers(profile.role as UserRole)) {
return NextResponse.json(
{ error: "You do not have permission to manage invitations." },
{ status: 403 }
);
}

const { data: invitation } = await supabase
.from("invitations")
.select("id, email, role, status, token, company_id")
.eq("id", invitationId)
.eq("company_id", profile.company_id)
.single();

if (!invitation) {
return NextResponse.json(
{ error: "Invitation not found in your company workspace." },
{ status: 404 }
);
}

if (invitation.status !== "pending") {
return NextResponse.json(
{ error: "Only pending invitations can be resent." },
{ status: 400 }
);
}

if (!invitation.email || !invitation.token) {
return NextResponse.json(
{ error: "Invitation is missing required delivery details." },
{ status: 400 }
);
}

const { data: company } = await supabase
.from("companies")
.select("id, name")
.eq("id", profile.company_id)
.single();

if (!company) {
return NextResponse.json(
{ error: "Company workspace not found." },
{ status: 404 }
);
}

const inviteUrl = `${SITE_URL}/invite/${invitation.token}`;

const invitationEmail = buildCompanyInvitationEmail({
companyName: company.name || "Your company",
invitedEmail: invitation.email,
invitedRole: invitation.role || "vendor",
inviteUrl,
});

const emailResult = await sendEmail({
to: invitation.email,
subject: invitationEmail.subject,
html: invitationEmail.html,
text: invitationEmail.text,
});

await supabase.from("audit_logs").insert({
action: "INVITATION_RESENT",
entity_type: "invitation",
entity_id: invitation.id,
user_id: user.id,
company_id: profile.company_id,
metadata: {
email: invitation.email,
role: invitation.role,
invite_url: inviteUrl,
email_sent: emailResult.success,
email_skipped: emailResult.skipped,
email_id: emailResult.id,
email_error: emailResult.error,
resent_by: {
id: profile.id,
email: profile.email,
role: profile.role,
},
resent_at: new Date().toISOString(),
},
});

return NextResponse.json({
success: true,
inviteUrl,
email: {
sent: emailResult.success,
skipped: emailResult.skipped,
id: emailResult.id,
error: emailResult.error,
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