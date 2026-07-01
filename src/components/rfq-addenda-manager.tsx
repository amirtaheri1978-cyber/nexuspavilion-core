"use client";

import { useCallback, useMemo, useState } from "react";

type Addendum = {
id: string;
title: string;
description: string | null;
addendum_number: number;
affected_documents: string | null;
requires_acknowledgement: boolean | null;
created_at: string | null;
};

type RFQAddendaManagerProps = {
rfqId: string;
companyId: string;
initialAddenda?: Addendum[];
canManage?: boolean;
};

function formatDate(value: string | null) {
if (!value) return "N/A";

return new Intl.DateTimeFormat("en", {
month: "short",
day: "numeric",
year: "numeric",
}).format(new Date(value));
}

export default function RFQAddendaManager({
rfqId,
companyId,
initialAddenda = [],
canManage = false,
}: RFQAddendaManagerProps) {
const [addenda, setAddenda] = useState<Addendum[]>(initialAddenda);
const [title, setTitle] = useState("");
const [description, setDescription] = useState("");
const [affectedDocuments, setAffectedDocuments] = useState("");
const [requiresAcknowledgement, setRequiresAcknowledgement] = useState(true);
const [loading, setLoading] = useState(false);
const [refreshing, setRefreshing] = useState(false);
const [message, setMessage] = useState("");
const [error, setError] = useState("");

const nextAddendumNumber = useMemo(
() =>
addenda.length > 0
? Math.max(...addenda.map((item) => item.addendum_number || 0)) + 1
: 1,
[addenda]
);

const loadAddenda = useCallback(async () => {
setRefreshing(true);
setError("");

const response = await fetch(`/api/rfq-addenda?rfqId=${rfqId}`);
const data = await response.json();

if (!response.ok) {
setError(data.error || "Failed to load addenda.");
setRefreshing(false);
return;
}

setAddenda(data.addenda || []);
setRefreshing(false);
}, [rfqId]);

async function handleCreateAddendum(event: React.FormEvent<HTMLFormElement>) {
event.preventDefault();

if (!canManage) return;

if (!title.trim()) {
setError("Addendum title is required.");
return;
}

setLoading(true);
setMessage("");
setError("");

try {
const response = await fetch("/api/rfq-addenda", {
method: "POST",
headers: {
"Content-Type": "application/json",
},
body: JSON.stringify({
rfqId,
companyId,
title: title.trim(),
description: description.trim(),
affectedDocuments: affectedDocuments.trim(),
requiresAcknowledgement,
}),
});

const data = await response.json();

if (!response.ok) {
setError(data.error || "Failed to issue addendum.");
return;
}

setAddenda((current) => [data.addendum, ...current]);
setTitle("");
setDescription("");
setAffectedDocuments("");
setRequiresAcknowledgement(true);
setMessage(`Addendum #${data.addendum.addendum_number} issued.`);
} catch (createError) {
console.error(createError);
setError("Request failed. Please try again.");
} finally {
setLoading(false);
}
}

return (
<section className="mt-8 rounded-[32px] border border-white/10 bg-[#061426]/90 p-6 text-white shadow-[0_24px_80px_rgba(0,0,0,0.28)] sm:p-8">
<div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
<div>
<p className="text-xs font-black uppercase tracking-[0.3em] text-[#C8A646]">
Addenda Management
</p>

<h2 className="mt-3 text-3xl font-black text-white">
RFQ Addenda & Clarifications
</h2>

<p className="mt-3 max-w-4xl text-sm font-semibold leading-7 text-slate-400">
Issue formal addenda for drawing revisions, specification updates,
BOQ changes, scope clarifications, and vendor instructions.
</p>
</div>

<button
type="button"
onClick={() => void loadAddenda()}
disabled={refreshing}
className="rounded-full border border-white/10 bg-white/[0.055] px-5 py-3 text-sm font-black text-white transition hover:bg-white/[0.08] disabled:cursor-not-allowed disabled:opacity-50"
>
{refreshing ? "Refreshing..." : "Refresh"}
</button>
</div>

{canManage ? (
<form
onSubmit={handleCreateAddendum}
className="mt-8 rounded-[28px] border border-white/10 bg-[#07111F]/75 p-5"
>
<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
<div>
<p className="text-xs font-black uppercase tracking-[0.22em] text-[#9BE8F8]">
Issue New Addendum
</p>

<h3 className="mt-2 text-2xl font-black text-white">
Addendum #{nextAddendumNumber}
</h3>
</div>

<label className="flex items-center gap-3 rounded-full border border-white/10 bg-white/[0.055] px-4 py-3">
<input
type="checkbox"
checked={requiresAcknowledgement}
onChange={(event) =>
setRequiresAcknowledgement(event.target.checked)
}
disabled={loading}
className="h-4 w-4"
/>

<span className="text-xs font-black uppercase tracking-[0.14em] text-slate-300">
Requires acknowledgement
</span>
</label>
</div>

<div className="mt-6 grid gap-5">
<label className="block">
<span className="mb-2 block text-xs font-black uppercase tracking-[0.18em] text-slate-500">
Title *
</span>

<input
required
value={title}
onChange={(event) => setTitle(event.target.value)}
disabled={loading}
placeholder="e.g. Updated ceiling layout and BOQ clarification"
className="w-full rounded-2xl border border-white/10 bg-[#061426]/80 px-4 py-4 text-sm font-bold text-white outline-none transition placeholder:text-slate-600 focus:border-[#2CC4E8]/40 disabled:cursor-not-allowed disabled:opacity-60"
/>
</label>

<label className="block">
<span className="mb-2 block text-xs font-black uppercase tracking-[0.18em] text-slate-500">
Description
</span>

<textarea
rows={4}
value={description}
onChange={(event) => setDescription(event.target.value)}
disabled={loading}
placeholder="Describe the clarification, revision, scope update, or instruction issued to vendors."
className="w-full resize-none rounded-2xl border border-white/10 bg-[#061426]/80 px-4 py-4 text-sm font-bold text-white outline-none transition placeholder:text-slate-600 focus:border-[#2CC4E8]/40 disabled:cursor-not-allowed disabled:opacity-60"
/>
</label>

<label className="block">
<span className="mb-2 block text-xs font-black uppercase tracking-[0.18em] text-slate-500">
Affected Documents
</span>

<textarea
rows={3}
value={affectedDocuments}
onChange={(event) => setAffectedDocuments(event.target.value)}
disabled={loading}
placeholder="e.g. Drawing A401 Rev 2, Specification 09 51 13, BOQ Rev 1"
className="w-full resize-none rounded-2xl border border-white/10 bg-[#061426]/80 px-4 py-4 text-sm font-bold text-white outline-none transition placeholder:text-slate-600 focus:border-[#2CC4E8]/40 disabled:cursor-not-allowed disabled:opacity-60"
/>
</label>
</div>

<button
type="submit"
disabled={loading}
className="mt-6 rounded-full bg-gradient-to-r from-[#B9902F] via-[#C8A646] to-[#F5D77B] px-7 py-4 text-sm font-black text-slate-950 shadow-[0_18px_55px_rgba(200,166,70,0.22)] transition hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-50"
>
{loading ? "Issuing Addendum..." : "Issue Addendum"}
</button>
</form>
) : null}

{message ? (
<div className="mt-6 rounded-2xl border border-emerald-300/20 bg-emerald-400/10 px-4 py-3 text-sm font-bold text-emerald-300">
{message}
</div>
) : null}

{error ? (
<div className="mt-6 rounded-2xl border border-red-300/20 bg-red-400/10 px-4 py-3 text-sm font-bold text-red-200">
{error}
</div>
) : null}

<div className="mt-8">
{addenda.length === 0 ? (
<div className="rounded-[26px] border border-dashed border-white/10 bg-[#07111F]/70 p-10 text-center">
<p className="text-xl font-black text-white">
No addenda issued yet.
</p>

<p className="mt-3 text-sm font-semibold leading-6 text-slate-500">
Formal drawing changes, scope clarifications, and vendor notices
will appear here.
</p>
</div>
) : (
<div className="space-y-4">
{addenda.map((addendum) => (
<article
key={addendum.id}
className="rounded-[26px] border border-white/10 bg-[#07111F]/75 p-5"
>
<div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
<div>
<div className="flex flex-wrap items-center gap-2">
<span className="rounded-full border border-[#C8A646]/25 bg-[#C8A646]/10 px-3 py-1 text-xs font-black uppercase tracking-[0.14em] text-[#F5D77B]">
Addendum #{addendum.addendum_number}
</span>

<span className="rounded-full border border-white/10 bg-white/[0.055] px-3 py-1 text-xs font-black uppercase tracking-[0.14em] text-slate-400">
{formatDate(addendum.created_at)}
</span>

<span className="rounded-full border border-[#2CC4E8]/25 bg-[#2CC4E8]/10 px-3 py-1 text-xs font-black uppercase tracking-[0.14em] text-[#9BE8F8]">
{addendum.requires_acknowledgement
? "Acknowledgement Required"
: "Informational"}
</span>
</div>

<h3 className="mt-4 text-2xl font-black text-white">
{addendum.title}
</h3>

{addendum.description ? (
<p className="mt-3 max-w-4xl text-sm font-semibold leading-7 text-slate-400">
{addendum.description}
</p>
) : null}

{addendum.affected_documents ? (
<div className="mt-5 rounded-2xl border border-white/10 bg-[#061426]/70 p-4">
<p className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">
Affected Documents
</p>

<p className="mt-2 whitespace-pre-wrap text-sm font-semibold leading-7 text-slate-300">
{addendum.affected_documents}
</p>
</div>
) : null}
</div>
</div>
</article>
))}
</div>
)}
</div>
</section>
);
}