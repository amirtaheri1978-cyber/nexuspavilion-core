import { NextResponse } from "next/server";

import { logCompanyActivity } from "@/lib/activity/log-company-activity";
import { sendEmail } from "@/lib/email/send-email";
import { rfqCreatedEmail } from "@/lib/email/templates/rfq-created-email";
import { createClient } from "@/lib/supabase/server";

type ProcurementScope =
| "material"
| "subcontractor"
| "equipment"
| "professional_service";

type SourcingMethod = "open" | "invited" | "sealed_bid";

type ContractFramework = "project_specific" | "framework";

const PROCUREMENT_SCOPES: ProcurementScope[] = [
"material",
"subcontractor",
"equipment",
"professional_service",
];

const SOURCING_METHODS: SourcingMethod[] = ["open", "invited", "sealed_bid"];

const CONTRACT_FRAMEWORKS: ContractFramework[] = [
"project_specific",
"framework",
];

function createSlug(title: string) {
return `${title
.toLowerCase()
.trim()
.replace(/[^a-z0-9]+/g, "-")
.replace(/^-+|-+$/g, "")}-${Date.now()}`;
}

function canCreateRfq(role: string | null | undefined) {
return ["owner", "admin", "buyer"].includes(String(role || "").toLowerCase());
}

function normalizeText(value: unknown) {
return String(value || "").trim();
}

function normalizeProcurementScope(value: unknown): ProcurementScope {
const normalized = normalizeText(value) as ProcurementScope;

if (PROCUREMENT_SCOPES.includes(normalized)) {
return normalized;
}

return "subcontractor";
}

function normalizeSourcingMethod(value: unknown): SourcingMethod {
const normalized = normalizeText(value) as SourcingMethod;

if (SOURCING_METHODS.includes(normalized)) {
return normalized;
}

return "invited";
}

function normalizeContractFramework(value: unknown): ContractFramework {
const normalized = normalizeText(value) as ContractFramework;

if (CONTRACT_FRAMEWORKS.includes(normalized)) {
return normalized;
}

return "project_specific";
}

function getProcurementScopeLabel(value: ProcurementScope) {
if (value === "material") return "Material / Product RFQ";
if (value === "equipment") return "Equipment Rental RFQ";
if (value === "professional_service") return "Professional Service RFQ";
return "Subcontractor / Trade RFQ";
}

function getSourcingMethodLabel(value: SourcingMethod) {
if (value === "open") return "Open RFQ";
if (value === "sealed_bid") return "Sealed Bid RFQ";
return "Invited / Selective RFQ";
}

function getContractFrameworkLabel(value: ContractFramework) {
if (value === "framework") return "Master / Framework RFQ";
return "Project-Specific RFQ";
}

export async function POST(request: Request) {
try {
const supabase = await createClient();

const {
data: { user },
error: userError,
} = await supabase.auth.getUser();

if (userError || !user) {
return NextResponse.json(
{ error: "Unauthorized. Please sign in again on this workspace URL." },
{ status: 401 }
);
}

const { data: profile, error: profileError } = await supabase
.from("profiles")
.select("id, email, role, company_id")
.eq("id", user.id)
.single();

if (profileError || !profile?.company_id) {
return NextResponse.json(
{ error: "No company linked to profile." },
{ status: 400 }
);
}

if (!canCreateRfq(profile.role)) {
return NextResponse.json(
{ error: "Only owners, admins, and buyers can create RFQs." },
{ status: 403 }
);
}

const body = await request.json();

const title = normalizeText(body.title);
const description = normalizeText(body.description);
const category = normalizeText(body.category);
const location = normalizeText(body.location);
const budget = normalizeText(body.budget);
const deadline = normalizeText(body.deadline);

const procurementScope = normalizeProcurementScope(body.procurement_scope);
const sourcingMethod = normalizeSourcingMethod(body.sourcing_method);
const contractFramework = normalizeContractFramework(
body.contract_framework
);

if (!title) {
return NextResponse.json(
{ error: "RFQ title is required." },
{ status: 400 }
);
}

const slug = createSlug(title);

const { data: rfq, error } = await supabase
.from("rfqs")
.insert({
title,
slug,
description,
category,
location,
budget,
deadline,
procurement_scope: procurementScope,
sourcing_method: sourcingMethod,
contract_framework: contractFramework,
status: "open",
company_id: profile.company_id,
user_id: user.id,
})
.select()
.single();

if (error || !rfq) {
return NextResponse.json(
{ error: error?.message || "Failed to create RFQ." },
{ status: 500 }
);
}

const procurementMetadata = {
procurement_scope: procurementScope,
procurement_scope_label: getProcurementScopeLabel(procurementScope),
sourcing_method: sourcingMethod,
sourcing_method_label: getSourcingMethodLabel(sourcingMethod),
contract_framework: contractFramework,
contract_framework_label: getContractFrameworkLabel(contractFramework),
};

await supabase.from("audit_logs").insert({
action: "RFQ_CREATED",
entity_type: "rfq",
entity_id: rfq.id,
user_id: user.id,
company_id: profile.company_id,
metadata: {
title: rfq.title,
budget: rfq.budget,
category: rfq.category,
slug: rfq.slug,
...procurementMetadata,
},
});

await logCompanyActivity({
supabase,
companyId: profile.company_id,
actorId: user.id,
action: "RFQ_CREATED",
entityType: "rfq",
entityId: rfq.id,
metadata: {
title: rfq.title,
budget: rfq.budget,
category: rfq.category,
location: rfq.location,
slug: rfq.slug,
...procurementMetadata,
},
});

await supabase.from("notifications").insert({
title: "RFQ Created",
message: `${rfq.title} procurement opportunity has been published as a ${getProcurementScopeLabel(
procurementScope
)}.`,
type: "rfq",
is_read: false,
company_id: profile.company_id,
});

try {
if (user.email) {
await sendEmail({
to: user.email,
subject: `RFQ Created: ${rfq.title}`,
html: rfqCreatedEmail({
rfqTitle: rfq.title || "New RFQ",
category: rfq.category || "Procurement",
budget: rfq.budget ? String(rfq.budget) : "Not specified",
rfqUrl: `${process.env.NEXT_PUBLIC_SITE_URL}/rfq/${rfq.slug}`,
procurementScope: getProcurementScopeLabel(procurementScope),
sourcingMethod: getSourcingMethodLabel(sourcingMethod),
contractFramework: getContractFrameworkLabel(contractFramework),
}),
});
}
} catch (emailError) {
console.error("RFQ created email failed:", emailError);
}

return NextResponse.json({
success: true,
rfq,
});
} catch (error) {
console.error(error);

return NextResponse.json(
{ error: "Internal server error." },
{ status: 500 }
);
}
}