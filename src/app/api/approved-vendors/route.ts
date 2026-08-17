import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

const AVL_MANAGEMENT_ROLES = ["owner", "admin", "buyer"];

type ApprovedVendorStatus =
| "approved"
| "conditional"
| "suspended"
| "rejected";

const APPROVED_VENDOR_STATUSES: ApprovedVendorStatus[] = [
"approved",
"conditional",
"suspended",
"rejected",
];

function normalizeText(value: unknown) {
return String(value || "").trim();
}

function normalizeStatus(value: unknown): ApprovedVendorStatus {
const status = normalizeText(value).toLowerCase() as ApprovedVendorStatus;

if (APPROVED_VENDOR_STATUSES.includes(status)) {
return status;
}

return "approved";
}

function normalizeRating(value: unknown) {
const rating = Number(value || 85);

if (!Number.isFinite(rating)) {
return 85;
}

return Math.max(0, Math.min(100, Math.round(rating)));
}

function canManageAvl(role: string | null | undefined) {
return AVL_MANAGEMENT_ROLES.includes(String(role || "").toLowerCase());
}

export async function POST(request: Request) {
try {
const body = await request.json();

const vendorCompanyId = normalizeText(body.vendorCompanyId);
const status = normalizeStatus(body.status);
const rating = normalizeRating(body.rating);
const notes = normalizeText(body.notes);

if (!vendorCompanyId) {
return NextResponse.json(
{ error: "Vendor company ID is required." },
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
.single();

if (!profile?.company_id) {
return NextResponse.json(
{ error: "Company profile is required." },
{ status: 403 }
);
}

if (!canManageAvl(profile.role)) {
return NextResponse.json(
{ error: "Only owners, admins, and buyers can manage approved vendors." },
{ status: 403 }
);
}

if (vendorCompanyId === profile.company_id) {
return NextResponse.json(
{ error: "A company cannot approve itself as a vendor." },
{ status: 400 }
);
}

const { data: vendorCompany } = await supabase
.from("company_directory")
.select("id, name, network_role, category")
.eq("id", vendorCompanyId)
.single();

if (!vendorCompany) {
return NextResponse.json(
{ error: "Vendor company not found." },
{ status: 404 }
);
}

const { data: approvedVendor, error } = await supabase
.from("approved_vendors")
.upsert(
{
buyer_company_id: profile.company_id,
vendor_company_id: vendorCompanyId,
status,
rating,
notes,
},
{
onConflict: "buyer_company_id,vendor_company_id",
}
)
.select("*")
.single();

if (error || !approvedVendor) {
console.error(error);

return NextResponse.json(
{ error: error?.message || "Failed to approve vendor." },
{ status: 500 }
);
}

await supabase.from("audit_logs").insert({
action: "APPROVED_VENDOR_UPSERTED",
entity_type: "approved_vendor",
entity_id: approvedVendor.id,
user_id: user.id,
company_id: profile.company_id,
metadata: {
buyer_company_id: profile.company_id,
vendor_company_id: vendorCompanyId,
vendor_company_name: vendorCompany.name,
vendor_category: vendorCompany.category,
vendor_network_role: vendorCompany.network_role,
status,
rating,
notes,
updated_at: new Date().toISOString(),
},
});

await supabase.from("notifications").insert({
title: "Approved Vendor Updated",
message: `${vendorCompany.name || "Vendor"} was added to your approved vendor list.`,
type: "approved_vendor",
is_read: false,
company_id: profile.company_id,
});

return NextResponse.json({
success: true,
approvedVendor,
});
} catch (error) {
console.error(error);

return NextResponse.json(
{ error: "Internal server error." },
{ status: 500 }
);
}
}