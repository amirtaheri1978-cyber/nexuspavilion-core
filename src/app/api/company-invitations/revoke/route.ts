import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
try {
const body = await request.json();
const invitationId = String(body.invitationId || "");

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
.select("company_id, role")
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
{ error: "You do not have permission to revoke invitations." },
{ status: 403 }
);
}

const { data: invitation } = await supabase
.from("invitations")
.select("id, email, role, status, company_id")
.eq("id", invitationId)
.eq("company_id", profile.company_id)
.single();

if (!invitation) {
return NextResponse.json(
{ error: "Invitation not found." },
{ status: 404 }
);
}

if (invitation.status !== "pending") {
return NextResponse.json(
{ error: "Only pending invitations can be revoked." },
{ status: 400 }
);
}

const { error: updateError } = await supabase
.from("invitations")
.update({
status: "revoked",
})
.eq("id", invitation.id);

if (updateError) {
console.error(updateError);

return NextResponse.json(
{ error: "Failed to revoke invitation." },
{ status: 500 }
);
}

await supabase.from("audit_logs").insert({
action: "INVITATION_REVOKED",
entity_type: "invitation",
entity_id: invitation.id,
user_id: user.id,
company_id: profile.company_id,
metadata: {
email: invitation.email,
role: invitation.role,
revoked_at: new Date().toISOString(),
},
});

return NextResponse.json({
success: true,
});
} catch (error) {
console.error(error);

return NextResponse.json(
{ error: "Internal server error." },
{ status: 500 }
);
}
}