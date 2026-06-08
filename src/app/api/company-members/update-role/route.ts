import { NextResponse } from "next/server";

import { canChangeRoles, type UserRole } from "@/lib/permissions";
import { createClient } from "@/lib/supabase/server";

type EditableRole = "admin" | "buyer" | "vendor";

function normalizeRole(role: unknown): EditableRole {
const value = String(role || "").trim().toLowerCase();

if (value === "admin") return "admin";
if (value === "buyer") return "buyer";
return "vendor";
}

export async function POST(request: Request) {
try {
const body = await request.json();

const memberId = String(body.memberId || "").trim();
const role = normalizeRole(body.role);

if (!memberId) {
return NextResponse.json(
{ error: "Member ID is required." },
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

const { data: currentProfile } = await supabase
.from("profiles")
.select("id, email, role, company_id")
.eq("id", user.id)
.single();

if (!currentProfile?.company_id) {
return NextResponse.json(
{ error: "No company assigned." },
{ status: 400 }
);
}

if (!canChangeRoles(currentProfile.role as UserRole)) {
return NextResponse.json(
{ error: "You do not have permission to update member roles." },
{ status: 403 }
);
}

const { data: targetMember } = await supabase
.from("profiles")
.select("id, email, role, company_id")
.eq("id", memberId)
.eq("company_id", currentProfile.company_id)
.single();

if (!targetMember) {
return NextResponse.json(
{ error: "Member not found in your company workspace." },
{ status: 404 }
);
}

if (targetMember.id === currentProfile.id) {
return NextResponse.json(
{ error: "You cannot change your own role." },
{ status: 400 }
);
}

const { count: adminCount } = await supabase
.from("profiles")
.select("*", { count: "exact", head: true })
.eq("company_id", currentProfile.company_id)
.eq("role", "admin");

if (
targetMember.role === "admin" &&
role !== "admin" &&
(adminCount || 0) <= 1
) {
return NextResponse.json(
{
error:
"Cannot remove the last workspace admin. Assign another admin first.",
},
{ status: 400 }
);
}

if (targetMember.role === "admin" && role !== "admin") {
const { count: adminCount, error: adminCountError } = await supabase
.from("profiles")
.select("id", { count: "exact", head: true })
.eq("company_id", currentProfile.company_id)
.eq("role", "admin");

if (adminCountError) {
console.error(adminCountError);

return NextResponse.json(
{ error: "Failed to validate workspace administrators." },
{ status: 500 }
);
}

if ((adminCount || 0) <= 1) {
return NextResponse.json(
{ error: "You cannot demote the last workspace admin." },
{ status: 400 }
);
}
}

const { error: updateError } = await supabase
.from("profiles")
.update({
role,
})
.eq("id", targetMember.id)
.eq("company_id", currentProfile.company_id);

if (updateError) {
console.error(updateError);

return NextResponse.json(
{ error: "Failed to update member role." },
{ status: 500 }
);
}

await supabase.from("audit_logs").insert({
action: "MEMBER_ROLE_UPDATED",
entity_type: "profile",
entity_id: targetMember.id,
user_id: user.id,
company_id: currentProfile.company_id,
metadata: {
member_email: targetMember.email,
previous_role: targetMember.role,
new_role: role,
updated_at: new Date().toISOString(),
},
});

return NextResponse.json({
success: true,
role,
});
} catch (error) {
console.error(error);

return NextResponse.json(
{ error: "Internal server error." },
{ status: 500 }
);
}
}