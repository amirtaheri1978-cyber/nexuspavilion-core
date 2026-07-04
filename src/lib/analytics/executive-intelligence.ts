export type ExecutiveTone = "excellent" | "healthy" | "developing" | "attention";
export type ExecutivePriority = "proceed" | "review" | "watch" | "hold";

export type ExecutiveScore = {
score: number;
status: string;
};

export type ExecutiveIntelligenceResult = {
score: number;
status: string;
tone: ExecutiveTone;
priority: ExecutivePriority;
recommendation: string;
};

export type AwardConfidenceInput = {
priceScore: number;
timelineScore: number;
performanceScore: number;
riskScore: number;
validityScore?: number;
};

export type DecisionReadinessInput = {
healthScore: number;
quoteCount: number;
documentCount: number;
addendaCount: number;
commercialEvaluationUnlocked: boolean;
hasRecommendedQuote: boolean;
};

export type CommercialHealthInput = {
recommendedAmount: number;
averageBid: number;
budget: number;
quoteCount: number;
};

export type NegotiationStrengthInput = {
recommendedAmount: number;
averageBid: number;
quoteCount: number;
riskLevel: string;
};

export type SupplierReliabilityInput = {
timelineScore: number;
performanceScore: number;
riskScore: number;
awardConfidence: number;
};

export type ScenarioRecommendationInput = {
awardConfidence: number;
healthScore: number;
quoteCount: number;
riskLevel: string;
commercialEvaluationUnlocked: boolean;
};

function clampScore(score: number) {
if (!Number.isFinite(score)) return 0;
return Math.max(0, Math.min(100, Math.round(score)));
}

function getTone(score: number): ExecutiveTone {
if (score >= 85) return "excellent";
if (score >= 70) return "healthy";
if (score >= 55) return "developing";
return "attention";
}

function getPriority(score: number): ExecutivePriority {
if (score >= 85) return "proceed";
if (score >= 70) return "review";
if (score >= 55) return "watch";
return "hold";
}

function result(
score: number,
status: string,
recommendation: string,
): ExecutiveIntelligenceResult {
const normalizedScore = clampScore(score);

return {
score: normalizedScore,
status,
tone: getTone(normalizedScore),
priority: getPriority(normalizedScore),
recommendation,
};
}

// -------------------------------------------------
// Existing Executive KPI Engine
// -------------------------------------------------

export function calculateExecutiveScore(
procurementHealthScore: number,
predictionAccuracy: number,
dataQualityScore: number,
procurementRiskIndex: number,
constructionClassificationScore: number,
): ExecutiveScore {
const score = Math.round(
(
procurementHealthScore +
predictionAccuracy +
dataQualityScore +
(100 - procurementRiskIndex) +
constructionClassificationScore
) / 5,
);

return {
score,
status: executiveStatus(score),
};
}

export function calculateExecutiveReadiness(
enterpriseScore: number,
predictionAccuracy: number,
dataQualityScore: number,
) {
return Math.min(
100,
Math.round(
enterpriseScore * 0.4 +
predictionAccuracy * 0.3 +
dataQualityScore * 0.3,
),
);
}

export function calculateDigitalMaturity(
procurementMaturityScore: number,
dataQualityScore: number,
supplierEngagementScore: number,
constructionClassificationScore: number,
) {
return Math.min(
100,
Math.round(
procurementMaturityScore * 0.45 +
dataQualityScore * 0.25 +
supplierEngagementScore * 0.2 +
constructionClassificationScore * 0.1,
),
);
}

export function calculateBoardHealth(
procurementEfficiencyScore: number,
executiveReadinessScore: number,
digitalMaturityScore: number,
procurementHealthScore: number,
) {
return Math.min(
100,
Math.round(
procurementEfficiencyScore * 0.25 +
executiveReadinessScore * 0.25 +
digitalMaturityScore * 0.25 +
procurementHealthScore * 0.25,
),
);
}

// -------------------------------------------------
// RFQ Decision Intelligence Engine
// -------------------------------------------------

export function calculateAwardConfidence({
priceScore,
timelineScore,
performanceScore,
riskScore,
validityScore = 80,
}: AwardConfidenceInput): ExecutiveIntelligenceResult {
const score =
priceScore * 0.34 +
timelineScore * 0.22 +
performanceScore * 0.18 +
riskScore * 0.18 +
validityScore * 0.08;

return result(
score,
score >= 85 ? "Award Ready" : score >= 70 ? "Executive Review" : "Needs Validation",
score >= 85
? "Proceed to executive validation if scope, compliance, and governance are aligned."
: score >= 70
? "Review supplier risk, scope assumptions, and commercial fit before award."
: "Do not proceed to award until confidence drivers improve.",
);
}

export function calculateDecisionReadiness({
healthScore,
quoteCount,
documentCount,
addendaCount,
commercialEvaluationUnlocked,
hasRecommendedQuote,
}: DecisionReadinessInput): ExecutiveIntelligenceResult {
const score = clampScore(
healthScore * 0.34 +
Math.min(100, quoteCount * 28) * 0.22 +
Math.min(100, documentCount * 24) * 0.18 +
Math.min(100, 55 + addendaCount * 12) * 0.1 +
(commercialEvaluationUnlocked ? 100 : 45) * 0.08 +
(hasRecommendedQuote ? 100 : 35) * 0.08,
);

return result(
score,
score >= 85 ? "Decision Ready" : score >= 70 ? "Review Ready" : "Not Ready",
score >= 85
? "RFQ is ready for executive award validation."
: score >= 70
? "RFQ can move to executive review with targeted validation."
: "Strengthen documents, supplier coverage, and commercial intelligence before decision.",
);
}

