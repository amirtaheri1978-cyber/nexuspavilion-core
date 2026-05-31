import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

const SITE_URL =
"https://scaling-invention-5g7q4p5rwrwj3vwq7-3000.app.github.dev";

function formatRole(role: string | null | undefined) {
if (role === "admin") return "Admin";
if (role === "buyer") return "Buyer";
return "Vendor";
}

function isExpired(expiresAt: string | null) {
if (!expiresAt) return false;

return new Date(expiresAt).getTime() < Date.now();
}

function redirectTo(path: string) {
return NextResponse.redirect(`${SITE_URL}${path}`);
}

export async function POST(request: Request) {
const formData = await request.formData();
const token = String(formData.get("token") || "");

const supabase = await createClient();

const {
data: { user },
} = await supabase.auth.getUser();

if (!user) {
return redirectTo("/login");
}

if (!token) {
return redirectTo("/dashboard");
}

const { data: invitation } = await supabase
.from("invitations")
.select("*")
.eq("token", token)
.single();

if (!invitation) {
return redirectTo("/dashboard");
}

if (invitation.status !== "pending") {
return redirectTo("/dashboard");
}

if (isExpired(invitation.expires_at)) {
return redirectTo("/dashboard");
}

const userEmail = String(user.email || "").toLowerCase();
const inviteEmail = String(invitation.email || "").toLowerCase();

if (userEmail !== inviteEmail) {
return redirectTo(`/invite/${token}`);
}

await supabase.from("profiles").upsert({
id: user.id,
email: user.email,
role: invitation.role,
company_id: invitation.company_id,
});

await supabase
.from("invitations")
.update({
status: "accepted",
accepted_by: user.id,
accepted_at: new Date().toISOString(),
})
.eq("id", invitation.id);

await supabase.from("notifications").insert({
title: "Invitation Accepted",
message: `${user.email} joined the company workspace as ${formatRole(
invitation.role
)}.`,
type: "invitation",
is_read: false,
});

await supabase.from("audit_logs").insert({
action: "INVITATION_ACCEPTED",
entity_type: "invitation",
entity_id: invitation.id,
user_id: user.id,
company_id: invitation.company_id,
metadata: {
email: user.email,
role: invitation.role,
accepted_at: new Date().toISOString(),
},
});

return redirectTo("/dashboard");
}