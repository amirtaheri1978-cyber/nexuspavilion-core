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

type Acknowledgement = {
id: string;
addendum_id: string;
rfq_id: string;
company_id: string;
acknowledged_at: string | null;
};

type Props = {
rfqId: string;
initialAddenda?: Addendum[];
initialAcknowledgements?: Acknowledgement[];
};

function formatDate(value: string | null) {
if (!value) return "N/A";

return new Intl.DateTimeFormat("en", {
month: "short",
day: "numeric",
year: "numeric",
}).format(new Date(value));
}

export default function RFQAddendumAcknowledgementCenter({
rfqId,
initialAddenda = [],
initialAcknowledgements = [],
}: Props) {
const [acknowledgements, setAcknowledgements] = useState<Acknowledgement[]>(
initialAcknowledgements
);
const [loadingId, setLoadingId] = useState("");
const [message, setMessage] = useState("");
const [error, setError] = useState("");

const requiredAddenda = useMemo(
() => initialAddenda.filter((item) => item.requires_acknowledgement),
[initialAddenda]
);

const acknowledgedIds = useMemo(
() => new Set(acknowledgements.map((item) => item.addendum_id)),
[acknowledgements]
);

const requiredAcknowledgedCount = requiredAddenda.filter((item) =>
acknowledgedIds.has(item.id)
).length;

const allRequiredAcknowledged =
requiredAddenda.length === 0 ||
requiredAcknowledgedCount === requiredAddenda.length;

const handleAcknowledge = useCallback(
async (addendumId: string) => {
setLoadingId(addendumId);
setMessage("");
setError("");

try {
const response = await fetch("/api/rfq-addendum-acknowledgements", {
method: "POST",
headers: {
"Content-Type": "application/json",
},
body: JSON.stringify({
rfqId,
addendumId,
}),
});

const data = await response.json();

if (!response.ok) {
setError(data.error || "Failed to acknowledge addendum.");
return;
}

setAcknowledgements((current) => {
const filtered = current.filter(
(item) => item.addendum_id !== addendumId
);

return [data.acknowledgement, ...filtered];
});

setMessage("Addendum acknowledged successfully.");
} catch (acknowledgementError) {
console.error(acknowledgementError);
setError("Request failed. Please try again.");
} finally {
setLoadingId("");
}
},
[rfqId]
);

return (
<section className="mt-8 rounded-[32px] border border-white/10 bg-[#061426]/90 p-6 text-white shadow-[0_24px_80px_rgba(0,0,0,0.28)] sm:p-8">
<div>
<p className="text-xs font-black uppercase tracking-[0.3em] text-[#C8A646]">
Vendor Compliance
</p>

<h2 className="mt-3 text-3xl font-black text-white">
Addendum Acknowledgement Center
</h2>

<p className="mt-3 max-w-4xl text-sm font-semibold leading-7 text-slate-400">
Review and acknowledge issued RFQ addenda before submitting or
revising your quote.
</p>
</div>

<div className="mt-6 grid gap-4 md:grid-cols-3">
<ComplianceMetric
title="Required"
value={String(requiredAddenda.length)}
/>

<ComplianceMetric
title="Acknowledged"
value={String(requiredAcknowledgedCount)}
/>

<ComplianceMetric
title="Quote Status"
value={allRequiredAcknowledged ? "Clear" : "Blocked"}
/>
</div>

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
{initialAddenda.length === 0 ? (
<div className="rounded-[26px] border border-dashed border-white/10 bg-[#07111F]/70 p-10 text-center">
<p className="text-xl font-black text-white">
No addenda issued yet.
</p>

<p className="mt-3 text-sm font-semibold leading-6 text-slate-400">
Addenda and clarification notices will appear here when issued by
the buyer.
</p>
</div>
) : (
<div className="space-y-4">
{initialAddenda.map((addendum) => {
const acknowledged = acknowledgedIds.has(addendum.id);
const requiresAcknowledgement =
addendum.requires_acknowledgement !== false;

return (
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

<span
className={`rounded-full border px-3 py-1 text-xs font-black uppercase tracking-[0.14em] ${
acknowledged
? "border-emerald-300/20 bg-emerald-400/10 text-emerald-300"
: requiresAcknowledgement
? "border-orange-300/20 bg-orange-400/10 text-orange-300"
: "border-[#2CC4E8]/25 bg-[#2CC4E8]/10 text-[#9BE8F8]"
}`}
>
{acknowledged
? "Acknowledged"
: requiresAcknowledgement
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
<p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">
Affected Documents
</p>

<p className="mt-2 whitespace-pre-wrap text-sm font-semibold leading-7 text-slate-300">
{addendum.affected_documents}
</p>
</div>
) : null}
</div>

{requiresAcknowledgement && !acknowledged ? (
<button
type="button"
onClick={() => void handleAcknowledge(addendum.id)}
disabled={loadingId === addendum.id}
className="rounded-full bg-gradient-to-r from-[#B9902F] via-[#C8A646] to-[#F5D77B] px-6 py-3 text-sm font-black text-slate-950 shadow-[0_18px_55px_rgba(200,166,70,0.22)] transition disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C8A646]/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[#07111F]"
>
{loadingId === addendum.id
? "Acknowledging..."
: "Acknowledge"}
</button>
) : null}
</div>
</article>
);
})}
</div>
)}
</div>
</section>
);
}

function ComplianceMetric({ title, value }: { title: string; value: string }) {
return (
<div className="rounded-[24px] border border-white/10 bg-[#07111F]/75 p-5">
<p className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">
{title}
</p>

<p className="mt-3 text-3xl font-black text-white">{value}</p>
</div>
);
}