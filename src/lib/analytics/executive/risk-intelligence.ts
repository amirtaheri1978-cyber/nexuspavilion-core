import type { ExecutiveInsight } from "@/lib/analytics/executive/executive-insight";
import type { ExecutiveInsightBundle } from "@/lib/analytics/executive/executive-insight-bundle";
import {
  COMPANY_COMPLIANCE_SELF_DECLARED_NOTICE,
  COMPANY_COMPLIANCE_TYPES,
  deriveCompliancePresentation,
  type GroupedCompanyCompliance,
} from "@/lib/company/compliance";
import {
  getClassificationCoverage,
  type AnalyticsRFQ,
} from "@/lib/analytics/procurement-utils";
import type { AnalyticsQuote } from "@/lib/analytics/source-data/load-analytics-source-data";

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

export type RiskComplianceEvidenceState =
  | "available"
  | "limited"
  | "insufficient-data"
  | "access-restricted";

export type RiskComplianceEvidence = {
  state: Exclude<RiskComplianceEvidenceState, "access-restricted">;
  stateLabel: "Available" | "Limited Evidence" | "Insufficient Data";
  narrative: string;
  indicators: string[];
  limitations: string[];
  compliance: {
    evidenceState: "available" | "insufficient-data";
    evidenceLabel: "Self-Declared" | "Insufficient Data";
    recordCount: number;
    currentCount: number;
    expiringSoonCount: number;
    expiredCount: number;
    notYetEffectiveCount: number;
    noExpiryCount: number;
    notice: string;
    summary: string;
  };
  rfq: {
    evidenceState: "available" | "insufficient-data";
    evidenceLabel: "Available" | "Insufficient Data";
    totalRfqs: number;
    activeRfqs: number;
    fullyClassifiedRfqs: number;
    incompleteClassificationRfqs: number;
    overdueOpenRfqs: number;
    summary: string;
  };
  supplier: {
    evidenceState: RiskComplianceEvidenceState;
    evidenceLabel:
      | "Available"
      | "Limited Evidence"
      | "Insufficient Data"
      | "Access Restricted";
    distinctSuppliers: number;
    rfqsWithQuoteEvidence: number;
    activeRfqsWithoutQuoteEvidence: number;
    summary: string;
  };
};

