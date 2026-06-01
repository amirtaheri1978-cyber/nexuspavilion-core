import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

function normalizeText(value: string) {
return value.trim();
}

function createSlug(name: string) {
return name
.trim()
.toLowerCase()
.replace(/[^a-z0-9]+/g, "-")
.replace(/^-+|-+$/g, "")
.slice(0, 80);
}

export async function POST(request: Request) {
try {
const body = await request.json();

const name = normalizeText(body.name || "");
const category = normalizeText(body.category || "");
const location = normalizeText(body.location || "");
const networkRole = normalizeText(body.networkRole || "Owner / Developer");

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

const { data: profile } = await supabase
.from("profiles")
.select("id, email, role, company_id")
.eq("id", user.id)
.maybeSingle();

if (profile?.company_id) {
return NextResponse.json(
{ error: "This account is already connected to a company." },
{ status: 409 }
);
}

const baseSlug = createSlug(name);
const slug = `${baseSlug}-${crypto.randomUUID().slice(0, 8)}`;

const { data: company, error: companyError } = await supabase
.from("companies")
.insert({
name,
slug,
category: category || "Enterprise",
location: location || "Location N/A",
network_role: networkRole || "Owner / Developer",
status: "verified",
user_id: user.id,
})
.select()
.single();

if (companyError || !company) {
console.error(companyError);

return NextResponse.json(
{ error: "Failed to create company." },
{ status: 500 }
);
}

const normalizedEmail = String(user.email || "").trim().toLowerCase();

await supabase.from("profiles").upsert({
id: user.id,
email: normalizedEmail,
role: "admin",
company_id: company.id,
});

await supabase.from("notifications").insert({
title: "Company Created",
message: `${name} workspace was created successfully.`,
type: "company",
is_read: false,
});

await supabase.from("audit_logs").insert({
action: "COMPANY_CREATED",
entity_type: "company",
entity_id: company.id,
user_id: user.id,
company_id: company.id,
metadata: {
name,
slug,
category,
location,
network_role: networkRole,
created_at: new Date().toISOString(),
},
});

return NextResponse.json({
success: true,
company,
redirectTo: "/company",
});
} catch (error) {
console.error(error);

return NextResponse.json(
{ error: "Internal server error." },
{ status: 500 }
);
}
}