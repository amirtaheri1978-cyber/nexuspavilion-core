import { NextResponse } from "next/server";

import { buildCompanyInvitationEmail } from "@/lib/email/templates/company-invitation-email";
import { sendEmail } from "@/lib/email/send-email";
import { canInviteUsers, type UserRole } from "@/lib/permissions";
import { createClient } from "@/lib/supabase/server";

const SITE_URL =
process.env.NEXT_PUBLIC_SITE_URL ||
"https://scaling-invention-5g7q4p5rwrwj3vwq7-3000.app.github.dev";

type Company = {
id: string;
name: string | null;
};

type InviteRole = "admin" | "buyer" | "vendor";

function normalizeEmail(email: unknown) {
return String(email || "").trim().toLowerCase();
}

function isValidEmail(email: string) {
return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function normalizeRole(role: unknown): InviteRole {
const value = String(role || "").trim().toLowerCase();

if (value === "admin") return "admin";
if (value === "buyer") return "buyer";

return "vendor";
}

export async function POST(request: Request) {
try {
const body = await request.json();

const email = normalizeEmail(body.email);
const role = normalizeRole(body.role);

if (!email) {
return NextResponse.json(
{ error: "Email is required." },
{ status: 400 }
);
}

if (!isValidEmail(email)) {
return NextResponse.json(
{ error: "Please enter a valid email address." },
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
{ error: "You do not have permission to invite company users." },
{ status: 403 }
);
}

const { data: companyData } = await supabase
.from("companies")
.select("id, name")
.eq("id", profile.company_id)
.single();

const company = companyData as Company | null;

if (!company) {
return NextResponse.json(
{ error: "Company workspace not found." },
{ status: 404 }
);
}

const { data: existingMember } = await supabase
.from("profiles")
.select("id, email, company_id")
.eq("company_id", profile.company_id)
.eq("email", email)
.maybeSingle();

if (existingMember) {
return NextResponse.json(
{ error: "This user is already a member of your company workspace." },
{ status: 409 }
);
}

const { data: existingInvite } = await supabase
.from("invitations")
.select("id")
.eq("company_id", profile.company_id)
.eq("email", email)
.eq("status", "pending")
.maybeSingle();

if (existingInvite) {
return NextResponse.json(
{ error: "A pending invitation already exists for this email." },
{ status: 409 }
);
}

const { data: invitation, error: invitationError } = await supabase
.from("invitations")
.insert({
company_id: profile.company_id,
email,
role,
invited_by: user.id,
})
.select("id, email, role, status, token, company_id")
.single();

if (invitationError || !invitation) {
console.error(invitationError);

return NextResponse.json(
{ error: "Failed to create invitation." },
{ status: 500 }
);
}

if (!invitation.token) {
return NextResponse.json(
{ error: "Invitation token was not generated." },
{ status: 500 }
);
}

const companyName = company.name || "Your company";
const inviteUrl = `${SITE_URL}/invite/${invitation.token}`;

const invitationEmail = buildCompanyInvitationEmail({
companyName,
invitedEmail: email,
invitedRole: role,
inviteUrl,
});

const emailResult = await sendEmail({
to: email,
subject: invitationEmail.subject,
html: invitationEmail.html,
text: invitationEmail.text,
});

await supabase.from("notifications").insert({
title: "Invitation Created",
message: `${email} was invited to ${companyName} as ${role}.`,
type: "invitation",
is_read: false,
company_id: profile.company_id,
});

await supabase.from("audit_logs").insert({
action: "INVITATION_CREATED",
entity_type: "invitation",
entity_id: invitation.id,
user_id: user.id,
company_id: profile.company_id,
metadata: {
email,
role,
invite_url: inviteUrl,
email_sent: emailResult.success,
email_skipped: emailResult.skipped,
email_id: emailResult.id,
email_error: emailResult.error,
invited_by: {
id: profile.id,
email: profile.email,
role: profile.role,
},
created_at: new Date().toISOString(),
},
});

return NextResponse.json({
success: true,
invitation,
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