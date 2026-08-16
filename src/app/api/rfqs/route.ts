import { NextResponse } from "next/server";

import { sendEmail } from "@/lib/email/send-email";
import { rfqCreatedEmail } from "@/lib/email/templates/rfq-created-email";
import { getActiveMembershipForUserCompany } from "@/lib/auth/membership";
import { canCreateCompanyRfq } from "@/lib/procurement/procurement-write-authorization";
import { createClient } from "@/lib/supabase/server";

type ProcurementScope =
| "material"
| "subcontractor"
| "equipment"
| "professional_service";

type SourcingMethod = "open" | "invited" | "sealed_bid";
type ContractFramework = "project_specific" | "framework";
type BidModel = "lump_sum" | "best_value" | "construction_management";

const PROCUREMENT_SCOPES: ProcurementScope[] = [
"material",
"subcontractor",
"equipment",
"professional_service",
];

const SOURCING_METHODS: SourcingMethod[] = ["open", "invited", "sealed_bid"];
const CONTRACT_FRAMEWORKS: ContractFramework[] = ["project_specific", "framework"];
const BID_MODELS: BidModel[] = ["lump_sum", "best_value", "construction_management"];

function createSlug(title: string) {
return `${title
.toLowerCase()
.trim()
.replace(/[^a-z0-9]+/g, "-")
.replace(/^-+|-+$/g, "")}-${Date.now()}`;
}


function normalizeText(value: unknown) {
return String(value || "").trim();
}

function normalizeBoolean(value: unknown) {
return value === true || value === "true";
}

function normalizeTimezone(value: unknown) {
const timezone = normalizeText(value);

if (!timezone) return "America/Toronto";

return timezone;
}

function normalizeProcurementScope(value: unknown): ProcurementScope {
const normalized = normalizeText(value) as ProcurementScope;
return PROCUREMENT_SCOPES.includes(normalized) ? normalized : "subcontractor";
}

function normalizeSourcingMethod(value: unknown): SourcingMethod {
const normalized = normalizeText(value) as SourcingMethod;
return SOURCING_METHODS.includes(normalized) ? normalized : "invited";
}

function normalizeContractFramework(value: unknown): ContractFramework {
const normalized = normalizeText(value) as ContractFramework;
return CONTRACT_FRAMEWORKS.includes(normalized) ? normalized : "project_specific";
}

function normalizeBidModel(value: unknown): BidModel {
const normalized = normalizeText(value) as BidModel;
return BID_MODELS.includes(normalized) ? normalized : "lump_sum";
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
.select("id, email, company_id")
.eq("id", user.id)
.single();

if (profileError || !profile?.company_id) {
return NextResponse.json(
{ error: "No company linked to profile." },
{ status: 400 }
);
}

let membership;

try {
membership = await getActiveMembershipForUserCompany(
supabase,
user.id,
profile.company_id
);
} catch (membershipError) {
console.error("RFQ create membership lookup failed:", membershipError);

return NextResponse.json(
{ error: "Unable to verify organization membership." },
{ status: 500 }
);
}

if (!canCreateCompanyRfq(membership, profile.company_id)) {
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
const deadlineTimezone = normalizeTimezone(body.deadline_timezone);

const projectName = normalizeText(body.project_name);
const ownerClient = normalizeText(body.owner_client);
const internalProjectId = normalizeText(body.internal_project_id);
const rfiDeadline = normalizeText(body.rfi_deadline);
const rfiDeadlineTimezone = normalizeTimezone(body.rfi_deadline_timezone);
const mobilizationDate = normalizeText(body.mobilization_date);
const substantialCompletionDate = normalizeText(
body.substantial_completion_date
);

const procurementScope = normalizeProcurementScope(body.procurement_scope);
const sourcingMethod = normalizeSourcingMethod(body.sourcing_method);
const contractFramework = normalizeContractFramework(body.contract_framework);
const bidModel = normalizeBidModel(body.bid_model);

if (!title) {
return NextResponse.json(
{ error: "RFQ title is required." },
{ status: 400 }
);
}

if (!deadline) {
return NextResponse.json(
{ error: "Submission closing date and time are required." },
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
deadline_timezone: deadlineTimezone,
project_name: projectName,
owner_client: ownerClient,
internal_project_id: internalProjectId,
rfi_deadline: rfiDeadline || null,
rfi_deadline_timezone: rfiDeadlineTimezone,
mobilization_date: mobilizationDate || null,
substantial_completion_date: substantialCompletionDate || null,
procurement_scope: procurementScope,
sourcing_method: sourcingMethod,
contract_framework: contractFramework,
bid_model: bidModel,
nda_required: normalizeBoolean(body.nda_required),
performance_bond_required: normalizeBoolean(body.performance_bond_required),
bid_bond_required: normalizeBoolean(body.bid_bond_required),
insurance_required: normalizeBoolean(body.insurance_required),
insurance_notes: normalizeText(body.insurance_notes),
safety_requirements: normalizeText(body.safety_requirements),
prequalification_notes: normalizeText(body.prequalification_notes),
advanced_controls_enabled: normalizeBoolean(body.advanced_controls_enabled),
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
bid_model: bidModel,
deadline_timezone: deadlineTimezone,
rfi_deadline_timezone: rfiDeadlineTimezone,
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
location: rfq.location,
slug: rfq.slug,
deadline: rfq.deadline,
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