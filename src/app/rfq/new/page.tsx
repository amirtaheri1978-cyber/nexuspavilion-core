"use client";

import DeadlineField from "@/components/deadline-field";
import { ExecutiveBadge } from "@/components/executive/executive-badge";
import { ExecutiveMetricCard } from "@/components/executive/executive-metric-card";
import { ExecutivePanel } from "@/components/executive/executive-panel";
import { ExecutiveProgress } from "@/components/executive/executive-progress";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useMemo, useState, type ReactNode } from "react";
import {
  RfqPublicationReadinessReview,
  type RfqPublicationReviewSection,
} from "@/components/rfq-workspace/rfq-publication-readiness-review";
import { RFQScopeReview } from "@/components/rfq-workspace/rfq-scope-review";
import { useRFQDraftAutosave } from "@/hooks/use-rfq-draft-autosave";
import {
  EXECUTIVE_BUTTON_PRIMARY,
  EXECUTIVE_BUTTON_SECONDARY,
  EXECUTIVE_BUTTON_TERTIARY,
  EXECUTIVE_DIALOG_BODY,
  EXECUTIVE_DIALOG_OVERLAY,
  EXECUTIVE_DIALOG_SURFACE,
  EXECUTIVE_DIALOG_TITLE,
  EXECUTIVE_FEEDBACK_ERROR,
  EXECUTIVE_FEEDBACK_INFO,
  EXECUTIVE_FEEDBACK_WARNING,
  EXECUTIVE_FOCUS_CYAN,
  EXECUTIVE_FORM_HELPER,
  EXECUTIVE_FORM_INPUT,
  EXECUTIVE_FORM_LABEL,
  EXECUTIVE_FORM_SELECT,
  EXECUTIVE_FORM_TEXTAREA,
  EXECUTIVE_PAGE_CLASS,
  EXECUTIVE_STEPPER_FOCUS,
  EXECUTIVE_STEPPER_MARKER,
  EXECUTIVE_STEPPER_MARKER_STATE,
  EXECUTIVE_STEPPER_SURFACE,
  EXECUTIVE_STEPPER_SURFACE_STATE,
  type ExecutiveStepperState,
} from "@/lib/design-system/executive-contract";
import { formatRfqDeadlineForDisplay } from "@/lib/datetime/format-rfq-deadline-display";
import { resolveRfqDeadlineForStorage } from "@/lib/datetime/local-date-time-to-utc";
import { evaluateRfqRequirements } from "@/lib/procurement/rfq-requirements-completeness";
import { evaluateRfqScopeReview } from "@/lib/procurement/rfq-scope-review";

type ProcurementScope =
| "material"
| "subcontractor"
| "equipment"
| "professional_service";

type SourcingMethod = "open" | "invited" | "sealed_bid";
type ContractFramework = "project_specific" | "framework";
type BidModel = "lump_sum" | "best_value" | "construction_management";

type WizardStep = 0 | 1 | 2 | 3 | 4;

type RFQFormData = {
title: string;
description: string;
category: string;
location: string;
budget: string;
deadline: string;
deadline_timezone: string;
project_name: string;
owner_client: string;
internal_project_id: string;
rfi_deadline: string;
rfi_deadline_timezone: string;
mobilization_date: string;
substantial_completion_date: string;
procurement_scope: ProcurementScope;
sourcing_method: SourcingMethod;
contract_framework: ContractFramework;
bid_model: BidModel;
nda_required: boolean;
performance_bond_required: boolean;
bid_bond_required: boolean;
insurance_required: boolean;
insurance_notes: string;
safety_requirements: string;
prequalification_notes: string;
advanced_controls_enabled: boolean;
};

const WIZARD_STEPS = [
"Project",
"Strategy",
"Controls",
"Documents",
"Publish",
];

const PROCUREMENT_SCOPES: {
value: ProcurementScope;
label: string;
description: string;
examples: string[];
}[] = [
{
value: "material",
label: "Material / Product RFQ",
description:
"Use this when buying materials, manufactured products, systems, or equipment components.",
examples: ["Concrete", "Steel", "Drywall", "HVAC units"],
},
{
value: "subcontractor",
label: "Subcontractor / Trade RFQ",
description:
"Use this when requesting pricing from a trade contractor for a work package.",
examples: ["Electrical", "Plumbing", "Roofing", "Interior trades"],
},
{
value: "equipment",
label: "Equipment Rental RFQ",
description:
"Use this for machinery, temporary systems, tools, or site equipment.",
examples: ["Cranes", "Excavators", "Scaffolding", "Site equipment"],
},
{
value: "professional_service",
label: "Professional Service RFQ",
description:
"Use this for design, engineering, consulting, cost, planning, or advisory services.",
examples: ["Architect", "Engineer", "Cost consultant", "Project advisor"],
},
];

const SOURCING_METHODS: {
value: SourcingMethod;
label: string;
description: string;
}[] = [
{
value: "open",
label: "Open RFQ",
description:
"Published broadly so qualified suppliers or contractors can submit quotes.",
},
{
value: "invited",
label: "Invited / Selective RFQ",
description:
"Sent to a selected group of qualified suppliers, subcontractors, or service providers.",
},
{
value: "sealed_bid",
label: "Sealed Bid RFQ",
description:
"Quotes are submitted securely and evaluated after the submission deadline.",
},
];

const CONTRACT_FRAMEWORKS: {
value: ContractFramework;
label: string;
description: string;
}[] = [
{
value: "project_specific",
label: "Project-Specific RFQ",
description: "A one-time procurement request for a defined project or scope.",
},
{
value: "framework",
label: "Master / Framework RFQ",
description:
"Used to establish recurring pricing or preferred supplier terms across projects.",
},
];

const BID_MODELS: {
value: BidModel;
label: string;
description: string;
}[] = [
{
value: "lump_sum",
label: "Lump Sum / Lowest Compliant",
description:
"Best for straightforward packages where award is primarily price-driven.",
},
{
value: "best_value",
label: "Best Value / Weighted Scoring",
description:
"Best when price, quality, safety, schedule, and experience are evaluated together.",
},
{
value: "construction_management",
label: "Construction Management / Fee-Based",
description:
"Best for fee-based or collaborative construction management delivery.",
},
];

