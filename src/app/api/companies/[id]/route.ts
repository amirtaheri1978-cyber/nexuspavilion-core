import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

type RouteContext = {
params: Promise<{
id: string;
}>;
};

const COMPANY_UPDATE_ROLES = ["admin", "buyer", "owner"];
const COMPANY_DELETE_ROLES = ["admin", "owner"];

const ALLOWED_CATEGORIES = [
"Developer",
"General Contractor",
"Engineering Consultant",
"Manufacturer",
"Vendor / Supplier",
"Subcontractor",
"Architect",
"Mixed-Use Development",
"Infrastructure Engineering",
"Supplier",
"Painting",
];

const ALLOWED_NETWORK_ROLES = [
"Owner / Developer",
"General Contractor",
"Architect / Designer",
"Manufacturer",
"Vendor / Supplier",
"Consultant",
];

function normalizeText(value: unknown) {
return String(value || "").trim();
}

function normalizeCategory(value: string) {
if (!value) return "Vendor / Supplier";

if (value === "Mixed Use Development" || value === "Mixed-use Development") {
return "Mixed-Use Development";
}

if (ALLOWED_CATEGORIES.includes(value)) {
return value;
}

return "Vendor / Supplier";
}

function normalizeNetworkRole(value: string) {
if (!value) return "Vendor / Supplier";

if (ALLOWED_NETWORK_ROLES.includes(value)) {
return value;
}

return "Vendor / Supplier";
}

function canUpdateCompany(role: string | null) {
return !!role && COMPANY_UPDATE_ROLES.includes(role);
}

function canDeleteCompany(role: string | null) {
return !!role && COMPANY_DELETE_ROLES.includes(role);
}

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

if (!canDeleteCompany(currentProfile.role)) {
return NextResponse.json(
{ error: "Only company owners or admins can delete a workspace." },
{ status: 403 }
);
}

if (currentProfile.company_id !== id) {
return NextResponse.json(
{ error: "You can only delete your own company workspace." },
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

export async function PATCH(request: Request, context: RouteContext) {
try {
const { id } = await context.params;
const body = await request.json();

const name = normalizeText(body.name);
const category = normalizeCategory(normalizeText(body.category));
const location = normalizeText(body.location) || "Location N/A";
const networkRole = normalizeNetworkRole(normalizeText(body.networkRole));

if (!name) {
return NextResponse.json(
{ error: "Company name is required." },
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

if (!canUpdateCompany(currentProfile.role)) {
return NextResponse.json(
{
error:
"You do not have permission to update company workspace details.",
},
{ status: 403 }
);
}

if (currentProfile.company_id !== id) {
return NextResponse.json(
{ error: "You can only update your own company workspace." },
{ status: 403 }
);
}

const { data: existingCompany } = await supabase
.from("companies")
.select("id, name, category, location, network_role")
.eq("id", id)
.single();

if (!existingCompany) {
return NextResponse.json(
{ error: "Company not found." },
{ status: 404 }
);
}

const { data: updatedCompany, error: updateError } = await supabase
.from("companies")
.update({
name,
category,
location,
network_role: networkRole,
})
.eq("id", id)
.select("id, name, slug, category, location, network_role, status")
.single();

if (updateError || !updatedCompany) {
console.error(updateError);

return NextResponse.json(
{ error: "Failed to update company." },
{ status: 500 }
);
}

await supabase.from("notifications").insert({
title: "Company Profile Updated",
message: `${updatedCompany.name} workspace profile was updated.`,
type: "company",
is_read: false,
company_id: updatedCompany.id,
});

await supabase.from("audit_logs").insert({
action: "COMPANY_UPDATED",
entity_type: "company",
entity_id: updatedCompany.id,
user_id: user.id,
company_id: updatedCompany.id,
metadata: {
previous: existingCompany,
updated: {
name: updatedCompany.name,
category: updatedCompany.category,
location: updatedCompany.location,
network_role: updatedCompany.network_role,
},
updated_by: {
id: currentProfile.id,
email: currentProfile.email,
role: currentProfile.role,
},
updated_at: new Date().toISOString(),
},
});

return NextResponse.json({
success: true,
company: updatedCompany,
});
} catch (error) {
console.error(error);

return NextResponse.json(
{ error: "Internal server error." },
{ status: 500 }
);
}
}