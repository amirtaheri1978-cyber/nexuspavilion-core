import { NextResponse } from "next/server";

import { companyWelcomeEmail } from "@/lib/email/templates/company-welcome-email";
import { sendEmail } from "@/lib/email/send-email";
import { createClient } from "@/lib/supabase/server";

type AccountType =
| "buyer_owner"
| "vendor_supplier"
| "consultant"
| "service_provider";

const ACCOUNT_TYPE_CONFIG: Record<
AccountType,
{
profileRole: "owner" | "vendor";
defaultNetworkRole: string;
allowedNetworkRoles: string[];
}
> = {
buyer_owner: {
profileRole: "owner",
defaultNetworkRole: "Project Owner",
allowedNetworkRoles: [
"Project Owner",
"Owner / Developer",
"General Contractor",
"Construction Manager",
"Procurement Team",
],
},
vendor_supplier: {
profileRole: "vendor",
defaultNetworkRole: "Building Products Supplier",
allowedNetworkRoles: [
"Building Products Supplier",
"Building Materials Supplier",
"Architectural Products Supplier",
"Building Systems Supplier",
"Construction Product Distributor",
"Construction Equipment Supplier",
"Supplier",
"Material Supplier",
],
},
consultant: {
profileRole: "vendor",
defaultNetworkRole: "Professional Consultant",
allowedNetworkRoles: [
"Professional Consultant",
"Consultant",
"Architecture & Design Firm",
"Structural Engineering Firm",
"Civil Engineering Firm",
"MEP Engineering Firm",
"Geotechnical Engineering Firm",
"Environmental Consulting Firm",
"Cost Management & Quantity Surveying Firm",
"Project & Construction Management Firm",
],
},
service_provider: {
profileRole: "vendor",
defaultNetworkRole: "Construction Service Provider",
allowedNetworkRoles: [
"Construction Service Provider",
"Service Provider",
"Specialty Trade Contractor",
"Building Envelope Contractor",
"Interior Fit-Out Contractor",
"Mechanical Contractor",
"Electrical Contractor",
"Fire Protection Contractor",
"Commissioning & Start-up Provider",
"Testing & Inspection Firm",
"Construction Logistics Provider",
"Facility Maintenance Contractor",
],
},
};

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

function isAccountType(value: string): value is AccountType {
return (
value === "buyer_owner" ||
value === "vendor_supplier" ||
value === "consultant" ||
value === "service_provider"
);
}

function normalizeNetworkRole(accountType: AccountType, value: string) {
const normalizedValue = normalizeText(value);
const accountConfig = ACCOUNT_TYPE_CONFIG[accountType];

if (!normalizedValue) {
return accountConfig.defaultNetworkRole;
}

const aliases: Record<string, string> = {
"Supplier / Vendor": "Building Products Supplier",
"Vendor / Supplier": "Building Products Supplier",
Manufacturer: "Building Products Supplier",
Distributor: "Construction Product Distributor",
"Distributor / Supplier": "Construction Product Distributor",
"Material Supplier": "Building Materials Supplier",
Supplier: "Building Products Supplier",

Consultant: "Professional Consultant",
"Professional Services Consultant": "Professional Consultant",
"Consultant / Service Provider": "Professional Consultant",
"Architect / Designer": "Architecture & Design Firm",
Architect: "Architecture & Design Firm",
Engineer: "Professional Consultant",
"Design Consultant": "Architecture & Design Firm",
"Cost Consultant": "Cost Management & Quantity Surveying Firm",
"Project Consultant": "Project & Construction Management Firm",

"Service Provider": "Construction Service Provider",
"Specialty Contractor": "Specialty Trade Contractor",
"Specialty Trade": "Specialty Trade Contractor",

"Project Owner": "Project Owner",
"Owner / Developer": "Owner / Developer",
};

return aliases[normalizedValue] || normalizedValue;
}

export async function POST(request: Request) {
try {
const body = await request.json();

const name = normalizeText(String(body.name || ""));
const location = normalizeText(String(body.location || ""));
const rawAccountType = normalizeText(String(body.accountType || ""));
const rawNetworkRole = normalizeText(String(body.networkRole || ""));

if (!name) {
return NextResponse.json(
{ error: "Company name is required." },
{ status: 400 },
);
}

if (!location) {
return NextResponse.json(
{ error: "Regional hub is required." },
{ status: 400 },
);
}

if (!isAccountType(rawAccountType)) {
return NextResponse.json(
{ error: "A valid organization type is required." },
{ status: 400 },
);
}

const accountConfig = ACCOUNT_TYPE_CONFIG[rawAccountType];
const networkRole = normalizeNetworkRole(rawAccountType, rawNetworkRole);

if (!accountConfig.allowedNetworkRoles.includes(networkRole)) {
return NextResponse.json(
{ error: "Network role is not valid for this organization type." },
{ status: 400 },
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
{ status: 409 },
);
}

const baseSlug = createSlug(name);

if (!baseSlug) {
return NextResponse.json(
{ error: "Company name must include letters or numbers." },
{ status: 400 },
);
}

const slug = `${baseSlug}-${crypto.randomUUID().slice(0, 8)}`;

const { data: company, error: companyError } = await supabase
.from("companies")
.insert({
name,
slug,
category: networkRole,
location,
network_role: networkRole,
status: "verified",
user_id: user.id,
})
.select()
.single();

if (companyError || !company) {
console.error(companyError);

return NextResponse.json(
{ error: "Failed to create company." },
{ status: 500 },
);
}

const normalizedEmail = String(user.email || "").trim().toLowerCase();

const { error: profileError } = await supabase.from("profiles").upsert({
id: user.id,
email: normalizedEmail,
role: accountConfig.profileRole,
company_id: company.id,
});

if (profileError) {
console.error(profileError);

return NextResponse.json(
{ error: "Company created, but failed to connect your profile." },
{ status: 500 },
);
}

await supabase.from("notifications").insert({
title: "Company Created",
message: `${name} workspace was created successfully.`,
type: "company",
is_read: false,
company_id: company.id,
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
category: networkRole,
location,
account_type: rawAccountType,
profile_role: accountConfig.profileRole,
network_role: networkRole,
owner_email: normalizedEmail,
created_at: new Date().toISOString(),
},
});

try {
if (user.email) {
await sendEmail({
to: user.email,
subject: "Welcome to Nexus Pavilion",
html: companyWelcomeEmail({
companyName: name,
workspaceUrl: `${process.env.NEXT_PUBLIC_SITE_URL}/company/settings`,
}),
});
}
} catch (error) {
console.error("Welcome email failed:", error);
}

return NextResponse.json({
success: true,
company,
accountType: rawAccountType,
role: accountConfig.profileRole,
redirectTo: "/company/settings",
});
} catch (error) {
console.error(error);

return NextResponse.json(
{ error: "Internal server error." },
{ status: 500 },
);
}
}