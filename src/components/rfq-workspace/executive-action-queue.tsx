import Link from "next/link";

type ActionPriority = "critical" | "high" | "medium" | "low";

type ExecutiveAction = {
title: string;
priority: ActionPriority;
category: string;
rationale: string;
outcome: string;
href?: string;
anchorHref?: string;
actionLabel: string;
};

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

function getPriorityClass(priority: ActionPriority) {
if (priority === "critical") {
return "border-red-300/25 bg-red-400/10 text-red-200";
}

if (priority === "high") {
return "border-orange-300/25 bg-orange-400/10 text-orange-200";
}

if (priority === "medium") {
return "border-cyan-300/25 bg-cyan-400/10 text-cyan-200";
}

return "border-emerald-300/25 bg-emerald-400/10 text-emerald-200";
}

function getPriorityRank(priority: ActionPriority) {
if (priority === "critical") return 1;
if (priority === "high") return 2;
if (priority === "medium") return 3;
return 4;
}

function getOwnerActions({
rfqSlug,
isOpen,
commercialEvaluationUnlocked,
quoteCount,
documentCount,
addendaCount,
healthScore,
recommendedQuote,
}: Omit<ExecutiveActionQueueProps, "isOwner">): ExecutiveAction[] {
const actions: ExecutiveAction[] = [];

if (documentCount === 0) {
actions.push({
title: "Upload RFQ Document Package",
priority: "critical",
category: "Documentation",
rationale:
"Suppliers need drawings, specifications, BOQ, photos, or supporting files before they can price with confidence.",
outcome:
"Improves supplier clarity, reduces assumptions, and strengthens award readiness.",
anchorHref: "#document-center",
actionLabel: "Open Document Center",
});
}

if (isOpen && quoteCount === 0) {
actions.push({
title: "Invite Qualified Suppliers",
priority: "critical",
category: "Competition",
rationale:
"No supplier quotes have been received yet. The RFQ needs bid coverage before commercial comparison can produce decision-grade intelligence.",
outcome:
"Creates supplier competition and improves the probability of a credible award recommendation.",
anchorHref: "#supplier-invitations",
actionLabel: "Invite Suppliers",
});
}

if (isOpen && quoteCount > 0 && quoteCount < 3) {
actions.push({
title: "Increase Supplier Competition",
priority: "high",
category: "Market Coverage",
rationale:
"Bid coverage is below the recommended executive threshold. More suppliers can improve pricing pressure and reduce selection risk.",
outcome:
"Improves competition index, negotiation leverage, and executive confidence.",
anchorHref: "#supplier-invitations",
actionLabel: "Invite More Suppliers",
});
}

if (documentCount > 0 && addendaCount === 0) {
actions.push({
title: "Monitor Scope Clarifications",
priority: "medium",
category: "Governance",
rationale:
"No addenda have been issued yet. If supplier questions arise, clarifications should be managed through the addenda workflow.",
outcome:
"Maintains a clean audit trail and ensures all suppliers receive the same RFQ updates.",
anchorHref: "#document-center",
actionLabel: "Review Addenda",
});
}

if (!commercialEvaluationUnlocked) {
actions.push({
title: "Maintain Blind Bidding Control",
priority: "medium",
category: "Commercial Governance",
rationale:
"Commercial data remains locked until opening. This protects fairness, confidentiality, and procurement integrity.",
outcome:
"Preserves controlled evaluation and reduces governance risk.",
anchorHref: "#quote-intelligence",
actionLabel: "Review Lockbox",
});
}

if (commercialEvaluationUnlocked && recommendedQuote) {
actions.push({
title: "Validate Recommended Award Path",
priority:
recommendedQuote.awardConfidence >= 85 && recommendedQuote.riskLevel === "Low"
? "high"
: "medium",
category: "Award Decision",
rationale: `Nexus Pavilion has identified a recommended supplier with ${recommendedQuote.awardConfidence}% award confidence and ${recommendedQuote.riskLevel.toLowerCase()} risk.`,
outcome:
"Moves the RFQ from commercial evaluation toward final executive award validation.",
href: `/rfq/${rfqSlug}/compare`,
actionLabel: "Open Compare View",
});
}

if (healthScore < 72) {
actions.push({
title: "Improve Procurement Health",
priority: "high",
category: "Readiness",
rationale:
"Procurement health is below the recommended executive threshold for confident decision-making.",
outcome:
"Improves overall readiness by strengthening documents, supplier coverage, and governance controls.",
anchorHref: "#document-center",
actionLabel: "Improve Readiness",
});
}

if (actions.length === 0) {
actions.push({
title: "Workspace Ready for Executive Review",
priority: "low",
category: "Executive Review",
rationale:
"No urgent action is currently required. Continue monitoring supplier activity, documents, addenda, and award readiness.",
outcome:
"Keeps the procurement workspace stable while preserving visibility for executives.",
anchorHref: "#quote-intelligence",
actionLabel: "Review Workspace",
});
}

return actions.sort(
(a, b) => getPriorityRank(a.priority) - getPriorityRank(b.priority)
);
}

function getSupplierActions({
rfqSlug,
isOpen,
documentCount,
addendaCount,
}: {
rfqSlug: string;
isOpen: boolean;
documentCount: number;
addendaCount: number;
}): ExecutiveAction[] {
const actions: ExecutiveAction[] = [];

if (documentCount > 0) {
actions.push({
title: "Review RFQ Documents",
priority: "high",
category: "Supplier Readiness",
rationale:
"The buyer has provided RFQ documents that should be reviewed before submitting or validating pricing.",
outcome:
"Improves proposal accuracy and reduces scope assumptions.",
anchorHref: "#document-center",
actionLabel: "Open Documents",
});
}

if (addendaCount > 0) {
actions.push({
title: "Acknowledge Issued Addenda",
priority: "critical",
category: "Compliance",
rationale:
"Issued addenda may contain clarifications, revisions, or updated instructions that affect your submission.",
outcome:
"Keeps your company aligned with the latest RFQ requirements.",
anchorHref: "#document-center",
actionLabel: "Review Addenda",
});
}

if (isOpen) {
actions.push({
title: "Submit Commercial Proposal",
priority: "high",
category: "Submission",
rationale:
"The RFQ is still accepting supplier submissions. Submit before the deadline to remain eligible.",
outcome:
"Completes your company’s supplier-side participation in the RFQ.",
href: `/rfq/${rfqSlug}/submit`,
actionLabel: "Submit Quote",
});
}

if (actions.length === 0) {
actions.push({
title: "Monitor RFQ Workspace",
priority: "low",
category: "Supplier Visibility",
rationale:
"There are no urgent supplier-side actions currently available.",
outcome:
"Keeps your company aware of documents, addenda, and RFQ status changes.",
anchorHref: "#document-center",
actionLabel: "Review Workspace",
});
}

return actions.sort(
(a, b) => getPriorityRank(a.priority) - getPriorityRank(b.priority)
);
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
const actions = isOwner
? getOwnerActions({
rfqSlug,
isOpen,
commercialEvaluationUnlocked,
quoteCount,
documentCount,
addendaCount,
healthScore,
recommendedQuote,
})
: getSupplierActions({
rfqSlug,
isOpen,
documentCount,
addendaCount,
});

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

<span
className={`rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] ${getPriorityClass(
action.priority
)}`}
>
{action.priority}
</span>
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
