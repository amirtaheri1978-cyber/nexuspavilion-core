export type ExecutiveScore = {
score: number;
status: string;
};

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