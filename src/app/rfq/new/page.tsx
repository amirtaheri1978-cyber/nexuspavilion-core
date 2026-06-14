"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type ProcurementScope =
| "material"
| "subcontractor"
| "equipment"
| "professional_service";

type SourcingMethod = "open" | "invited" | "sealed_bid";

type ContractFramework = "project_specific" | "framework";

type RFQFormData = {
title: string;
description: string;
category: string;
location: string;
budget: string;
deadline: string;
procurement_scope: ProcurementScope;
sourcing_method: SourcingMethod;
contract_framework: ContractFramework;
};

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
"Use this when you are buying materials, manufactured products, systems, or equipment components.",
examples: ["Concrete", "Steel", "Drywall", "HVAC units"],
},
{
value: "subcontractor",
label: "Subcontractor / Trade RFQ",
description:
"Use this when you need pricing from a trade contractor for labor, materials, installation, or a defined work package.",
examples: ["Electrical", "Plumbing", "Roofing", "Interior trades"],
},
{
value: "equipment",
label: "Equipment Rental RFQ",
description:
"Use this when you need construction equipment, machinery, temporary systems, or specialized tools for a defined duration.",
examples: ["Cranes", "Excavators", "Scaffolding", "Site equipment"],
},
{
value: "professional_service",
label: "Professional Service RFQ",
description:
"Use this when you need design, engineering, consulting, cost, planning, or advisory services.",
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
description:
"A one-time procurement request for a defined project, package, or work scope.",
},
{
value: "framework",
label: "Master / Framework RFQ",
description:
"Used to establish recurring pricing or preferred vendor terms across multiple projects.",
},
];

const initialFormData: RFQFormData = {
title: "",
description: "",
category: "",
location: "",
budget: "",
deadline: "",
procurement_scope: "subcontractor",
sourcing_method: "invited",
contract_framework: "project_specific",
};

function formatCurrency(value: string) {
const numericValue = Number(value.replace(/[^0-9.]/g, ""));

if (!value || Number.isNaN(numericValue)) {
return "$0";
}

return `$${numericValue.toLocaleString()}`;
}

function getSelectedLabel<T extends string>(
options: { value: T; label: string }[],
value: T
) {
return options.find((item) => item.value === value)?.label || "Pending";
}

export default function NewRFQPage() {
const router = useRouter();

const [loading, setLoading] = useState(false);
const [error, setError] = useState("");

const [formData, setFormData] = useState<RFQFormData>(initialFormData);

const budgetPreview = useMemo(
() => formatCurrency(formData.budget),
[formData.budget]
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

const rfqClassification = `${getSelectedLabel(
PROCUREMENT_SCOPES,
formData.procurement_scope
)} · ${getSelectedLabel(
SOURCING_METHODS,
formData.sourcing_method
)} · ${getSelectedLabel(
CONTRACT_FRAMEWORKS,
formData.contract_framework
)}`;

const isFormReady =
formData.title.trim().length > 2 &&
formData.description.trim().length > 8 &&
formData.category.trim().length > 1 &&
formData.location.trim().length > 1 &&
Number(formData.budget) > 0 &&
Boolean(formData.deadline);

function updateField(field: keyof RFQFormData, value: string) {
setFormData((current) => ({
...current,
[field]: value,
}));
}

async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
event.preventDefault();

if (!isFormReady) {
setError("Please complete all required RFQ fields before publishing.");
return;
}

setLoading(true);
setError("");

try {
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
procurement_scope: formData.procurement_scope,
sourcing_method: formData.sourcing_method,
contract_framework: formData.contract_framework,
}),
});

const data = await response.json();

if (!response.ok) {
setError(data.error || "Failed to create RFQ");
return;
}

