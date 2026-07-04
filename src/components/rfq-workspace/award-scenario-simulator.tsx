import { calculateScenarioRecommendation } from "@/lib/analytics/executive-intelligence";

type ScenarioQuote = {
amountNumber: number;
awardConfidence: number;
riskLevel: string;
totalScore: number;
priceScore: number;
timelineScore: number;
riskScore: number;
performanceScore: number;
};

type AwardScenarioSimulatorProps = {
isOwner: boolean;
commercialEvaluationUnlocked: boolean;
recommendedQuote: ScenarioQuote | null;
averageBid: number;
quoteCount: number;
healthScore: number;
budget: number;
};

type ScenarioTone = "success" | "info" | "warning" | "risk";

type AwardScenario = {
title: string;
tone: ScenarioTone;
recommendation: string;
costImpact: string;
timeImpact: string;
riskImpact: string;
boardView: string;
};

function formatMoney(value: number) {
if (!Number.isFinite(value)) return "$0";
return `$${Math.max(0, Math.round(value)).toLocaleString()}`;
}

function getToneClass(tone: ScenarioTone) {
if (tone === "success") {
return "border-emerald-300/25 bg-emerald-400/10 text-emerald-200";
}

if (tone === "info") {
return "border-cyan-300/25 bg-cyan-400/10 text-cyan-200";
}

if (tone === "warning") {
return "border-orange-300/25 bg-orange-400/10 text-orange-200";
}

return "border-red-300/25 bg-red-400/10 text-red-200";
}

function getPrimaryTone(status: string): ScenarioTone {
if (status === "Award Now") return "success";
if (status === "Negotiate First") return "info";
if (status === "Extend or Rebid") return "warning";
return "risk";
}

function buildScenarios({
recommendedQuote,
averageBid,
quoteCount,
healthScore,
budget,
primaryRecommendation,
}: {
recommendedQuote: ScenarioQuote;
averageBid: number;
quoteCount: number;
healthScore: number;
budget: number;
primaryRecommendation: string;
}): AwardScenario[] {
const savingsVsAverage =
averageBid > 0 ? averageBid - recommendedQuote.amountNumber : 0;
const budgetDelta = budget > 0 ? budget - recommendedQuote.amountNumber : 0;
const lowRisk = recommendedQuote.riskLevel.toLowerCase() === "low";
const strongCompetition = quoteCount >= 3;

return [
{
title: "Award Now",
tone: getPrimaryTone(primaryRecommendation),
recommendation:
primaryRecommendation === "Award Now"
? "Proceed if scope, compliance, and internal approval are aligned."
: "Proceed only after validating risk, scope, and commercial assumptions.",
costImpact:
savingsVsAverage > 0
? `${formatMoney(savingsVsAverage)} below average bid`
: budgetDelta >= 0
? `${formatMoney(budgetDelta)} under budget`
: "Limited savings signal versus current average",
timeImpact: "Fastest path to contract execution",
riskImpact: lowRisk
? "Low risk based on current supplier profile"
: `${recommendedQuote.riskLevel} risk requires validation`,
boardView:
primaryRecommendation === "Award Now"
? "Board-ready with executive validation"
: "Requires management review before board-level confidence",
},
{
title: "Negotiate First",
tone:
primaryRecommendation === "Negotiate First"
? "success"
: savingsVsAverage > 0 || strongCompetition
? "info"
: "warning",
recommendation:
"Request targeted commercial improvement while preserving scope, schedule, warranty, and supplier commitment.",
costImpact:
savingsVsAverage > 0
? `Protects current savings and may improve ${formatMoney(
Math.max(0, recommendedQuote.amountNumber * 0.03),
)}+`
: "May create incremental commercial improvement",
timeImpact: "Adds short negotiation cycle",
riskImpact: "Low to moderate if scope remains unchanged",
boardView:
"Best option when award confidence is strong but commercial leverage remains available",
},
{
title: "Extend RFQ",
tone:
primaryRecommendation === "Extend or Rebid"
? "warning"
: quoteCount < 3
? "warning"
: "info",
recommendation:
quoteCount < 3
? "Consider extending if supplier coverage is below target and schedule allows."
: "Extension may not add enough value if competition is already healthy.",
costImpact:
quoteCount < 3
? "May improve competition and pricing pressure"
: "Limited upside if current bid coverage is adequate",
timeImpact: "Adds schedule delay before award",
riskImpact: "May reduce competition risk but increase procurement duration",
boardView:
quoteCount < 3
? "Useful if market coverage is a board concern"
: "Not primary recommendation unless new suppliers are expected",
},
{
title: "Rebid Package",
tone: healthScore < 58 ? "risk" : "warning",
recommendation:
"Use only if scope, pricing, competition, or governance signals are not reliable enough for award.",
costImpact: "Could reset pricing but increases process cost",
timeImpact: "Longest path; delays award and contract execution",
riskImpact:
"Reduces decision risk only if current RFQ package is materially weak",
boardView:
"Defensive option when current procurement record is not decision-grade",
},
];
}

