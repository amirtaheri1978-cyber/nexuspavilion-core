
import Link from "next/link";

type DecisionStatus = "ready" | "locked" | "watch" | "not_ready";

type ExecutiveDecisionCenterProps = {
rfqSlug: string;
isOwner: boolean;
isOpen: boolean;
commercialEvaluationUnlocked: boolean;
healthScore: number;
quoteCount: number;
documentCount: number;
addendaCount: number;
potentialSavings: number;
recommendedQuote:
| {
rank: number;
amountNumber: number;
awardConfidence: number;
riskLevel: string;
totalScore: number;
timelineScore: number;
priceScore: number;
riskScore: number;
performanceScore: number;
}
| null;
};

function formatMoney(value: number) {
if (!Number.isFinite(value)) return "$0";
return `$${Math.max(value, 0).toLocaleString()}`;
}

function getDecisionStatus({
isOwner,
commercialEvaluationUnlocked,
recommendedQuote,
quoteCount,
}: {
isOwner: boolean;
commercialEvaluationUnlocked: boolean;
recommendedQuote: ExecutiveDecisionCenterProps["recommendedQuote"];
quoteCount: number;
}): DecisionStatus {
if (!isOwner) return "watch";
if (!commercialEvaluationUnlocked) return "locked";
if (recommendedQuote) return "ready";
if (quoteCount > 0) return "watch";
return "not_ready";
}

function getDecisionLabel(status: DecisionStatus) {
if (status === "ready") return "Award Ready";
if (status === "locked") return "Commercial Locked";
if (status === "watch") return "Executive Review";
return "Not Ready";
}

function getDecisionNarrative({
status,
recommendedQuote,
quoteCount,
documentCount,
}: {
status: DecisionStatus;
recommendedQuote: ExecutiveDecisionCenterProps["recommendedQuote"];
quoteCount: number;
documentCount: number;
}) {
if (status === "ready" && recommendedQuote) {
return `Nexus Pavilion has identified a recommended award path with ${recommendedQuote.awardConfidence}% confidence. Executive review should validate commercial fit, scope alignment, and final governance before award.`;
}

if (status === "locked") {
return "Commercial submissions remain protected under blind bidding control. Buyer-side users can monitor participation and readiness, but award decisions should wait until commercial opening.";
}

if (quoteCount > 0) {
return "Supplier participation exists, but the workspace needs stronger decision intelligence before executive award validation.";
}

if (documentCount === 0) {
return "This RFQ needs a stronger document package before supplier engagement and executive decision review.";
}

return "This RFQ is still building toward decision readiness. Continue improving supplier coverage, documentation, and commercial intelligence.";
}

function getChecklist({
commercialEvaluationUnlocked,
recommendedQuote,
quoteCount,
documentCount,
addendaCount,
healthScore,
}: {
commercialEvaluationUnlocked: boolean;
recommendedQuote: ExecutiveDecisionCenterProps["recommendedQuote"];
quoteCount: number;
documentCount: number;
addendaCount: number;
healthScore: number;
}) {
return [
{
label: "Commercial opening available",
complete: commercialEvaluationUnlocked,
},
{
label: "Supplier bids received",
complete: quoteCount > 0,
},
{
label: "RFQ document package active",
complete: documentCount > 0,
},
{
label: "Governance and addenda trackable",
complete: addendaCount > 0,
},
{
label: "AI recommendation available",
complete: Boolean(recommendedQuote),
},
{
label: "Procurement health above executive threshold",
complete: healthScore >= 72,
},
];
}

