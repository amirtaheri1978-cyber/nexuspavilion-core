import { ExecutiveMiniTile } from "@/components/rfq-workspace/shared/executive-mini-tile";
import { ExecutiveProgress } from "@/components/executive/executive-progress";
import { buildExecutiveIntelligence } from "@/lib/executive/executive-engine";
import type { ExecutiveQuote } from "@/types/executive";

type ExecutiveSupplierDNAProps = {
isOwner: boolean;
commercialEvaluationUnlocked: boolean;
recommendedQuote: ExecutiveQuote | null;
averageBid: number;
lowestAmount: number | null;
quoteCount: number;
};

function formatMoney(value: number) {
if (!Number.isFinite(value)) return "$0";
return `$${Math.round(value).toLocaleString()}`;
}

function getScoreLabel(score: number) {
if (score >= 88) return "Excellent";
if (score >= 74) return "Strong";
if (score >= 58) return "Developing";
return "Watch";
}

export function ExecutiveSupplierDNA({
isOwner,
commercialEvaluationUnlocked,
recommendedQuote,
averageBid,
lowestAmount,
quoteCount,
}: ExecutiveSupplierDNAProps) {
if (!isOwner) return null;

if (!commercialEvaluationUnlocked || !recommendedQuote) {
return (
<section className="mt-8 rounded-[40px] border border-orange-200 bg-orange-50 p-6 shadow-sm sm:p-8">
<p className="text-xs font-black uppercase tracking-[0.3em] text-orange-600">
Executive Supplier DNA
</p>

<h2 className="mt-3 text-3xl font-black text-slate-950">
Supplier intelligence locked
</h2>

<p className="mt-3 max-w-3xl text-sm font-bold leading-7 text-orange-800">
Supplier DNA activates after commercial opening and once Nexus
Pavilion has enough quote intelligence to evaluate the recommended
supplier profile.
</p>
</section>
);
}

const budget = recommendedQuote.amountNumber + recommendedQuote.budgetVariance;
const savingsVsAverage =
averageBid > 0 ? averageBid - recommendedQuote.amountNumber : 0;

const executive = buildExecutiveIntelligence({
rfqSlug: "",
isOwner,
isOpen: true,
commercialEvaluationUnlocked,
healthScore: recommendedQuote.totalScore,
quoteCount,
documentCount: 1,
addendaCount: 0,
averageBid,
lowestAmount,
budget,
potentialSavings: savingsVsAverage,
recommendedQuote,
awardedQuote: null,
});

const dnaScores = [
{
label: "Commercial",
score: executive.recommendation.score,
detail: executive.recommendation.status,
},
{
label: "Delivery",
score: recommendedQuote.timelineScore,
detail: getScoreLabel(recommendedQuote.timelineScore),
},
{
label: "Performance",
score: recommendedQuote.performanceScore,
detail: getScoreLabel(recommendedQuote.performanceScore),
},
{
label: "Risk Control",
score: recommendedQuote.riskScore,
detail: `${recommendedQuote.riskLevel} risk`,
},
{
label: "Supplier Reliability",
score: executive.board.confidence,
detail: executive.board.status,
},
];

return (
<section className="mt-8 overflow-hidden rounded-[40px] border border-white/10 bg-[#061426] text-white shadow-[0_24px_80px_rgba(0,0,0,0.26)]">
<div className="grid gap-0 lg:grid-cols-[0.85fr_1.15fr]">
<div className="border-b border-white/10 p-6 sm:p-8 lg:border-b-0 lg:border-r">
<p className="text-xs font-black uppercase tracking-[0.3em] text-[#C8A646]">
Executive Supplier DNA
</p>

<h2 className="mt-3 text-3xl font-black text-white">
Recommended Supplier Profile
</h2>

<p className="mt-4 text-sm font-semibold leading-7 text-slate-400">
Nexus Pavilion summarizes the recommended supplier through
commercial position, delivery strength, performance signals, risk
control, and executive award confidence.
</p>

<div className="mt-8 rounded-[34px] border border-white/10 bg-white/[0.055] p-6">
<p className="text-xs font-black uppercase tracking-[0.24em] text-slate-500">
Board Recommendation
</p>

<p className="mt-4 text-4xl font-black text-white">
Rank #{recommendedQuote.rank}
</p>

<p className="mt-3 text-sm font-bold leading-6 text-slate-300">
{executive.board.boardRecommendation}
</p>
</div>

<div className="mt-6 grid gap-4 sm:grid-cols-2">
<ExecutiveMiniTile
title="Recommended Bid"
value={formatMoney(recommendedQuote.amountNumber)}
/>
<ExecutiveMiniTile title="Competition" value={`${quoteCount} bids`} />
<ExecutiveMiniTile
title="Savings Signal"
value={savingsVsAverage > 0 ? formatMoney(savingsVsAverage) : "Pending"}
/>
<ExecutiveMiniTile title="Risk" value={recommendedQuote.riskLevel} />
</div>
</div>

<div className="p-6 sm:p-8">
<p className="text-xs font-black uppercase tracking-[0.3em] text-cyan-300">
Supplier Intelligence Scorecard
</p>

<h3 className="mt-3 text-3xl font-black text-white">DNA Signals</h3>

<div className="mt-6 grid gap-4">
{dnaScores.map((item) => (
<div
key={item.label}
className="rounded-3xl border border-white/10 bg-white/[0.045] p-5"
>
<div className="flex items-start justify-between gap-4">
<div>
<p className="text-sm font-black text-white">
{item.label}
</p>

<p className="mt-1 text-xs font-bold leading-5 text-slate-400">
{item.detail}
</p>
</div>

<p className="text-2xl font-black text-white">{item.score}</p>
</div>

<ExecutiveProgress value={item.score} className="mt-4" />
</div>
))}
</div>

<div className="mt-6 rounded-[32px] border border-cyan-300/15 bg-cyan-400/[0.07] p-6">
<p className="text-xs font-black uppercase tracking-[0.24em] text-cyan-300">
AI Executive Summary
</p>

<p className="mt-4 text-sm font-bold leading-7 text-slate-300">
{executive.summary.recommendation} {executive.summary.nextStep}
</p>
</div>
</div>
</div>
</section>
);
}