const initialFormData: RFQFormData = {
title: "",
description: "",
category: "",
location: "",
budget: "",
deadline: "",
deadline_timezone: "America/Toronto",
project_name: "",
owner_client: "",
internal_project_id: "",
rfi_deadline: "",
rfi_deadline_timezone: "America/Toronto",
mobilization_date: "",
substantial_completion_date: "",
procurement_scope: "subcontractor",
sourcing_method: "invited",
contract_framework: "project_specific",
bid_model: "lump_sum",
nda_required: false,
performance_bond_required: false,
bid_bond_required: false,
insurance_required: false,
insurance_notes: "",
safety_requirements: "",
prequalification_notes: "",
advanced_controls_enabled: false,
};

function formatCurrency(value: string) {
const numericValue = Number(value.replace(/[^0-9.]/g, ""));

if (!value || Number.isNaN(numericValue)) {
return "$0";
}

return `$${numericValue.toLocaleString()}`;
}

function formatDeadlinePreview(value: string, timezone: string) {
if (!value) return "Not set";

try {
const resolved = resolveRfqDeadlineForStorage({
deadline: value,
deadline_timezone: timezone,
});

return formatRfqDeadlineForDisplay(
resolved.deadline,
resolved.deadline_timezone,
);
} catch {
return `${value} · ${timezone}`;
}
}

function getSelectedLabel<T extends string>(
options: { value: T; label: string }[],
value: T
) {
return options.find((item) => item.value === value)?.label || "Pending";
}

