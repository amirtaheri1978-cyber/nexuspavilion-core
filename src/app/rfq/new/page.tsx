"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function CreateRFQPage() {
const router = useRouter();
const supabase = createClient();

const [loading, setLoading] = useState(false);

const [formData, setFormData] = useState({
title: "",
description: "",
category: "",
location: "",
budget: "",
deadline: "",
});

async function handleSubmit(e: React.FormEvent) {
e.preventDefault();

try {
setLoading(true);

const {
data: { user },
} = await supabase.auth.getUser();

if (!user) {
alert("Please login first.");
return;
}

const slug =
formData.title
.toLowerCase()
.replaceAll(" ", "-")
.replace(/[^a-z0-9-]/g, "") +
"-" +
Date.now();

const { error } = await supabase.from("rfqs").insert({
title: formData.title,
slug,
description: formData.description,
category: formData.category,
location: formData.location,
budget: formData.budget,
deadline: formData.deadline,
status: "OPEN",
user_id: user.id,
});

if (error) {
console.error(error);
alert(error.message);
return;
}

router.push("/rfq");
router.refresh();
} catch (error) {
console.error(error);
alert("Something went wrong.");
} finally {
setLoading(false);
}
}

return (
<main className="min-h-screen bg-neutral-50 px-6 py-12">
<div className="mx-auto max-w-3xl rounded-3xl border border-neutral-200 bg-white p-10 shadow-sm">
<p className="text-sm font-semibold uppercase tracking-[0.2em] text-orange-700">
Procurement RFQ
</p>

<h1 className="mt-2 text-5xl font-black tracking-tight text-neutral-900">
Create RFQ
</h1>

<p className="mt-4 text-lg text-neutral-600">
Create a request for quotation for your enterprise procurement
workflow.
</p>

<form onSubmit={handleSubmit} className="mt-10 space-y-6">
<input
type="text"
placeholder="RFQ title"
required
value={formData.title}
onChange={(e) =>
setFormData({ ...formData, title: e.target.value })
}
className="w-full rounded-2xl border border-neutral-300 px-5 py-4 outline-none transition focus:border-black"
/>

<textarea
placeholder="Scope of work / procurement details"
required
rows={6}
value={formData.description}
onChange={(e) =>
setFormData({
...formData,
description: e.target.value,
})
}
className="w-full rounded-2xl border border-neutral-300 px-5 py-4 outline-none transition focus:border-black"
/>

<input
type="text"
placeholder="Category"
required
value={formData.category}
onChange={(e) =>
setFormData({ ...formData, category: e.target.value })
}
className="w-full rounded-2xl border border-neutral-300 px-5 py-4 outline-none transition focus:border-black"
/>

<input
type="text"
placeholder="Location"
required
value={formData.location}
onChange={(e) =>
setFormData({ ...formData, location: e.target.value })
}
className="w-full rounded-2xl border border-neutral-300 px-5 py-4 outline-none transition focus:border-black"
/>

<input
type="text"
placeholder="Budget range"
required
value={formData.budget}
onChange={(e) =>
setFormData({ ...formData, budget: e.target.value })
}
className="w-full rounded-2xl border border-neutral-300 px-5 py-4 outline-none transition focus:border-black"
/>

<input
type="date"
required
value={formData.deadline}
onChange={(e) =>
setFormData({ ...formData, deadline: e.target.value })
}
className="w-full rounded-2xl border border-neutral-300 px-5 py-4 outline-none transition focus:border-black"
/>

<button
type="submit"
disabled={loading}
className="w-full rounded-2xl bg-black px-6 py-4 text-lg font-bold text-white transition hover:bg-neutral-800 disabled:opacity-50"
>
{loading ? "Creating RFQ..." : "Create RFQ"}
</button>
</form>
</div>
</main>
);
}