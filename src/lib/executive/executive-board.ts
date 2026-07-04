import type {
ExecutiveBoardSummary,
ExecutiveIntelligenceInput,
} from "@/lib/executive/executive-types";

export function buildExecutiveBoard({
healthScore,
quoteCount,
documentCount,
commercialEvaluationUnlocked,
recommendedQuote,
}: ExecutiveIntelligenceInput): ExecutiveBoardSummary {
if (!commercialEvaluationUnlocked) {
return {
status: "Commercial Locked",
confidence: 0,
summary:
"Commercial evaluation has not yet been opened. Board-level award discussion should wait until supplier pricing becomes available.",
boardRecommendation:
"Wait for commercial opening before executive review.",
};
}

if (!recommendedQuote) {
return {
status: "Awaiting Recommendation",
confidence: 35,
summary:
"Commercial data is available, but Nexus Pavilion does not yet have enough intelligence to recommend an award path.",
boardRecommendation:
"Continue supplier evaluation before presenting to the board.",
};
}

const confidence = Math.round(
(
recommendedQuote.awardConfidence +
healthScore +
Math.min(100, quoteCount * 25) +
Math.min(100, documentCount * 20)
) / 4,
);

const lowRisk =
recommendedQuote.riskLevel.toLowerCase() === "low";

const boardReady =
confidence >= 85 &&
lowRisk &&
healthScore >= 72;

return {
status: boardReady
? "Board Ready"
: "Executive Review",

confidence,

summary: boardReady
? "The procurement package demonstrates sufficient commercial, governance, supplier competition, and procurement health signals for board-level review."
: "The procurement package should undergo additional executive validation before being escalated to the board.",

boardRecommendation: boardReady
? "Proceed to board approval."
: "Complete executive validation before board submission.",
};
}
