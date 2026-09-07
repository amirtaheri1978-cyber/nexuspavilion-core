import {
  resolveAnalyticsHealthBand,
} from "@/lib/analytics/analytics-score-bands";
import { createExecutiveSignal } from "@/lib/analytics/executive/executive-signal";

export function createDecisionSupportReadinessSignal(
  readinessScore: number,
) {
  return createExecutiveSignal({
    id: "decision-support-readiness",
    category: "confidence",
    label: "Decision-support readiness",
    value: `${readinessScore}/100`,
    status:
      readinessScore >= 80
        ? "strong"
        : readinessScore >= 60
          ? "moderate"
          : "limited",
    importance: 100,
    description:
      "Readiness derived from current portfolio, competition, risk, and decision-support inputs.",
  });
}

export function createProcurementRiskSignal(
  riskIndex: number,
  importance = 95,
) {
  return createExecutiveSignal({
    id: "procurement-risk-index",
    category: "risk",
    label: "Procurement risk index",
    value: `${riskIndex}/100`,
    status:
      riskIndex >= 70
        ? "critical"
        : riskIndex >= 40
          ? "moderate"
          : "healthy",
    importance,
    description:
      "Lower values indicate a more controlled procurement risk position.",
  });
}

export function createAverageQuotesSignal(
  averageQuotes: number,
  importance = 85,
) {
  return createExecutiveSignal({
    id: "average-quotes-per-rfq",
    category: "competition",
    label: "Average quotes per RFQ",
    value: String(averageQuotes),
    status:
      averageQuotes >= 4
        ? "strong"
        : averageQuotes >= 2
          ? "healthy"
          : averageQuotes >= 1
            ? "moderate"
            : "limited",
    importance,
    description:
      "Average competitive quotation coverage across the current RFQ portfolio.",
  });
}

export function createSupplierCoverageSignal(
  supplierCount: number,
  importance = 90,
) {
  return createExecutiveSignal({
    id: "supplier-coverage",
    category: "supplier",
    label: "Supplier coverage",
    value: String(supplierCount),
    status:
      supplierCount >= 8
        ? "strong"
        : supplierCount >= 5
          ? "healthy"
          : supplierCount >= 3
            ? "moderate"
            : "limited",
    importance,
    description:
      "Number of suppliers represented in the current procurement intelligence dataset.",
  });
}

export function createClassificationMaturitySignal(
  classificationScore: number,
  importance = 85,
) {
  const band = resolveAnalyticsHealthBand(
    classificationScore,
  );

  return createExecutiveSignal({
    id: "rfq-classification-maturity",
    category: "classification",
    label: "RFQ classification maturity",
    value: `${classificationScore}/100`,
    status:
      band === "strong"
        ? "strong"
        : band === "healthy"
          ? "healthy"
          : band === "developing"
            ? "moderate"
            : "limited",
    importance,
    description:
      "Coverage of procurement scope, sourcing method, and contract framework classifications.",
  });
}

export function createSavingsOpportunitySignal(
  estimatedSavings: number,
  importance = 100,
) {
  return createExecutiveSignal({
    id: "estimated-savings-opportunity",
    category: "commercial",
    label: "Observed quotation opportunity",
    value: `$${estimatedSavings.toLocaleString()}`,
    status:
      estimatedSavings >= 50_000
        ? "strong"
        : estimatedSavings >= 10_000
          ? "healthy"
          : estimatedSavings > 0
            ? "moderate"
            : "limited",
    importance,
    description:
      "Estimated sum of within-RFQ differences between average and lowest positive visible quotations. Not realized savings.",
  });
}