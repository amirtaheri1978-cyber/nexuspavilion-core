import { ExecutiveProgress } from "@/components/rfq-workspace/shared/executive-progress";
import { ExecutiveSignal } from "@/components/rfq-workspace/shared/executive-signal";
import { buildExecutiveIntelligence } from "@/lib/executive/executive-engine";
import type { ExecutiveQuote } from "@/types/executive";

type ExecutiveAIExplainabilityProps = {
isOwner: boolean;
commercialEvaluationUnlocked: boolean;
recommendedQuote: ExecutiveQuote | null;
averageBid: number;
quoteCount: number;
healthScore: number;
documentCount: number;
};

function formatMoney(value: number) {
if (!Number.isFinite(value)) return "$0";
return `$${Math.round(value).toLocaleString()}`;
}

function getDriverLabel(score: number) {
if (score >= 88) return "Strong";
if (score >= 72) return "Healthy";
if (score >= 56) return "Watch";
return "Weak";
}

export function ExecutiveAIExplainability({
isOwner,
commercialEvaluationUnlocked,
recommendedQuote,
averageBid,
quoteCount,
healthScore,
documentCount,
}: ExecutiveAIExplainabilityProps) {
if (!isOwner) return null;

if (!commercialEvaluationUnlocked || !recommendedQuote) {
return (
<section className="mt-8 rounded-[40px] border border-orange-200 bg-orange-50 p-6 shadow-sm sm:p-8">
<p className="text-xs font-black uppercase tracking-[0.3em] text-orange-600">
AI Explainability Layer
</p>

<h2 className="mt-3 text-3xl font-black text-slate-950">
Award reasoning locked
</h2>

<p className="mt-3 max-w-3xl text-sm font-bold leading-7 text-orange-800">
Executive award reasoning becomes available after commercial opening
and after Nexus Pavilion has enough supplier intelligence to explain
the recommended award path.
</p>
</section>
);
}

const executive = buildExecutiveIntelligence({
rfqSlug: "",
isOwner,
isOpen: true,
commercialEvaluationUnlocked,
healthScore,
quoteCount,
documentCount,
addendaCount: 0,
averageBid,
lowestAmount: null,
budget: recommendedQuote.amountNumber + recommendedQuote.budgetVariance,
potentialSavings:
averageBid > 0 ? averageBid - recommendedQuote.amountNumber : 0,
recommendedQuote,
awardedQuote: null,
});

const drivers = [
{ label: "Price", score: recommendedQuote.priceScore },
{ label: "Timeline", score: recommendedQuote.timelineScore },
{ label: "Performance", score: recommendedQuote.performanceScore },
{ label: "Risk", score: recommendedQuote.riskScore },
{ label: "Overall", score: recommendedQuote.totalScore },
];

const reasonSignals = executive.risks.map((risk) => ({
label: risk.title,
value: risk.summary,
strong: risk.severity === "success" || risk.severity === "info",
}));

return (
<section className="mt-8 overflow-hidden rounded-[40px] border border-white/10 bg-slate-950 text-white shadow-[0_30px_100px_rgba(2,6,23,0.26)]">
<div className="grid gap-0 lg:grid-cols-[0.9fr_1.1fr]">
<div className="border-b border-white/10 p-6 sm:p-8 lg:border-b-0 lg:border-r">
<p className="text-xs font-black uppercase tracking-[0.3em] text-[#C8A646]">
AI Explainability Layer
</p>

<h2 className="mt-3 text-3xl font-black text-white">
Why Nexus recommends this award path
</h2>

<p className="mt-4 text-sm font-semibold leading-7 text-slate-400">
This panel explains the reasoning behind the recommended supplier
using price, delivery, performance, risk, procurement health, and
commercial comparison signals.
</p>

<div className="mt-8 rounded-[32px] border border-white/10 bg-white/[0.055] p-6">
<p className="text-xs font-black uppercase tracking-[0.24em] text-slate-500">
AI Verdict
</p>

<p className="mt-4 text-sm font-bold leading-7 text-slate-300">
{executive.recommendation.recommendation}{" "}
{executive.board.boardRecommendation}
</p>
</div>

<div className="mt-6 grid gap-4 sm:grid-cols-2">
<MiniMetric
title="Recommended Rank"
value={`#${recommendedQuote.rank}`}
/>
<MiniMetric
title="Award Confidence"
value={`${executive.recommendation.score}%`}
/>
<MiniMetric
title="Recommended Bid"
value={formatMoney(recommendedQuote.amountNumber)}
/>
<MiniMetric title="Risk Level" value={recommendedQuote.riskLevel} />
</div>
</div>

<div className="p-6 sm:p-8">
<p className="text-xs font-black uppercase tracking-[0.3em] text-cyan-300">
Confidence Drivers
</p>

<h3 className="mt-3 text-3xl font-black text-white">
Decision factors behind the score
</h3>

<div className="mt-6 grid gap-4">
{drivers.map((driver) => (
<div
key={driver.label}
className="rounded-3xl border border-white/10 bg-white/[0.045] p-5"
>
<div className="flex items-start justify-between gap-4">
<div>
<p className="text-sm font-black text-white">
{driver.label}
</p>
<p className="mt-1 text-xs font-bold uppercase tracking-[0.18em] text-slate-500">
{getDriverLabel(driver.score)}
</p>
</div>

<p className="text-2xl font-black text-white">
{driver.score}
</p>
</div>

<ExecutiveProgress value={driver.score} className="mt-4" />
</div>
))}
</div>

<div className="mt-6 rounded-[32px] border border-white/10 bg-white/[0.045] p-6">
<p className="text-xs font-black uppercase tracking-[0.24em] text-slate-500">
Explainable Reasons
</p>

<div className="mt-5 grid gap-3">
{reasonSignals.map((reason) => (
<div
key={reason.label}
className="flex items-start gap-3 rounded-2xl border border-white/10 bg-slate-950/50 p-4"
>
<ExecutiveSignal positive={reason.strong} />

<div>
<p className="text-sm font-black text-white">
{reason.label}
</p>

<p className="mt-1 text-xs font-bold leading-5 text-slate-400">
{reason.value}
</p>
</div>
</div>
))}
</div>
</div>
</div>
</div>
</section>
);
}

function MiniMetric({ title, value }: { title: string; value: string }) {
return (
<div className="rounded-3xl border border-white/10 bg-white/[0.055] p-5">
<p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">
{title}
</p>

<p className="mt-3 text-2xl font-black text-white">{value}</p>
</div>
);
}
