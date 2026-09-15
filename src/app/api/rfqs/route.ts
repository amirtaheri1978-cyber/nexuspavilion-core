import { NextResponse } from "next/server";

import { sendEmail } from "@/lib/email/send-email";
import { rfqCreatedEmail } from "@/lib/email/templates/rfq-created-email";
import { getActiveMembershipForUserCompany } from "@/lib/auth/membership";
import { resolveRfqDeadlineForStorage } from "@/lib/datetime/local-date-time-to-utc";
import { joinPublicSitePath } from "@/lib/ops/public-site-url";
import { reportCriticalApiFailure } from "@/lib/ops/report-critical-api-failure";
import { canCreateCompanyRfq } from "@/lib/procurement/procurement-write-authorization";
import {
  evaluateRfqRequirements,
  isRfqPublicationAcknowledged,
} from "@/lib/procurement/rfq-requirements-completeness";
import { recordTrustedProcurementActivity } from "@/lib/procurement/record-procurement-activity";
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

type CancelRfqRpcResult = {
success?: boolean;
error_code?: string;
error_message?: string;
rfq_id?: string;
cancelled_at?: string;
};

function cancellationStatus(errorCode: string | undefined) {
if (errorCode === "UNAUTHENTICATED") return 401;
if (errorCode === "FORBIDDEN") return 403;
if (errorCode === "RFQ_NOT_FOUND") return 404;
if (errorCode?.startsWith("INVALID_")) return 400;
return 409;
}

function isPlainJsonObject(value: unknown): value is Record<string, unknown> {
return value !== null && typeof value === "object" && !Array.isArray(value);
}

function isRfqReissueLineageConflict(error: unknown) {
if (!isPlainJsonObject(error)) return false;

const code = normalizeText(error.code);
const message = normalizeText(error.message);
const details = normalizeText(error.details);
const hint = normalizeText(error.hint);
const databaseText = `${message}\n${details}\n${hint}`;

if (
code === "23503" &&
(
message === "Reissue source RFQ was not found." ||
databaseText.includes("rfqs_reissued_from_rfq_id_fkey")
)
) {
return true;
}

if (
code === "23514" &&
(
message === "An RFQ cannot be reissued from itself." ||
message ===
"A reissued RFQ must reference a cancelled, unawarded predecessor." ||
message ===
"A reissued RFQ must begin as a new open, unawarded procurement." ||
databaseText.includes("rfqs_reissue_not_self_check")
)
) {
return true;
}

if (
code === "42501" &&
message === "RFQ reissue lineage cannot cross issuing companies."
) {
return true;
}

return (
code === "23505" &&
databaseText.includes("rfqs_one_reissue_per_source_idx")
);
}