function NewRFQPageContent() {
const router = useRouter();
const searchParams = useSearchParams();
const reissueFrom = searchParams.get("reissueFrom")?.trim() || "";

const [activeStep, setActiveStep] = useState<WizardStep>(0);
const [loading, setLoading] = useState(false);
const [publishStage, setPublishStage] = useState("");
const [publishProgress, setPublishProgress] = useState(10);
const [publishSuccess, setPublishSuccess] = useState(false);
const [redirectCountdown, setRedirectCountdown] = useState(2);
const [createdRFQ, setCreatedRFQ] = useState<{
slug: string;
title: string;
} | null>(null);
const [error, setError] = useState("");
const [validationAttempted, setValidationAttempted] = useState(false);
const [readyToPublishAcknowledged, setReadyToPublishAcknowledged] =
useState(false);
const [formData, setFormData] = useState<RFQFormData>(initialFormData);

const draftValue = useMemo(
() => ({
activeStep,
formData,
}),
[activeStep, formData],
);

const draftAutosave = useRFQDraftAutosave({
storageKey: "nexus-pavilion:new-rfq-draft",
value: draftValue,
enabled: !loading,
delay: 900,
});

function handleResumeDraft() {
const draft = draftAutosave.loadDraft();

if (!draft) return;

setFormData(draft.formData);
setActiveStep(draft.activeStep);
setReadyToPublishAcknowledged(false);
}

function handleDiscardDraft() {
draftAutosave.clearDraft();
}

const budgetPreview = useMemo(
() => formatCurrency(formData.budget),
[formData.budget]
);

const deadlinePreview = useMemo(
() => formatDeadlinePreview(formData.deadline, formData.deadline_timezone),
[formData.deadline, formData.deadline_timezone]
);

const rfiDeadlinePreview = useMemo(
() =>
formatDeadlinePreview(
formData.rfi_deadline,
formData.rfi_deadline_timezone
),
[formData.rfi_deadline, formData.rfi_deadline_timezone]
);

const selectedScope = PROCUREMENT_SCOPES.find(
(item) => item.value === formData.procurement_scope
);

const selectedSourcing = SOURCING_METHODS.find(
(item) => item.value === formData.sourcing_method
);

const selectedFramework = CONTRACT_FRAMEWORKS.find(
(item) => item.value === formData.contract_framework
);

const selectedBidModel = BID_MODELS.find(
(item) => item.value === formData.bid_model
);

const rfqClassification = `${getSelectedLabel(
PROCUREMENT_SCOPES,
formData.procurement_scope
)} · ${getSelectedLabel(
SOURCING_METHODS,
formData.sourcing_method
)} · ${getSelectedLabel(CONTRACT_FRAMEWORKS, formData.contract_framework)}`;

const rfqRequirements = useMemo(
() =>
evaluateRfqRequirements({
title: formData.title,
description: formData.description,
category: formData.category,
location: formData.location,
deadline: formData.deadline,
deadline_timezone: formData.deadline_timezone,
rfi_deadline: formData.rfi_deadline,
rfi_deadline_timezone: formData.rfi_deadline_timezone,
mobilization_date: formData.mobilization_date,
substantial_completion_date: formData.substantial_completion_date,
procurement_scope: formData.procurement_scope,
sourcing_method: formData.sourcing_method,
contract_framework: formData.contract_framework,
bid_model: formData.bid_model,
}),
[
formData.title,
formData.description,
formData.category,
formData.location,
formData.deadline,
formData.deadline_timezone,
formData.rfi_deadline,
formData.rfi_deadline_timezone,
formData.mobilization_date,
formData.substantial_completion_date,
formData.procurement_scope,
formData.sourcing_method,
formData.contract_framework,
formData.bid_model,
]
);

const scopeReview = useMemo(
() =>
evaluateRfqScopeReview({
description: formData.description,
mobilizationDate: formData.mobilization_date,
substantialCompletionDate: formData.substantial_completion_date,
}),
[
formData.description,
formData.mobilization_date,
formData.substantial_completion_date,
]
);

const requiredChecklist = rfqRequirements.signals;
const recommendedChecklist = [
{
label: "Budget added",
complete: Number(formData.budget) > 0,
},
{
label: "Owner / client captured",
complete: formData.owner_client.trim().length > 1,
},
{
label: "Project ID captured",
complete: formData.internal_project_id.trim().length > 1,
},
{
label: "RFI deadline added",
complete: Boolean(formData.rfi_deadline),
},
{
label: "Mobilization or completion date added",
complete:
Boolean(formData.mobilization_date) ||
Boolean(formData.substantial_completion_date),
},
];

const recommendedReady = recommendedChecklist.filter(
(item) => item.complete
).length;

const requiredScore = rfqRequirements.completionPercent;

const recommendedScore = Math.round(
(recommendedReady / recommendedChecklist.length) * 100
);

const isFormReady = rfqRequirements.status === "ready";
const publicationReady = isFormReady && readyToPublishAcknowledged;
const projectStepReady = !rfqRequirements.missingSignals.some(
(signal) => signal.step === 0
);
const validationErrorId = "rfq-new-validation-error";
const isMissingRequiredField = (key: string) =>
validationAttempted &&
rfqRequirements.missingSignals.some((signal) => signal.key === key);
const scopeSummaryReady =
rfqRequirements.signals.find((signal) => signal.key === "description")
?.complete ?? false;
const submissionDeadlineReady =
rfqRequirements.signals.find(
(signal) => signal.key === "submission_deadline"
)?.complete ?? false;

const firstBlockingStep =
rfqRequirements.missingSignals[0]?.step ??
rfqRequirements.blockingIssues[0]?.step ??
4;

const publicationReviewSections = useMemo<RfqPublicationReviewSection[]>(
() => [
{
id: "project-identity",
title: "Project and RFQ package",
description:
"Confirm the supplier-facing package identity and commercial context.",
step: 0,
items: [
{ label: "Project Name", value: formData.project_name.trim() || "Not specified" },
{ label: "RFQ Title", value: formData.title.trim() || "Pending" },
{ label: "Category / Trade", value: formData.category.trim() || "Pending" },
{ label: "Project Location", value: formData.location.trim() || "Pending" },
{ label: "Scope of Work", value: formData.description.trim() || "Pending" },
{ label: "Submission Closing", value: deadlinePreview },
{ label: "Budget", value: formData.budget.trim() ? budgetPreview : "Not specified" },
],
},
{
id: "strategy",
title: "Procurement strategy",
description:
"Confirm market access, contract structure, and evaluation model.",
step: 1,
items: [
{ label: "Procurement Scope", value: selectedScope?.label || "Pending" },
{ label: "Sourcing Method", value: selectedSourcing?.label || "Pending" },
{ label: "Contract Framework", value: selectedFramework?.label || "Pending" },
{ label: "Evaluation Model", value: selectedBidModel?.label || "Pending" },
],
},
{
id: "deadlines-schedule",
title: "Project controls and schedule",
description:
"Verify closing controls and delivery dates are internally consistent.",
step: 2,
items: [
{ label: "Owner / Client", value: formData.owner_client.trim() || "Not specified" },
{ label: "Internal Project ID", value: formData.internal_project_id.trim() || "Not specified" },
{ label: "RFI / Clarification Deadline", value: rfiDeadlinePreview },
{ label: "Target Mobilization", value: formData.mobilization_date || "Not specified" },
{ label: "Substantial Completion", value: formData.substantial_completion_date || "Not specified" },
],
},
{
id: "enterprise-controls",
title: "Enterprise requirements",
description:
"Confirm confidentiality, bonding, insurance, safety, and prequalification decisions.",
step: 4,
items: [
{ label: "NDA", value: formData.nda_required ? "Required" : "Not required" },
{ label: "Performance Bond", value: formData.performance_bond_required ? "Required" : "Not required" },
{ label: "Bid Bond", value: formData.bid_bond_required ? "Required" : "Not required" },
{ label: "Insurance", value: formData.insurance_required ? "Required" : "Not required" },
{ label: "Insurance Notes", value: formData.insurance_notes.trim() || "None specified" },
{ label: "Safety Requirements", value: formData.safety_requirements.trim() || "None specified" },
{ label: "Prequalification", value: formData.prequalification_notes.trim() || "None specified" },
],
},
],
[
budgetPreview,
deadlinePreview,
formData,
rfiDeadlinePreview,
selectedBidModel?.label,
selectedFramework?.label,
selectedScope?.label,
selectedSourcing?.label,
]
);

function updateField(field: keyof RFQFormData, value: string | boolean) {
setReadyToPublishAcknowledged(false);
setFormData((current) => ({
...current,
[field]: value,
}));
}

function goToNextStep() {
setError("");
setValidationAttempted(false);

if (activeStep === 0 && !projectStepReady) {
setValidationAttempted(true);
setError("Complete the required project fields before continuing.");
return;
}

setActiveStep((current) => Math.min(current + 1, 4) as WizardStep);
}

function goToPreviousStep() {
setError("");
setValidationAttempted(false);
setActiveStep((current) => Math.max(current - 1, 0) as WizardStep);
}

async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
event.preventDefault();
if (loading) return;

if (!isFormReady) {
setValidationAttempted(true);
setError("Resolve the publication-readiness blockers before publishing.");
setActiveStep(firstBlockingStep as WizardStep);
return;
}

if (!readyToPublishAcknowledged) {
setError(
"Confirm the Ready to Publish acknowledgement after reviewing the final RFQ package."
);
setActiveStep(4);
return;
}

setLoading(true);
setError("");
setValidationAttempted(false);
setPublishProgress(15);
setPublishStage("Validating procurement package...");

try {
setPublishStage("Creating RFQ workspace...");
setPublishProgress(45);
const response = await fetch("/api/rfqs", {
method: "POST",
credentials: "include",
headers: {
"Content-Type": "application/json",
},
body: JSON.stringify({
title: formData.title.trim(),
description: formData.description.trim(),
category: formData.category.trim(),
location: formData.location.trim(),
budget: formData.budget.trim(),
deadline: formData.deadline,
deadline_timezone: formData.deadline_timezone,
project_name: formData.project_name.trim(),
owner_client: formData.owner_client.trim(),
internal_project_id: formData.internal_project_id.trim(),
rfi_deadline: formData.rfi_deadline,
rfi_deadline_timezone: formData.rfi_deadline_timezone,
mobilization_date: formData.mobilization_date,
substantial_completion_date: formData.substantial_completion_date,
procurement_scope: formData.procurement_scope,
sourcing_method: formData.sourcing_method,
contract_framework: formData.contract_framework,
bid_model: formData.bid_model,
nda_required: formData.nda_required,
performance_bond_required: formData.performance_bond_required,
bid_bond_required: formData.bid_bond_required,
insurance_required: formData.insurance_required,
insurance_notes: formData.insurance_notes.trim(),
safety_requirements: formData.safety_requirements.trim(),
prequalification_notes: formData.prequalification_notes.trim(),
advanced_controls_enabled: formData.advanced_controls_enabled,
ready_to_publish_acknowledged: readyToPublishAcknowledged,
...(reissueFrom ? { reissued_from_rfq_id: reissueFrom } : {}),
}),
});

const data = await response.json();
setPublishStage("Preparing executive dashboard...");
setPublishProgress(75);
if (!response.ok) {
setPublishStage("Finalizing procurement workspace...");
setPublishProgress(100);
setError(data.error || "Failed to create RFQ");
return;
}
setPublishStage("Finalizing executive workspace...");
draftAutosave.clearDraft();

setCreatedRFQ({
slug: data.rfq.slug,
title: data.rfq.title,
});

setPublishStage("RFQ published successfully.");
setPublishProgress(100);
setPublishSuccess(true);

setRedirectCountdown(2);

await new Promise((resolve) => {
setTimeout(() => {
setRedirectCountdown(1);

setTimeout(() => {
resolve(null);
}, 1000);
}, 1000);
});

router.push(`/rfq/${data.rfq.slug}`);
router.refresh();

} catch (submissionError) {
console.error(submissionError);
setError("Something went wrong while publishing this RFQ.");
} finally {
setLoading(false);
setPublishStage("");
}
}

