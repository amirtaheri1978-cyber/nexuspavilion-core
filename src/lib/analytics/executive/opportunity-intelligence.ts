import type { ExecutiveInsight } from "@/lib/analytics/executive/executive-insight";

import {
  createAverageQuotesSignal,
  createSavingsOpportunitySignal,
  createSupplierCoverageSignal,
} from "@/lib/analytics/executive/executive-signal-factory";


import { buildExecutiveInsight } from "@/lib/analytics/executive/executive-insight-engine";

export type OpportunityIntelligenceInput = {
  topCategory: string;
  potentialSavings: number;
  avgQuotesPerRfq: number;
  supplierCount: number;
};

function normalizeAmount(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.max(0, value);
}

function normalizeNonNegative(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.max(0, value);
}

function getConfidence({
  potentialSavings,
  avgQuotesPerRfq,
  supplierCount,
}: {
  potentialSavings: number;
  avgQuotesPerRfq: number;
  supplierCount: number;
}): number {
  let score = 40;

  if (potentialSavings > 0) {
    score += 20;
  }

  if (avgQuotesPerRfq >= 2) {
    score += 20;
  } else if (avgQuotesPerRfq >= 1) {
    score += 10;
  }

  if (supplierCount >= 5) {
    score += 20;
  } else if (supplierCount >= 2) {
    score += 10;
  }

  return Math.min(100, score);
}

export function buildTopOpportunityInsight({
  topCategory,
  potentialSavings,
  avgQuotesPerRfq,
  supplierCount,
}: OpportunityIntelligenceInput): ExecutiveInsight {
  const normalizedSavings = normalizeAmount(potentialSavings);
  const normalizedAverageQuotes = normalizeNonNegative(avgQuotesPerRfq);
  const normalizedSupplierCount = Math.floor(
    normalizeNonNegative(supplierCount),
  );

  const hasSavingsOpportunity = normalizedSavings > 0;
  const hasHealthyCompetition = normalizedAverageQuotes >= 2;
  const category =
    topCategory && topCategory !== "N/A"
      ? topCategory
      : "Current portfolio";

  const summary = hasSavingsOpportunity
    ? `${category} contains an estimated ${normalizedSavings.toLocaleString()} dollars in commercial opportunity.`
    : `${category} currently shows limited measurable savings opportunity.`;

  const reason = hasSavingsOpportunity
    ? hasHealthyCompetition
      ? "Recorded quotation data shows measurable bid dispersion with sufficient supplier participation to support commercial review."
      : "Recorded quotation data shows measurable bid dispersion, but competitive coverage remains limited."
    : "Current quotation history does not yet show a material difference between average and lowest recorded pricing.";

  const recommendation = hasSavingsOpportunity
    ? hasHealthyCompetition
      ? "Validate scope alignment and supplier suitability, then use the available competitive tension in commercial negotiations."
      : "Increase qualified supplier participation before relying on the current savings estimate for award or negotiation decisions."
    : "Expand competitive participation and quotation coverage before expecting a reliable savings signal.";

  const severity = hasSavingsOpportunity
    ? "high"
    : normalizedAverageQuotes < 2
      ? "medium"
      : "low";



 

 const signals = [
  createSavingsOpportunitySignal(
    normalizedSavings,
    100,
  ),

  createAverageQuotesSignal(
    normalizedAverageQuotes,
    85,
  ),

  createSupplierCoverageSignal(
    normalizedSupplierCount,
    75,
  ),
];


return buildExecutiveInsight({
  category: "opportunity",
  title: "Top Commercial Opportunity",
  summary,
  subject: "Top commercial opportunity",
  severity,
  confidence: getConfidence({
    potentialSavings: normalizedSavings,
    avgQuotesPerRfq: normalizedAverageQuotes,
    supplierCount: normalizedSupplierCount,
  }),
  signals,
  fallbackReason: reason,
  fallbackRecommendation: recommendation,
});
}