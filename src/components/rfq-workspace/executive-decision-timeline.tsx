import { ExecutiveProgress } from "@/components/rfq-workspace/shared/executive-progress";
import { ExecutiveStatusBadge } from "@/components/rfq-workspace/shared/executive-status-badge";
import { buildExecutiveIntelligence } from "@/lib/executive/executive-engine";

type TimelineStatus = "complete" | "active" | "locked" | "pending" | "watch";

type TimelineStep = {
title: string;
status: TimelineStatus;
detail: string;
signal: string;
};

type ExecutiveDecisionTimelineProps = {
isOwner: boolean;
isOpen: boolean;
commercialEvaluationUnlocked: boolean;
quoteCount: number;
documentCount: number;
addendaCount: number;
recommendedQuote:
| {
awardConfidence: number;
riskLevel: string;
}
| null;
awardedQuote:
| {
amountNumber: number;
}
| null;
};

function getStatusLabel(status: TimelineStatus) {
if (status === "complete") return "Complete";
if (status === "active") return "Active";
if (status === "locked") return "Locked";
if (status === "watch") return "Watch";
return "Pending";
}

function mapTimelineStatusTone(
status: TimelineStatus,
): "success" | "info" | "warning" | "risk" | "neutral" {
if (status === "complete") return "success";
if (status === "active") return "info";
if (status === "locked") return "warning";
if (status === "watch") return "warning";
return "neutral";
}

function getDotClass(status: TimelineStatus) {
if (status === "complete") return "bg-emerald-400 text-slate-950";
if (status === "active") return "bg-cyan-300 text-slate-950";
if (status === "locked") return "bg-orange-300 text-slate-950";
if (status === "watch") return "bg-yellow-300 text-slate-950";
return "bg-white/15 text-slate-400";
}

export function ExecutiveDecisionTimeline({
isOwner,
isOpen,
commercialEvaluationUnlocked,
quoteCount,
documentCount,
addendaCount,
recommendedQuote,
awardedQuote,
}: ExecutiveDecisionTimelineProps) {
const executiveRecommendedQuote = recommendedQuote
? {
rank: 1,
amountNumber: awardedQuote?.amountNumber ?? 0,
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
rfqSlug: "",
isOwner,
isOpen,
commercialEvaluationUnlocked,
healthScore: recommendedQuote?.awardConfidence ?? 50,
quoteCount,
documentCount,
addendaCount,
potentialSavings: 0,
recommendedQuote: executiveRecommendedQuote,
awardedQuote,
});

const steps: TimelineStep[] = [
{
title: "RFQ Workspace Published",
status: "complete",
detail:
"The RFQ workspace is live and available for procurement execution.",
signal: "Workspace active",
},
{
title: "Document Package",
status: documentCount > 0 ? "complete" : "watch",
detail:
documentCount > 0
? "Documents are available for RFQ review and supplier pricing."
: "Upload RFQ documents to strengthen supplier clarity.",
signal: documentCount > 0 ? `${documentCount} files` : "No files yet",
},
{
title: "Supplier Engagement",
status: quoteCount > 0 ? "complete" : isOpen ? "active" : "pending",
detail:
quoteCount > 0
? "Supplier participation has started."
: isOpen
? "The RFQ is open for supplier submissions."
: "Supplier engagement is not currently active.",
signal: `${quoteCount} quote${quoteCount === 1 ? "" : "s"}`,
},
{
title: "Commercial Opening",
status: commercialEvaluationUnlocked ? "complete" : "locked",
detail: commercialEvaluationUnlocked
? "Commercial evaluation is available for authorized review."
: "Commercial submissions remain protected.",
signal: commercialEvaluationUnlocked
  ? "Evaluation Open"
  : "Awaiting Commercial Opening",
},
{
title: isOwner ? "Executive Review" : "Supplier Visibility",
status: recommendedQuote
? "active"
: commercialEvaluationUnlocked
? "watch"
: "locked",
detail: isOwner
? executive.recommendation.recommendation
: "Supplier-side users can monitor their own submission while buyer-side award analysis remains confidential.",
signal: recommendedQuote
? `${recommendedQuote.awardConfidence}% confidence`
: "Awaiting intelligence",
},
{
title: "Award Decision",
status: awardedQuote ? "complete" : recommendedQuote ? "active" : "pending",
detail: awardedQuote
? "The RFQ has an awarded supplier decision recorded."
: executive.summary.nextStep,
signal: awardedQuote ? "Awarded" : recommendedQuote ? "Ready" : "Pending",
},
];

const activeStep = steps.find((step) => step.status === "active");
const progress = executive.readiness.score;

return (
<section className="mt-8 overflow-hidden rounded-[40px] border border-white/10 bg-[#061426] text-white shadow-[0_24px_80px_rgba(0,0,0,0.26)]">
<div className="border-b border-white/10 p-6 sm:p-8">
<div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
<div>
<p className="text-xs font-black uppercase tracking-[0.3em] text-[#C8A646]">
Executive Decision Timeline
</p>

<h2 className="mt-3 text-3xl font-black text-white">
Procurement Path to Award
</h2>

<p className="mt-3 max-w-4xl text-sm font-semibold leading-7 text-slate-400">
Track the RFQ from published workspace through documents, supplier
engagement, commercial opening, executive review, award, and
contract execution.
</p>
</div>

<div className="rounded-3xl border border-white/10 bg-white/[0.055] px-6 py-5">
<p className="text-xs font-black uppercase tracking-[0.24em] text-slate-500">
Timeline Progress
</p>

<p className="mt-2 text-4xl font-black text-white">{progress}%</p>

<p className="mt-1 text-xs font-bold text-slate-400">
{activeStep ? `Active: ${activeStep.title}` : "Monitoring"}
</p>
</div>
</div>

<ExecutiveProgress value={progress} className="mt-4" />
</div>

<div className="grid gap-0 lg:grid-cols-2">
{steps.map((step, index) => (
<div
key={`${step.title}-${index}`}
className="relative border-b border-white/10 p-6 sm:p-8 lg:border-r"
>
<div className="flex gap-5">
<div className="flex flex-col items-center">
<div
className={`flex h-11 w-11 items-center justify-center rounded-full text-sm font-black ${getDotClass(
step.status,
)}`}
>
{step.status === "complete" ? "✓" : index + 1}
</div>

{index < steps.length - 1 ? (
<div className="mt-3 h-full min-h-10 w-px bg-white/10" />
) : null}
</div>

<div className="min-w-0 flex-1">
<div className="flex flex-wrap items-start justify-between gap-3">
<div>
<p className="text-xs font-black uppercase tracking-[0.22em] text-slate-500">
Step {index + 1}
</p>

<h3 className="mt-2 text-2xl font-black text-white">
{step.title}
</h3>
</div>

<ExecutiveStatusBadge tone={mapTimelineStatusTone(step.status)}>
{getStatusLabel(step.status)}
</ExecutiveStatusBadge>
</div>

<p className="mt-4 text-sm font-semibold leading-7 text-slate-400">
{step.detail}
</p>

<div className="mt-5 rounded-2xl border border-white/10 bg-white/[0.045] p-4">
<p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">
Signal
</p>

<p className="mt-2 text-sm font-black text-white">
{step.signal}
</p>
</div>
</div>
</div>
</div>
))}
</div>
</section>
);
}