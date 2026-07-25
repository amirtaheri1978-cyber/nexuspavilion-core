import type { ExecutiveInsight } from "@/lib/analytics/executive/executive-insight";
import type { ExecutiveInsightBundle } from "@/lib/analytics/executive/executive-insight-bundle";

import {
  createAverageQuotesSignal,
  createDecisionSupportReadinessSignal,
  createProcurementRiskSignal,
} from "@/lib/analytics/executive/executive-signal-factory";

import { buildExecutiveInsight } from "@/lib/analytics/executive/executive-insight-engine";

export type ActionIntelligenceInput = {
  executiveRecommendation: string;
  decisionSupportReadinessScore: number;
  procurementRiskIndex: number;
  avgQuotesPerRfq: number;
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

export function buildTopActionInsight({
  executiveRecommendation,
  decisionSupportReadinessScore,
  procurementRiskIndex,
  avgQuotesPerRfq,
}: ActionIntelligenceInput): ExecutiveInsightBundle {
  const confidence = normalizeScore(
    decisionSupportReadinessScore,
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
    createDecisionSupportReadinessSignal(
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

  const recommendation =
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
    recommendation,
  });

  return {
    insight,
    signals,
  };
}