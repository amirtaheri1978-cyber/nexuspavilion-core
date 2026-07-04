import type {
ExecutiveIntelligenceInput,
ExecutiveSummary,
} from "@/lib/executive/executive-types";

export function buildExecutiveSummary({
healthScore,
quoteCount,
documentCount,
commercialEvaluationUnlocked,
recommendedQuote,
}: ExecutiveIntelligenceInput): ExecutiveSummary {
if (!commercialEvaluationUnlocked) {
return {
headline: "Commercial evaluation is locked",
recommendation:
"Wait for commercial opening before executive review.",
topRisk:
"Commercial submissions remain protected.",
topOpportunity:
"Continue supplier participation and document governance.",
nextStep:
"Monitor supplier activity until commercial opening.",
};
}

if (!recommendedQuote) {
return {
headline: "Executive recommendation unavailable",
recommendation:
"Collect more supplier intelligence before award.",
topRisk:
"Insufficient award intelligence.",
topOpportunity:
"Increase supplier competition and improve procurement readiness.",
nextStep:
"Continue commercial evaluation.",
};
}

const strongHealth = healthScore >= 72;
const strongCompetition = quoteCount >= 3;
const completeDocuments = documentCount > 0;
const lowRisk =
recommendedQuote.riskLevel.toLowerCase() === "low";

const ready =
strongHealth &&
strongCompetition &&
completeDocuments &&
lowRisk &&
recommendedQuote.awardConfidence >= 85;

return {
headline: ready
? "Procurement package is board-ready."
: "Executive validation recommended.",

recommendation: ready
? "Proceed toward executive approval and board presentation."
: "Strengthen procurement readiness before award.",

topRisk: lowRisk
? "No significant supplier risk identified."
: `${recommendedQuote.riskLevel} supplier risk requires validation.`,

topOpportunity: strongCompetition
? "Healthy supplier competition supports commercial leverage."
: "Additional supplier competition may improve pricing.",

nextStep: ready
? "Begin executive approval workflow."
: "Complete readiness improvements and re-evaluate.",
};
}
