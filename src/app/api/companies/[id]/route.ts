import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

type RouteContext = {
params: Promise<{
id: string;
}>;
};

export async function DELETE(_request: Request, context: RouteContext) {
try {
const { id } = await context.params;
const supabase = await createClient();

const {
data: { user },
} = await supabase.auth.getUser();

if (!user) {
return NextResponse.json(
{ error: "You must be signed in to delete a company." },
{ status: 401 }
);
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

if (currentProfile.role !== "admin") {
return NextResponse.json(
{ error: "Only admins can delete company records." },
{ status: 403 }
);
}

if (currentProfile.company_id !== id) {
return NextResponse.json(
{ error: "You can only delete your own company." },
{ status: 403 }
);
}

const { data: company } = await supabase
.from("companies")
.select("id, name")
.eq("id", id)
.single();

if (!company) {
return NextResponse.json(
{ error: "Company not found." },
{ status: 404 }
);
}

const { error: deleteError } = await supabase
.from("companies")
.delete()
.eq("id", id);

if (deleteError) {
console.error(deleteError);

return NextResponse.json(
{ error: "Failed to delete company." },
{ status: 500 }
);
}

await supabase.from("audit_logs").insert({
action: "COMPANY_DELETED",
entity_type: "company",
entity_id: id,
user_id: user.id,
company_id: id,
metadata: {
company_name: company.name,
deleted_at: new Date().toISOString(),
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