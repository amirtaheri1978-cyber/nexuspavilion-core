import { ExecutiveStatusBadge } from "@/components/rfq-workspace/shared/executive-status-badge";
import { buildExecutiveIntelligence } from "@/lib/executive/executive-engine";
import type { ExecutiveScenario } from "@/lib/executive/executive-types";
import type { ExecutiveQuote } from "@/types/executive";

type AwardScenarioSimulatorProps = {
isOwner: boolean;
commercialEvaluationUnlocked: boolean;
recommendedQuote: ExecutiveQuote | null;
averageBid: number;
quoteCount: number;
healthScore: number;
budget: number;
};

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

const executive = buildExecutiveIntelligence({
rfqSlug: "",
isOwner,
isOpen: true,
commercialEvaluationUnlocked,
healthScore,
quoteCount,
documentCount: 1,
addendaCount: 0,
averageBid,
lowestAmount: null,
budget,
potentialSavings:
averageBid > 0 ? averageBid - recommendedQuote.amountNumber : 0,
recommendedQuote,
awardedQuote: null,
});

const scenarios = executive.scenarios;
const primaryScenario = scenarios[0];

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
{executive.recommendation.recommendation}
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
{executive.recommendation.recommendation}
</p>
</div>
</section>
);
}

function ScenarioCard({ scenario }: { scenario: ExecutiveScenario }) {
return (
<div className="rounded-[32px] border border-white/10 bg-white/[0.045] p-6">
<div className="flex items-start justify-between gap-4">
<h3 className="text-2xl font-black text-white">{scenario.title}</h3>

<ExecutiveStatusBadge tone={scenario.tone}>
{scenario.tone}
</ExecutiveStatusBadge>
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