import type {
ExecutiveAction,
ExecutiveIntelligenceInput,
} from "@/lib/executive/executive-types";

function getPriorityRank(priority: ExecutiveAction["priority"]) {
if (priority === "critical") return 1;
if (priority === "high") return 2;
if (priority === "medium") return 3;
return 4;
}

export function buildExecutiveActions({
rfqSlug,
isOwner,
isOpen,
commercialEvaluationUnlocked,
quoteCount,
documentCount,
addendaCount,
healthScore,
recommendedQuote,
}: ExecutiveIntelligenceInput): ExecutiveAction[] {
const actions: ExecutiveAction[] = [];

if (!isOwner) {
if (documentCount > 0) {
actions.push({
title: "Review RFQ Documents",
priority: "high",
category: "Supplier Readiness",
rationale:
"The buyer has provided RFQ documents that should be reviewed before submitting or validating pricing.",
outcome: "Improves proposal accuracy and reduces scope assumptions.",
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
outcome: "Keeps your company aligned with the latest RFQ requirements.",
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
outcome: "Completes your company’s supplier-side participation in the RFQ.",
href: `/rfq/${rfqSlug}/submit`,
actionLabel: "Submit Quote",
});
}

if (actions.length === 0) {
actions.push({
title: "Monitor RFQ Workspace",
priority: "low",
category: "Supplier Visibility",
rationale: "There are no urgent supplier-side actions currently available.",
outcome:
"Keeps your company aware of documents, addenda, and RFQ status changes.",
anchorHref: "#document-center",
actionLabel: "Review Workspace",
});
}

return actions.sort(
(a, b) => getPriorityRank(a.priority) - getPriorityRank(b.priority),
);
}

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
outcome: "Preserves controlled evaluation and reduces governance risk.",
anchorHref: "#quote-intelligence",
actionLabel: "Review Lockbox",
});
}

if (commercialEvaluationUnlocked && recommendedQuote) {
actions.push({
title: "Validate Recommended Award Path",
priority:
recommendedQuote.awardConfidence >= 85 &&
recommendedQuote.riskLevel.toLowerCase() === "low"
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
(a, b) => getPriorityRank(a.priority) - getPriorityRank(b.priority),
);
}
