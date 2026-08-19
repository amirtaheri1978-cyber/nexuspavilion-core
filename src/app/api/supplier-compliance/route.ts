import { NextResponse } from "next/server";

import {
  SUPPLIER_COMPLIANCE_DOMAIN_AVAILABLE,
  SUPPLIER_COMPLIANCE_UNAVAILABLE_MESSAGE,
} from "@/lib/procurement/supplier-domain-availability";
import { createClient } from "@/lib/supabase/server";

const COMPLIANCE_MANAGEMENT_ROLES = ["owner", "admin", "buyer"];

type ComplianceStatus = "valid" | "expiring_soon" | "expired" | "missing";

const COMPLIANCE_STATUSES: ComplianceStatus[] = [
"valid",
"expiring_soon",
"expired",
"missing",
];

function normalizeText(value: unknown) {
return String(value || "").trim();
}

function normalizeStatus(value: unknown): ComplianceStatus {
const status = normalizeText(value).toLowerCase() as ComplianceStatus;

if (COMPLIANCE_STATUSES.includes(status)) {
return status;
}

return "missing";
}

function normalizeDate(value: unknown) {
const text = normalizeText(value);

if (!text) {
return null;
}

const date = new Date(text);

if (Number.isNaN(date.getTime())) {
return null;
}

return text;
}

function canManageCompliance(role: string | null | undefined) {
return COMPLIANCE_MANAGEMENT_ROLES.includes(
String(role || "").toLowerCase()
);
}

function statusScore(status: ComplianceStatus) {
if (status === "valid") return 100;
if (status === "expiring_soon") return 70;
if (status === "expired") return 25;
return 0;
}

function calculateComplianceScore({
insuranceStatus,
certificateStatus,
licenseStatus,
taxStatus,
}: {
insuranceStatus: ComplianceStatus;
certificateStatus: ComplianceStatus;
licenseStatus: ComplianceStatus;
taxStatus: ComplianceStatus;
}) {
return Math.round(
statusScore(insuranceStatus) * 0.35 +
statusScore(certificateStatus) * 0.3 +
statusScore(licenseStatus) * 0.2 +
statusScore(taxStatus) * 0.15
);
}

function getOverallStatus(score: number): ComplianceStatus {
if (score >= 85) return "valid";
if (score >= 60) return "expiring_soon";
if (score > 0) return "expired";
return "missing";
}

export async function POST(request: Request) {
try {
const body = await request.json();

const vendorCompanyId = normalizeText(body.vendorCompanyId);

const insuranceStatus = normalizeStatus(body.insuranceStatus);
const certificateStatus = normalizeStatus(body.certificateStatus);
const licenseStatus = normalizeStatus(body.licenseStatus);
const taxStatus = normalizeStatus(body.taxStatus);

const insuranceExpiry = normalizeDate(body.insuranceExpiry);
const certificateExpiry = normalizeDate(body.certificateExpiry);
const licenseExpiry = normalizeDate(body.licenseExpiry);

const notes = normalizeText(body.notes);

if (!vendorCompanyId) {
return NextResponse.json(
{ error: "Vendor company ID is required." },
{ status: 400 }
);
}

if (!SUPPLIER_COMPLIANCE_DOMAIN_AVAILABLE) {
return NextResponse.json(
{ error: SUPPLIER_COMPLIANCE_UNAVAILABLE_MESSAGE },
{ status: 404 }
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

if (!canManageCompliance(profile.role)) {
return NextResponse.json(
{
error:
"Only owners, admins, and buyers can manage supplier compliance.",
},
{ status: 403 }
);
}

if (vendorCompanyId === profile.company_id) {
return NextResponse.json(
{ error: "A company cannot manage compliance for itself." },
{ status: 400 }
);
}

const { data: vendorCompany } = await supabase
.from("company_directory")
.select("id, name, category, network_role")
.eq("id", vendorCompanyId)
.single();

if (!vendorCompany) {
return NextResponse.json(
{ error: "Vendor company not found." },
{ status: 404 }
);
}

const complianceScore = calculateComplianceScore({
insuranceStatus,
certificateStatus,
licenseStatus,
taxStatus,
});

const overallStatus = getOverallStatus(complianceScore);

const { data: compliance, error: complianceError } = await supabase
.from("supplier_compliance")
.upsert(
{
buyer_company_id: profile.company_id,
vendor_company_id: vendorCompanyId,
insurance_status: insuranceStatus,
insurance_expiry: insuranceExpiry,
certificate_status: certificateStatus,
certificate_expiry: certificateExpiry,
license_status: licenseStatus,
license_expiry: licenseExpiry,
tax_status: taxStatus,
compliance_score: complianceScore,
overall_status: overallStatus,
notes,
updated_at: new Date().toISOString(),
},
{
onConflict: "buyer_company_id,vendor_company_id",
}
)
.select("*")
.single();

if (complianceError || !compliance) {
console.error(complianceError);

return NextResponse.json(
{ error: complianceError?.message || "Failed to update compliance." },
{ status: 500 }
);
}

await supabase.from("audit_logs").insert({
action: "SUPPLIER_COMPLIANCE_UPDATED",
entity_type: "supplier_compliance",
entity_id: compliance.id,
user_id: user.id,
company_id: profile.company_id,
metadata: {
buyer_company_id: profile.company_id,
vendor_company_id: vendorCompanyId,
vendor_company_name: vendorCompany.name,
vendor_category: vendorCompany.category,
vendor_network_role: vendorCompany.network_role,
insurance_status: insuranceStatus,
certificate_status: certificateStatus,
license_status: licenseStatus,
tax_status: taxStatus,
compliance_score: complianceScore,
overall_status: overallStatus,
updated_at: new Date().toISOString(),
},
});

await supabase.from("notifications").insert({
title: "Supplier Compliance Updated",
message: `${vendorCompany.name || "Supplier"} compliance status was updated to ${overallStatus}.`,
type: "supplier_compliance",
is_read: false,
company_id: profile.company_id,
});

return NextResponse.json({
success: true,
compliance,
});
} catch (error) {
console.error(error);

return NextResponse.json(
{ error: "Internal server error." },
{ status: 500 }
);
}
}