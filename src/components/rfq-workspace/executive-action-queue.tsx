import Link from "next/link";

import { ExecutiveStatusBadge } from "@/components/rfq-workspace/shared/executive-status-badge";
import { buildExecutiveIntelligence } from "@/lib/executive/executive-engine";
import type { ExecutiveAction } from "@/lib/executive/executive-types";

type ExecutiveActionQueueProps = {
rfqSlug: string;
isOwner: boolean;
isOpen: boolean;
commercialEvaluationUnlocked: boolean;
quoteCount: number;
documentCount: number;
addendaCount: number;
healthScore: number;
recommendedQuote:
| {
awardConfidence: number;
riskLevel: string;
}
| null;
};

function mapPriorityTone(
priority: ExecutiveAction["priority"],
): "success" | "info" | "warning" | "risk" {
if (priority === "critical") return "risk";
if (priority === "high") return "warning";
if (priority === "medium") return "info";
return "success";
}

export function ExecutiveActionQueue({
rfqSlug,
isOwner,
isOpen,
commercialEvaluationUnlocked,
quoteCount,
documentCount,
addendaCount,
healthScore,
recommendedQuote,
}: ExecutiveActionQueueProps) {
const executiveRecommendedQuote = recommendedQuote
? {
rank: 1,
amountNumber: 0,
awardConfidence: recommendedQuote.awardConfidence,
riskLevel: recommendedQuote.riskLevel,
totalScore: recommendedQuote.awardConfidence,
priceScore: recommendedQuote.awardConfidence,
timelineScore: recommendedQuote.awardConfidence,
riskScore: recommendedQuote.awardConfidence,
performanceScore: recommendedQuote.awardConfidence,
budgetVariance: 0,
lowestBidVariance: 0,
}
: null;

const executive = buildExecutiveIntelligence({
rfqSlug,
isOwner,
isOpen,
commercialEvaluationUnlocked,
healthScore,
quoteCount,
documentCount,
addendaCount,
potentialSavings: 0,
recommendedQuote: executiveRecommendedQuote,
awardedQuote: null,
});

const actions = executive.actions;
const primaryAction = actions[0];

return (
<section className="mt-8 rounded-[40px] border border-black/5 bg-white p-6 shadow-sm sm:p-8">
<div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
<div>
<p className="text-xs font-black uppercase tracking-[0.3em] text-orange-500">
Executive Action Queue
</p>

<h2 className="mt-3 text-3xl font-black text-slate-950">
Priority Next Steps
</h2>

<p className="mt-3 max-w-3xl text-sm font-semibold leading-7 text-slate-600">
Nexus Pavilion prioritizes the next actions based on document
readiness, supplier competition, commercial access, governance
controls, and award confidence.
</p>
</div>

<div className="rounded-3xl bg-slate-950 px-6 py-5 text-white">
<p className="text-xs font-black uppercase tracking-[0.24em] text-slate-400">
Top Priority
</p>

<p className="mt-2 max-w-xs text-lg font-black leading-6 text-white">
{primaryAction.title}
</p>
</div>
</div>

<div className="mt-8 grid gap-5 lg:grid-cols-2">
{actions.map((action, index) => (
<ActionQueueCard
key={`${action.title}-${index}`}
action={action}
index={index}
/>
))}
</div>
</section>
);
}

function ActionQueueCard({
action,
index,
}: {
action: ExecutiveAction;
index: number;
}) {
const content = (
<>
<div className="flex items-start justify-between gap-4">
<div>
<p className="text-xs font-black uppercase tracking-[0.22em] text-slate-400">
Priority {index + 1} · {action.category}
</p>

<h3 className="mt-3 text-2xl font-black text-slate-950">
{action.title}
</h3>
</div>

<ExecutiveStatusBadge tone={mapPriorityTone(action.priority)}>
{action.priority}
</ExecutiveStatusBadge>
</div>

<p className="mt-4 text-sm font-semibold leading-7 text-slate-600">
{action.rationale}
</p>

<div className="mt-5 rounded-2xl bg-slate-50 p-4">
<p className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">
Expected Outcome
</p>

<p className="mt-2 text-sm font-bold leading-6 text-slate-700">
{action.outcome}
</p>
</div>

<div className="mt-5 inline-flex rounded-full bg-slate-950 px-5 py-3 text-sm font-black text-white transition group-hover:bg-slate-800">
{action.actionLabel}
</div>
</>
);

if (action.href) {
return (
<Link
href={action.href}
className="group rounded-[32px] border border-slate-200 bg-white p-6 transition hover:-translate-y-0.5 hover:shadow-xl"
>
{content}
</Link>
);
}

return (
<a
href={action.anchorHref || "#"}
className="group rounded-[32px] border border-slate-200 bg-white p-6 transition hover:-translate-y-0.5 hover:shadow-xl"
>
{content}
</a>
);
}