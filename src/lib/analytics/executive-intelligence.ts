export type ExecutiveTone =
  | "excellent"
  | "healthy"
  | "developing"
  | "attention";

export type ExecutivePriority =
  | "proceed"
  | "review"
  | "watch"
  | "hold";

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

type WeightedScoreInput = {
  value: number;
  weight: number;
};

const SCORE_THRESHOLDS = {
  excellent: 85,
  healthy: 70,
  developing: 55,
} as const;

const AWARD_CONFIDENCE_WEIGHTS = {
  price: 0.34,
  timeline: 0.22,
  performance: 0.18,
  risk: 0.18,
  validity: 0.08,
} as const;

const EXECUTIVE_SCORE_WEIGHTS = {
  procurementHealth: 0.2,
  predictionAccuracy: 0.2,
  dataQuality: 0.2,
  controlledRisk: 0.2,
  classification: 0.2,
} as const;

const EXECUTIVE_READINESS_WEIGHTS = {
  enterpriseScore: 0.4,
  predictionAccuracy: 0.3,
  dataQuality: 0.3,
} as const;

const DIGITAL_MATURITY_WEIGHTS = {
  procurementMaturity: 0.45,
  dataQuality: 0.25,
  supplierEngagement: 0.2,
  classification: 0.1,
} as const;

const BOARD_HEALTH_WEIGHTS = {
  procurementEfficiency: 0.25,
  executiveReadiness: 0.25,
  digitalMaturity: 0.25,
  procurementHealth: 0.25,
} as const;

function clampScore(score: number): number {
  if (!Number.isFinite(score)) {
    return 0;
  }

  return Math.max(0, Math.min(100, Math.round(score)));
}

function normalizeCount(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.max(0, Math.floor(value));
}

function normalizeAmount(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.max(0, value);
}

function normalizeRiskLevel(value: string): string {
  return String(value || "").trim().toLowerCase();
}

function isLowRisk(value: string): boolean {
  return normalizeRiskLevel(value) === "low";
}

function calculateWeightedScore(
  inputs: WeightedScoreInput[],
): number {
  const totalWeight = inputs.reduce(
    (total, input) => total + Math.max(0, input.weight),
    0,
  );

  if (totalWeight <= 0) {
    return 0;
  }

  const weightedValue = inputs.reduce((total, input) => {
    const normalizedValue = clampScore(input.value);
    const normalizedWeight = Math.max(0, input.weight);

    return total + normalizedValue * normalizedWeight;
  }, 0);

  return clampScore(weightedValue / totalWeight);
}

function calculatePercentageDifference(
  baseline: number,
  comparison: number,
): number {
  const normalizedBaseline = normalizeAmount(baseline);
  const normalizedComparison = normalizeAmount(comparison);

  if (normalizedBaseline <= 0 || normalizedComparison <= 0) {
    return 0;
  }

  return Math.max(
    0,
    ((normalizedBaseline - normalizedComparison) /
      normalizedBaseline) *
      100,
  );
}

function getTone(score: number): ExecutiveTone {
  const normalizedScore = clampScore(score);

  if (normalizedScore >= SCORE_THRESHOLDS.excellent) {
    return "excellent";
  }

  if (normalizedScore >= SCORE_THRESHOLDS.healthy) {
    return "healthy";
  }

  if (normalizedScore >= SCORE_THRESHOLDS.developing) {
    return "developing";
  }

  return "attention";
}