export type RiskComplianceEvidenceInput = {
  rfqs: AnalyticsRFQ[];
  quotes: AnalyticsQuote[];
  compliance: GroupedCompanyCompliance;
  canViewQuoteHistory: boolean;
  asOf?: Date;
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

function isActiveRfqStatus(status: string | null | undefined): boolean {
  const normalized = String(status || "open").toLowerCase();
  return normalized === "open" || normalized === "published";
}

function isPastDeadline(
  deadline: string | null | undefined,
  asOf: Date,
): boolean {
  if (!deadline) {
    return false;
  }

  const parsed = new Date(deadline);

  if (Number.isNaN(parsed.getTime())) {
    return false;
  }

  return parsed.getTime() < asOf.getTime();
}

function evidenceStateLabel(
  state: RiskComplianceEvidenceState,
): RiskComplianceEvidence["supplier"]["evidenceLabel"] {
  if (state === "available") return "Available";
  if (state === "limited") return "Limited Evidence";
  if (state === "access-restricted") return "Access Restricted";
  return "Insufficient Data";
}

export function buildRiskComplianceEvidence({
  rfqs,
  quotes,
  compliance,
  canViewQuoteHistory,
  asOf = new Date(),
}: RiskComplianceEvidenceInput): RiskComplianceEvidence {
  const complianceItems = COMPANY_COMPLIANCE_TYPES.flatMap(
    (complianceType) => compliance[complianceType],
  );

  const compliancePresentations = complianceItems.map((item) =>
    deriveCompliancePresentation(item.effective_on, item.expires_on, asOf),
  );

  const complianceRecordCount = complianceItems.length;
  const expiredCount = compliancePresentations.filter(
    (status) => status === "Expired",
  ).length;
  const expiringSoonCount = compliancePresentations.filter(
    (status) => status === "Expiring soon",
  ).length;
  const notYetEffectiveCount = compliancePresentations.filter(
    (status) => status === "Not yet effective",
  ).length;
  const currentCount = compliancePresentations.filter(
    (status) => status === "Current",
  ).length;
  const noExpiryCount = compliancePresentations.filter(
    (status) => status === "No expiry recorded",
  ).length;

  const classificationCoverage = getClassificationCoverage(rfqs);
  const activeRfqs = rfqs.filter((rfq) => isActiveRfqStatus(rfq.status));
  const overdueOpenRfqs = activeRfqs.filter((rfq) =>
    isPastDeadline(rfq.deadline, asOf),
  ).length;
  const incompleteClassificationRfqs =
    classificationCoverage.totalRfqs - classificationCoverage.fullyClassifiedRfqs;

  const quoteRfqIds = new Set(
    quotes
      .map((quote) => quote.rfq_id)
      .filter((rfqId): rfqId is string => Boolean(rfqId?.trim())),
  );
  const distinctSupplierIds = new Set(
    quotes
      .map((quote) => quote.company_id?.trim() || "")
      .filter(Boolean),
  );
  const activeRfqsWithoutQuoteEvidence = canViewQuoteHistory
    ? activeRfqs.filter((rfq) => !quoteRfqIds.has(rfq.id)).length
    : 0;

  const supplierEvidenceState: RiskComplianceEvidenceState =
    !canViewQuoteHistory
      ? "access-restricted"
      : activeRfqs.length === 0
        ? "insufficient-data"
        : quoteRfqIds.size === 0 || activeRfqsWithoutQuoteEvidence > 0
          ? "limited"
          : "available";

  const indicators: string[] = [];
  const limitations: string[] = [];

  if (expiredCount > 0) {
    indicators.push(
      `${expiredCount} self-declared compliance ${expiredCount === 1 ? "record is" : "records are"} past the recorded expiry date.`,
    );
  }

  if (expiringSoonCount > 0) {
    indicators.push(
      `${expiringSoonCount} self-declared compliance ${expiringSoonCount === 1 ? "record is" : "records are"} within the 30-day expiring-soon window.`,
    );
  }

  if (overdueOpenRfqs > 0) {
    indicators.push(
      `${overdueOpenRfqs} active RFQ ${overdueOpenRfqs === 1 ? "has" : "have"} a recorded deadline earlier than the current review date.`,
    );
  }

  if (incompleteClassificationRfqs > 0) {
    indicators.push(
      `${incompleteClassificationRfqs} RFQ ${incompleteClassificationRfqs === 1 ? "is" : "are"} missing one or more procurement classification fields.`,
    );
  }

  if (canViewQuoteHistory && activeRfqsWithoutQuoteEvidence > 0) {
    indicators.push(
      `${activeRfqsWithoutQuoteEvidence} active RFQ ${activeRfqsWithoutQuoteEvidence === 1 ? "has" : "have"} no submitted quotation evidence in the authorized analytics dataset.`,
    );
  }

  if (complianceRecordCount === 0) {
    limitations.push(
      "No self-declared company compliance records are available in the current workspace evidence.",
    );
  } else {
    limitations.push(COMPANY_COMPLIANCE_SELF_DECLARED_NOTICE);
  }

  if (noExpiryCount > 0) {
    limitations.push(
      `${noExpiryCount} self-declared compliance ${noExpiryCount === 1 ? "record has" : "records have"} no recorded expiry date.`,
    );
  }

  if (!canViewQuoteHistory) {
    limitations.push(
      "Quotation-derived supplier participation and RFQ response evidence is access restricted for the current workspace membership.",
    );
  }

  if (rfqs.length === 0) {
    limitations.push(
      "No company-scoped RFQ records are available for risk-pattern interpretation.",
    );
  }

  const overallState: RiskComplianceEvidence["state"] =
    rfqs.length === 0 && complianceRecordCount === 0
      ? "insufficient-data"
      : complianceRecordCount === 0 ||
          supplierEvidenceState === "access-restricted" ||
          supplierEvidenceState === "limited" ||
          supplierEvidenceState === "insufficient-data"
        ? "limited"
        : "available";

  const stateLabel: RiskComplianceEvidence["stateLabel"] =
    overallState === "available"
      ? "Available"
      : overallState === "limited"
        ? "Limited Evidence"
        : "Insufficient Data";

  const narrative =
    overallState === "insufficient-data"
      ? "Risk and compliance interpretation is unavailable because the current company workspace has neither self-declared compliance records nor company-scoped RFQ evidence."
      : indicators.length > 0
        ? `Current company-scoped evidence contains ${indicators.length} explainable review ${indicators.length === 1 ? "indicator" : "indicators"}. These observations describe recorded conditions only and are not a universal risk rating, probability, regulatory determination, or third-party compliance verification.`
        : "Current company-scoped evidence contains no observed expiry, overdue-RFQ, classification-gap, or authorized quote-coverage indicators. This is not a universal low-risk rating or third-party compliance verification.";

  const complianceSummary =
    complianceRecordCount === 0
      ? "No self-declared insurance, workers' compensation, or safety records are available in the current workspace evidence."
      : `${complianceRecordCount} self-declared compliance ${complianceRecordCount === 1 ? "record is" : "records are"} available: ${currentCount} current, ${expiringSoonCount} expiring soon, ${expiredCount} expired, ${notYetEffectiveCount} not yet effective, and ${noExpiryCount} with no recorded expiry.`;

  const rfqSummary =
    rfqs.length === 0
      ? "No company-scoped RFQ records are available for risk-pattern interpretation."
      : `${rfqs.length} company-scoped RFQs are available; ${incompleteClassificationRfqs} have incomplete classification evidence and ${overdueOpenRfqs} active RFQs have a recorded deadline earlier than the review date.`;

  const supplierSummary =
    supplierEvidenceState === "access-restricted"
      ? "Supplier participation evidence cannot be interpreted because quotation history is access restricted for the current membership."
      : activeRfqs.length === 0
        ? "No active RFQs are available for supplier-response interpretation."
        : `${distinctSupplierIds.size} distinct supplier organizations appear in authorized quotation history; ${quoteRfqIds.size} RFQs have submitted quotation evidence and ${activeRfqsWithoutQuoteEvidence} active RFQs do not.`;

  return {
    state: overallState,
    stateLabel,
    narrative,
    indicators,
    limitations,
    compliance: {
      evidenceState:
        complianceRecordCount > 0 ? "available" : "insufficient-data",
      evidenceLabel:
        complianceRecordCount > 0 ? "Self-Declared" : "Insufficient Data",
      recordCount: complianceRecordCount,
      currentCount,
      expiringSoonCount,
      expiredCount,
      notYetEffectiveCount,
      noExpiryCount,
      notice: COMPANY_COMPLIANCE_SELF_DECLARED_NOTICE,
      summary: complianceSummary,
    },
    rfq: {
      evidenceState: rfqs.length > 0 ? "available" : "insufficient-data",
      evidenceLabel: rfqs.length > 0 ? "Available" : "Insufficient Data",
      totalRfqs: rfqs.length,
      activeRfqs: activeRfqs.length,
      fullyClassifiedRfqs: classificationCoverage.fullyClassifiedRfqs,
      incompleteClassificationRfqs,
      overdueOpenRfqs,
      summary: rfqSummary,
    },
    supplier: {
      evidenceState: supplierEvidenceState,
      evidenceLabel: evidenceStateLabel(supplierEvidenceState),
      distinctSuppliers: distinctSupplierIds.size,
      rfqsWithQuoteEvidence: quoteRfqIds.size,
      activeRfqsWithoutQuoteEvidence,
      summary: supplierSummary,
    },
  };
}

export function buildTopRiskInsight({
  topRisk,
  procurementRiskIndex,
  supplierCount,
  avgQuotesPerRfq,
  classificationScore,
}: RiskIntelligenceInput): ExecutiveInsightBundle {
  const riskIndex = normalizeScore(procurementRiskIndex);

  const normalizedSupplierCount = Math.floor(
    normalizeNonNegative(supplierCount),
  );

  const averageQuotes = normalizeNonNegative(avgQuotesPerRfq);

  const normalizedClassificationScore = normalizeScore(classificationScore);

  const severity: ExecutiveInsight["severity"] =
    riskIndex >= 70 ? "high" : riskIndex >= 40 ? "medium" : "low";

  const recommendation =
    normalizedSupplierCount <= 3
      ? "Expand qualified supplier coverage to reduce dependency and improve competitive resilience."
      : averageQuotes < 2
        ? "Increase competitive participation before relying on current commercial signals."
        : normalizedClassificationScore < 60
          ? "Complete missing RFQ classifications before relying on category-level executive interpretation."
          : "Maintain monitoring and validate the underlying evidence before escalation.";

  const signals = [
    createProcurementRiskSignal(riskIndex, 100),
    createSupplierCoverageSignal(normalizedSupplierCount, 90),
    createAverageQuotesSignal(averageQuotes, 80),
    createClassificationMaturitySignal(normalizedClassificationScore, 85),
  ];

  const fallbackReason =
    riskIndex >= 60
      ? "The internal procurement risk signal is elevated and should be reviewed alongside the underlying supplier, competition, classification, and compliance evidence."
      : "The internal procurement risk signal is not elevated, but the underlying supplier, competition, classification, and compliance evidence should continue to be reviewed.";

  const confidence = Math.min(
    100,
    Math.round(
      40 +
        Math.min(normalizedSupplierCount * 5, 20) +
        Math.min(averageQuotes * 10, 20) +
        normalizedClassificationScore * 0.2,
    ),
  );

  const insight = buildExecutiveInsight({
    category: "risk",
    title: "Portfolio Risk Review",
    summary:
      topRisk ||
      "No material portfolio risk indicator has been identified from the current recorded evidence.",
    subject: "Portfolio risk review",
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
