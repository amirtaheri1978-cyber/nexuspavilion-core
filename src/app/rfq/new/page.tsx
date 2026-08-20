"use client";

import DeadlineField from "@/components/deadline-field";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, type ReactNode } from "react";
import { useRFQDraftAutosave } from "@/hooks/use-rfq-draft-autosave";
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
"Sent to a selected group of qualified suppliers, vendors, or subcontractors.",
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
"Used to establish recurring pricing or preferred vendor terms across projects.",
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

const date = new Date(value);

if (Number.isNaN(date.getTime())) {
return `${value} · ${timezone}`;
}

return `${date.toLocaleString("en-CA", {
year: "numeric",
month: "long",
day: "numeric",
hour: "2-digit",
minute: "2-digit",
})} · ${timezone}`;
}

function getSelectedLabel<T extends string>(
options: { value: T; label: string }[],
value: T
) {
return options.find((item) => item.value === value)?.label || "Pending";
}

export default function NewRFQPage() {
const router = useRouter();

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
const [formData, setFormData] = useState<RFQFormData>(initialFormData);

const draftAutosave = useRFQDraftAutosave({
storageKey: "nexus-pavilion:new-rfq-draft",
value: {
activeStep,
formData,
},
enabled: !loading,
delay: 900,
});

function handleResumeDraft() {
const draft = draftAutosave.loadDraft();

if (!draft) return;

setFormData(draft.formData);
setActiveStep(draft.activeStep);
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

const requiredChecklist = [
{
label: "Clear RFQ title",
complete: formData.title.trim().length > 2,
},
{
label: "Scope of work summary",
complete: formData.description.trim().length > 8,
},
{
label: "Category and location",
complete:
formData.category.trim().length > 1 &&
formData.location.trim().length > 1,
},
{
label: "Submission deadline",
complete: Boolean(formData.deadline),
},
{
label: "Procurement strategy selected",
complete: Boolean(
formData.procurement_scope &&
formData.sourcing_method &&
formData.contract_framework
),
},
];
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

const requiredReady = requiredChecklist.filter((item) => item.complete).length;
const recommendedReady = recommendedChecklist.filter(
(item) => item.complete
).length;

const requiredScore = Math.round(
(requiredReady / requiredChecklist.length) * 100
);

const recommendedScore = Math.round(
(recommendedReady / recommendedChecklist.length) * 100
);

const isFormReady =
formData.title.trim().length > 2 &&
formData.description.trim().length > 8 &&
formData.category.trim().length > 1 &&
formData.location.trim().length > 1 &&
Boolean(formData.deadline);

function updateField(field: keyof RFQFormData, value: string | boolean) {
setFormData((current) => ({
...current,
[field]: value,
}));
}

function goToNextStep() {
setError("");

if (activeStep === 0 && !isFormReady) {
setError("Complete the required project fields before continuing.");
return;
}

setActiveStep((current) => Math.min(current + 1, 4) as WizardStep);
}

function goToPreviousStep() {
setError("");
setActiveStep((current) => Math.max(current - 1, 0) as WizardStep);
}

async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
event.preventDefault();
if (loading) return;

if (!isFormReady) {
setError("Please complete the required RFQ fields before publishing.");
setActiveStep(0);
return;
}

setLoading(true);
setError("");
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

return (
<main className="relative min-h-screen overflow-hidden bg-[#061426] px-4 py-6 text-white sm:px-6 lg:px-10">
<div className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(circle_at_top_left,rgba(44,196,232,0.18),transparent_34%),radial-gradient(circle_at_top_right,rgba(200,166,70,0.15),transparent_30%),linear-gradient(180deg,#061426_0%,#07111F_45%,#020617_100%)]" />
<div className="pointer-events-none fixed inset-0 -z-10 bg-[linear-gradient(120deg,rgba(255,255,255,0.055),transparent_32%,rgba(200,166,70,0.05)_66%,transparent)]" />

<div className="mx-auto w-full max-w-[1680px]">
<Link
href="/rfq"
className="inline-flex rounded-full border border-white/10 bg-white/[0.045] px-5 py-3 text-sm font-black text-slate-300 transition hover:bg-white/[0.08] hover:text-white"
>
← Back to RFQ Command Center
</Link>

<section className="mt-6 rounded-[38px] border border-white/10 bg-white/[0.045] p-6 shadow-[0_32px_110px_rgba(0,0,0,0.42)] backdrop-blur-2xl sm:p-8 lg:p-10">
<div className="flex flex-col gap-8 xl:flex-row xl:items-start xl:justify-between">
<div>
<p className="text-xs font-black uppercase tracking-[0.35em] text-[#C8A646]">
Buyer Procurement Portal
</p>

<h1 className="mt-4 max-w-4xl text-4xl font-black tracking-[-0.05em] text-white sm:text-5xl xl:text-[64px] xl:leading-[0.98]">
Create Construction RFQ
</h1>

<p className="mt-5 max-w-4xl text-sm font-semibold leading-7 text-slate-300 sm:text-base">
Move through a guided RFQ workflow. Small projects can publish
quickly with required fields only, while larger tenders can add
optional documents, controls, and enterprise requirements.
</p>

<div className="mt-6 flex flex-wrap gap-3">
<ExecutiveBadge tone={isFormReady ? "success" : "warning"}>
{isFormReady ? "Ready to Publish" : "Draft"}
</ExecutiveBadge>

<ExecutiveBadge tone="blue">RFQ Wizard</ExecutiveBadge>

<ExecutiveBadge
tone={
draftAutosave.status === "saved" ||
draftAutosave.status === "restored" ||
draftAutosave.status === "cleared"
? "success"
: draftAutosave.status === "saving"
? "blue"
: draftAutosave.status === "dirty"
? "warning"
: "neutral"
}
>
{draftAutosave.status === "saved"
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
: "Auto Save"}
</ExecutiveBadge>

<ExecutiveBadge tone="neutral">
Required {requiredScore}%
</ExecutiveBadge>

<ExecutiveBadge tone="neutral">
Recommended {recommendedScore}%
</ExecutiveBadge>
</div>
</div>

<div className="grid min-w-full gap-4 sm:grid-cols-2 xl:min-w-[520px]">
<MiniMetric
title="Status"
value={isFormReady ? "Ready" : "Draft"}
/>
<MiniMetric title="Budget" value={budgetPreview} />
<MiniMetric
title="Scope"
value={selectedScope?.label || "Pending"}
/>
<MiniMetric title="Deadline" value={deadlinePreview} />
</div>
</div>
</section>
{draftAutosave.hasStoredDraft && (
<section className="mt-8 rounded-[30px] border border-[#C8A646]/25 bg-[#C8A646]/10 p-6 shadow-[0_20px_70px_rgba(200,166,70,0.18)]">

<div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">

<div>

<p className="text-xs font-black uppercase tracking-[0.25em] text-[#F5D77B]">
Draft Recovery
</p>

<h3 className="mt-2 text-2xl font-black text-white">
Continue your previous RFQ draft?
</h3>

<p className="mt-2 max-w-2xl text-sm font-semibold leading-6 text-slate-300">
A previously saved draft was found on this device.
You can continue where you left off or discard it and
start a new RFQ.
</p>

</div>

<div className="flex flex-wrap gap-3">

<button
type="button"
onClick={handleResumeDraft}
className="rounded-full bg-gradient-to-r from-[#B9902F] via-[#C8A646] to-[#F5D77B] px-6 py-3 text-sm font-black text-slate-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C8A646]/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[#07111F]"
>
Resume Draft
</button>

<button
type="button"
onClick={handleDiscardDraft}
className="rounded-full border border-white/10 bg-white/[0.05] px-6 py-3 text-sm font-black text-white hover:bg-white/[0.08]"
>
Discard Draft
</button>

</div>

</div>

</section>
)}


<section className="mt-8 rounded-[32px] border border-white/10 bg-white/[0.045] p-5 shadow-[0_24px_80px_rgba(0,0,0,0.25)] backdrop-blur-xl sm:p-6">
<div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
{WIZARD_STEPS.map((step, index) => (
<button
key={step}
type="button"
onClick={() => setActiveStep(index as WizardStep)}
aria-current={activeStep === index ? "step" : undefined}
className={`min-h-11 rounded-[22px] border p-4 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C8A646]/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[#07111F] ${
activeStep === index
? "border-[#C8A646]/35 bg-[#C8A646]/10"
: "border-white/10 bg-[#061426]/55 hover:border-[#2CC4E8]/25 hover:bg-[#07111F]"
}`}
>
<p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">
Step {index + 1}
{activeStep === index ? " · Current" : ""}
</p>

<p className="mt-2 break-words text-sm font-black text-white">{step}</p>
</button>
))}
</div>
</section>

<form
onSubmit={handleSubmit}
className="mt-8 grid gap-8 lg:grid-cols-[1.5fr_0.85fr]"
>
<section className="space-y-8">
{activeStep === 0 ? (
<ExecutivePanel
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
className="w-full rounded-2xl border border-white/10 bg-[#061426]/80 px-4 py-4 text-sm font-bold text-white outline-none transition placeholder:text-slate-600 focus:border-[#2CC4E8]/40 focus:bg-[#07111F]"
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
className="w-full rounded-2xl border border-white/10 bg-[#061426]/80 px-4 py-4 text-sm font-bold text-white outline-none transition placeholder:text-slate-600 focus:border-[#2CC4E8]/40 focus:bg-[#07111F]"
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
className="w-full resize-none rounded-2xl border border-white/10 bg-[#061426]/80 px-4 py-4 text-sm font-bold text-white outline-none transition placeholder:text-slate-600 focus:border-[#2CC4E8]/40 focus:bg-[#07111F]"
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
className="w-full rounded-2xl border border-white/10 bg-[#061426]/80 px-4 py-4 text-sm font-bold text-white outline-none transition placeholder:text-slate-600 focus:border-[#2CC4E8]/40 focus:bg-[#07111F]"
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
className="w-full rounded-2xl border border-white/10 bg-[#061426]/80 px-4 py-4 text-sm font-bold text-white outline-none transition placeholder:text-slate-600 focus:border-[#2CC4E8]/40 focus:bg-[#07111F]"
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
className="w-full rounded-2xl border border-white/10 bg-[#061426]/80 px-4 py-4 text-sm font-bold text-white outline-none transition placeholder:text-slate-600 focus:border-[#2CC4E8]/40 focus:bg-[#07111F]"
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
helperText="The official closing date and time for supplier submissions."
/>
</div>
</div>
</ExecutivePanel>
) : null}

{activeStep === 1 ? (
<ExecutivePanel
eyebrow="Step 2 · Required"
title="Procurement strategy"
description="Choose how the RFQ should go to market and how the procurement package should be classified."
>
<div className="mt-8 grid gap-5">
<FieldLabel label="Procurement Scope" required>
<div className="grid gap-4">
{PROCUREMENT_SCOPES.map((item) => {
const selected =
item.value === formData.procurement_scope;

return (
<button
key={item.value}
type="button"
disabled={loading}
onClick={() =>
updateField("procurement_scope", item.value)
}
className={`rounded-[28px] border p-5 text-left transition disabled:cursor-not-allowed disabled:opacity-60 ${
selected
? "border-[#C8A646]/35 bg-[#C8A646]/10 text-white shadow-[0_18px_55px_rgba(200,166,70,0.12)]"
: "border-white/10 bg-[#061426]/70 text-white hover:border-[#2CC4E8]/25 hover:bg-[#07111F]"
}`}
>
<div className="flex items-start justify-between gap-4">
<div>
<p className="text-lg font-black">
{item.label}
</p>

<p className="mt-2 text-sm font-semibold leading-6 text-slate-400">
{item.description}
</p>
</div>

<span
className={`shrink-0 rounded-full border px-3 py-1 text-xs font-black uppercase tracking-[0.12em] ${
selected
? "border-[#C8A646]/30 bg-[#C8A646]/15 text-[#F5D77B]"
: "border-white/10 bg-white/[0.055] text-slate-300"
}`}
>
{selected ? "Selected" : "Select"}
</span>
</div>

<div className="mt-4 flex flex-wrap gap-2">
{item.examples.map((example) => (
<span
key={example}
className="rounded-full border border-white/10 bg-white/[0.055] px-3 py-1 text-xs font-bold text-slate-300"
>
{example}
</span>
))}
</div>
</button>
);
})}
</div>
</FieldLabel>
<div className="grid gap-6 md:grid-cols-2">
<FieldLabel label="Sourcing Method" required>
<select
required
value={formData.sourcing_method}
onChange={(event) =>
updateField("sourcing_method", event.target.value)
}
disabled={loading}
className="w-full rounded-2xl border border-white/10 bg-[#061426]/80 px-4 py-4 text-sm font-bold text-white outline-none transition focus:border-[#2CC4E8]/40 focus:bg-[#07111F] disabled:cursor-not-allowed disabled:opacity-60"
>
{SOURCING_METHODS.map((item) => (
<option
key={item.value}
value={item.value}
className="bg-[#061426] text-white"
>
{item.label}
</option>
))}
</select>

<p className="mt-2 text-xs font-semibold leading-5 text-slate-500">
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
className="w-full rounded-2xl border border-white/10 bg-[#061426]/80 px-4 py-4 text-sm font-bold text-white outline-none transition focus:border-[#2CC4E8]/40 focus:bg-[#07111F] disabled:cursor-not-allowed disabled:opacity-60"
>
{CONTRACT_FRAMEWORKS.map((item) => (
<option
key={item.value}
value={item.value}
className="bg-[#061426] text-white"
>
{item.label}
</option>
))}
</select>

<p className="mt-2 text-xs font-semibold leading-5 text-slate-500">
{selectedFramework?.description}
</p>
</FieldLabel>
</div>

<FieldLabel label="Bidding Model">
<select
value={formData.bid_model}
onChange={(event) =>
updateField("bid_model", event.target.value)
}
disabled={loading}
className="w-full rounded-2xl border border-white/10 bg-[#061426]/80 px-4 py-4 text-sm font-bold text-white outline-none transition focus:border-[#2CC4E8]/40 focus:bg-[#07111F] disabled:cursor-not-allowed disabled:opacity-60"
>
{BID_MODELS.map((item) => (
<option
key={item.value}
value={item.value}
className="bg-[#061426] text-white"
>
{item.label}
</option>
))}
</select>

<p className="mt-2 text-xs font-semibold leading-5 text-slate-500">
{selectedBidModel?.description}
</p>
</FieldLabel>
</div>
</ExecutivePanel>
) : null}

{activeStep === 2 ? (
<ExecutivePanel
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
className="w-full rounded-2xl border border-white/10 bg-[#061426]/80 px-4 py-4 text-sm font-bold text-white outline-none transition placeholder:text-slate-600 focus:border-[#2CC4E8]/40 focus:bg-[#07111F]"
/>
</FieldLabel>

<FieldLabel label="Internal Project ID">
<input
placeholder="e.g. NP-2026-014"
value={formData.internal_project_id}
onChange={(event) =>
updateField("internal_project_id", event.target.value)
}
className="w-full rounded-2xl border border-white/10 bg-[#061426]/80 px-4 py-4 text-sm font-bold text-white outline-none transition placeholder:text-slate-600 focus:border-[#2CC4E8]/40 focus:bg-[#07111F]"
/>
</FieldLabel>
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
className="w-full rounded-2xl border border-white/10 bg-[#061426]/80 px-4 py-4 text-sm font-bold text-white outline-none transition focus:border-[#2CC4E8]/40 focus:bg-[#07111F]"
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
className="w-full rounded-2xl border border-white/10 bg-[#061426]/80 px-4 py-4 text-sm font-bold text-white outline-none transition focus:border-[#2CC4E8]/40 focus:bg-[#07111F]"
/>
</FieldLabel>
</div>
</div>
</ExecutivePanel>
) : null}

{activeStep === 3 ? (
<ExecutivePanel
eyebrow="Step 4 · Optional"
title="Construction documents"
description="Drawings, specifications, BOQ, photos, addenda, and supporting documents are optional. Small RFQs can publish without uploads; larger RFQs can become complete procurement packages immediately after publishing."
>
<div className="mt-8 rounded-[24px] border border-[#2CC4E8]/20 bg-[#2CC4E8]/10 p-5">
<p className="text-sm font-black leading-6 text-[#9BE8F8]">
ℹ️ Document uploads become available immediately after your
RFQ is published.
</p>

<p className="mt-2 text-sm font-semibold leading-6 text-slate-400">
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
</ExecutivePanel>
) : null}

{activeStep === 4 ? (
<ExecutivePanel
eyebrow="Step 5 · Optional"
title="Enterprise controls and publish"
description="Activate NDA, bonding, insurance, safety, and prequalification controls only when the procurement package requires them."
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
description="Require vendors to confirm insurance coverage before award consideration."
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
className="w-full resize-none rounded-2xl border border-white/10 bg-[#061426]/80 px-4 py-4 text-sm font-bold text-white outline-none transition placeholder:text-slate-600 focus:border-[#2CC4E8]/40 focus:bg-[#07111F]"
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
className="w-full resize-none rounded-2xl border border-white/10 bg-[#061426]/80 px-4 py-4 text-sm font-bold text-white outline-none transition placeholder:text-slate-600 focus:border-[#2CC4E8]/40 focus:bg-[#07111F]"
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
className="w-full resize-none rounded-2xl border border-white/10 bg-[#061426]/80 px-4 py-4 text-sm font-bold text-white outline-none transition placeholder:text-slate-600 focus:border-[#2CC4E8]/40 focus:bg-[#07111F]"
/>
</FieldLabel>
</div>
</ExecutivePanel>
) : null}

{error ? (
<div className="rounded-2xl border border-red-300/20 bg-red-400/10 px-4 py-3 text-sm font-bold leading-6 text-red-200">
{error}
</div>
) : null}

<div className="flex flex-wrap items-center justify-between gap-4 rounded-[30px] border border-white/10 bg-white/[0.045] p-5">
<button
type="button"
onClick={goToPreviousStep}
disabled={activeStep === 0 || loading || publishSuccess}
className="rounded-full border border-white/10 bg-white/[0.055] px-6 py-3 text-sm font-black text-white transition hover:bg-white/[0.08] disabled:cursor-not-allowed disabled:opacity-40"
>
Back
</button>

<div className="flex flex-wrap items-center gap-3">
{!publishSuccess && (
<Link
href="/rfq"
className="rounded-full border border-white/10 bg-white/[0.055] px-6 py-3 text-sm font-black text-white transition hover:bg-white/[0.08]"
>
Cancel
</Link>
)}

{activeStep < 4 ? (
<button
type="button"
onClick={goToNextStep}
disabled={loading}
className="rounded-full bg-gradient-to-r from-[#B9902F] via-[#C8A646] to-[#F5D77B] px-7 py-3 text-sm font-black text-slate-950 shadow-[0_18px_55px_rgba(200,166,70,0.22)] transition disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C8A646]/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[#07111F]"
>
Continue →
</button>
) : (
<button
type="submit"
disabled={loading || publishSuccess || !isFormReady}
className="rounded-full bg-gradient-to-r from-[#B9902F] via-[#C8A646] to-[#F5D77B] px-7 py-3 text-sm font-black text-slate-950 shadow-[0_18px_55px_rgba(200,166,70,0.22)] transition disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C8A646]/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[#07111F]"
>
{loading ? `Publishing... ${publishProgress}%` : "Publish RFQ"}
</button>

)}
</div>
</div>
</section>

<aside className="space-y-8">
<ExecutivePanel
eyebrow="RFQ Health"
title={`${requiredScore}% Required`}
description="Required readiness controls whether the RFQ can be published."
>
<div className="mt-6 space-y-3">
{requiredChecklist.map((item) => (
<ChecklistItem
key={item.label}
label={item.label}
complete={item.complete}
/>
))}
</div>
</ExecutivePanel>

<ExecutivePanel
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
</ExecutivePanel>

<ExecutivePanel
eyebrow="Procurement Summary"
title="RFQ Setup"
description="Live summary of the procurement package."
>
<div className="mt-6 space-y-4">
<SummaryRow title="Classification" value={rfqClassification} />
<SummaryRow
title="Bid Model"
value={selectedBidModel?.label || "Pending"}
/>
<SummaryRow title="Budget" value={budgetPreview} />
<SummaryRow
title="Category"
value={formData.category || "Pending"}
/>
<SummaryRow title="Deadline" value={deadlinePreview} />
</div>
</ExecutivePanel>

<section className="rounded-[32px] border border-[#2CC4E8]/15 bg-[#2CC4E8]/[0.055] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.28)] backdrop-blur-xl sm:p-8">
<p className="text-xs font-black uppercase tracking-[0.3em] text-[#9BE8F8]">
Supplier Experience Preview
</p>

<h2 className="mt-3 text-3xl font-black text-white">
What Suppliers Will See
</h2>

<div className="mt-6 space-y-3">
<PreviewRow label="RFQ Summary" ready={isFormReady} />
<PreviewRow
label="Scope of Work"
ready={formData.description.length > 8}
/>
<PreviewRow
label="Submission Deadline"
ready={Boolean(formData.deadline)}
/>
<PreviewRow label="Procurement Strategy" ready />
<PreviewRow label="Documents" ready={false} optional />
<PreviewRow
label="Enterprise Controls"
ready={formData.advanced_controls_enabled}
optional
/>
</div>
</section>
</aside>
</form>
</div>
{(loading || publishSuccess) && (
<div className="fixed inset-0 z-[200] flex items-center justify-center bg-[#020617]/80 backdrop-blur-md">
<div className="w-full max-w-md rounded-[32px] border border-[#C8A646]/20 bg-[#07111F] p-8 shadow-[0_40px_120px_rgba(0,0,0,0.55)]">

<div className="flex justify-center">

{publishSuccess ? (

<div className="flex h-20 w-20 items-center justify-center rounded-full border border-emerald-300/20 bg-emerald-400/10 shadow-[0_0_40px_rgba(34,197,94,0.18)]">

<svg
xmlns="http://www.w3.org/2000/svg"
className="h-10 w-10 text-emerald-300"
fill="none"
viewBox="0 0 24 24"
stroke="currentColor"
strokeWidth={3}
>
<path
strokeLinecap="round"
strokeLinejoin="round"
d="M5 13l4 4L19 7"
/>
</svg>

</div>

) : (

<div className="h-16 w-16 animate-spin rounded-full border-4 border-[#2CC4E8]/20 border-t-[#C8A646]" />

)}

</div>

<h2 className="mt-8 text-center text-3xl font-black text-white">
{publishSuccess ? "RFQ Published Successfully" : "Publishing RFQ"}
</h2>

<p className="mt-4 text-center text-sm font-semibold leading-7 text-slate-400">
{publishStage}
</p>
{publishSuccess && createdRFQ ? (
<p className="mt-3 text-center text-sm font-black text-[#F5D77B]">
{createdRFQ.title}
</p>
) : null}
{publishSuccess && (
<div className="mt-8 rounded-[24px] border border-emerald-300/20 bg-emerald-400/5 p-5">

<p className="text-center text-sm font-black text-white">
Workspace Created Successfully
</p>

<p className="mt-2 text-center text-sm leading-6 text-slate-400">
Executive procurement intelligence has been initialized.
</p>

<div className="mt-6 space-y-3">

<div className="flex items-center gap-3 text-sm font-semibold text-slate-300">
<span className="text-emerald-300">✓</span>
Supplier Workspace Ready
</div>

<div className="flex items-center gap-3 text-sm font-semibold text-slate-300">
<span className="text-emerald-300">✓</span>
Executive Dashboard Ready
</div>
<div className="mt-8 border-t border-white/10 pt-5">
<p className="text-center text-xs font-black uppercase tracking-[0.24em] text-slate-500">
Opening RFQ Workspace
</p>

<div className="mt-3 flex items-center justify-center gap-3">
<div className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />

<p className="text-3xl font-black text-[#F5D77B]">
{redirectCountdown}
</p>

<div className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
</div>
</div>

<div className="flex items-center gap-3 text-sm font-semibold text-slate-300">
<span className="text-emerald-300">✓</span>
Procurement Analytics Ready
</div>

<div className="flex items-center gap-3 text-sm font-semibold text-slate-300">
<span className="text-emerald-300">✓</span>
Executive Dashboard Ready
<div className="mt-8 border-t border-white/10 pt-5">

<p className="text-center text-xs font-black uppercase tracking-[0.24em] text-slate-500">
Opening RFQ Workspace
</p>

<div className="mt-3 flex items-center justify-center gap-3">

<div className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />

<p className="text-3xl font-black text-[#F5D77B]">
{redirectCountdown}
</p>

<div className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />

</div>


</div>

<p className="mt-3 text-center text-sm font-semibold text-slate-400">
Redirecting to your executive procurement workspace...
</p>

</div>

</div>

</div>
)}

<div className="mt-8 h-2 overflow-hidden rounded-full bg-white/10">

<div
className="h-full rounded-full bg-gradient-to-r from-[#2CC4E8] via-[#C8A646] to-[#F5D77B] transition-all duration-500"
style={{
width: `${publishProgress}%`,
}}
/>

</div>

<p className="mt-3 text-center text-xs font-bold text-slate-500">
{publishProgress}% Complete
</p>

<p className="mt-6 text-center text-xs font-bold uppercase tracking-[0.22em] text-[#9BE8F8]">
Executive Procurement Intelligence
</p>

</div>
</div>
)}
</main>
);
}

function ExecutivePanel({
eyebrow,
title,
description,
children,
}: {
eyebrow: string;
title: string;
description?: string;
children: ReactNode;
}) {
return (
<section className="rounded-[32px] border border-white/10 bg-white/[0.045] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.28)] backdrop-blur-xl sm:p-8">
<p className="text-xs font-black uppercase tracking-[0.3em] text-[#C8A646]">
{eyebrow}
</p>

<h2 className="mt-3 text-3xl font-black text-white">{title}</h2>

{description ? (
<p className="mt-3 max-w-3xl text-sm font-semibold leading-7 text-slate-400">
{description}
</p>
) : null}

{children}
</section>
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
<label className="block">
<span className="mb-2 block text-xs font-black uppercase tracking-[0.2em] text-slate-500">
{label}
{required ? <span className="text-[#F5D77B]"> *</span> : null}
</span>

{children}
</label>
);
}

function MiniMetric({ title, value }: { title: string; value: string }) {
return (
<div className="rounded-[26px] border border-white/10 bg-[#061426]/75 p-5">
<p className="text-xs font-black uppercase tracking-[0.2em] text-slate-500">
{title}
</p>

<p className="mt-2 truncate text-xl font-black text-white">{value}</p>
</div>
);
}

function SummaryRow({ title, value }: { title: string; value: string }) {
return (
<div className="rounded-[22px] border border-white/10 bg-[#061426]/70 p-4">
<p className="text-xs font-black uppercase tracking-[0.2em] text-slate-500">
{title}
</p>

<p className="mt-2 text-sm font-black leading-6 text-white">{value}</p>
</div>
);
}

function ChecklistItem({
label,
complete,
}: {
label: string;
complete: boolean;
}) {
return (
<div className="flex items-center justify-between gap-4 rounded-[22px] border border-white/10 bg-[#061426]/70 px-4 py-3">
<span className="text-sm font-bold text-slate-300">{label}</span>

<span
className={`rounded-full border px-3 py-1 text-xs font-black uppercase tracking-[0.12em] ${
complete
? "border-emerald-300/20 bg-emerald-400/10 text-emerald-300"
: "border-white/10 bg-white/[0.055] text-slate-400"
}`}
>
{complete ? "Ready" : "Pending"}
</span>
</div>
);
}

function ExecutiveBadge({
children,
tone = "neutral",
}: {
children: ReactNode;
tone?: "success" | "warning" | "blue" | "neutral";
}) {
const toneClass =
tone === "success"
? "border-emerald-300/20 bg-emerald-400/10 text-emerald-300"
: tone === "warning"
? "border-orange-300/20 bg-orange-400/10 text-orange-300"
: tone === "blue"
? "border-[#2CC4E8]/25 bg-[#2CC4E8]/10 text-[#9BE8F8]"
: "border-white/10 bg-white/[0.055] text-slate-300";

return (
<span
className={`inline-flex rounded-full border px-3 py-1 text-xs font-black uppercase tracking-[0.16em] ${toneClass}`}
>
{children}
</span>
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
<div className="rounded-[24px] border border-white/10 bg-[#061426]/70 p-5">
<div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-[#2CC4E8]/20 bg-[#2CC4E8]/10 text-lg">
📎
</div>

<p className="mt-5 text-lg font-black text-white">{title}</p>

<p className="mt-2 text-sm font-semibold leading-6 text-slate-400">
{value}
</p>

<div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.055] px-4 py-3">
<p className="text-xs font-black uppercase tracking-[0.14em] text-[#9BE8F8]">
Available After Publish
</p>

<p className="mt-2 text-xs font-semibold leading-5 text-slate-500">
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
onClick={onChange}
className={`rounded-[24px] border p-5 text-left transition ${
checked
? "border-[#C8A646]/35 bg-[#C8A646]/10"
: "border-white/10 bg-[#061426]/70 hover:border-[#2CC4E8]/25 hover:bg-[#07111F]"
}`}
>
<div className="flex items-start justify-between gap-4">
<div>
<p className="text-lg font-black text-white">{title}</p>

<p className="mt-2 text-sm font-semibold leading-6 text-slate-400">
{description}
</p>
</div>

<span
className={`shrink-0 rounded-full border px-3 py-1 text-xs font-black uppercase tracking-[0.12em] ${
checked
? "border-[#C8A646]/30 bg-[#C8A646]/15 text-[#F5D77B]"
: "border-white/10 bg-white/[0.055] text-slate-400"
}`}
>
{checked ? "On" : "Off"}
</span>
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
<div className="flex items-center justify-between gap-4 rounded-[20px] border border-white/10 bg-[#061426]/70 px-4 py-3">
<span className="text-sm font-bold text-slate-300">{label}</span>

<span
className={`rounded-full border px-3 py-1 text-xs font-black uppercase tracking-[0.12em] ${
ready
? "border-emerald-300/20 bg-emerald-400/10 text-emerald-300"
: optional
? "border-[#2CC4E8]/25 bg-[#2CC4E8]/10 text-[#9BE8F8]"
: "border-orange-300/20 bg-orange-400/10 text-orange-300"
}`}
>
{ready ? "Ready" : optional ? "Optional" : "Needed"}
</span>
</div>
);
}