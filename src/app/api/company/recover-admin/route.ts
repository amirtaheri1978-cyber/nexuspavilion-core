import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

export async function POST() {
try {
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
.select("id,email,role,company_id")
.eq("id", user.id)
.single();

if (!profile?.company_id) {
return NextResponse.json(
{ error: "No company assigned." },
{ status: 400 }
);
}

const { data: company } = await supabase
.from("companies")
.select("id,name,user_id")
.eq("id", profile.company_id)
.single();

if (!company) {
return NextResponse.json(
{ error: "Company not found." },
{ status: 404 }
);
}

if (company.user_id) {
return NextResponse.json(
{ error: "Company already has an owner." },
{ status: 400 }
);
}

const { error: companyUpdateError } = await supabase
.from("companies")
.update({
user_id: user.id,
})
.eq("id", company.id);

if (companyUpdateError) {
console.error(companyUpdateError);

return NextResponse.json(
{ error: "Failed to assign company owner." },
{ status: 500 }
);
}

const { error: profileUpdateError } = await supabase
.from("profiles")
.update({
role: "owner",
})
.eq("id", user.id);

if (profileUpdateError) {
console.error(profileUpdateError);

return NextResponse.json(
{ error: "Failed to update profile role." },
{ status: 500 }
);
}

await supabase.from("audit_logs").insert({
action: "OWNER_RECOVERED",
entity_type: "company",
entity_id: company.id,
user_id: user.id,
company_id: company.id,
metadata: {
company_name: company.name,
owner_email: profile.email,
recovered_at: new Date().toISOString(),
},
});

return NextResponse.json({
success: true,
owner: profile.email,
company: company.name,
});
} catch (error) {
console.error(error);

return NextResponse.json(
{ error: "Internal server error." },
{ status: 500 }
);
}
}