export async function PATCH(request: Request) {
try {
const supabase = await createClient();
const {
data: { user },
error: userError,
} = await supabase.auth.getUser();

if (userError || !user) {
return NextResponse.json(
{ success: false, error_code: "UNAUTHENTICATED", error: "Unauthorized." },
{ status: 401 }
);
}

let parsedBody: unknown;

try {
parsedBody = await request.json();
} catch {
return NextResponse.json(
{ success: false, error_code: "INVALID_REQUEST", error: "A valid request body is required." },
{ status: 400 }
);
}

if (!isPlainJsonObject(parsedBody)) {
return NextResponse.json(
{ success: false, error_code: "INVALID_REQUEST", error: "A valid request body is required." },
{ status: 400 }
);
}

const allowedKeys = new Set(["action", "rfqId", "reason"]);
if (Object.keys(parsedBody).some((key) => !allowedKeys.has(key))) {
return NextResponse.json(
{ success: false, error_code: "INVALID_REQUEST", error: "The request contains unsupported fields." },
{ status: 400 }
);
}

const body = parsedBody;

const action = normalizeText(body.action);
const rfqId = normalizeText(body.rfqId);
const reason = normalizeText(body.reason);

if (action !== "cancel" || !rfqId) {
return NextResponse.json(
{
success: false,
error_code: "INVALID_REQUEST",
error: 'Action "cancel" and RFQ ID are required.',
},
{ status: 400 }
);
}

if (!reason) {
return NextResponse.json(
{
success: false,
error_code: "INVALID_CANCELLATION_REASON",
error: "A cancellation reason is required.",
},
{ status: 400 }
);
}

const { data: rpcData, error: rpcError } = await supabase.rpc("cancel_rfq", {
p_rfq_id: rfqId,
p_reason: reason,
});
const result = rpcData as CancelRfqRpcResult | null;

if (result && !result.success) {
return NextResponse.json(
{
success: false,
error_code: result.error_code,
error: result.error_message || "RFQ cancellation was rejected.",
},
{ status: cancellationStatus(result.error_code) }
);
}

if (rpcError || !result?.success || !result.rfq_id) {
reportCriticalApiFailure({
domain: "rfq",
operation: "cancel",
failureStage: "cancellation_rpc",
route: "/api/rfqs",
method: "PATCH",
error: rpcError ?? new Error("CancelRfqRpcResultMissing"),
});

return NextResponse.json(
{ success: false, error: "Failed to cancel RFQ." },
{ status: 500 }
);
}

return NextResponse.json({
success: true,
rfqId: result.rfq_id,
cancelledAt: result.cancelled_at ?? null,
});
} catch (error) {
reportCriticalApiFailure({
domain: "rfq",
operation: "cancel",
failureStage: "outer_catch",
route: "/api/rfqs",
method: "PATCH",
error,
});

return NextResponse.json(
{ success: false, error: "Internal server error." },
{ status: 500 }
);
}
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
reportCriticalApiFailure({
  domain: "rfq",
  operation: "create",
  failureStage: "membership_lookup",
  route: "/api/rfqs",
  method: "POST",
  error: membershipError,
});

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
const rawDeadline = normalizeText(body.deadline);
const reissuedFromRfqId = normalizeText(body.reissued_from_rfq_id) || null;

const requirementsCompleteness = evaluateRfqRequirements({
title,
description,
category,
location,
deadline: rawDeadline,
deadline_timezone: body.deadline_timezone,
rfi_deadline: body.rfi_deadline,
rfi_deadline_timezone: body.rfi_deadline_timezone,
mobilization_date: body.mobilization_date,
substantial_completion_date: body.substantial_completion_date,
procurement_scope: normalizeText(body.procurement_scope) || "subcontractor",
sourcing_method: normalizeText(body.sourcing_method) || "invited",
contract_framework: normalizeText(body.contract_framework) || "project_specific",
bid_model: normalizeText(body.bid_model) || "lump_sum",
});

if (requirementsCompleteness.status === "incomplete") {
return NextResponse.json(
{
error: "RFQ is not ready to publish.",
requirements: {
status: requirementsCompleteness.status,
missing: requirementsCompleteness.missingSignals,
issues: requirementsCompleteness.blockingIssues,
},
},
{ status: 400 }
);
}

if (!isRfqPublicationAcknowledged(body.ready_to_publish_acknowledged)) {
return NextResponse.json(
{
error:
"Confirm the Ready to Publish acknowledgement after reviewing the final RFQ package.",
requirements: {
status: "awaiting_acknowledgement",
missing: [],
issues: [],
},
},
{ status: 400 }
);
}

let resolvedDeadline: {
deadline: string;
deadline_timezone: string;
};

try {
resolvedDeadline = resolveRfqDeadlineForStorage({
deadline: rawDeadline,
deadline_timezone: body.deadline_timezone,
});
} catch (deadlineError) {
return NextResponse.json(
{
error:
deadlineError instanceof Error
? deadlineError.message
: "Invalid submission deadline or timezone.",
},
{ status: 400 }
);
}

const deadline = resolvedDeadline.deadline;
const deadlineTimezone = resolvedDeadline.deadline_timezone;

const projectName = normalizeText(body.project_name);
const ownerClient = normalizeText(body.owner_client);
const internalProjectId = normalizeText(body.internal_project_id);
const rawRfiDeadline = normalizeText(body.rfi_deadline);

let rfiDeadline: string | null = null;
let rfiDeadlineTimezone = normalizeTimezone(body.rfi_deadline_timezone);

if (rawRfiDeadline) {
  try {
    const resolvedRfiDeadline = resolveRfqDeadlineForStorage({
      deadline: rawRfiDeadline,
      deadline_timezone: body.rfi_deadline_timezone,
    });
    rfiDeadline = resolvedRfiDeadline.deadline;
    rfiDeadlineTimezone = resolvedRfiDeadline.deadline_timezone;
  } catch (rfiDeadlineError) {
    return NextResponse.json(
      {
        error:
          rfiDeadlineError instanceof Error
            ? rfiDeadlineError.message
            : "Invalid RFI deadline or timezone.",
      },
      { status: 400 },
    );
  }
}

const mobilizationDate = normalizeText(body.mobilization_date);
const substantialCompletionDate = normalizeText(
body.substantial_completion_date
);

const procurementScope = normalizeProcurementScope(body.procurement_scope);
const sourcingMethod = normalizeSourcingMethod(body.sourcing_method);
const contractFramework = normalizeContractFramework(body.contract_framework);
const bidModel = normalizeBidModel(body.bid_model);

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
rfi_deadline: rfiDeadline,
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
reissued_from_rfq_id: reissuedFromRfqId,
})
.select()
.single();

if (error || !rfq) {
if (
reissuedFromRfqId &&
error &&
isRfqReissueLineageConflict(error)
) {
return NextResponse.json(
{
error:
"This RFQ cannot be published as a replacement for the selected source RFQ.",
},
{ status: 409 }
);
}

reportCriticalApiFailure({
  domain: "rfq",
  operation: "create",
  failureStage: "rfq_insert",
  route: "/api/rfqs",
  method: "POST",
  error: error ?? new Error("RfqInsertMissing"),
});

return NextResponse.json(
{ error: "Failed to create RFQ." },
{ status: 500 }
);
}

await recordTrustedProcurementActivity(
  supabase,
  "rfq_created",
  rfq.id,
  {
    userId: user.id,
    companyId: profile.company_id,
  },
);

try {
const rfqUrl = joinPublicSitePath(`/rfq/${rfq.slug}`);
if (user.email && rfqUrl) {
await sendEmail({
to: user.email,
subject: `RFQ Created: ${rfq.title}`,
html: rfqCreatedEmail({
rfqTitle: rfq.title || "New RFQ",
category: rfq.category || "Procurement",
budget: rfq.budget ? String(rfq.budget) : "Not specified",
rfqUrl,
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
reportCriticalApiFailure({
  domain: "rfq",
  operation: "create",
  failureStage: "outer_catch",
  route: "/api/rfqs",
  method: "POST",
  error,
});

return NextResponse.json(
{ error: "Internal server error." },
{ status: 500 }
);
}
}