const draftStatusLabel =
draftAutosave.status === "saved"
? draftAutosave.lastSavedAt
? `Draft Saved · ${new Date(
draftAutosave.lastSavedAt
).toLocaleTimeString("en-CA", {
hour: "2-digit",
minute: "2-digit",
})}`
: "Draft Saved"
: draftAutosave.status === "saving"
? "Saving..."
: draftAutosave.status === "dirty"
? "Unsaved Changes"
: draftAutosave.status === "restored"
? "Draft Restored"
: draftAutosave.status === "cleared"
? "Draft Cleared"
: "Auto Save";

const draftStatusTone =
draftAutosave.status === "saved" ||
draftAutosave.status === "restored" ||
draftAutosave.status === "cleared"
? "success"
: draftAutosave.status === "saving"
? "blue"
: draftAutosave.status === "dirty"
? "warning"
: "neutral";

const publishStatusLabel = publicationReady
? "Ready to Publish"
: isFormReady
? "Awaiting Sign-Off"
: "Draft";

const publishStatusTone = publicationReady
? "success"
: isFormReady
? "blue"
: "warning";

const heroStatusValue = publicationReady
? "Ready"
: isFormReady
? "Awaiting Sign-Off"
: "Draft";

return (
<main className="min-h-screen bg-nexus-navy text-white">
<div className={EXECUTIVE_PAGE_CLASS}>
<Link href="/rfq" className={EXECUTIVE_BUTTON_TERTIARY}>
← Back to RFQ Command Center
</Link>

<ExecutivePanel
variant="executive"
padding="lg"
tone="gold"
className="np-region-major mt-6"
aria-labelledby="rfq-drafting-heading"
>
{reissueFrom ? (
<div
className={`${EXECUTIVE_FEEDBACK_WARNING} mb-8`}
data-rfq-replacement-procurement="true"
>
<p className="np-type-eyebrow text-[#F5D77B]!">
Replacement Procurement
</p>
<p className="np-type-body mt-3 max-w-4xl text-nexus-text-primary">
This wizard creates a new RFQ identity. Quotes, invitations, Addenda,
acknowledgements, evaluations, and award state are not carried forward.
Only governed lineage to the cancelled predecessor is recorded.
</p>
</div>
) : null}

<div className="flex flex-col gap-8 xl:flex-row xl:items-start xl:justify-between">
<div className="min-w-0">
<p className="np-type-eyebrow text-nexus-gold">
Buyer Procurement Portal
</p>

<h1
id="rfq-drafting-heading"
className="np-type-h1 mt-4 max-w-4xl text-pretty"
>
Create Construction RFQ
</h1>

<p className="np-type-body mt-5 max-w-4xl text-pretty text-nexus-text-secondary">
Move through a guided RFQ workflow. Small projects can publish
quickly with required fields only, while larger tenders can add
optional documents, controls, and enterprise requirements.
</p>

<div className="mt-6 flex flex-wrap gap-2">
<ExecutiveBadge tone={publishStatusTone}>
{publishStatusLabel}
</ExecutiveBadge>

<ExecutiveBadge tone="blue">RFQ Wizard</ExecutiveBadge>

<ExecutiveBadge tone={draftStatusTone}>
{draftStatusLabel}
</ExecutiveBadge>

<ExecutiveBadge tone="neutral">
Required {requiredScore}%
</ExecutiveBadge>

<ExecutiveBadge tone="neutral">
Recommended {recommendedScore}%
</ExecutiveBadge>
</div>
</div>

<div className="grid min-w-0 w-full gap-3 sm:grid-cols-2 xl:max-w-xl">
<ExecutiveMetricCard
label="Status"
value={heroStatusValue}
tone={publicationReady ? "success" : isFormReady ? "blue" : "gold"}
/>
<ExecutiveMetricCard
label="Budget"
value={budgetPreview}
tone="neutral"
/>
<ExecutiveMetricCard
label="Scope"
value={selectedScope?.label || "Pending"}
tone="neutral"
/>
<ExecutiveMetricCard
label="Deadline"
value={deadlinePreview}
tone="neutral"
/>
</div>
</div>
</ExecutivePanel>

{draftAutosave.hasStoredDraft ? (
<ExecutivePanel
variant="operational"
padding="lg"
tone="gold"
className="np-region mt-8"
aria-labelledby="draft-recovery-heading"
>
<div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
<div className="min-w-0">
<p className="np-type-eyebrow text-[#F5D77B]!">
Draft Recovery
</p>

<h3
id="draft-recovery-heading"
className="np-type-h3 mt-2 text-pretty"
>
Continue your previous RFQ draft?
</h3>

<p className="np-type-body mt-2 max-w-2xl text-pretty text-nexus-text-secondary">
A previously saved draft was found on this device.
You can continue where you left off or discard it and
start a new RFQ.
</p>
</div>

<div className="flex flex-wrap gap-3">
<button
type="button"
onClick={handleResumeDraft}
className={EXECUTIVE_BUTTON_PRIMARY}
>
Resume Draft
</button>

<button
type="button"
onClick={handleDiscardDraft}
className={EXECUTIVE_BUTTON_SECONDARY}
>
Discard Draft
</button>
</div>
</div>
</ExecutivePanel>
) : null}

<ExecutivePanel
variant="operational"
padding="md"
className="np-region mt-8"
aria-label="RFQ drafting steps"
>
<div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
{WIZARD_STEPS.map((step, index) => {
const stepState: ExecutiveStepperState =
index < activeStep
? "completed"
: index === activeStep
? "current"
: "upcoming";

return (
<button
key={step}
type="button"
onClick={() => setActiveStep(index as WizardStep)}
aria-current={activeStep === index ? "step" : undefined}
className={`${EXECUTIVE_STEPPER_SURFACE} ${EXECUTIVE_STEPPER_SURFACE_STATE[stepState]} ${EXECUTIVE_STEPPER_FOCUS}`}
>
<span
aria-hidden="true"
className={`${EXECUTIVE_STEPPER_MARKER} ${EXECUTIVE_STEPPER_MARKER_STATE[stepState]}`}
>
{stepState === "completed" ? "✓" : index + 1}
</span>
<span className="min-w-0">
<p className="np-type-meta">
Step {index + 1}
{activeStep === index ? " · Current" : ""}
</p>
<p className="mt-1 break-words text-sm font-black text-nexus-text-primary">
{step}
</p>
</span>
</button>
);
})}
</div>
</ExecutivePanel>

<form
onSubmit={handleSubmit}
className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,0.85fr)]"
>
<section className="min-w-0 space-y-8">
{activeStep === 0 ? (
<StepSection
eyebrow="Step 1 · Required"
title="Basic project information"
description="These fields are the minimum required to publish a clear RFQ."
>
<div className="mt-8 grid gap-6">
<FieldLabel label="Project Name">
<input
placeholder="e.g. CIBC HQ Interior Fit-Out"
value={formData.project_name}
onChange={(event) =>
updateField("project_name", event.target.value)
}
className={EXECUTIVE_FORM_INPUT}
/>
</FieldLabel>

<FieldLabel label="RFQ Title" required>
<input
required
placeholder="e.g. CIBC HQ - 3rd floor acoustic ceiling package"
value={formData.title}
onChange={(event) =>
updateField("title", event.target.value)
}
aria-invalid={isMissingRequiredField("title")}
aria-describedby={
isMissingRequiredField("title") ? validationErrorId : undefined
}
className={EXECUTIVE_FORM_INPUT}
/>
</FieldLabel>

<FieldLabel label="Scope of Work Summary" required>
<textarea
required
rows={8}
placeholder="Describe inclusions, exclusions, technical requirements, site conditions, quote expectations, and supplier instructions."
value={formData.description}
onChange={(event) =>
updateField("description", event.target.value)
}
aria-invalid={isMissingRequiredField("description")}
aria-describedby={
isMissingRequiredField("description") ? validationErrorId : undefined
}
className={`${EXECUTIVE_FORM_TEXTAREA} resize-y`}
/>
</FieldLabel>

<div className="grid gap-6 md:grid-cols-2">
<FieldLabel label="Category / Trade" required>
<input
required
placeholder="e.g. Acoustic Ceilings, Flooring, Electrical"
value={formData.category}
onChange={(event) =>
updateField("category", event.target.value)
}
aria-invalid={isMissingRequiredField("category")}
aria-describedby={
isMissingRequiredField("category") ? validationErrorId : undefined
}
className={EXECUTIVE_FORM_INPUT}
/>
</FieldLabel>

<FieldLabel label="Project Location" required>
<input
required
placeholder="e.g. Toronto, ON"
value={formData.location}
onChange={(event) =>
updateField("location", event.target.value)
}
aria-invalid={isMissingRequiredField("location")}
aria-describedby={
isMissingRequiredField("location") ? validationErrorId : undefined
}
className={EXECUTIVE_FORM_INPUT}
/>
</FieldLabel>
</div>

<div className="grid gap-6 md:grid-cols-2">
<FieldLabel label="Budget">
<input
inputMode="numeric"
placeholder="e.g. 25000"
value={formData.budget}
onChange={(event) =>
updateField(
"budget",
event.target.value.replace(/[^0-9.]/g, "")
)
}
className={EXECUTIVE_FORM_INPUT}
/>
</FieldLabel>

<DeadlineField
label="Submission Closing"
required
dateTimeValue={formData.deadline}
timezoneValue={formData.deadline_timezone}
onDateTimeChange={(value) =>
updateField("deadline", value)
}
onTimezoneChange={(value) =>
updateField("deadline_timezone", value)
}
ariaInvalid={isMissingRequiredField("submission_deadline")}
ariaDescribedBy={
isMissingRequiredField("submission_deadline")
? validationErrorId
: undefined
}
helperText="The official closing date and time for supplier submissions."
/>
</div>
</div>
</StepSection>
) : null}

