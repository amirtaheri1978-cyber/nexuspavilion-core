import { calculateNegotiationStrength } from "@/lib/executive/negotiation-strength";

import type {
ExecutiveIntelligenceInput,
ExecutiveNegotiation,
ExecutivePriority,
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

export function buildExecutiveNegotiation({
recommendedQuote,
averageBid = 0,
quoteCount,
}: ExecutiveIntelligenceInput): ExecutiveNegotiation | null {
if (!recommendedQuote) return null;

const negotiation = calculateNegotiationStrength({
recommendedAmount: recommendedQuote.amountNumber,
averageBid,
quoteCount,
riskLevel: recommendedQuote.riskLevel,
});

const potential = Math.min(12, Math.round(negotiation.score * 0.12));
const targetImprovement = Math.round(
recommendedQuote.amountNumber * (potential / 100),
);
const targetPrice = recommendedQuote.amountNumber - targetImprovement;
const expectedSavings =
averageBid > 0 ? averageBid - recommendedQuote.amountNumber : 0;

return {
score: negotiation.score,
status: negotiation.status,
tone: mapScoreToTone(negotiation.score),
priority: mapScoreToPriority(negotiation.score),
recommendation: negotiation.recommendation,
targetPrice,
targetImprovement,
expectedSavings,
};
}