router.push(`/rfq/${data.rfq.slug}`);
router.refresh();
} catch (submissionError) {
console.error(submissionError);
setError("Something went wrong while publishing this RFQ.");
} finally {
setLoading(false);
}
}
return (
<main className="min-h-screen bg-[#f6f6f3] px-8 py-10">
<div className="mx-auto max-w-7xl">
<Link
href="/rfq"
className="text-sm font-bold text-slate-500 hover:text-slate-950"
>
← Back to RFQ Marketplace
</Link>

<section className="mt-8 rounded-[36px] border border-black/5 bg-white p-10">
<div className="flex flex-col gap-8 lg:flex-row lg:items-start lg:justify-between">
<div>
<p className="text-xs font-black uppercase tracking-[0.35em] text-orange-500">
Construction Procurement Workflow
</p>

<h1 className="mt-3 text-5xl font-black text-slate-950">
Create RFQ
</h1>

<p className="mt-4 max-w-3xl text-sm leading-6 text-slate-600">
Publish a construction procurement request with proper RFQ
classification, sourcing method, and contract framework so
suppliers understand exactly what is being requested.
</p>
</div>

<div className="grid min-w-[320px] grid-cols-2 gap-4">
<MiniMetric title="Status" value="Draft" />
<MiniMetric title="Budget" value={budgetPreview} />
<MiniMetric
title="Scope"
value={selectedScope?.label || "Pending"}
/>
<MiniMetric
title="Deadline"
value={formData.deadline || "Not set"}
/>
</div>
</div>
</section>

<form
onSubmit={handleSubmit}
className="mt-8 grid gap-8 lg:grid-cols-[1.5fr_0.85fr]"
>
<section className="space-y-8">
<section className="rounded-[32px] border border-black/5 bg-white p-8">
<p className="text-xs font-black uppercase tracking-[0.3em] text-orange-500">
RFQ Classification
</p>

<h2 className="mt-3 text-3xl font-black text-slate-950">
What type of procurement is this?
</h2>

<p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
Classifying the RFQ correctly improves supplier matching,
analytics, quote comparison, risk scoring, and executive
reporting.
</p>

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
className={`rounded-3xl border p-5 text-left transition ${
selected
? "border-slate-950 bg-slate-950 text-white shadow-lg"
: "border-slate-200 bg-slate-50 text-slate-950 hover:border-slate-400 hover:bg-white"
}`}
>
<div className="flex items-start justify-between gap-4">
<div>
<p className="text-lg font-black">{item.label}</p>

<p
className={`mt-2 text-sm leading-6 ${
selected
? "text-slate-300"
: "text-slate-600"
}`}
>
{item.description}
</p>
</div>

<span
className={`shrink-0 rounded-full px-3 py-1 text-xs font-black ${
selected
? "bg-orange-500 text-white"
: "bg-white text-slate-500"
}`}
>
{selected ? "Selected" : "Select"}
</span>
</div>

<div className="mt-4 flex flex-wrap gap-2">
{item.examples.map((example) => (
<span
key={example}
className={`rounded-full px-3 py-1 text-xs font-bold ${
selected
? "bg-white/10 text-slate-200"
: "bg-white text-slate-500"
}`}
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
className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm font-bold text-slate-950 outline-none transition focus:border-slate-950 focus:bg-white disabled:cursor-not-allowed disabled:opacity-60"
>
{SOURCING_METHODS.map((item) => (
<option key={item.value} value={item.value}>
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
className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm font-bold text-slate-950 outline-none transition focus:border-slate-950 focus:bg-white disabled:cursor-not-allowed disabled:opacity-60"
>
{CONTRACT_FRAMEWORKS.map((item) => (
<option key={item.value} value={item.value}>
{item.label}
</option>
))}
</select>

<p className="mt-2 text-xs font-semibold leading-5 text-slate-500">
{selectedFramework?.description}
</p>
</FieldLabel>
</div>
</div>
</section>

<section className="rounded-[32px] border border-black/5 bg-white p-8">
<p className="text-xs font-black uppercase tracking-[0.3em] text-orange-500">
RFQ Details
</p>

<h2 className="mt-3 text-3xl font-black text-slate-950">
Opportunity Information
</h2>

<div className="mt-8 grid gap-6">
<FieldLabel label="RFQ Title" required>
<input
required
placeholder="e.g. CIBC HQ - 3rd floor acoustic ceiling package"
value={formData.title}
onChange={(event) =>
updateField("title", event.target.value)
}
className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm font-semibold text-slate-950 outline-none transition focus:border-slate-950 focus:bg-white"
/>
</FieldLabel>

<FieldLabel label="Description" required>
<textarea
required
rows={6}
placeholder="Describe the project scope, drawings, specifications, trade requirements, materials, schedule, exclusions, and quote expectations."
value={formData.description}
onChange={(event) =>
updateField("description", event.target.value)
}
className="w-full resize-none rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm font-semibold text-slate-950 outline-none transition focus:border-slate-950 focus:bg-white"
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
className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm font-semibold text-slate-950 outline-none transition focus:border-slate-950 focus:bg-white"
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
className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm font-semibold text-slate-950 outline-none transition focus:border-slate-950 focus:bg-white"
/>
</FieldLabel>
</div>

<div className="grid gap-6 md:grid-cols-2">
<FieldLabel label="Budget" required>
<input
required
inputMode="numeric"
placeholder="e.g. 25000"
value={formData.budget}
onChange={(event) =>
updateField(
"budget",
event.target.value.replace(/[^0-9.]/g, "")
)
}
className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm font-semibold text-slate-950 outline-none transition focus:border-slate-950 focus:bg-white"
/>
</FieldLabel>

<FieldLabel label="Submission Deadline" required>
<input
type="date"
required
value={formData.deadline}
onChange={(event) =>
updateField("deadline", event.target.value)
}
className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm font-semibold text-slate-950 outline-none transition focus:border-slate-950 focus:bg-white"
/>
</FieldLabel>
</div>
</div>

{error ? (
<div className="mt-6 rounded-2xl bg-red-50 px-4 py-3 text-sm font-bold text-red-600">
{error}
</div>
) : null}

<div className="mt-8 flex flex-wrap items-center gap-4">
<button
type="submit"
disabled={loading || !isFormReady}
className="rounded-full bg-slate-950 px-7 py-4 text-sm font-bold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
>
{loading ? "Publishing RFQ..." : "Publish RFQ"}
</button>

<Link
href="/rfq"
className="rounded-full bg-slate-100 px-7 py-4 text-sm font-bold text-slate-700 transition hover:bg-slate-200"
>
Cancel
</Link>
</div>
</section>
</section>

<aside className="space-y-8">
<section className="rounded-[32px] border border-black/5 bg-white p-8">
<p className="text-xs font-black uppercase tracking-[0.3em] text-orange-500">
RFQ Summary
</p>

<h2 className="mt-3 text-3xl font-black text-slate-950">
Procurement Setup
</h2>

<div className="mt-6 space-y-4">
<SummaryRow title="Classification" value={rfqClassification} />
<SummaryRow title="Budget" value={budgetPreview} />
<SummaryRow
title="Category"
value={formData.category || "Pending"}
/>
<SummaryRow
title="Deadline"
value={formData.deadline || "Not set"}
/>
</div>
</section>

<section className="rounded-[32px] border border-black/5 bg-white p-8">
<p className="text-xs font-black uppercase tracking-[0.3em] text-orange-500">
Publishing Checklist
</p>

<h2 className="mt-3 text-3xl font-black text-slate-950">
RFQ Readiness
</h2>

<div className="mt-6 space-y-3">
<ChecklistItem
label="RFQ classification selected"
complete={Boolean(
formData.procurement_scope &&
formData.sourcing_method &&
formData.contract_framework
)}
/>

<ChecklistItem
label="Clear opportunity title"
complete={formData.title.trim().length > 2}
/>

<ChecklistItem
label="Detailed procurement scope"
complete={formData.description.trim().length > 8}
/>

<ChecklistItem
label="Category and location"
complete={
formData.category.trim().length > 1 &&
formData.location.trim().length > 1
}
/>

<ChecklistItem
label="Budget and deadline"
complete={Number(formData.budget) > 0 && !!formData.deadline}
/>
</div>
</section>

<section className="rounded-[32px] border border-black/5 bg-slate-950 p-8 text-white">
<p className="text-xs font-black uppercase tracking-[0.3em] text-orange-300">
Supplier Marketplace
</p>

<h2 className="mt-3 text-3xl font-black">
What happens next?
</h2>

<div className="mt-6 space-y-4 text-sm leading-6 text-white/70">
<p>
Once published, this RFQ becomes a structured procurement
opportunity with scope, sourcing method, and contract
framework metadata.
</p>

<p>
Supplier matching, quote comparison, analytics, and executive
reporting will use this classification to improve procurement
intelligence.
</p>
</div>
</section>
</aside>
</form>
</div>
</main>
);
}

function FieldLabel({
label,
required,
children,
}: {
label: string;
required?: boolean;
children: React.ReactNode;
}) {
return (
<label className="block">
<span className="mb-2 block text-xs font-black uppercase tracking-[0.2em] text-slate-500">
{label}
{required ? <span className="text-orange-500"> *</span> : null}
</span>

{children}
</label>
);
}

function MiniMetric({
title,
value,
}: {
title: string;
value: string;
}) {
return (
<div className="rounded-3xl bg-slate-50 p-5">
<p className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">
{title}
</p>

<p className="mt-2 truncate text-xl font-black text-slate-950">{value}</p>
</div>
);
}

function SummaryRow({ title, value }: { title: string; value: string }) {
return (
<div className="rounded-2xl bg-slate-50 p-4">
<p className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">
{title}
</p>

<p className="mt-2 text-sm font-black leading-6 text-slate-950">
{value}
</p>
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
<div className="flex items-center justify-between gap-4 rounded-2xl bg-slate-50 px-4 py-3">
<span className="text-sm font-bold text-slate-700">{label}</span>

<span
className={`rounded-full px-3 py-1 text-xs font-black ${
complete
? "bg-green-100 text-green-700"
: "bg-slate-200 text-slate-500"
}`}
>
{complete ? "Ready" : "Pending"}
</span>
</div>
);
}