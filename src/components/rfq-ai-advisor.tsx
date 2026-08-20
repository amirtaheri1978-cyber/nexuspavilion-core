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

type Props = {
rfqId: string;
initialReview?: AiReview | null;
};

function splitLines(value: string | null) {
return String(value || "")
.split("\n")
.map((item) => item.trim())
.filter(Boolean);
}

function getStatus(score: number) {
if (score >= 85) return "Ready";
if (score >= 65) return "Needs Review";
return "High Risk";
}

export default function RFQAIAdvisor({ rfqId, initialReview = null }: Props) {
const [review, setReview] = useState<AiReview | null>(initialReview);
const [loading, setLoading] = useState(false);
const [error, setError] = useState("");

async function generateReview() {
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
setError(data.error || "Failed to generate AI advisor review.");
return;
}

setReview(data.review);
} catch {
setError("Request failed. Please try again.");
} finally {
setLoading(false);
}
}

const missingItems = splitLines(review?.missing_items || null);
const recommendations = splitLines(review?.recommendations || null);
const score = review?.readiness_score || 0;

return (
<section className="mt-8 rounded-[32px] border border-[#2CC4E8]/15 bg-[#061426]/90 p-6 text-white shadow-[0_24px_80px_rgba(0,0,0,0.28)] sm:p-8">
<div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
<div>
<p className="text-xs font-black uppercase tracking-[0.3em] text-[#9BE8F8]">
AI Procurement Advisor
</p>

<h2 className="mt-3 text-3xl font-black text-white">
Executive RFQ Readiness
</h2>

<p className="mt-3 max-w-4xl text-sm font-semibold leading-7 text-slate-400">
Review RFQ completeness, procurement risk, missing documents, and
recommended actions before supplier engagement.
</p>
</div>

<button
type="button"
onClick={generateReview}
disabled={loading}
className="rounded-full bg-gradient-to-r from-[#B9902F] via-[#C8A646] to-[#F5D77B] px-6 py-3 text-sm font-black text-slate-950 shadow-[0_18px_55px_rgba(200,166,70,0.22)] transition disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C8A646]/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[#07111F]"
>
{loading ? "Analyzing RFQ..." : "Run AI Advisor"}
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
Publish Readiness
</p>

<p className="mt-4 text-6xl font-black tracking-[-0.06em] text-white">
{score}
<span className="text-2xl text-slate-400">/100</span>
</p>

<div className="mt-5 h-3 overflow-hidden rounded-full bg-white/10">
<div
className="h-full rounded-full bg-gradient-to-r from-[#2CC4E8] to-[#F5D77B]"
style={{ width: `${score}%` }}
/>
</div>

<p className="mt-6 text-xs font-black uppercase tracking-[0.22em] text-slate-400">
Advisor Status
</p>

<p className="mt-2 text-3xl font-black uppercase text-[#F5D77B]">
{getStatus(score)}
</p>

<p className="mt-6 text-xs font-black uppercase tracking-[0.22em] text-slate-400">
Risk Level
</p>

<p className="mt-2 text-2xl font-black uppercase text-[#9BE8F8]">
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
<AdvisorList title="Critical Gaps" items={missingItems} />
<AdvisorList title="Recommended Actions" items={recommendations} />
</div>
</div>
</div>
) : (
<div className="mt-8 rounded-[26px] border border-dashed border-white/10 bg-[#07111F]/70 p-10 text-center">
<p className="text-xl font-black text-white">
AI advisor has not reviewed this RFQ yet.
</p>

<p className="mt-3 text-sm font-semibold leading-6 text-slate-400">
Run the advisor to generate a readiness score, missing items, risk
level, and procurement recommendations.
</p>
</div>
)}
</section>
);
}

function AdvisorList({ title, items }: { title: string; items: string[] }) {
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
No items detected.
</p>
)}
</div>
</div>
);
}