{activeStep === 1 ? (
<StepSection
eyebrow="Step 2 · Required"
title="Procurement strategy"
description="Choose how the RFQ should go to market and how the procurement package should be classified."
>
<div className="mt-8 grid gap-5">
<fieldset className="min-w-0 border-0 p-0">
<legend className="np-type-meta mb-2 block text-slate-400">
Procurement Scope
<span className="text-[#F5D77B]"> *</span>
</legend>
<div className="grid gap-4">
{PROCUREMENT_SCOPES.map((item) => {
const selected =
item.value === formData.procurement_scope;

return (
<button
key={item.value}
type="button"
disabled={loading}
aria-pressed={selected}
onClick={() =>
updateField("procurement_scope", item.value)
}
className={`min-h-11 rounded-executive border p-5 text-left transition disabled:cursor-not-allowed disabled:opacity-60 ${EXECUTIVE_FOCUS_CYAN} ${
selected
? "border-nexus-gold/35 bg-nexus-gold/10 text-white"
: "border-white/10 bg-white/[0.045] text-white hover:border-nexus-cyan/25 hover:bg-white/[0.08]"
}`}
>
<div className="flex items-start justify-between gap-4">
<div className="min-w-0">
<p className="text-lg font-black text-pretty">
{item.label}
</p>

<p className="mt-2 text-sm font-semibold leading-6 text-nexus-text-secondary">
{item.description}
</p>
</div>

<ExecutiveBadge tone={selected ? "gold" : "neutral"}>
{selected ? "Selected" : "Select"}
</ExecutiveBadge>
</div>

<div className="mt-4 flex flex-wrap gap-2">
{item.examples.map((example) => (
<span
key={example}
className="rounded-full border border-white/10 bg-white/[0.055] px-3 py-1 text-xs font-bold text-nexus-text-secondary"
>
{example}
</span>
))}
</div>
</button>
);
})}
</div>
</fieldset>
<div className="grid gap-6 md:grid-cols-2">
<FieldLabel label="Sourcing Method" required>
<select
required
value={formData.sourcing_method}
onChange={(event) =>
updateField("sourcing_method", event.target.value)
}
disabled={loading}
className={EXECUTIVE_FORM_SELECT}
>
{SOURCING_METHODS.map((item) => (
<option
key={item.value}
value={item.value}
className="bg-nexus-navy text-white"
>
{item.label}
</option>
))}
</select>

<p className={`mt-2 ${EXECUTIVE_FORM_HELPER}`}>
{selectedSourcing?.description}
</p>
</FieldLabel>

<FieldLabel label="Contract Framework" required>
<select
required
value={formData.contract_framework}
onChange={(event) =>
updateField("contract_framework", event.target.value)
}
disabled={loading}
className={EXECUTIVE_FORM_SELECT}
>
{CONTRACT_FRAMEWORKS.map((item) => (
<option
key={item.value}
value={item.value}
className="bg-nexus-navy text-white"
>
{item.label}
</option>
))}
</select>

<p className={`mt-2 ${EXECUTIVE_FORM_HELPER}`}>
{selectedFramework?.description}
</p>
</FieldLabel>
</div>

<FieldLabel label="Evaluation Model">
<select
value={formData.bid_model}
onChange={(event) =>
updateField("bid_model", event.target.value)
}
disabled={loading}
className={EXECUTIVE_FORM_SELECT}
>
{BID_MODELS.map((item) => (
<option
key={item.value}
value={item.value}
className="bg-nexus-navy text-white"
>
{item.label}
</option>
))}
</select>

<p className={`mt-2 ${EXECUTIVE_FORM_HELPER}`}>
{selectedBidModel?.description}
</p>
</FieldLabel>
</div>
</StepSection>
) : null}

