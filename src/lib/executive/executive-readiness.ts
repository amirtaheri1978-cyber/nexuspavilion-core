import { calculateDecisionReadiness } from "@/lib/analytics/executive-intelligence";

import type {
ExecutiveIntelligenceInput,
ExecutivePriority,
ExecutiveReadiness,
ExecutiveTone,
} from "@/lib/executive/executive-types";

function mapScoreToTone(score: number): ExecutiveTone {
if (score >= 85) return "success";
if (score >= 70) return "info";
if (score >= 55) return "warning";

return "risk";
}

function mapScoreToPriority(score: number): ExecutivePriority {
if (score >= 85) return "low";
if (score >= 70) return "medium";
if (score >= 55) return "high";

return "critical";
}

export function buildExecutiveReadiness({
healthScore,
quoteCount,
documentCount,
addendaCount,
commercialEvaluationUnlocked,
recommendedQuote,
}: ExecutiveIntelligenceInput): ExecutiveReadiness {
const readiness = calculateDecisionReadiness({
healthScore,
quoteCount,
documentCount,
addendaCount,
commercialEvaluationUnlocked,
hasRecommendedQuote: Boolean(recommendedQuote),
});

const controls = [
commercialEvaluationUnlocked,
quoteCount > 0,
documentCount > 0,
addendaCount > 0,
Boolean(recommendedQuote),
healthScore >= 72,
];

return {
score: readiness.score,
status: readiness.status,
tone: mapScoreToTone(readiness.score),
priority: mapScoreToPriority(readiness.score),
recommendation: readiness.recommendation,
completedControls: controls.filter(Boolean).length,
totalControls: controls.length,
};
}