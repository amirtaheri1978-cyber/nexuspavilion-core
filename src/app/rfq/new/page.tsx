"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type RFQFormData = {
title: string;
description: string;
category: string;
location: string;
budget: string;
deadline: string;
};

const initialFormData: RFQFormData = {
title: "",
description: "",
category: "",
location: "",
budget: "",
deadline: "",
};

function formatCurrency(value: string) {
const numericValue = Number(value.replace(/[^0-9.]/g, ""));

if (!value || Number.isNaN(numericValue)) {
return "$0";
}

return `$${numericValue.toLocaleString()}`;
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
deadline_timezone: "America/Toronto",
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
<div className="mx-auto max-w-6xl">
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
Procurement Workflow
</p>

<h1 className="mt-3 text-5xl font-black text-slate-950">
Create RFQ
</h1>

<p className="mt-4 max-w-2xl text-sm leading-6 text-slate-600">
Publish a structured procurement request, collect supplier
quotes, compare pricing, and award the best bid from one secure
Nexus Pavilion workspace.
</p>
</div>

<div className="grid min-w-[280px] grid-cols-2 gap-4">
<MiniMetric title="Status" value="Draft" />
<MiniMetric title="Budget" value={budgetPreview} />
<MiniMetric
title="Category"
value={formData.category || "Pending"}
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
className="mt-8 grid gap-8 lg:grid-cols-[1.5fr_0.8fr]"
>
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
placeholder="e.g. CIBC HQ - 3rd floor flooring"
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
placeholder="Describe the procurement scope, project requirements, drawings, materials, and key expectations."
value={formData.description}
onChange={(event) =>
updateField("description", event.target.value)
}
className="w-full resize-none rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm font-semibold text-slate-950 outline-none transition focus:border-slate-950 focus:bg-white"
/>
</FieldLabel>

<div className="grid gap-6 md:grid-cols-2">
<FieldLabel label="Category" required>
<input
required
placeholder="e.g. Flooring, Interior, AV"
value={formData.category}
onChange={(event) =>
updateField("category", event.target.value)
}
className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm font-semibold text-slate-950 outline-none transition focus:border-slate-950 focus:bg-white"
/>
</FieldLabel>

<FieldLabel label="Location" required>
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

<FieldLabel label="Deadline" required>
<input
type="datetime-local"
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

{error && (
<div className="mt-6 rounded-2xl bg-red-50 px-4 py-3 text-sm font-bold text-red-600">
{error}
</div>
)}

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

<aside className="space-y-8">
<section className="rounded-[32px] border border-black/5 bg-white p-8">
<p className="text-xs font-black uppercase tracking-[0.3em] text-orange-500">
Publishing Checklist
</p>

<h2 className="mt-3 text-3xl font-black text-slate-950">
RFQ Readiness
</h2>

<div className="mt-6 space-y-3">
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
Once published, the RFQ becomes visible in the marketplace and
supplier quote submissions can be compared through the Quote
Intelligence engine.
</p>

<p>
Award decisions will automatically update the marketplace,
notifications, analytics, and vendor dashboard.
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