{activeStep === 2 ? (
<StepSection
eyebrow="Step 3 · Recommended"
title="Project controls"
description="These fields improve supplier clarity for larger projects, but they remain optional for smaller RFQs."
>
<div className="mt-8 grid gap-6">
<div className="grid gap-6 md:grid-cols-2">
<FieldLabel label="Owner / Client">
<input
placeholder="e.g. CIBC, City of Toronto, Private Owner"
value={formData.owner_client}
onChange={(event) =>
updateField("owner_client", event.target.value)
}
className={EXECUTIVE_FORM_INPUT}
/>
</FieldLabel>

<FieldLabel label="Internal Project ID">
<input
placeholder="e.g. NP-2026-014"
value={formData.internal_project_id}
onChange={(event) =>
updateField("internal_project_id", event.target.value)
}
className={EXECUTIVE_FORM_INPUT}
/>
</FieldLabel>
</div>

<div className="rounded-executive border border-status-info/20 bg-status-info/10 p-5">
<p className="np-type-meta text-nexus-cyan-bright">
Schedule controls
</p>
<p className="np-type-body mt-2 text-nexus-text-secondary">
RFI clarification timing and delivery milestones remain optional,
but improve supplier response quality when set.
</p>
</div>

<DeadlineField
label="RFI / Clarification Deadline"
dateTimeValue={formData.rfi_deadline}
timezoneValue={formData.rfi_deadline_timezone}
onDateTimeChange={(value) =>
updateField("rfi_deadline", value)
}
onTimezoneChange={(value) =>
updateField("rfi_deadline_timezone", value)
}
helperText="Suppliers may submit clarification questions until this deadline."
/>

<div className="grid gap-6 md:grid-cols-2">
<FieldLabel label="Target Mobilization">
<input
type="date"
value={formData.mobilization_date}
onChange={(event) =>
updateField("mobilization_date", event.target.value)
}
className={EXECUTIVE_FORM_INPUT}
/>
</FieldLabel>

<FieldLabel label="Substantial Completion">
<input
type="date"
value={formData.substantial_completion_date}
onChange={(event) =>
updateField(
"substantial_completion_date",
event.target.value
)
}
className={EXECUTIVE_FORM_INPUT}
/>
</FieldLabel>
</div>
</div>
</StepSection>
) : null}

{activeStep === 3 ? (
<StepSection
eyebrow="Step 4 · Optional"
title="Construction documents"
description="Drawings, specifications, BOQ, photos, addenda, and supporting documents are optional. Small RFQs can publish without uploads; larger RFQs can become complete procurement packages immediately after publishing."
>
<div className={`${EXECUTIVE_FEEDBACK_INFO} mt-8`}>
<p className="text-sm font-black leading-6 text-nexus-cyan-bright">
Document uploads become available immediately after your
RFQ is published.
</p>

<p className="mt-2 text-sm font-semibold leading-6 text-nexus-text-secondary">
After publishing, you can upload drawings, specifications,
BOQs, photos, addenda, and supporting documents from the RFQ
workspace.
</p>
</div>

<div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
<DocumentPlaceholder
title="Drawing Set"
value="PDF / DWG / Plans"
/>
<DocumentPlaceholder
title="Specifications"
value="PDF / DOCX"
/>
<DocumentPlaceholder
title="BOQ / Bid Form"
value="Excel / CSV"
/>
<DocumentPlaceholder
title="Addenda"
value="Revision-ready"
/>
<DocumentPlaceholder title="Site Photos" value="Images" />
<DocumentPlaceholder
title="Supporting Docs"
value="Any file"
/>
</div>
</StepSection>
) : null}

{activeStep === 4 ? (
<StepSection
eyebrow="Step 5 · Publication Gate"
title="Publication readiness review"
description="Confirm enterprise controls, resolve any blocking inconsistencies, review the complete procurement package, and explicitly sign off before release."
>
<div className="mt-8 grid gap-5">
<div className="grid gap-4 md:grid-cols-2">
<ToggleCard
title="NDA Required"
description="Require suppliers to accept confidentiality before accessing sensitive RFQ information."
checked={formData.nda_required}
onChange={() =>
updateField("nda_required", !formData.nda_required)
}
/>

<ToggleCard
title="Performance Bond"
description="Request performance bond confirmation for larger or higher-risk scopes."
checked={formData.performance_bond_required}
onChange={() =>
updateField(
"performance_bond_required",
!formData.performance_bond_required
)
}
/>

<ToggleCard
title="Bid Bond"
description="Require a bid bond or bid security for controlled tender environments."
checked={formData.bid_bond_required}
onChange={() =>
updateField("bid_bond_required", !formData.bid_bond_required)
}
/>

<ToggleCard
title="Insurance Required"
description="Require suppliers to confirm insurance coverage before award consideration."
checked={formData.insurance_required}
onChange={() =>
updateField(
"insurance_required",
!formData.insurance_required
)
}
/>
</div>
<FieldLabel label="Insurance Notes">
<textarea
rows={3}
placeholder="e.g. $5M CGL, WSIB clearance, automotive liability, professional liability..."
value={formData.insurance_notes}
onChange={(event) =>
updateField("insurance_notes", event.target.value)
}
className={`${EXECUTIVE_FORM_TEXTAREA} resize-y`}
/>
</FieldLabel>

<FieldLabel label="Safety Requirements">
<textarea
rows={3}
placeholder="e.g. minimum safety rating, TRIR / EMR limits, site orientation, safety plan requirements..."
value={formData.safety_requirements}
onChange={(event) =>
updateField("safety_requirements", event.target.value)
}
className={`${EXECUTIVE_FORM_TEXTAREA} resize-y`}
/>
</FieldLabel>

<FieldLabel label="Prequalification Notes">
<textarea
rows={3}
placeholder="e.g. only approved vendors, union requirement, past project experience, certifications..."
value={formData.prequalification_notes}
onChange={(event) =>
updateField("prequalification_notes", event.target.value)
}
className={`${EXECUTIVE_FORM_TEXTAREA} resize-y`}
/>
</FieldLabel>
</div>

<RfqPublicationReadinessReview
readiness={rfqRequirements}
sections={publicationReviewSections}
readyToPublishAcknowledged={readyToPublishAcknowledged}
onReadyToPublishAcknowledgedChange={
setReadyToPublishAcknowledged
}
onEditStep={(step) => {
setError("");
setValidationAttempted(false);
setActiveStep(step);
}}
/>
</StepSection>
) : null}

