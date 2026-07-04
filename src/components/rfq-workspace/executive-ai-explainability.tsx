import {
calculateAwardConfidence,
calculateCommercialHealth,
calculateSupplierReliability,
} from "@/lib/analytics/executive-intelligence";

type ExplainabilityQuote = {
rank: number;
amountNumber: number;
awardConfidence: number;
riskLevel: string;
totalScore: number;
priceScore: number;
timelineScore: number;
riskScore: number;
performanceScore: number;
budgetVariance: number;
lowestBidVariance: number;
};

type ExecutiveAIExplainabilityProps = {
isOwner: boolean;
commercialEvaluationUnlocked: boolean;
recommendedQuote: ExplainabilityQuote | null;
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

function getReasonSignals({
recommendedQuote,
averageBid,
documentCount,
}: {
recommendedQuote: ExplainabilityQuote;
averageBid: number;
documentCount: number;
}) {
return [
{
label: "Commercial Position",
value:
averageBid > 0 && recommendedQuote.amountNumber < averageBid
? "Below average bid"
: "Needs commercial validation",
strong: averageBid > 0 && recommendedQuote.amountNumber <= averageBid,
},
{
label: "Award Confidence",
value: `${recommendedQuote.awardConfidence}% confidence`,
strong: recommendedQuote.awardConfidence >= 80,
},
{
label: "Risk Position",
value: `${recommendedQuote.riskLevel} risk`,
strong: recommendedQuote.riskLevel.toLowerCase() === "low",
},
{
label: "Performance Signals",
value: `${recommendedQuote.performanceScore}/100 performance score`,
strong: recommendedQuote.performanceScore >= 75,
},
{
label: "Timeline Strength",
value: `${recommendedQuote.timelineScore}/100 timeline score`,
strong: recommendedQuote.timelineScore >= 75,
},
{
label: "Document Context",
value:
documentCount > 0
? `${documentCount} RFQ document${documentCount === 1 ? "" : "s"} available`
: "Document package needs attention",
strong: documentCount > 0,
},
];
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

const awardConfidence = calculateAwardConfidence({
priceScore: recommendedQuote.priceScore,
timelineScore: recommendedQuote.timelineScore,
performanceScore: recommendedQuote.performanceScore,
riskScore: recommendedQuote.riskScore,
});

const commercialHealth = calculateCommercialHealth({
recommendedAmount: recommendedQuote.amountNumber,
averageBid,
budget: recommendedQuote.amountNumber + recommendedQuote.budgetVariance,
quoteCount,
});

const supplierReliability = calculateSupplierReliability({
timelineScore: recommendedQuote.timelineScore,
performanceScore: recommendedQuote.performanceScore,
riskScore: recommendedQuote.riskScore,
awardConfidence: recommendedQuote.awardConfidence,
});

const drivers = [
{ label: "Price", score: recommendedQuote.priceScore },
{ label: "Timeline", score: recommendedQuote.timelineScore },
{ label: "Performance", score: recommendedQuote.performanceScore },
{ label: "Risk", score: recommendedQuote.riskScore },
{ label: "Overall", score: recommendedQuote.totalScore },
];

const reasonSignals = getReasonSignals({
recommendedQuote,
averageBid,
documentCount,
});

const verdict = `${awardConfidence.recommendation} ${commercialHealth.recommendation} ${supplierReliability.recommendation}`;

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
{verdict}
</p>
</div>

<div className="mt-6 grid gap-4 sm:grid-cols-2">
<MiniMetric
title="Recommended Rank"
value={`#${recommendedQuote.rank}`}
/>
<MiniMetric
title="Award Confidence"
value={`${awardConfidence.score}%`}
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

<div className="mt-4 h-2 overflow-hidden rounded-full bg-white/10">
<div
className="h-full rounded-full bg-[#C8A646]"
style={{ width: `${driver.score}%` }}
/>
</div>
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
<span
className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs font-black ${
reason.strong
? "bg-emerald-400 text-slate-950"
: "bg-orange-400 text-slate-950"
}`}
>
{reason.strong ? "✓" : "!"}
</span>

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
