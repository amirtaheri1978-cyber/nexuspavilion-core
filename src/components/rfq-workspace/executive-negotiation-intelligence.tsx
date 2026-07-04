type NegotiationQuote = {
amountNumber: number;
awardConfidence: number;
riskLevel: string;
totalScore: number;
priceScore: number;
timelineScore: number;
riskScore: number;
performanceScore: number;
};

type ExecutiveNegotiationIntelligenceProps = {
isOwner: boolean;
commercialEvaluationUnlocked: boolean;
recommendedQuote: NegotiationQuote | null;
averageBid: number;
lowestAmount: number | null;
quoteCount: number;
budget: number;
};

function formatMoney(value: number) {
if (!Number.isFinite(value)) return "$0";
return `$${Math.max(0, Math.round(value)).toLocaleString()}`;
}

function getNegotiationPotential({
recommendedQuote,
averageBid,
quoteCount,
}: {
recommendedQuote: NegotiationQuote;
averageBid: number;
quoteCount: number;
}) {
if (averageBid <= 0) return 0;

const spread = averageBid - recommendedQuote.amountNumber;
const spreadPercent = (spread / averageBid) * 100;
const competitionBoost = quoteCount >= 3 ? 1.2 : quoteCount >= 2 ? 1 : 0.75;

return Math.max(0, Math.min(12, Math.round(spreadPercent * 0.35 * competitionBoost)));
}

function getLeverageLabel(score: number) {
if (score >= 8) return "High Leverage";
if (score >= 5) return "Moderate Leverage";
if (score >= 2) return "Limited Leverage";
return "Low Leverage";
}

function getStrategy({
potential,
quoteCount,
riskLevel,
}: {
potential: number;
quoteCount: number;
riskLevel: string;
}) {
if (potential >= 8 && quoteCount >= 3) {
return "Use competitive tension to request best-and-final pricing while preserving scope, schedule, and warranty commitments.";
}

if (potential >= 5) {
return "Negotiate targeted commercial improvement while validating that no scope exclusions or schedule risks are introduced.";
}

if (riskLevel.toLowerCase() !== "low") {
return "Prioritize risk clarification before pricing pressure. Commercial reduction should not increase delivery or execution exposure.";
}

return "Proceed with light negotiation focused on final terms, validity period, and contract execution readiness.";
}