{error ? (
<div
id={validationErrorId}
role="alert"
className={EXECUTIVE_FEEDBACK_ERROR}
>
{error}
</div>
) : null}

<ExecutivePanel variant="operational" padding="md" className="np-region">
<div className="flex flex-wrap items-center justify-between gap-4">
<button
type="button"
onClick={goToPreviousStep}
disabled={activeStep === 0 || loading || publishSuccess}
className={EXECUTIVE_BUTTON_SECONDARY}
>
Back
</button>

<div className="flex flex-wrap items-center gap-3">
{!publishSuccess && (
<Link
href="/rfq"
className={EXECUTIVE_BUTTON_TERTIARY}
>
Cancel
</Link>
)}

{activeStep < 4 ? (
<button
type="button"
onClick={goToNextStep}
disabled={loading}
className={EXECUTIVE_BUTTON_PRIMARY}
>
Continue →
</button>
) : (
<button
type="submit"
disabled={loading || publishSuccess || !publicationReady}
className={EXECUTIVE_BUTTON_PRIMARY}
>
{loading ? `Publishing... ${publishProgress}%` : "Publish RFQ"}
</button>
)}
</div>
</div>
</ExecutivePanel>
</section>

<aside className="min-w-0 space-y-6" aria-label="Publication readiness">
<StepSection
eyebrow="RFQ Health"
title={`${requiredScore}% Required`}
description="Required readiness controls whether the RFQ can be published."
tone={isFormReady ? "success" : "gold"}
>
<div className="mt-6 space-y-3">
{requiredChecklist.map((item) => (
<ChecklistItem
key={item.key}
label={item.label}
complete={item.complete}
source={item.source}
context={item.context}
/>
))}
</div>
</StepSection>

<RFQScopeReview review={scopeReview} />

<StepSection
eyebrow="Recommended Strength"
title={`${recommendedScore}% Enhanced`}
description="Recommended fields improve supplier response quality but remain optional."
>
<div className="mt-6 space-y-3">
{recommendedChecklist.map((item) => (
<ChecklistItem
key={item.label}
label={item.label}
complete={item.complete}
/>
))}
</div>
</StepSection>

<StepSection
eyebrow="Procurement Summary"
title="RFQ Setup"
description="Live summary of the procurement package."
>
<div className="mt-6 space-y-3">
<SummaryRow title="Classification" value={rfqClassification} />
<SummaryRow
title="Evaluation Model"
value={selectedBidModel?.label || "Pending"}
/>
<SummaryRow title="Budget" value={budgetPreview} />
<SummaryRow
title="Category"
value={formData.category || "Pending"}
/>
<SummaryRow title="Deadline" value={deadlinePreview} />
</div>
</StepSection>

<ExecutivePanel
variant="operational"
padding="lg"
tone="blue"
className="np-region"
aria-labelledby="supplier-preview-heading"
>
<p className="np-type-eyebrow text-nexus-cyan-bright">
Supplier Experience Preview
</p>

<h2
id="supplier-preview-heading"
className="np-type-h2 mt-3 text-pretty"
>
What Suppliers Will See
</h2>

<p className="np-type-body mt-3 text-nexus-text-secondary">
Preview only. Publication readiness remains controlled by required
fields and acknowledgement.
</p>

<div className="mt-6 space-y-3">
<PreviewRow label="RFQ Summary" ready={isFormReady} />
<PreviewRow
label="Scope of Work"
ready={scopeSummaryReady}
/>
<PreviewRow
label="Submission Deadline"
ready={submissionDeadlineReady}
/>
<PreviewRow label="Procurement Strategy" ready />
<PreviewRow label="Documents" ready={false} optional />
<PreviewRow
label="Enterprise Controls"
ready={formData.advanced_controls_enabled}
optional
/>
</div>
</ExecutivePanel>
</aside>
</form>
</div>

{(loading || publishSuccess) && (
<div
className={`${EXECUTIVE_DIALOG_OVERLAY} z-[200] backdrop-blur-md`}
role="status"
aria-live="polite"
>
<div className={EXECUTIVE_DIALOG_SURFACE}>
<div className="flex justify-center">
{publishSuccess ? (
<div className="flex h-20 w-20 items-center justify-center rounded-full border border-status-success/25 bg-status-success/10">
<svg
xmlns="http://www.w3.org/2000/svg"
className="h-10 w-10 text-status-success"
fill="none"
viewBox="0 0 24 24"
stroke="currentColor"
strokeWidth={3}
aria-hidden="true"
>
<path
strokeLinecap="round"
strokeLinejoin="round"
d="M5 13l4 4L19 7"
/>
</svg>
</div>
) : (
<div
className="h-16 w-16 animate-spin rounded-full border-4 border-nexus-cyan/20 border-t-nexus-gold motion-reduce:animate-none"
aria-hidden="true"
/>
)}
</div>

<h2 className={`${EXECUTIVE_DIALOG_TITLE} mt-8 text-center`}>
{publishSuccess ? "RFQ Published Successfully" : "Publishing RFQ"}
</h2>

<p className={`${EXECUTIVE_DIALOG_BODY} text-center text-nexus-text-secondary`}>
{publishStage}
</p>

{publishSuccess && createdRFQ ? (
<p className="np-type-body mt-3 text-center text-[#F5D77B]!">
{createdRFQ.title}
</p>
) : null}

{publishSuccess ? (
<div className="mt-8 rounded-executive border border-status-success/25 bg-status-success/10 p-5">
<p className="np-type-h3 text-center text-white!">
Workspace Created Successfully
</p>

<p className="np-type-body mt-2 text-center text-nexus-text-secondary">
Executive procurement intelligence has been initialized.
</p>

<div className="mt-6 space-y-3">
<div className="flex items-center gap-3 text-sm font-semibold text-nexus-text-primary">
<span className="text-status-success" aria-hidden="true">✓</span>
Supplier Workspace Ready
</div>

<div className="flex items-center gap-3 text-sm font-semibold text-nexus-text-primary">
<span className="text-status-success" aria-hidden="true">✓</span>
Executive Dashboard Ready
</div>

<div className="flex items-center gap-3 text-sm font-semibold text-nexus-text-primary">
<span className="text-status-success" aria-hidden="true">✓</span>
Procurement Analytics Ready
</div>
</div>

<div className="mt-8 border-t border-white/10 pt-5">
<p className="text-center text-xs font-black uppercase tracking-[0.24em] text-nexus-text-secondary">
Opening RFQ Workspace
</p>

<div className="mt-3 flex items-center justify-center gap-3">
<div className="h-2 w-2 animate-pulse rounded-full bg-status-success motion-reduce:animate-none" />
<p className="np-type-kpi text-[#F5D77B]!">
{redirectCountdown}
</p>
<div className="h-2 w-2 animate-pulse rounded-full bg-status-success motion-reduce:animate-none" />
</div>

<p className="np-type-body mt-3 text-center text-nexus-text-secondary">
Redirecting to your executive procurement workspace...
</p>
</div>
</div>
) : null}

<div className="mt-8">
<ExecutiveProgress
value={publishProgress}
label="Publication progress"
/>
</div>

<p className="mt-3 text-center text-xs font-bold text-nexus-text-secondary">
{publishProgress}% Complete
</p>

<p className="mt-6 text-center text-xs font-bold uppercase tracking-[0.22em] text-nexus-cyan-bright">
Executive Procurement Intelligence
</p>
</div>
</div>
)}
</main>
);
}