export function calculateCommercialHealth({
recommendedAmount,
averageBid,
budget,
quoteCount,
}: CommercialHealthInput): ExecutiveIntelligenceResult {
const savingsScore =
averageBid > 0 && recommendedAmount > 0
? Math.min(100, Math.max(35, ((averageBid - recommendedAmount) / averageBid) * 250 + 65))
: 45;

const budgetScore =
budget > 0 && recommendedAmount > 0
? recommendedAmount <= budget
? 90
: 55
: 60;

const competitionScore = Math.min(100, quoteCount * 30 + (quoteCount >= 3 ? 10 : 0));
const score = savingsScore * 0.42 + budgetScore * 0.28 + competitionScore * 0.3;

return result(
score,
score >= 85 ? "Commercially Strong" : score >= 70 ? "Commercially Healthy" : "Commercial Watch",
score >= 85
? "Commercial position supports confident award review."
: score >= 70
? "Commercial position is acceptable but should be validated."
: "Commercial position requires review before award.",
);
}

export function calculateNegotiationStrength({
recommendedAmount,
averageBid,
quoteCount,
riskLevel,
}: NegotiationStrengthInput): ExecutiveIntelligenceResult {
const spread =
averageBid > 0 && recommendedAmount > 0
? Math.max(0, ((averageBid - recommendedAmount) / averageBid) * 100)
: 0;

const competitionBoost = quoteCount >= 3 ? 22 : quoteCount >= 2 ? 12 : 4;
const riskBoost = riskLevel.toLowerCase() === "low" ? 14 : 4;
const score = Math.min(100, spread * 4 + competitionBoost + riskBoost + 38);

return result(
score,
score >= 85 ? "High Leverage" : score >= 70 ? "Moderate Leverage" : "Limited Leverage",
score >= 85
? "Use competitive tension to request best-and-final pricing."
: score >= 70
? "Negotiate targeted improvement without weakening scope or schedule."
: "Use light negotiation focused on terms and execution readiness.",
);
}

export function calculateSupplierReliability({
timelineScore,
performanceScore,
riskScore,
awardConfidence,
}: SupplierReliabilityInput): ExecutiveIntelligenceResult {
const score =
timelineScore * 0.28 +
performanceScore * 0.28 +
riskScore * 0.24 +
awardConfidence * 0.2;

return result(
score,
score >= 85 ? "Highly Reliable" : score >= 70 ? "Reliable" : "Reliability Watch",
score >= 85
? "Supplier profile supports executive award validation."
: score >= 70
? "Supplier appears reliable but should be validated before award."
: "Supplier reliability requires deeper review before award.",
);
}

export function calculateScenarioRecommendation({
awardConfidence,
healthScore,
quoteCount,
riskLevel,
commercialEvaluationUnlocked,
}: ScenarioRecommendationInput): ExecutiveIntelligenceResult {
const lowRisk = riskLevel.toLowerCase() === "low";

if (!commercialEvaluationUnlocked) {
return result(
45,
"Commercial Locked",
"Maintain blind bidding controls until commercial opening.",
);
}

const score = clampScore(
awardConfidence * 0.42 +
healthScore * 0.28 +
Math.min(100, quoteCount * 30) * 0.18 +
(lowRisk ? 100 : 58) * 0.12,
);

return result(
score,
score >= 85 ? "Award Now" : score >= 70 ? "Negotiate First" : "Extend or Rebid",
score >= 85
? "Preferred path is executive validation and award preparation."
: score >= 70
? "Preferred path is targeted negotiation before final award."
: "Preferred path is to improve competition, documentation, or risk position before award.",
);
}

export function calculateExecutiveSummary({
decisionReadiness,
awardConfidence,
commercialHealth,
supplierReliability,
}: {
decisionReadiness: ExecutiveIntelligenceResult;
awardConfidence: ExecutiveIntelligenceResult;
commercialHealth: ExecutiveIntelligenceResult;
supplierReliability: ExecutiveIntelligenceResult;
}) {
const averageScore = clampScore(
(
decisionReadiness.score +
awardConfidence.score +
commercialHealth.score +
supplierReliability.score
) / 4,
);

return result(
averageScore,
averageScore >= 85 ? "Executive Ready" : averageScore >= 70 ? "Review Ready" : "Needs Work",
averageScore >= 85
? "RFQ is ready for executive award validation."
: averageScore >= 70
? "RFQ is ready for structured review with targeted validation."
: "RFQ requires stronger evidence before executive decision.",
);
}

// -------------------------------------------------
// Status Helpers
// -------------------------------------------------

export function executiveStatus(score: number) {
if (score >= 85) return "Excellent";
if (score >= 70) return "Healthy";
if (score >= 55) return "Developing";

return "Needs Attention";
}

export function commandStatus(score: number) {
if (score >= 85) return "World Class";
if (score >= 70) return "High Performance";
if (score >= 55) return "Developing";

return "Needs Improvement";
}

export function boardStatus(score: number) {
if (score >= 85) return "Board Ready";
if (score >= 70) return "Executive Review";

return "Needs Attention";
}