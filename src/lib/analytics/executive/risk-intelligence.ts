import type { ExecutiveInsight } from "@/lib/analytics/executive/executive-insight";
import type { ExecutiveInsightBundle } from "@/lib/analytics/executive/executive-insight-bundle";

import {
  createAverageQuotesSignal,
  createClassificationMaturitySignal,
  createProcurementRiskSignal,
  createSupplierCoverageSignal,
} from "@/lib/analytics/executive/executive-signal-factory";

import { buildExecutiveInsight } from "@/lib/analytics/executive/executive-insight-engine";

export type RiskIntelligenceInput = {
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

  return Math.max(0, Math.min(100, Math.round(value)));
}

function normalizeNonNegative(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.max(0, value);
}

export function buildTopRiskInsight({
  topRisk,
  procurementRiskIndex,
  supplierCount,
  avgQuotesPerRfq,
  classificationScore,
}: RiskIntelligenceInput): ExecutiveInsightBundle {
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