export default function NewRFQPage() {
return (
<Suspense fallback={null}>
<NewRFQPageContent />
</Suspense>
);
}

function StepSection({
eyebrow,
title,
description,
children,
tone = "neutral",
}: {
eyebrow: string;
title: string;
description?: string;
children: ReactNode;
tone?: "neutral" | "blue" | "gold" | "risk" | "success";
}) {
return (
<ExecutivePanel
variant="operational"
padding="lg"
tone={tone}
className="np-region min-w-0"
>
<p className="np-type-eyebrow text-nexus-gold">{eyebrow}</p>
<h2 className="np-type-h2 mt-3 text-pretty">{title}</h2>
{description ? (
<p className="np-type-body mt-3 max-w-3xl text-pretty text-nexus-text-secondary">
{description}
</p>
) : null}
{children}
</ExecutivePanel>
);
}

function FieldLabel({
label,
required,
children,
}: {
label: string;
required?: boolean;
children: ReactNode;
}) {
return (
<label className="block min-w-0">
<span className={`${EXECUTIVE_FORM_LABEL} mb-2 block`}>
{label}
{required ? <span className="text-[#F5D77B]"> *</span> : null}
</span>
{children}
</label>
);
}

function SummaryRow({ title, value }: { title: string; value: string }) {
return (
<div className="rounded-executive border border-white/10 bg-white/[0.045] p-4">
<p className="np-type-meta text-nexus-text-secondary">{title}</p>
<p className="np-type-body mt-2 break-words text-nexus-text-primary">
{value}
</p>
</div>
);
}

function ChecklistItem({
label,
complete,
source,
context,
}: {
label: string;
complete: boolean;
source?: string;
context?: string;
}) {
return (
<div className="flex items-start justify-between gap-4 rounded-executive border border-white/10 bg-white/[0.045] px-4 py-3">
<div className="min-w-0">
<span className="text-sm font-bold text-nexus-text-primary">{label}</span>
{!complete && source ? (
<p className="mt-1 text-[10px] font-black uppercase tracking-[0.14em] text-nexus-cyan-bright">
Source: {source}
</p>
) : null}
{!complete && context ? (
<p className="mt-1 text-xs font-semibold leading-5 text-nexus-text-secondary">
{context}
</p>
) : null}
</div>
<ExecutiveBadge tone={complete ? "success" : "pending"}>
{complete ? "Ready" : "Pending"}
</ExecutiveBadge>
</div>
);
}

function DocumentPlaceholder({
title,
value,
}: {
title: string;
value: string;
}) {
return (
<div className="rounded-executive border border-white/10 bg-white/[0.045] p-5">
<div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-status-info/25 bg-status-info/10 text-nexus-cyan-bright">
<span className="sr-only">Document placeholder</span>
<span aria-hidden="true">📎</span>
</div>
<p className="np-type-h3 mt-5 text-pretty">{title}</p>
<p className="np-type-body mt-2 text-nexus-text-secondary">{value}</p>
<div className="mt-4 rounded-executive border border-white/10 bg-white/[0.055] px-4 py-3">
<p className="text-xs font-black uppercase tracking-[0.14em] text-nexus-cyan-bright">
Available After Publish
</p>
<p className="mt-2 text-xs font-semibold leading-5 text-nexus-text-secondary">
This upload becomes available as soon as your RFQ is published.
</p>
</div>
</div>
);
}

function ToggleCard({
title,
description,
checked,
onChange,
}: {
title: string;
description: string;
checked: boolean;
onChange: () => void;
}) {
return (
<button
type="button"
aria-pressed={checked}
onClick={onChange}
className={`min-h-11 rounded-executive border p-5 text-left transition ${EXECUTIVE_FOCUS_CYAN} ${
checked
? "border-nexus-gold/35 bg-nexus-gold/10"
: "border-white/10 bg-white/[0.045] hover:border-nexus-cyan/25 hover:bg-white/[0.08]"
}`}
>
<div className="flex items-start justify-between gap-4">
<div className="min-w-0">
<p className="np-type-h3 text-pretty">{title}</p>
<p className="np-type-body mt-2 text-nexus-text-secondary">
{description}
</p>
</div>
<ExecutiveBadge tone={checked ? "gold" : "neutral"}>
{checked ? "On" : "Off"}
</ExecutiveBadge>
</div>
</button>
);
}

function PreviewRow({
label,
ready,
optional,
}: {
label: string;
ready: boolean;
optional?: boolean;
}) {
return (
<div className="flex items-center justify-between gap-4 rounded-executive border border-white/10 bg-white/[0.045] px-4 py-3">
<span className="min-w-0 text-sm font-bold text-nexus-text-primary">
{label}
</span>
<ExecutiveBadge
tone={ready ? "success" : optional ? "blue" : "warning"}
>
{ready ? "Ready" : optional ? "Optional" : "Needed"}
</ExecutiveBadge>
</div>
);
}