export function AwardScenarioSimulator({
isOwner,
commercialEvaluationUnlocked,
recommendedQuote,
averageBid,
quoteCount,
healthScore,
budget,
}: AwardScenarioSimulatorProps) {
if (!isOwner) return null;

if (!commercialEvaluationUnlocked || !recommendedQuote) {
return (
<section className="mt-8 rounded-[40px] border border-orange-200 bg-orange-50 p-6 shadow-sm sm:p-8">
<p className="text-xs font-black uppercase tracking-[0.3em] text-orange-600">
Award Scenario Simulator
</p>

<h2 className="mt-3 text-3xl font-black text-slate-950">
Scenario modeling locked
</h2>

<p className="mt-3 max-w-3xl text-sm font-bold leading-7 text-orange-800">
Award scenario modeling becomes available after commercial opening and
once Nexus Pavilion has a recommended supplier path to evaluate.
</p>
</section>
);
}

const scenarioRecommendation = calculateScenarioRecommendation({
awardConfidence: recommendedQuote.awardConfidence,
healthScore,
quoteCount,
riskLevel: recommendedQuote.riskLevel,
commercialEvaluationUnlocked,
});

const scenarios = buildScenarios({
recommendedQuote,
averageBid,
quoteCount,
healthScore,
budget,
primaryRecommendation: scenarioRecommendation.status,
});

const primaryScenario =
scenarios.find((scenario) => scenario.title === scenarioRecommendation.status) ??
scenarios[0];

return (
<section className="mt-8 overflow-hidden rounded-[40px] border border-white/10 bg-[#061426] text-white shadow-[0_24px_80px_rgba(0,0,0,0.26)]">
<div className="border-b border-white/10 p-6 sm:p-8">
<div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
<div>
<p className="text-xs font-black uppercase tracking-[0.3em] text-[#C8A646]">
Award Scenario Simulator
</p>

<h2 className="mt-3 text-3xl font-black text-white">
Compare executive award paths before committing
</h2>

<p className="mt-3 max-w-4xl text-sm font-semibold leading-7 text-slate-400">
Nexus Pavilion compares award now, negotiate first, extend RFQ,
and rebid scenarios using cost, time, risk, and board-readiness
signals.
</p>
</div>

<div className="rounded-3xl border border-white/10 bg-white/[0.055] px-6 py-5">
<p className="text-xs font-black uppercase tracking-[0.24em] text-slate-500">
Primary Path
</p>

<p className="mt-2 text-2xl font-black text-white">
{primaryScenario.title}
</p>

<p className="mt-2 max-w-xs text-xs font-bold leading-5 text-slate-400">
{scenarioRecommendation.recommendation}
</p>
</div>
</div>
</div>

<div className="grid gap-5 p-6 sm:p-8 xl:grid-cols-4">
{scenarios.map((scenario) => (
<ScenarioCard key={scenario.title} scenario={scenario} />
))}
</div>

<div className="border-t border-white/10 bg-white/[0.035] p-6 sm:p-8">
<p className="text-xs font-black uppercase tracking-[0.3em] text-cyan-300">
Executive Recommendation
</p>

<p className="mt-4 max-w-4xl text-sm font-bold leading-7 text-slate-300">
{scenarioRecommendation.recommendation}
</p>
</div>
</section>
);
}

function ScenarioCard({ scenario }: { scenario: AwardScenario }) {
return (
<div className="rounded-[32px] border border-white/10 bg-white/[0.045] p-6">
<div className="flex items-start justify-between gap-4">
<h3 className="text-2xl font-black text-white">{scenario.title}</h3>

<span
className={`rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] ${getToneClass(
scenario.tone,
)}`}
>
{scenario.tone}
</span>
</div>

<p className="mt-4 text-sm font-bold leading-7 text-slate-300">
{scenario.recommendation}
</p>

<div className="mt-6 space-y-3">
<SignalBlock title="Cost Impact" value={scenario.costImpact} />
<SignalBlock title="Time Impact" value={scenario.timeImpact} />
<SignalBlock title="Risk Impact" value={scenario.riskImpact} />
<SignalBlock title="Board View" value={scenario.boardView} />
</div>
</div>
);
}

function SignalBlock({ title, value }: { title: string; value: string }) {
return (
<div className="rounded-2xl border border-white/10 bg-slate-950/50 p-4">
<p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">
{title}
</p>

<p className="mt-2 text-xs font-bold leading-5 text-slate-300">
{value}
</p>
</div>
);
}