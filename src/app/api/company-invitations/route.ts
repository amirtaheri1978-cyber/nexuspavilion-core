import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

const SITE_URL =
"https://scaling-invention-5g7q4p5rwrwj3vwq7-3000.app.github.dev";

function normalizeEmail(email: string) {
return email.trim().toLowerCase();
}

function normalizeRole(role: string) {
const value = role.trim().toLowerCase();

if (value === "admin") return "admin";
if (value === "buyer") return "buyer";

return "vendor";
}

export async function POST(request: Request) {
try {
const body = await request.json();

const email = normalizeEmail(body.email || "");
const role = normalizeRole(body.role || "vendor");

if (!email) {
return NextResponse.json(
{ error: "Email is required." },
{ status: 400 }
);
}

const supabase = await createClient();

const {
data: { user },
error: userError,
} = await supabase.auth.getUser();

if (userError || !user) {
return NextResponse.json(
{ error: "Unauthorized." },
{ status: 401 }
);
}

const { data: profile } = await supabase
.from("profiles")
.select("company_id")
.eq("id", user.id)
.single();

if (!profile?.company_id) {
return NextResponse.json(
{ error: "No company assigned." },
{ status: 400 }
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
{ error: "Invitation already exists." },
{ status: 409 }
);
}

const { data: invitation, error } = await supabase
.from("invitations")
.insert({
company_id: profile.company_id,
email,
role,
invited_by: user.id,
})
.select()
.single();

if (error) {
console.error(error);

return NextResponse.json(
{ error: "Failed to create invitation." },
{ status: 500 }
);
}

const inviteUrl = `${SITE_URL}/invite/${invitation.token}`;

return NextResponse.json({
success: true,
invitation,
inviteUrl,
});
} catch (error) {
console.error(error);

return NextResponse.json(
{ error: "Internal server error." },
{ status: 500 }
);
}
}