export function ExecutiveNegotiationIntelligence({
isOwner,
commercialEvaluationUnlocked,
recommendedQuote,
averageBid,
lowestAmount,
quoteCount,
budget,
}: ExecutiveNegotiationIntelligenceProps) {
if (!isOwner) return null;

if (!commercialEvaluationUnlocked || !recommendedQuote) {
return (
<section className="mt-8 rounded-[40px] border border-orange-200 bg-orange-50 p-6 shadow-sm sm:p-8">
<p className="text-xs font-black uppercase tracking-[0.3em] text-orange-600">
Executive Negotiation Intelligence
</p>

<h2 className="mt-3 text-3xl font-black text-slate-950">
Negotiation intelligence locked
</h2>

<p className="mt-3 max-w-3xl text-sm font-bold leading-7 text-orange-800">
Negotiation strategy becomes available after commercial opening and
once Nexus Pavilion has a recommended supplier path to analyze.
</p>
</section>
);
}

const potential = getNegotiationPotential({
recommendedQuote,
averageBid,
quoteCount,
});

const targetReduction = Math.round(recommendedQuote.amountNumber * (potential / 100));
const targetPrice = recommendedQuote.amountNumber - targetReduction;
const savingsVsAverage =
averageBid > 0 ? averageBid - recommendedQuote.amountNumber : 0;
const budgetDelta = budget > 0 ? budget - recommendedQuote.amountNumber : 0;
const isLowest =
lowestAmount !== null && recommendedQuote.amountNumber === lowestAmount;

const strategy = getStrategy({
potential,
quoteCount,
riskLevel: recommendedQuote.riskLevel,
});

const commercialSignals = [
{
label: "Negotiation Potential",
value: `${potential}%`,
detail: getLeverageLabel(potential),
},
{
label: "Target Improvement",
value: formatMoney(targetReduction),
detail: "Estimated achievable reduction",
},
{
label: "Target Price",
value: formatMoney(targetPrice),
detail: "Suggested negotiation target",
},
{
label: "Savings vs Average",
value: savingsVsAverage > 0 ? formatMoney(savingsVsAverage) : "Limited",
detail: "Compared to average bid",
},
];

const leverageSignals = [
{
label: "Competition",
value: quoteCount >= 3 ? "Strong" : quoteCount >= 2 ? "Moderate" : "Light",
positive: quoteCount >= 3,
},
{
label: "Lowest Bid Position",
value: isLowest ? "Yes" : "No",
positive: isLowest,
},
{
label: "Budget Position",
value:
budget <= 0
? "Unknown"
: budgetDelta >= 0
? `${formatMoney(budgetDelta)} under budget`
: `${formatMoney(Math.abs(budgetDelta))} over budget`,
positive: budget <= 0 ? false : budgetDelta >= 0,
},
{
label: "Risk Position",
value: `${recommendedQuote.riskLevel} risk`,
positive: recommendedQuote.riskLevel.toLowerCase() === "low",
},
];

return (
<section className="mt-8 overflow-hidden rounded-[40px] border border-white/10 bg-slate-950 text-white shadow-[0_30px_100px_rgba(2,6,23,0.26)]">
<div className="grid gap-0 lg:grid-cols-[0.9fr_1.1fr]">
<div className="border-b border-white/10 p-6 sm:p-8 lg:border-b-0 lg:border-r">
<p className="text-xs font-black uppercase tracking-[0.3em] text-[#C8A646]">
Executive Negotiation Intelligence
</p>

<h2 className="mt-3 text-3xl font-black text-white">
Commercial strategy before award
</h2>

<p className="mt-4 text-sm font-semibold leading-7 text-slate-400">
Nexus Pavilion estimates negotiation room, leverage, target pricing,
and commercial strategy before executive award validation.
</p>

<div className="mt-8 rounded-[34px] border border-white/10 bg-white/[0.055] p-6">
<p className="text-xs font-black uppercase tracking-[0.24em] text-slate-500">
Recommended Strategy
</p>

<p className="mt-4 text-sm font-bold leading-7 text-slate-300">
{strategy}
</p>
</div>

<div className="mt-6 grid gap-4 sm:grid-cols-2">
{commercialSignals.map((signal) => (
<MiniTile
key={signal.label}
title={signal.label}
value={signal.value}
detail={signal.detail}
/>
))}
</div>
</div>

<div className="p-6 sm:p-8">
<p className="text-xs font-black uppercase tracking-[0.3em] text-cyan-300">
Commercial Leverage Signals
</p>

<h3 className="mt-3 text-3xl font-black text-white">
What strengthens negotiation position
</h3>

<div className="mt-6 grid gap-4">
{leverageSignals.map((signal) => (
<div
key={signal.label}
className="flex items-start gap-4 rounded-3xl border border-white/10 bg-white/[0.045] p-5"
>
<span
className={`mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-black ${
signal.positive
? "bg-emerald-400 text-slate-950"
: "bg-orange-400 text-slate-950"
}`}
>
{signal.positive ? "✓" : "!"}
</span>

<div>
<p className="text-sm font-black text-white">
{signal.label}
</p>

<p className="mt-1 text-sm font-bold leading-6 text-slate-400">
{signal.value}
</p>
</div>
</div>
))}
</div>

<div className="mt-6 rounded-[32px] border border-cyan-300/15 bg-cyan-400/[0.07] p-6">
<p className="text-xs font-black uppercase tracking-[0.24em] text-cyan-300">
Executive Negotiation Brief
</p>

<p className="mt-4 text-sm font-bold leading-7 text-slate-300">
Use negotiation only where it preserves scope certainty, schedule
confidence, supplier commitment, and procurement fairness. The
target should improve commercial value without weakening delivery
or governance controls.
</p>
</div>
</div>
</div>
</section>
);
}

function MiniTile({
title,
value,
detail,
}: {
title: string;
value: string;
detail: string;
}) {
return (
<div className="rounded-3xl border border-white/10 bg-white/[0.055] p-5">
<p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">
{title}
</p>

<p className="mt-3 text-2xl font-black text-white">{value}</p>

<p className="mt-2 text-xs font-bold leading-5 text-slate-400">
{detail}
</p>
</div>
);
}
