import type {
  ExecutiveInsight,
} from "@/lib/analytics/executive/executive-insight";

import type {
  ExecutiveInsightBundle,
} from "@/lib/analytics/executive/executive-insight-bundle";

import {
  createAverageQuotesSignal,
  createClassificationMaturitySignal,
  createDecisionConfidenceSignal,
  createProcurementRiskSignal,
  createSupplierCoverageSignal,
} from "@/lib/analytics/executive/executive-signal-factory";

import {
  buildTopOpportunityInsight,
  type OpportunityIntelligenceInput,
} from "@/lib/analytics/executive/opportunity-intelligence";


import {
  buildExecutiveInsight,
} from "@/lib/analytics/executive/executive-insight-engine";

import {
  buildExecutiveAssessment,
  type ExecutiveAssessment,
} from "@/lib/analytics/executive/executive-assessment";

export type ExecutiveBriefConfidence =
  | "high"
  | "moderate"
  | "limited";

export type ExecutiveBrief = {
  action: ExecutiveInsight;
  opportunity: ExecutiveInsight;
  risk: ExecutiveInsight;
  assessment: ExecutiveAssessment;
  confidence: {
    score: number;
    level: ExecutiveBriefConfidence;
    evidence: string[];
  };
};

export type ExecutiveBriefInput = {
  opportunity: OpportunityIntelligenceInput;

  executiveRecommendation: string;
  decisionConfidenceScore: number;

  topRisk: string;
  procurementRiskIndex: number;

  supplierCount: number;
  avgQuotesPerRfq: number;
  classificationScore: number;
};

function normalizeScore(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.max(
    0,
    Math.min(100, Math.round(value)),
  );
}

function normalizeNonNegative(
  value: number,
): number {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.max(0, value);
}

function getConfidenceLevel(
  score: number,
): ExecutiveBriefConfidence {
  if (score >= 80) {
    return "high";
  }

  if (score >= 60) {
    return "moderate";
  }

  return "limited";
}

function buildActionInsight({
  executiveRecommendation,
  decisionConfidenceScore,
  procurementRiskIndex,
  avgQuotesPerRfq,
}: Pick<
  ExecutiveBriefInput,
  | "executiveRecommendation"
  | "decisionConfidenceScore"
  | "procurementRiskIndex"
  | "avgQuotesPerRfq"
>): ExecutiveInsightBundle {
  const confidence = normalizeScore(
    decisionConfidenceScore,
  );

  const riskIndex = normalizeScore(
    procurementRiskIndex,
  );

  const averageQuotes = normalizeNonNegative(
    avgQuotesPerRfq,
  );

  const severity: ExecutiveInsight["severity"] =
    riskIndex >= 60
      ? "high"
      : averageQuotes < 2
        ? "medium"
        : "low";

  const signals = [
    createDecisionConfidenceSignal(
      confidence,
    ),
    createProcurementRiskSignal(
      riskIndex,
      95,
    ),
    createAverageQuotesSignal(
      averageQuotes,
      85,
    ),
  ];

  const fallbackReason =
    riskIndex >= 60
      ? "Current portfolio signals indicate elevated procurement exposure requiring leadership review."
      : averageQuotes < 2
        ? "Competitive coverage remains limited across the current RFQ portfolio."
        : "Current portfolio signals support structured executive review.";

  const fallbackRecommendation =
    riskIndex >= 60
      ? "Review supplier concentration, competition coverage, and commercial exposure before scaling procurement commitments."
      : averageQuotes < 2
        ? "Increase qualified supplier participation before progressing major award decisions."
        : "Validate the supporting commercial and governance evidence, then proceed through the authorized decision workflow.";

  const insight = buildExecutiveInsight({
    category: "action",
    title: "Immediate Leadership Action",
    summary:
      executiveRecommendation ||
      "Review the current procurement portfolio before authorizing further commercial action.",
    subject: "Immediate leadership action",
    severity,
    confidence,
    signals,
    fallbackReason,
    fallbackRecommendation,
  });

  return {
    insight,
    signals,
  };
}

