"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function NewRFQPage() {
const router = useRouter();

const [loading, setLoading] = useState(false);
const [error, setError] = useState("");

const [formData, setFormData] = useState({
title: "",
description: "",
category: "",
location: "",
budget: "",
deadline: "",
});

async function handleSubmit(
event: React.FormEvent<HTMLFormElement>
) {
event.preventDefault();

try {
setLoading(true);
setError("");

const response = await fetch("/api/rfqs", {
method: "POST",
headers: {
"Content-Type": "application/json",
},
body: JSON.stringify(formData),
});

const data = await response.json();

if (!response.ok) {
throw new Error(data.error || "Failed to create RFQ");
}

router.push(`/rfq/${data.slug}`);
router.refresh();
} catch (err: any) {
setError(err.message || "Something went wrong.");
} finally {
setLoading(false);
}
}

return (
<main className="min-h-screen bg-slate-100 px-8 py-10">
<div className="mx-auto max-w-4xl">
<div className="rounded-3xl border border-slate-200 bg-white p-10">
<p className="text-xs font-black uppercase tracking-[0.35em] text-orange-500">
Procurement Workflow
</p>

<h1 className="mt-3 text-5xl font-black text-slate-950">
Create RFQ
</h1>

<p className="mt-4 max-w-2xl text-sm text-slate-600">
Publish a procurement request to suppliers across Nexus Pavilion.
</p>
</div>

<form
onSubmit={handleSubmit}
className="mt-8 rounded-3xl border border-slate-200 bg-white p-8"
>
<div className="grid gap-6">
<input
type="text"
required
placeholder="RFQ Title"
value={formData.title}
onChange={(event) =>
setFormData({
...formData,
title: event.target.value,
})
}
className="rounded-2xl border border-slate-300 px-4 py-3 outline-none"
/>

<textarea
required
rows={5}
placeholder="Description"
value={formData.description}
onChange={(event) =>
setFormData({
...formData,
description: event.target.value,
})
}
className="rounded-2xl border border-slate-300 px-4 py-3 outline-none"
/>

<div className="grid gap-6 md:grid-cols-2">
<input
type="text"
required
placeholder="Category"
value={formData.category}
onChange={(event) =>
setFormData({
...formData,
category: event.target.value,
})
}
className="rounded-2xl border border-slate-300 px-4 py-3 outline-none"
/>

<input
type="text"
required
placeholder="Location"
value={formData.location}
onChange={(event) =>
setFormData({
...formData,
location: event.target.value,
})
}
className="rounded-2xl border border-slate-300 px-4 py-3 outline-none"
/>
</div>

<div className="grid gap-6 md:grid-cols-2">
<input
type="number"
required
placeholder="Budget"
value={formData.budget}
onChange={(event) =>
setFormData({
...formData,
budget: event.target.value,
})
}
className="rounded-2xl border border-slate-300 px-4 py-3 outline-none"
/>

<input
type="date"
required
value={formData.deadline}
onChange={(event) =>
setFormData({
...formData,
deadline: event.target.value,
})
}
className="rounded-2xl border border-slate-300 px-4 py-3 outline-none"
/>
</div>
</div>

{error && (
<div className="mt-6 rounded-2xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-600">
{error}
</div>
)}

<button
type="submit"
disabled={loading}
className="mt-8 rounded-full bg-slate-950 px-6 py-3 text-sm font-bold text-white transition hover:opacity-90 disabled:opacity-50"
>
{loading ? "Publishing..." : "Publish RFQ"}
</button>
</form>
</div>
</main>
);
}