function getPriority(score: number): ExecutivePriority {
  const normalizedScore = clampScore(score);

  if (normalizedScore >= SCORE_THRESHOLDS.excellent) {
    return "proceed";
  }

  if (normalizedScore >= SCORE_THRESHOLDS.healthy) {
    return "review";
  }

  if (normalizedScore >= SCORE_THRESHOLDS.developing) {
    return "watch";
  }

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
// Executive Portfolio KPI Engine
// -------------------------------------------------

/**
 * Produces a derived internal executive score from existing operating
 * indicators. This is not an external industry benchmark or predictive
 * accuracy measure.
 */
export function calculateExecutiveScore(
  procurementHealthScore: number,
  predictionAccuracy: number,
  dataQualityScore: number,
  procurementRiskIndex: number,
  constructionClassificationScore: number,
): ExecutiveScore {
  const controlledRiskScore = 100 - clampScore(procurementRiskIndex);

  const score = calculateWeightedScore([
    {
      value: procurementHealthScore,
      weight: EXECUTIVE_SCORE_WEIGHTS.procurementHealth,
    },
    {
      value: predictionAccuracy,
      weight: EXECUTIVE_SCORE_WEIGHTS.predictionAccuracy,
    },
    {
      value: dataQualityScore,
      weight: EXECUTIVE_SCORE_WEIGHTS.dataQuality,
    },
    {
      value: controlledRiskScore,
      weight: EXECUTIVE_SCORE_WEIGHTS.controlledRisk,
    },
    {
      value: constructionClassificationScore,
      weight: EXECUTIVE_SCORE_WEIGHTS.classification,
    },
  ]);

  return {
    score,
    status: executiveStatus(score),
  };
}

export function calculateExecutiveReadiness(
  enterpriseScore: number,
  predictionAccuracy: number,
  dataQualityScore: number,
): number {
  return calculateWeightedScore([
    {
      value: enterpriseScore,
      weight: EXECUTIVE_READINESS_WEIGHTS.enterpriseScore,
    },
    {
      value: predictionAccuracy,
      weight: EXECUTIVE_READINESS_WEIGHTS.predictionAccuracy,
    },
    {
      value: dataQualityScore,
      weight: EXECUTIVE_READINESS_WEIGHTS.dataQuality,
    },
  ]);
}

export function calculateDigitalMaturity(
  procurementMaturityScore: number,
  dataQualityScore: number,
  supplierEngagementScore: number,
  constructionClassificationScore: number,
): number {
  return calculateWeightedScore([
    {
      value: procurementMaturityScore,
      weight: DIGITAL_MATURITY_WEIGHTS.procurementMaturity,
    },
    {
      value: dataQualityScore,
      weight: DIGITAL_MATURITY_WEIGHTS.dataQuality,
    },
    {
      value: supplierEngagementScore,
      weight: DIGITAL_MATURITY_WEIGHTS.supplierEngagement,
    },
    {
      value: constructionClassificationScore,
      weight: DIGITAL_MATURITY_WEIGHTS.classification,
    },
  ]);
}

export function calculateBoardHealth(
  procurementEfficiencyScore: number,
  executiveReadinessScore: number,
  digitalMaturityScore: number,
  procurementHealthScore: number,
): number {
  return calculateWeightedScore([
    {
      value: procurementEfficiencyScore,
      weight: BOARD_HEALTH_WEIGHTS.procurementEfficiency,
    },
    {
      value: executiveReadinessScore,
      weight: BOARD_HEALTH_WEIGHTS.executiveReadiness,
    },
    {
      value: digitalMaturityScore,
      weight: BOARD_HEALTH_WEIGHTS.digitalMaturity,
    },
    {
      value: procurementHealthScore,
      weight: BOARD_HEALTH_WEIGHTS.procurementHealth,
    },
  ]);
}

// -------------------------------------------------
// RFQ Decision Intelligence Engine
// -------------------------------------------------

/**
 * Calculates a derived award-support score from normalized commercial
 * and execution inputs. The result supports review and does not represent
 * an automated approval or verified probability of award success.
 */
export function calculateAwardConfidence({
  priceScore,
  timelineScore,
  performanceScore,
  riskScore,
  validityScore = 80,
}: AwardConfidenceInput): ExecutiveIntelligenceResult {
  const score = calculateWeightedScore([
    {
      value: priceScore,
      weight: AWARD_CONFIDENCE_WEIGHTS.price,
    },
    {
      value: timelineScore,
      weight: AWARD_CONFIDENCE_WEIGHTS.timeline,
    },
    {
      value: performanceScore,
      weight: AWARD_CONFIDENCE_WEIGHTS.performance,
    },
    {
      value: riskScore,
      weight: AWARD_CONFIDENCE_WEIGHTS.risk,
    },
    {
      value: validityScore,
      weight: AWARD_CONFIDENCE_WEIGHTS.validity,
    },
  ]);

  return result(
    score,
    score >= SCORE_THRESHOLDS.excellent
      ? "Ready for Award Validation"
      : score >= SCORE_THRESHOLDS.healthy
        ? "Executive Review Required"
        : "Additional Validation Required",
    score >= SCORE_THRESHOLDS.excellent
      ? "Proceed to authorized award validation after confirming scope, compliance, commercial terms, and governance controls."
      : score >= SCORE_THRESHOLDS.healthy
        ? "Review supplier risk, scope assumptions, commercial fit, and approval requirements before award."
        : "Do not proceed to award until the supporting commercial and execution evidence is strengthened.",
  );
}



export function calculateCommercialHealth({
  recommendedAmount,
  averageBid,
  budget,
  quoteCount,
}: CommercialHealthInput): ExecutiveIntelligenceResult {
  const normalizedRecommendedAmount =
    normalizeAmount(recommendedAmount);

  const normalizedAverageBid = normalizeAmount(averageBid);
  const normalizedBudget = normalizeAmount(budget);
  const normalizedQuoteCount = normalizeCount(quoteCount);

  const savingsPercentage = calculatePercentageDifference(
    normalizedAverageBid,
    normalizedRecommendedAmount,
  );

  const savingsScore =
    normalizedAverageBid > 0 &&
    normalizedRecommendedAmount > 0
      ? Math.min(
          100,
          Math.max(35, savingsPercentage * 2.5 + 65),
        )
      : 45;

  const budgetScore =
    normalizedBudget > 0 &&
    normalizedRecommendedAmount > 0
      ? normalizedRecommendedAmount <= normalizedBudget
        ? 90
        : 55
      : 60;

  const competitionScore = Math.min(
    100,
    normalizedQuoteCount * 30 +
      (normalizedQuoteCount >= 3 ? 10 : 0),
  );

  const score = calculateWeightedScore([
    {
      value: savingsScore,
      weight: 0.42,
    },
    {
      value: budgetScore,
      weight: 0.28,
    },
    {
      value: competitionScore,
      weight: 0.3,
    },
  ]);

  return result(
    score,
    score >= SCORE_THRESHOLDS.excellent
      ? "Strong Commercial Position"
      : score >= SCORE_THRESHOLDS.healthy
        ? "Commercial Position Established"
        : "Commercial Review Required",
    score >= SCORE_THRESHOLDS.excellent
      ? "The current commercial position supports award review, subject to scope, compliance, and approval validation."
      : score >= SCORE_THRESHOLDS.healthy
        ? "The commercial position is credible but should be validated against scope, budget, and supplier assumptions."
        : "Review pricing evidence, competition coverage, budget alignment, and scope assumptions before award.",
  );
}

export function calculateNegotiationStrength({
  recommendedAmount,
  averageBid,
  quoteCount,
  riskLevel,
}: NegotiationStrengthInput): ExecutiveIntelligenceResult {
  const normalizedRecommendedAmount =
    normalizeAmount(recommendedAmount);

  const normalizedAverageBid = normalizeAmount(averageBid);
  const normalizedQuoteCount = normalizeCount(quoteCount);

  const spread = calculatePercentageDifference(
    normalizedAverageBid,
    normalizedRecommendedAmount,
  );

  const competitionBoost =
    normalizedQuoteCount >= 3
      ? 22
      : normalizedQuoteCount >= 2
        ? 12
        : 4;

  const riskBoost = isLowRisk(riskLevel) ? 14 : 4;

  const score = clampScore(
    spread * 4 + competitionBoost + riskBoost + 38,
  );

  return result(
    score,
    score >= SCORE_THRESHOLDS.excellent
      ? "Strong Negotiation Position"
      : score >= SCORE_THRESHOLDS.healthy
        ? "Targeted Negotiation Available"
        : "Limited Negotiation Leverage",
    score >= SCORE_THRESHOLDS.excellent
      ? "Use verified competitive tension to request best-and-final pricing without weakening scope, quality, or schedule requirements."
      : score >= SCORE_THRESHOLDS.healthy
        ? "Pursue targeted commercial improvement while preserving execution requirements and supplier accountability."
        : "Use a controlled negotiation focused on commercial terms, clarifications, and execution readiness.",
  );
}

export function calculateSupplierReliability({
  timelineScore,
  performanceScore,
  riskScore,
  awardConfidence,
}: SupplierReliabilityInput): ExecutiveIntelligenceResult {
  const score = calculateWeightedScore([
    {
      value: timelineScore,
      weight: 0.28,
    },
    {
      value: performanceScore,
      weight: 0.28,
    },
    {
      value: riskScore,
      weight: 0.24,
    },
    {
      value: awardConfidence,
      weight: 0.2,
    },
  ]);

  /*
   * This result represents the strength of the currently available
   * supplier profile. It must not be interpreted as verified historical
   * delivery reliability unless operational performance data exists.
   */
  return result(
    score,
    score >= SCORE_THRESHOLDS.excellent
      ? "Strong Supplier Profile"
      : score >= SCORE_THRESHOLDS.healthy
        ? "Supplier Profile Established"
        : "Supplier Profile Requires Review",
    score >= SCORE_THRESHOLDS.excellent
      ? "Available commercial and execution signals support supplier validation, subject to compliance and due-diligence review."
      : score >= SCORE_THRESHOLDS.healthy
        ? "The supplier profile is credible but requires confirmation of supporting evidence before award."
        : "Review supplier evidence, execution assumptions, risk controls, and compliance inputs before award.",
  );
}

export function calculateScenarioRecommendation({
  awardConfidence,
  healthScore,
  quoteCount,
  riskLevel,
  commercialEvaluationUnlocked,
}: ScenarioRecommendationInput): ExecutiveIntelligenceResult {
  if (!commercialEvaluationUnlocked) {
    return result(
      45,
      "Commercial Evaluation Locked",
      "Maintain commercial confidentiality and blind-bidding controls until authorized commercial opening.",
    );
  }

  const normalizedQuoteCount = normalizeCount(quoteCount);
  const quoteCoverageScore = Math.min(
    100,
    normalizedQuoteCount * 30,
  );

  const riskPositionScore = isLowRisk(riskLevel) ? 100 : 58;

  const score = calculateWeightedScore([
    {
      value: awardConfidence,
      weight: 0.42,
    },
    {
      value: healthScore,
      weight: 0.28,
    },
    {
      value: quoteCoverageScore,
      weight: 0.18,
    },
    {
      value: riskPositionScore,
      weight: 0.12,
    },
  ]);

  return result(
    score,
    score >= SCORE_THRESHOLDS.excellent
      ? "Proceed to Award Validation"
      : score >= SCORE_THRESHOLDS.healthy
        ? "Negotiate and Validate"
        : "Improve or Reopen Competition",
    score >= SCORE_THRESHOLDS.excellent
      ? "Preferred path is authorized executive validation followed by award preparation."
      : score >= SCORE_THRESHOLDS.healthy
        ? "Preferred path is targeted negotiation and evidence validation before final award."
        : "Improve competition, documentation, commercial evidence, or supplier risk position before award.",
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
}): ExecutiveIntelligenceResult {
  const averageScore = calculateWeightedScore([
    {
      value: decisionReadiness.score,
      weight: 0.25,
    },
    {
      value: awardConfidence.score,
      weight: 0.25,
    },
    {
      value: commercialHealth.score,
      weight: 0.25,
    },
    {
      value: supplierReliability.score,
      weight: 0.25,
    },
  ]);

  return result(
    averageScore,
    averageScore >= SCORE_THRESHOLDS.excellent
      ? "Ready for Executive Validation"
      : averageScore >= SCORE_THRESHOLDS.healthy
        ? "Structured Review Required"
        : "Additional Evidence Required",
    averageScore >= SCORE_THRESHOLDS.excellent
      ? "The RFQ has sufficient decision-support evidence to proceed to authorized executive award validation."
      : averageScore >= SCORE_THRESHOLDS.healthy
        ? "The RFQ is ready for structured review with targeted commercial, supplier, or governance validation."
        : "Strengthen the underlying procurement evidence before requesting an executive award decision.",
  );
}

// -------------------------------------------------
// Status Helpers
// -------------------------------------------------

export function executiveStatus(score: number): string {
  const normalizedScore = clampScore(score);

  if (normalizedScore >= SCORE_THRESHOLDS.excellent) {
    return "Strong";
  }

  if (normalizedScore >= SCORE_THRESHOLDS.healthy) {
    return "Established";
  }

  if (normalizedScore >= SCORE_THRESHOLDS.developing) {
    return "Developing";
  }

  return "Needs Attention";
}

export function commandStatus(score: number): string {
  const normalizedScore = clampScore(score);

  if (normalizedScore >= SCORE_THRESHOLDS.excellent) {
    return "Executive Ready";
  }

  if (normalizedScore >= SCORE_THRESHOLDS.healthy) {
    return "Operationally Established";
  }

  if (normalizedScore >= SCORE_THRESHOLDS.developing) {
    return "Capability Developing";
  }

  return "Immediate Review Required";
}

export function boardStatus(score: number): string {
  const normalizedScore = clampScore(score);

  if (normalizedScore >= SCORE_THRESHOLDS.excellent) {
    return "Ready for Board Review";
  }

  if (normalizedScore >= SCORE_THRESHOLDS.healthy) {
    return "Executive Validation Required";
  }

  return "Additional Evidence Required";
}