function buildRiskInsight({
  topRisk,
  procurementRiskIndex,
  supplierCount,
  avgQuotesPerRfq,
  classificationScore,
}: Pick<
  ExecutiveBriefInput,
  | "topRisk"
  | "procurementRiskIndex"
  | "supplierCount"
  | "avgQuotesPerRfq"
  | "classificationScore"
>): ExecutiveInsightBundle {
  const riskIndex = normalizeScore(
    procurementRiskIndex,
  );

  const normalizedSupplierCount = Math.floor(
    normalizeNonNegative(supplierCount),
  );

  const averageQuotes = normalizeNonNegative(
    avgQuotesPerRfq,
  );

  const normalizedClassificationScore =
    normalizeScore(classificationScore);

  const severity: ExecutiveInsight["severity"] =
    riskIndex >= 70
      ? "high"
      : riskIndex >= 40
        ? "medium"
        : "low";

  const fallbackRecommendation =
    normalizedSupplierCount <= 3
      ? "Expand qualified supplier coverage to reduce dependency and improve competitive resilience."
      : averageQuotes < 2
        ? "Increase competitive participation before relying on current commercial signals."
        : normalizedClassificationScore < 60
          ? "Complete missing RFQ classifications before relying on category-level executive interpretation."
          : "Maintain monitoring and validate the underlying evidence before escalation.";

  const signals = [
    createProcurementRiskSignal(
      riskIndex,
      100,
    ),
    createSupplierCoverageSignal(
      normalizedSupplierCount,
      90,
    ),
    createAverageQuotesSignal(
      averageQuotes,
      80,
    ),
    createClassificationMaturitySignal(
      normalizedClassificationScore,
      85,
    ),
  ];

  const fallbackReason =
    riskIndex >= 60
      ? "Current procurement signals indicate elevated exposure requiring management attention."
      : "Current exposure remains manageable, but supplier, competition, and classification signals should continue to be monitored.";

  const confidence = Math.min(
    100,
    Math.round(
      40 +
        Math.min(
          normalizedSupplierCount * 5,
          20,
        ) +
        Math.min(
          averageQuotes * 10,
          20,
        ) +
        normalizedClassificationScore * 0.2,
    ),
  );

  const insight = buildExecutiveInsight({
    category: "risk",
    title: "Top Portfolio Risk",
    summary:
      topRisk ||
      "No material procurement risk has been identified from current portfolio signals.",
    subject: "Top portfolio risk",
    severity,
    confidence,
    signals,
    fallbackReason,
    fallbackRecommendation,
  });

  return {
    insight,
    signals,
  };
}

export function buildExecutiveBrief({
  opportunity,
  executiveRecommendation,
  decisionConfidenceScore,
  topRisk,
  procurementRiskIndex,
  supplierCount,
  avgQuotesPerRfq,
  classificationScore,
}: ExecutiveBriefInput): ExecutiveBrief {
  const normalizedConfidenceScore =
    normalizeScore(decisionConfidenceScore);

  const opportunityBundle =
    buildTopOpportunityInsight(opportunity);

  const actionBundle = buildActionInsight({
    executiveRecommendation,
    decisionConfidenceScore:
      normalizedConfidenceScore,
    procurementRiskIndex,
    avgQuotesPerRfq,
  });

  const riskBundle = buildRiskInsight({
    topRisk,
    procurementRiskIndex,
    supplierCount,
    avgQuotesPerRfq,
    classificationScore,
  });

  const assessment = buildExecutiveAssessment([
  ...actionBundle.signals,
  ...opportunityBundle.signals,
  ...riskBundle.signals,
]);

  const opportunityInsight =
    opportunityBundle.insight;

  const actionInsight =
    actionBundle.insight;

  const riskInsight =
    riskBundle.insight;

  return {
    action: actionInsight,
    opportunity: opportunityInsight,
    risk: riskInsight,
    assessment,
    confidence: {
      score: normalizedConfidenceScore,
      level: getConfidenceLevel(
        normalizedConfidenceScore,
      ),
      evidence: [
        `Opportunity confidence: ${opportunityInsight.confidence}/100`,
        `Risk confidence: ${riskInsight.confidence}/100`,
        `Action confidence: ${actionInsight.confidence}/100`,
      ],
    },
  };
}