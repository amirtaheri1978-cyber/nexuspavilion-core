"use client";

import { useState } from "react";

type AiReview = {
id: string;
readiness_score: number;
risk_level: string;
executive_summary: string | null;
missing_items: string | null;
recommendations: string | null;
created_at: string | null;
};

type RFQAIReviewPanelProps = {
rfqId: string;
initialReview?: AiReview | null;
};

function splitLines(value: string | null) {
return String(value || "")
.split("\n")
.map((item) => item.trim())
.filter(Boolean);
}

function getRiskTone(riskLevel: string) {
if (riskLevel === "low") return "text-emerald-300";
if (riskLevel === "high") return "text-red-300";
return "text-orange-300";
}

export default function RFQAIReviewPanel({
rfqId,
initialReview = null,
}: RFQAIReviewPanelProps) {
const [review, setReview] = useState<AiReview | null>(initialReview);
const [loading, setLoading] = useState(false);
const [error, setError] = useState("");

async function handleGenerateReview() {
setLoading(true);
setError("");

try {
const response = await fetch("/api/rfq-ai-review", {
method: "POST",
headers: {
"Content-Type": "application/json",
},
body: JSON.stringify({ rfqId }),
});

const data = await response.json();

if (!response.ok) {
setError(data.error || "Failed to generate AI review.");
return;
}

setReview(data.review);
} catch (reviewError) {
console.error(reviewError);
setError("Request failed. Please try again.");
} finally {
setLoading(false);
}
}

const missingItems = splitLines(review?.missing_items || null);
const recommendations = splitLines(review?.recommendations || null);

return (
<section className="mt-8 rounded-[32px] border border-[#2CC4E8]/15 bg-[#061426]/90 p-6 text-white shadow-[0_24px_80px_rgba(0,0,0,0.28)] sm:p-8">
<div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
<div>
<p className="text-xs font-black uppercase tracking-[0.3em] text-[#9BE8F8]">
AI Procurement Intelligence
</p>

<h2 className="mt-3 text-3xl font-black text-white">
RFQ Readiness Review
</h2>

<p className="mt-3 max-w-4xl text-sm font-semibold leading-7 text-slate-400">
Generate a procurement readiness review based on RFQ completeness,
documents, classification, compliance controls, and supplier
response quality risks.
</p>
</div>

<button
type="button"
onClick={handleGenerateReview}
disabled={loading}
className="rounded-full bg-gradient-to-r from-[#B9902F] via-[#C8A646] to-[#F5D77B] px-6 py-3 text-sm font-black text-slate-950 shadow-[0_18px_55px_rgba(200,166,70,0.22)] transition disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C8A646]/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[#07111F]"
>
{loading ? "Reviewing RFQ..." : "Generate AI Review"}
</button>
</div>

{error ? (
<div className="mt-6 rounded-2xl border border-red-300/20 bg-red-400/10 px-4 py-3 text-sm font-bold text-red-200">
{error}
</div>
) : null}

{review ? (
<div className="mt-8 grid gap-6 xl:grid-cols-[0.75fr_1.25fr]">
<div className="rounded-[28px] border border-white/10 bg-[#07111F]/75 p-6">
<p className="text-xs font-black uppercase tracking-[0.22em] text-slate-400">
Readiness Score
</p>

<p className="mt-4 text-6xl font-black tracking-[-0.06em] text-white">
{review.readiness_score}
<span className="text-2xl text-slate-400">/100</span>
</p>

<div className="mt-5 h-3 overflow-hidden rounded-full bg-white/10">
<div
className="h-full rounded-full bg-gradient-to-r from-[#2CC4E8] to-[#F5D77B]"
style={{ width: `${review.readiness_score}%` }}
/>
</div>

<p className="mt-6 text-xs font-black uppercase tracking-[0.22em] text-slate-400">
Risk Level
</p>

<p
className={`mt-2 text-3xl font-black uppercase ${getRiskTone(
review.risk_level
)}`}
>
{review.risk_level}
</p>
</div>

<div className="space-y-6">
<div className="rounded-[28px] border border-white/10 bg-[#07111F]/75 p-6">
<p className="text-xs font-black uppercase tracking-[0.22em] text-[#C8A646]">
Executive Summary
</p>

<p className="mt-4 text-sm font-semibold leading-7 text-slate-300">
{review.executive_summary}
</p>
</div>

<div className="grid gap-6 lg:grid-cols-2">
<ReviewList
title="Missing Items"
items={missingItems}
emptyText="No critical missing items detected."
/>

<ReviewList
title="Recommendations"
items={recommendations}
emptyText="No recommendations generated."
/>
</div>
</div>
</div>
) : (
<div className="mt-8 rounded-[26px] border border-dashed border-white/10 bg-[#07111F]/70 p-10 text-center">
<p className="text-xl font-black text-white">
No AI review generated yet.
</p>

<p className="mt-3 text-sm font-semibold leading-6 text-slate-400">
Generate a review to evaluate RFQ readiness, missing procurement
inputs, document completeness, and executive risk posture.
</p>
</div>
)}
</section>
);
}

function ReviewList({
title,
items,
emptyText,
}: {
title: string;
items: string[];
emptyText: string;
}) {
return (
<div className="rounded-[28px] border border-white/10 bg-[#07111F]/75 p-6">
<p className="text-xs font-black uppercase tracking-[0.22em] text-slate-400">
{title}
</p>

<div className="mt-4 space-y-3">
{items.length > 0 ? (
items.map((item) => (
<div
key={item}
className="rounded-2xl border border-white/10 bg-[#061426]/75 px-4 py-3 text-sm font-bold leading-6 text-slate-300"
>
{item}
</div>
))
) : (
<p className="text-sm font-semibold leading-6 text-slate-400">
{emptyText}
</p>
)}
</div>
</div>
);
}