export function ExecutiveDecisionCenter({
rfqSlug,
isOwner,
isOpen,
commercialEvaluationUnlocked,
healthScore,
quoteCount,
documentCount,
addendaCount,
potentialSavings,
recommendedQuote,
}: ExecutiveDecisionCenterProps) {
const status = getDecisionStatus({
isOwner,
commercialEvaluationUnlocked,
recommendedQuote,
quoteCount,
});

const checklist = getChecklist({
commercialEvaluationUnlocked,
recommendedQuote,
quoteCount,
documentCount,
addendaCount,
healthScore,
});

const completedItems = checklist.filter((item) => item.complete).length;
const readinessScore = Math.round((completedItems / checklist.length) * 100);

return (
<section className="mt-8 overflow-hidden rounded-[40px] border border-white/10 bg-slate-950 text-white shadow-[0_30px_100px_rgba(2,6,23,0.26)]">
<div className="grid gap-0 lg:grid-cols-[1.05fr_0.95fr]">
<div className="relative overflow-hidden p-6 sm:p-8">
<div className="absolute right-0 top-0 h-72 w-72 rounded-full bg-cyan-400/10 blur-3xl" />
<div className="absolute bottom-0 left-0 h-72 w-72 rounded-full bg-orange-400/10 blur-3xl" />

<div className="relative">
<p className="text-xs font-black uppercase tracking-[0.32em] text-[#C8A646]">
Executive Decision Center
</p>

<div className="mt-4 flex flex-wrap items-center gap-3">
<span className="rounded-full border border-white/10 bg-white/10 px-4 py-2 text-xs font-black uppercase tracking-[0.16em] text-white">
{getDecisionLabel(status)}
</span>

<span className="rounded-full border border-cyan-300/20 bg-cyan-400/10 px-4 py-2 text-xs font-black uppercase tracking-[0.16em] text-cyan-300">
Readiness {readinessScore}%
</span>
</div>

<h2 className="mt-6 text-3xl font-black leading-tight sm:text-4xl">
Executive award path and decision readiness
</h2>

<p className="mt-4 max-w-3xl text-sm font-semibold leading-7 text-slate-300">
{getDecisionNarrative({
status,
recommendedQuote,
quoteCount,
documentCount,
})}
</p>

<div className="mt-8 grid gap-4 sm:grid-cols-2">
<DecisionMetric
title="Award Readiness"
value={`${readinessScore}%`}
detail={`${completedItems}/${checklist.length} controls complete`}
/>

<DecisionMetric
title="Potential Savings"
value={formatMoney(potentialSavings)}
detail="Versus current average bid"
/>

<DecisionMetric
title="Supplier Coverage"
value={String(quoteCount)}
detail={quoteCount >= 3 ? "Healthy competition" : "Needs coverage"}
/>

<DecisionMetric
title="Health Score"
value={`${healthScore}/100`}
detail={healthScore >= 72 ? "Executive threshold met" : "Needs attention"}
/>
</div>

<div className="mt-8 flex flex-wrap gap-3">
{isOwner && commercialEvaluationUnlocked ? (
<Link
href={`/rfq/${rfqSlug}/compare`}
className="rounded-full bg-white px-6 py-3 text-sm font-black text-slate-950 transition hover:bg-slate-100"
>
Open Compare View
</Link>
) : null}

{!isOwner && isOpen ? (
<Link
href={`/rfq/${rfqSlug}/submit`}
className="rounded-full bg-white px-6 py-3 text-sm font-black text-slate-950 transition hover:bg-slate-100"
>
Submit Quote
</Link>
) : null}

<a
href="#document-center"
className="rounded-full border border-white/10 bg-white/10 px-6 py-3 text-sm font-black text-white transition hover:bg-white/15"
>
Review Documents
</a>
</div>
</div>
</div>

<div className="border-t border-white/10 bg-white/[0.04] p-6 sm:p-8 lg:border-l lg:border-t-0">
<p className="text-xs font-black uppercase tracking-[0.32em] text-cyan-300">
AI Explainability
</p>

<h3 className="mt-4 text-2xl font-black text-white">
Why this decision path matters
</h3>

<div className="mt-6 grid gap-3">
<ExplainabilityItem
complete={Boolean(recommendedQuote)}
label={
recommendedQuote
? `Recommended supplier ranked #${recommendedQuote.rank}`
: "No recommended supplier yet"
}
/>

<ExplainabilityItem
complete={commercialEvaluationUnlocked}
label={
commercialEvaluationUnlocked
? "Commercial evaluation is open"
: "Commercial data remains protected"
}
/>

<ExplainabilityItem
complete={quoteCount >= 3}
label={
quoteCount >= 3
? "Supplier competition is healthy"
: "Supplier competition can improve"
}
/>

<ExplainabilityItem
complete={documentCount > 0}
label={
documentCount > 0
? "Document package supports supplier clarity"
: "Document package requires attention"
}
/>
</div>

{recommendedQuote ? (
<div className="mt-6 rounded-[28px] border border-white/10 bg-slate-950/60 p-5">
<p className="text-xs font-black uppercase tracking-[0.24em] text-[#C8A646]">
Recommended Supplier Intelligence
</p>

<div className="mt-5 grid gap-3 sm:grid-cols-2">
<MiniScore title="Overall" value={`${recommendedQuote.totalScore}/100`} />
<MiniScore title="Risk" value={recommendedQuote.riskLevel} />
<MiniScore title="Price" value={`${recommendedQuote.priceScore}/100`} />
<MiniScore title="Timeline" value={`${recommendedQuote.timelineScore}/100`} />
<MiniScore title="Performance" value={`${recommendedQuote.performanceScore}/100`} />
<MiniScore title="Risk Score" value={`${recommendedQuote.riskScore}/100`} />
</div>
</div>
) : (
<div className="mt-6 rounded-[28px] border border-orange-300/20 bg-orange-400/10 p-5">
<p className="text-sm font-bold leading-6 text-orange-200">
Award intelligence will activate once supplier submissions and
commercial evaluation are available.
</p>
</div>
)}

<div className="mt-6 rounded-[28px] border border-white/10 bg-white/[0.04] p-5">
<p className="text-xs font-black uppercase tracking-[0.24em] text-slate-400">
Decision Checklist
</p>

<div className="mt-4 grid gap-3">
{checklist.map((item) => (
<ExplainabilityItem
key={item.label}
complete={item.complete}
label={item.label}
/>
))}
</div>
</div>
</div>
</div>
</section>
);
}

function DecisionMetric({
title,
value,
detail,
}: {
title: string;
value: string;
detail: string;
}) {
return (
<div className="rounded-[28px] border border-white/10 bg-white/10 p-5">
<p className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">
{title}
</p>

<p className="mt-3 text-3xl font-black text-white">{value}</p>

<p className="mt-2 text-xs font-bold leading-5 text-slate-300">{detail}</p>
</div>
);
}

function ExplainabilityItem({
complete,
label,
}: {
complete: boolean;
label: string;
}) {
return (
<div className="flex items-start gap-3 rounded-2xl border border-white/10 bg-white/[0.045] p-4">
<span
className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs font-black ${
complete ? "bg-emerald-400 text-slate-950" : "bg-orange-400 text-slate-950"
}`}
>
{complete ? "✓" : "!"}
</span>

<p className="text-sm font-bold leading-6 text-slate-300">{label}</p>
</div>
);
}

function MiniScore({ title, value }: { title: string; value: string }) {
return (
<div className="rounded-2xl border border-white/10 bg-white/[0.045] p-4">
<p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">
{title}
</p>

<p className="mt-2 text-lg font-black text-white">{value}</p>
</div>
);
}