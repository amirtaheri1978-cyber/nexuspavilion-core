import type {
ExecutiveIntelligenceInput,
ExecutiveResult,
ExecutivePriority,
ExecutiveTone,
} from "@/lib/executive/executive-types";

function tone(score: number): ExecutiveTone {
if (score >= 85) return "success";
if (score >= 70) return "info";
if (score >= 55) return "warning";
return "risk";
}

function priority(score: number): ExecutivePriority {
if (score >= 85) return "low";
if (score >= 70) return "medium";
if (score >= 55) return "high";
return "critical";
}

export function buildExecutiveRecommendation({
commercialEvaluationUnlocked,
recommendedQuote,
quoteCount,
healthScore,
documentCount,
}: ExecutiveIntelligenceInput): ExecutiveResult {
if (!commercialEvaluationUnlocked) {
return {
score: 20,
status: "Commercial Locked",
tone: "warning",
priority: "high",
recommendation:
"Commercial evaluation is still protected. Wait until commercial opening before making an award decision.",
};
}

if (!recommendedQuote) {
return {
score: 40,
status: "Awaiting Recommendation",
tone: "warning",
priority: "high",
recommendation:
"More supplier intelligence is required before Nexus Pavilion can recommend an award.",
};
}

const score = Math.round(
(
recommendedQuote.awardConfidence +
healthScore +
Math.min(100, quoteCount * 25) +
Math.min(100, documentCount * 20)
) / 4,
);

let status = "Executive Review";

if (
score >= 85 &&
recommendedQuote.riskLevel.toLowerCase() === "low"
) {
status = "Award Ready";
} else if (score < 55) {
status = "Needs Validation";
}

return {
score,
status,
tone: tone(score),
priority: priority(score),
recommendation:
status === "Award Ready"
? "Proceed with executive validation and award approval."
: status === "Needs Validation"
? "Strengthen procurement readiness before proceeding."
: "Review supplier recommendation and validate governance before award.",
};
}