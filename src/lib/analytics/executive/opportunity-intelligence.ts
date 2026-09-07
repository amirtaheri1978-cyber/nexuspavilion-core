import type { CommercialEvidenceState } from "@/lib/analytics/commercial/commercial-insights";
import type { ExecutiveInsightBundle } from "@/lib/analytics/executive/executive-insight-bundle";

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
  commercialEvidenceState?: CommercialEvidenceState;
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
  commercialEvidenceState,
}: {
  potentialSavings: number;
  avgQuotesPerRfq: number;
  supplierCount: number;
  commercialEvidenceState: CommercialEvidenceState;
}): number {
  let score = commercialEvidenceState === "available" ? 40 : 30;

  if (
    commercialEvidenceState === "available" &&
    potentialSavings > 0
  ) {
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

  return Math.min(
    commercialEvidenceState === "available" ? 100 : 65,
    score,
  );
}

export function buildTopOpportunityInsight({
  topCategory,
  potentialSavings,
  avgQuotesPerRfq,
  supplierCount,
  commercialEvidenceState = "available",
}: OpportunityIntelligenceInput): ExecutiveInsightBundle {
  const normalizedSavings = normalizeAmount(potentialSavings);

  const normalizedAverageQuotes =
    normalizeNonNegative(avgQuotesPerRfq);

  const normalizedSupplierCount = Math.floor(
    normalizeNonNegative(supplierCount),
  );

  const hasSavingsOpportunity = normalizedSavings > 0;
  const hasHealthyCompetition = normalizedAverageQuotes >= 2;

  const category =
    topCategory && topCategory !== "N/A"
      ? topCategory
      : "Current portfolio";

  const summary =
    commercialEvidenceState === "access-restricted"
      ? "Commercial opportunity evidence is access restricted for the current workspace membership."
      : commercialEvidenceState === "policy-locked"
        ? "Commercial pricing evidence remains policy locked under the current RFQ controls."
        : commercialEvidenceState === "insufficient-data"
          ? `${category} does not yet have enough comparable within-RFQ quotation evidence for a commercial opportunity estimate.`
          : hasSavingsOpportunity
            ? `${category} contains an estimated ${normalizedSavings.toLocaleString()} dollars in within-RFQ quotation opportunity.`
            : `${category} has comparable quotation evidence but no positive estimated within-RFQ opportunity.`;

  const reason =
    commercialEvidenceState === "access-restricted"
      ? "The current membership is not authorized for issuer commercial analytics. Commercial values must remain unavailable."
      : commercialEvidenceState === "policy-locked"
        ? "Applicable RFQ sourcing or deadline controls have not yet unlocked commercial pricing evidence."
        : commercialEvidenceState === "insufficient-data"
          ? "At least two positive visible quotations within the same unlocked RFQ are required for a comparable commercial estimate."
          : hasSavingsOpportunity
            ? hasHealthyCompetition
              ? "Visible within-RFQ quotation evidence shows measurable bid dispersion with sufficient supplier participation to support commercial review."
              : "Visible within-RFQ quotation evidence shows measurable bid dispersion, but competitive coverage remains limited."
            : "Comparable visible quotations currently show no positive difference between average and lowest pricing within the same RFQ.";

  const recommendation =
    commercialEvidenceState === "access-restricted"
      ? "Use an authorized commercial review context before requesting or interpreting issuer-side pricing intelligence."
      : commercialEvidenceState === "policy-locked"
        ? "Wait for the applicable RFQ commercial unlock before interpreting supplier pricing."
        : commercialEvidenceState === "insufficient-data"
          ? "Increase comparable quotation coverage within individual RFQs before relying on commercial opportunity signals."
          : hasSavingsOpportunity
            ? hasHealthyCompetition
              ? "Validate scope alignment and supplier suitability, then use the observed competitive tension in commercial negotiations."
              : "Increase qualified supplier participation before relying on the current quotation opportunity for award or negotiation decisions."
            : "Maintain competitive quotation coverage and continue monitoring within-RFQ price dispersion.";

  const severity =
    commercialEvidenceState === "available"
      ? hasSavingsOpportunity
        ? "high"
        : normalizedAverageQuotes < 2
          ? "medium"
          : "low"
      : commercialEvidenceState === "insufficient-data"
        ? "low"
        : "medium";

  const signals = [
    ...(commercialEvidenceState === "available"
      ? [
          createSavingsOpportunitySignal(
            normalizedSavings,
            100,
          ),
        ]
      : []),
    createAverageQuotesSignal(
      normalizedAverageQuotes,
      85,
    ),
    createSupplierCoverageSignal(
      normalizedSupplierCount,
      75,
    ),
  ];

  const insight = buildExecutiveInsight({
    category: "opportunity",
    title: "Top Commercial Opportunity",
    summary,
    subject: "Top commercial opportunity",
    severity,
    confidence: getConfidence({
      potentialSavings: normalizedSavings,
      avgQuotesPerRfq: normalizedAverageQuotes,
      supplierCount: normalizedSupplierCount,
      commercialEvidenceState,
    }),
    signals,
    fallbackReason: reason,
    recommendation,
  });

  return {
    insight,
    signals,
  };
}
