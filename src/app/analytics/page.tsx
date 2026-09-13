import Link from "next/link";
import AnalyticsChart from "@/components/analytics-chart";
import ExecutiveExportPanel from "@/components/executive-export-panel";
import { BoardroomSnapshot } from "@/components/analytics/boardroom-snapshot";
import { CEOActionCenter } from "@/components/analytics/ceo-action-center";
import { ExecutiveMetricCard } from "@/components/executive/executive-metric-card";
import BoardReportGenerator from "@/components/board-report-generator";
import BoardNarrativeGenerator from "@/components/ai-board-narrative-generator";
import ExecutiveRiskIntelligence from "@/components/executive-risk-intelligence";
import ProcurementCopilotIntelligence from "@/components/procurement-copilot-intelligence";
import {
  loadAnalyticsSourceData,
  type AnalyticsQuote,
} from "@/lib/analytics/source-data/load-analytics-source-data";
import { ExecutiveOpportunityRanking } from "@/components/executive/executive-opportunity-ranking";
import { ExecutiveDashboard } from "@/components/analytics/sections/executive-dashboard";
import { BoardDashboard } from "@/components/analytics/sections/board-dashboard";
import { ProcurementDashboard } from "@/components/analytics/sections/procurement-dashboard";
import { buildAnalyticsNarrative } from "@/lib/analytics/narrative/analytics-narrative";
import {
  buildCommercialInsights,
  type CommercialEvidenceState,
} from "@/lib/analytics/commercial/commercial-insights";
import {
  buildPortfolioIntelligence,
  type ProcurementRatioEvidence,
} from "@/lib/analytics/portfolio/portfolio-intelligence";
import { buildExecutiveBrief } from "@/lib/analytics/executive/executive-brief";
import { buildRiskComplianceEvidence } from "@/lib/analytics/executive/risk-intelligence";
import { buildExecutiveHistoricalPatterns } from "@/lib/analytics/executive/executive-trend";
import { IntelligenceDashboard } from "@/components/analytics/sections/intelligence-dashboard";
import {
  CONTRACT_FRAMEWORK_LABELS,
  PROCUREMENT_SCOPE_LABELS,
  SOURCING_METHOD_LABELS,
  type AnalyticsRFQ,
  buildAnalyticsRfqSourceHref,
  countByFramework,
  countByScope,
  countBySourcing,
  getCompetitionLabel,
  getContractFramework,
  getHealthLabel,
  getProcurementScope,
  getSourcingMethod,
} from "@/lib/analytics/procurement-utils";
import { buildSupplierIntelligence } from "@/lib/analytics/supplier-intelligence";

import { commandStatus } from "@/lib/executive/command-status";

import { calculateExecutiveScore } from "@/lib/executive/executive-score";

import { calculateBoardHealth } from "@/lib/executive/board-health";

import { calculateDigitalMaturity } from "@/lib/executive/digital-maturity";

import { calculateExecutiveReadiness } from "@/lib/executive/executive-readiness-score";

import { buildExecutiveNarrative } from "@/lib/analytics/executive/executive-narrative";

import { buildDecisionSupportReadiness } from "@/lib/analytics/executive/decision-support-readiness";
import { BoardReportCover } from "@/components/analytics/board-report-cover";
import { ExecutiveSummary } from "@/components/report-engine/ExecutiveSummary";
import { BoardExecutiveReport } from "@/components/report-engine/BoardExecutiveReport";
import { ReportEndPage } from "@/components/report-engine/ReportEndPage";
import { ReportSectionDivider } from "@/components/report-engine/ReportSectionDivider";
import { TableOfContents } from "@/components/report-engine/TableOfContents";

type ExecutiveAlert = {
  level: "opportunity" | "healthy" | "warning";
  title: string;
  message: string;
};

type RfqDecisionReadinessSourceRfq = Pick<AnalyticsRFQ, "id"> &
  Partial<
    Pick<
      AnalyticsRFQ,
      | "title"
      | "category"
      | "procurement_scope"
      | "sourcing_method"
      | "contract_framework"
      | "status"
      | "slug"
    >
  >;

type AnalyticsExecutiveScoreInputs = {
  evidenceState: CommercialEvidenceState;
  totalRfqs: number;
  supplierQuotes: number;
  awardedContracts: number;
  budgetTotal: number;
  avgQuotesPerRfq: number;
  awardRate: number;
  budgetUtilization: number;
  supplierReliabilityScore: number;
  supplierDiversificationScore: number;
  observedCommercialOpportunity: number;
  constructionClassificationScore: number;
};

type AvailableAnalyticsExecutiveScores = {
  state: "available";
  supplierActivityScore: number;
  competitionScore: number;
  awardScore: number;
  commercialOpportunityEvidenceScore: number;
  procurementHealthScore: number;
  executiveProcurementHealth: number;
  procurementRiskIndex: number;
  procurementMaturityScore: number;
  dataQualityScore: number;
  enterpriseProcurementScore: number;
  executiveStatus: string;
  procurementEfficiencyScore: number;
  supplierEngagementScore: number;
  executiveReadinessScore: number;
  digitalMaturityScore: number;
  boardHealthIndex: number;
  benchmarkReadinessScore: number;
  decisionSupportReadiness: ReturnType<typeof buildDecisionSupportReadiness>;
  procurementOpportunityScore: number;
  boardReadinessScore: number;
  ceoReadinessScore: number;
  internalPerformanceIndex: number;
  procurementPerformanceIndex: number;
  supplierPerformanceIndex: number;
  costOpportunityIndex: number;
  portfolioHealthIndex: number;
};

type UnavailableAnalyticsExecutiveScores = {
  state: Exclude<CommercialEvidenceState, "available">;
} & {
  [Key in Exclude<
    keyof AvailableAnalyticsExecutiveScores,
    "state" | "executiveStatus" | "decisionSupportReadiness"
  >]: null;
} & {
  executiveStatus: "Policy Locked" | "Access Restricted" | "Insufficient Data";
  decisionSupportReadiness: null;
};

export type AnalyticsExecutiveScoreEvidence =
  | AvailableAnalyticsExecutiveScores
  | UnavailableAnalyticsExecutiveScores;

export function getCommercialEvidenceLabel(
  state: Exclude<CommercialEvidenceState, "available">,
) {
  if (state === "access-restricted") {
    return "Access Restricted";
  }

  return state === "policy-locked" ? "Policy Locked" : "Insufficient Data";
}

export function buildSafeSubmissionParticipation({
  rfqIds,
  safeSubmissionCountByRfqId,
}: {
  rfqIds: readonly string[];
  safeSubmissionCountByRfqId: Readonly<Record<string, number>>;
}) {
  const totalSubmissions = rfqIds.reduce(
    (total, rfqId) => total + (safeSubmissionCountByRfqId[rfqId] ?? 0),
    0,
  );
  const rfqsWithSubmissions = rfqIds.filter(
    (rfqId) => (safeSubmissionCountByRfqId[rfqId] ?? 0) > 0,
  ).length;
  const rfqSubmissionCoverage: ProcurementRatioEvidence =
    rfqIds.length === 0
      ? {
          numerator: 0,
          denominator: 0,
          percentage: null,
          status: "insufficient-data",
        }
      : {
          numerator: rfqsWithSubmissions,
          denominator: rfqIds.length,
          percentage: Math.round((rfqsWithSubmissions / rfqIds.length) * 100),
          status: "available",
        };

  return { totalSubmissions, rfqSubmissionCoverage };
}

export function resolveCommercialEvidenceStateForSealedParticipation({
  globalEvidenceState,
  hasSealedCommercialEvidence,
}: {
  globalEvidenceState: CommercialEvidenceState;
  hasSealedCommercialEvidence: boolean;
}): CommercialEvidenceState {
  if (globalEvidenceState !== "available") {
    return globalEvidenceState;
  }

  return hasSealedCommercialEvidence ? "policy-locked" : "available";
}

export function buildDecisionStreamRiskMessage({
  evidenceState,
  totalSubmissions,
  fallbackMessage,
}: {
  evidenceState: CommercialEvidenceState;
  totalSubmissions: number;
  fallbackMessage: string;
}) {
  const representsMissingQuotationEvidence =
    /^\d+ active RFQs? (?:has|have) no submitted quotation evidence in the authorized analytics dataset\.$/.test(
      fallbackMessage,
    );

  if (
    evidenceState === "policy-locked" &&
    totalSubmissions > 0 &&
    representsMissingQuotationEvidence
  ) {
    return `${totalSubmissions} submitted ${totalSubmissions === 1 ? "quotation is" : "quotations are"} recorded; commercial evidence remains policy locked until the applicable RFQ opening control unlocks it.`;
  }

  return fallbackMessage;
}

export function buildGovernedRiskComplianceEvidence({
  evidenceState,
  totalSubmissions,
  riskComplianceEvidence,
}: {
  evidenceState: CommercialEvidenceState;
  totalSubmissions: number;
  riskComplianceEvidence: ReturnType<typeof buildRiskComplianceEvidence>;
}) {
  const governMessage = (fallbackMessage: string) =>
    buildDecisionStreamRiskMessage({
      evidenceState,
      totalSubmissions,
      fallbackMessage,
    });

  return {
    ...riskComplianceEvidence,
    narrative: governMessage(riskComplianceEvidence.narrative),
    indicators: riskComplianceEvidence.indicators.map(governMessage),
  };
}

export function formatCommercialCurrencyEvidence(
  evidenceState: CommercialEvidenceState,
  value: number,
) {
  return evidenceState === "available"
    ? `$${value.toLocaleString()}`
    : getCommercialEvidenceLabel(evidenceState);
}

export function buildGovernedAnalyticsNarrative({
  evidenceState,
  ...narrativeInput
}: Parameters<typeof buildAnalyticsNarrative>[0] & {
  evidenceState: CommercialEvidenceState;
}) {
  if (evidenceState === "available") {
    return buildAnalyticsNarrative(narrativeInput);
  }

  const evidenceLabel = getCommercialEvidenceLabel(evidenceState);

  return {
    executiveSummary: `${evidenceLabel}: supplier and commercial evidence is unavailable under the current evidence controls. Numeric quotation counts, average quotation values, award rates, and dependent executive scores are withheld rather than reported as zero.`,
    strategicRecommendations: [
      evidenceState === "policy-locked"
        ? "Wait for the applicable RFQ commercial opening before interpreting supplier or commercial outcomes."
        : evidenceState === "access-restricted"
          ? "Use an authorized workspace membership when supplier or commercial analytics are required."
          : "Increase complete, comparable commercial evidence before interpreting supplier or commercial outcomes.",
    ],
  };
}

export function buildAnalyticsExecutiveScoreEvidence({
  evidenceState,
  totalRfqs,
  supplierQuotes,
  awardedContracts,
  budgetTotal,
  avgQuotesPerRfq,
  awardRate,
  budgetUtilization,
  supplierReliabilityScore,
  supplierDiversificationScore,
  observedCommercialOpportunity,
  constructionClassificationScore,
}: AnalyticsExecutiveScoreInputs): AnalyticsExecutiveScoreEvidence {
  if (evidenceState !== "available") {
    const executiveStatus = getCommercialEvidenceLabel(evidenceState);

    return {
      state: evidenceState,
      supplierActivityScore: null,
      competitionScore: null,
      awardScore: null,
      commercialOpportunityEvidenceScore: null,
      procurementHealthScore: null,
      executiveProcurementHealth: null,
      procurementRiskIndex: null,
      procurementMaturityScore: null,
      dataQualityScore: null,
      enterpriseProcurementScore: null,
      executiveStatus,
      procurementEfficiencyScore: null,
      supplierEngagementScore: null,
      executiveReadinessScore: null,
      digitalMaturityScore: null,
      boardHealthIndex: null,
      benchmarkReadinessScore: null,
      decisionSupportReadiness: null,
      procurementOpportunityScore: null,
      boardReadinessScore: null,
      ceoReadinessScore: null,
      internalPerformanceIndex: null,
      procurementPerformanceIndex: null,
      supplierPerformanceIndex: null,
      costOpportunityIndex: null,
      portfolioHealthIndex: null,
    };
  }

  const supplierActivityScore = Math.min(100, supplierQuotes * 12);
  const competitionScore = Math.min(100, avgQuotesPerRfq * 25);
  const awardScore = Math.min(100, Math.round(awardRate * 1.5));
  const commercialOpportunityEvidenceScore =
    observedCommercialOpportunity > 0 ? 85 : 55;
  const procurementHealthScore = Math.round(
    supplierActivityScore * 0.25 +
      competitionScore * 0.25 +
      awardScore * 0.25 +
      commercialOpportunityEvidenceScore * 0.25,
  );
  const executiveProcurementHealth = Math.min(
    100,
    Math.round(
      awardRate * 0.4 + budgetUtilization * 0.3 + avgQuotesPerRfq * 10,
    ),
  );
  const procurementRiskIndex = Math.max(0, 100 - procurementHealthScore);
  const procurementMaturityScore = Math.min(
    100,
    Math.round(
      procurementHealthScore * 0.45 +
        competitionScore * 0.2 +
        awardRate * 0.15 +
        budgetUtilization * 0.1 +
        constructionClassificationScore * 0.1,
    ),
  );
  const dataQualityScore = Math.min(
    100,
    Math.round(
      (totalRfqs > 0 ? 25 : 0) +
        (supplierQuotes > 0 ? 25 : 0) +
        (awardedContracts > 0 ? 20 : 0) +
        (budgetTotal > 0 ? 15 : 0) +
        (constructionClassificationScore >= 60 ? 15 : 0),
    ),
  );
  const { score: enterpriseProcurementScore, status: executiveStatus } =
    calculateExecutiveScore(
      procurementHealthScore,
      dataQualityScore,
      procurementRiskIndex,
      constructionClassificationScore,
    );
  const procurementEfficiencyScore = Math.min(
    100,
    Math.round(
      awardRate * 0.35 +
        budgetUtilization * 0.25 +
        avgQuotesPerRfq * 10 +
        procurementHealthScore * 0.2 +
        constructionClassificationScore * 0.1,
    ),
  );
  const supplierEngagementScore = Math.min(
    100,
    Math.round(
      supplierQuotes * 5 +
        avgQuotesPerRfq * 15 +
        supplierReliabilityScore * 0.3,
    ),
  );
  const executiveReadinessScore = calculateExecutiveReadiness(
    enterpriseProcurementScore,
    dataQualityScore,
  );
  const digitalMaturityScore = calculateDigitalMaturity(
    procurementMaturityScore,
    dataQualityScore,
    supplierEngagementScore,
    constructionClassificationScore,
  );
  const boardHealthIndex = calculateBoardHealth(
    procurementEfficiencyScore,
    executiveReadinessScore,
    digitalMaturityScore,
    procurementHealthScore,
  );
  const benchmarkReadinessScore = Math.min(
    100,
    Math.round(
      procurementMaturityScore * (5 / 17) +
        supplierEngagementScore * (4 / 17) +
        executiveReadinessScore * (4 / 17) +
        dataQualityScore * (4 / 17),
    ),
  );
  const decisionSupportReadiness = buildDecisionSupportReadiness({
    dataQualityScore,
    supplierEngagementScore,
    benchmarkReadinessScore,
  });
  const procurementOpportunityScore = Math.min(
    100,
    Math.round(
      observedCommercialOpportunity / 1000 +
        avgQuotesPerRfq * 15 +
        awardRate * 0.3 +
        budgetUtilization * 0.2 +
        constructionClassificationScore * 0.15,
    ),
  );
  const boardReadinessScore = Math.min(
    100,
    Math.round(
      boardHealthIndex * 0.3 +
        executiveReadinessScore * 0.25 +
        enterpriseProcurementScore * 0.2 +
        benchmarkReadinessScore * 0.15 +
        dataQualityScore * 0.1,
    ),
  );
  const ceoReadinessScore = Math.min(
    100,
    Math.round(
      boardReadinessScore * 0.3 +
        enterpriseProcurementScore * 0.25 +
        executiveReadinessScore * 0.2 +
        benchmarkReadinessScore * 0.15 +
        supplierEngagementScore * 0.1,
    ),
  );
  const internalPerformanceIndex = Math.min(
    100,
    Math.round(
      procurementHealthScore * (7 / 17) +
        supplierReliabilityScore * (4 / 17) +
        competitionScore * (4 / 17) +
        constructionClassificationScore * (2 / 17),
    ),
  );
  const procurementPerformanceIndex = Math.min(
    100,
    Math.round(
      procurementMaturityScore * 0.45 +
        executiveProcurementHealth * 0.25 +
        boardHealthIndex * 0.2 +
        constructionClassificationScore * 0.1,
    ),
  );
  const supplierPerformanceIndex = Math.min(
    100,
    Math.round(
      supplierReliabilityScore * 0.5 +
        supplierEngagementScore * 0.3 +
        competitionScore * 0.2,
    ),
  );
  const costOpportunityIndex = Math.min(
    100,
    Math.round(
      budgetUtilization * 0.3 +
        procurementOpportunityScore * 0.4 +
        commercialOpportunityEvidenceScore * 0.3,
    ),
  );
  const portfolioHealthIndex = Math.min(
    100,
    Math.round(
      supplierReliabilityScore * 0.4 +
        supplierDiversificationScore * 0.3 +
        supplierEngagementScore * 0.3,
    ),
  );

  return {
    state: "available",
    supplierActivityScore,
    competitionScore,
    awardScore,
    commercialOpportunityEvidenceScore,
    procurementHealthScore,
    executiveProcurementHealth,
    procurementRiskIndex,
    procurementMaturityScore,
    dataQualityScore,
    enterpriseProcurementScore,
    executiveStatus,
    procurementEfficiencyScore,
    supplierEngagementScore,
    executiveReadinessScore,
    digitalMaturityScore,
    boardHealthIndex,
    benchmarkReadinessScore,
    decisionSupportReadiness,
    procurementOpportunityScore,
    boardReadinessScore,
    ceoReadinessScore,
    internalPerformanceIndex,
    procurementPerformanceIndex,
    supplierPerformanceIndex,
    costOpportunityIndex,
    portfolioHealthIndex,
  };
}

function formatEvidenceScore(score: number | null, unavailableLabel: string) {
  return score === null ? unavailableLabel : `${score}/100`;
}

export function buildRfqDecisionReadiness({
  rfqList,
  quoteList,
  commerciallyOpenRfqIdSet,
  safeSubmissionCountByRfqId,
}: {
  rfqList: readonly RfqDecisionReadinessSourceRfq[];
  quoteList: readonly Pick<AnalyticsQuote, "rfq_id">[];
  commerciallyOpenRfqIdSet: ReadonlySet<string>;
  safeSubmissionCountByRfqId: Readonly<Record<string, number>>;
}) {
  return rfqList
    .map((rfq) => {
      const rfqQuotes = quoteList.filter((quote) => quote.rfq_id === rfq.id);
      const safeSubmissionCount = safeSubmissionCountByRfqId[rfq.id] ?? 0;
      const commercialOpeningUnlocked = commerciallyOpenRfqIdSet.has(rfq.id);

      const scope = getProcurementScope(rfq.procurement_scope);
      const sourcing = getSourcingMethod(rfq.sourcing_method);
      const framework = getContractFramework(rfq.contract_framework);
      const status = String(rfq.status || "open").toLowerCase();
      const evaluationState =
        status === "awarded"
          ? "Awarded"
          : rfqQuotes.length > 0
            ? "Evaluation Active"
            : safeSubmissionCount > 0 && !commercialOpeningUnlocked
              ? "Commercial Opening Pending"
              : status === "open" || status === "published"
                ? "Awaiting Quotes"
                : "No Submission Evidence";

      return {
        title: rfq.title || "Untitled RFQ",
        category: rfq.category || "Procurement",
        scope: PROCUREMENT_SCOPE_LABELS[scope],
        sourcing: SOURCING_METHOD_LABELS[sourcing],
        framework: CONTRACT_FRAMEWORK_LABELS[framework],
        quotes: safeSubmissionCount,
        evaluationState,
        status: rfq.status || "open",
        sourceHref: buildAnalyticsRfqSourceHref(rfq.slug),
      };
    })
    .slice(0, 10);
}

export default async function AnalyticsPage() {
  const {
    companyId,
    commercialAccess,
    companyCompliance,
    rfqList,
    quoteList,
    companyList,
    commerciallyOpenRfqIds,
    safeSubmissionCountByRfqId,
  } = await loadAnalyticsSourceData();

  const analyticsAsOf = new Date();
  const commerciallyOpenRfqIdSet = new Set(commerciallyOpenRfqIds);
  const hasSealedSubmissionEvidence = rfqList.some(
    (rfq) =>
      !commerciallyOpenRfqIdSet.has(rfq.id) &&
      safeSubmissionCountByRfqId[rfq.id] > 0,
  );
  const currentCompany =
    companyList.find((company) => company.id === companyId) ?? null;

  const reportCompanyName =
    currentCompany?.name?.trim() || "Nexus Pavilion Organization";

  const reportGeneratedAt = new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(analyticsAsOf);

  const {
    vendorLeaderboard,
    supplierRanking,
    suppliersWithAwardHistory,
    suppliersWithMultipleAwards,
    suppliersWithLimitedQuoteHistory,
    supplierParticipationCount,
    supplierDiversificationScore,
    awardHistoryCoverage,
    supplierReliabilityScore,
  } = buildSupplierIntelligence({
    quoteList,
    companyList,
  });

  const {
    totalRfqs,
    activeRfqs,
    awardedContracts,
    supplierQuotes,
    procurementVolume,
    awardedVolume,
    averageQuote,
    awardRate,
    avgQuotesPerRfq,
    budgetTotal,
    budgetUtilization,
    categoryCounts,
    topCategory,
    procurementInsights,
  } = buildPortfolioIntelligence({
    rfqList,
    quoteList,
    asOf: analyticsAsOf,
  });

  const commercialInsights = buildCommercialInsights({
    rfqList,
    quoteList,
    canViewIssuerCommercialAnalytics:
      commercialAccess.canViewIssuerCommercialAnalytics,
    asOf: analyticsAsOf,
  });

  const supplierCommercialEvidenceState: CommercialEvidenceState =
    resolveCommercialEvidenceStateForSealedParticipation({
      globalEvidenceState: commercialInsights.state,
      hasSealedCommercialEvidence: hasSealedSubmissionEvidence,
    });
  const unavailableCommercialEvidenceLabel =
    supplierCommercialEvidenceState === "available"
      ? null
      : getCommercialEvidenceLabel(supplierCommercialEvidenceState);
  const executiveEvidenceLabel =
    unavailableCommercialEvidenceLabel ?? "Insufficient Data";
  const commercialEvidenceUnavailable =
    supplierCommercialEvidenceState !== "available";
  const safeSubmissionParticipation = buildSafeSubmissionParticipation({
    rfqIds: rfqList.map((rfq) => rfq.id),
    safeSubmissionCountByRfqId,
  });
  const governedProcurementInsights = {
    ...procurementInsights,
    rfqSubmissionCoverage:
      safeSubmissionParticipation.rfqSubmissionCoverage,
  };
  const procurementVolumeDisplay = formatCommercialCurrencyEvidence(
    supplierCommercialEvidenceState,
    procurementVolume,
  );
  const formatCurrentEvidenceScore = (score: number | null) =>
    formatEvidenceScore(score, executiveEvidenceLabel);

  const observedCommercialOpportunity =
    commercialInsights.state === "available"
      ? commercialInsights.estimatedOpportunity ?? 0
      : 0;

  const hasCommercialOpportunity =
    commercialInsights.state === "available" &&
    observedCommercialOpportunity > 0;

  const commercialOpportunityDisplay =
    commercialInsights.state === "available"
      ? `$${observedCommercialOpportunity.toLocaleString()}`
      : commercialInsights.state === "access-restricted"
        ? "Access Restricted"
        : commercialInsights.state === "policy-locked"
          ? "Policy Locked"
          : "Insufficient Data";

  const commercialOpportunityAction =
    commercialInsights.state === "available"
      ? hasCommercialOpportunity
        ? `Review the current estimated within-RFQ quotation opportunity of ${observedCommercialOpportunity.toLocaleString()} dollars before financial treatment.`
        : "Comparable visible quotations currently show no positive within-RFQ opportunity."
      : commercialInsights.state === "access-restricted"
        ? "Commercial opportunity evidence is access restricted for the current workspace membership."
        : commercialInsights.state === "policy-locked"
          ? "Commercial pricing remains policy locked until the applicable RFQ controls unlock it."
          : "Increase comparable quotation coverage within individual RFQs before interpreting commercial opportunity.";

  const historicalPatterns = buildExecutiveHistoricalPatterns({
    rfqs: rfqList,
    quotes: quoteList,
    canViewQuoteHistory: commercialAccess.canViewIssuerCommercialAnalytics,
    asOf: analyticsAsOf,
    periodDays: 30,
  });

  const riskComplianceEvidence = buildRiskComplianceEvidence({
    rfqs: rfqList,
    quotes: quoteList,
    compliance: companyCompliance,
    canViewQuoteHistory: commercialAccess.canViewIssuerCommercialAnalytics,
    asOf: analyticsAsOf,
  });
  const governedRiskComplianceEvidence = buildGovernedRiskComplianceEvidence({
    evidenceState: supplierCommercialEvidenceState,
    totalSubmissions: safeSubmissionParticipation.totalSubmissions,
    riskComplianceEvidence,
  });

  const materialRfqs = countByScope(rfqList, "material");
  const tradeRfqs = countByScope(rfqList, "subcontractor");
  const equipmentRfqs = countByScope(rfqList, "equipment");
  const serviceRfqs = countByScope(rfqList, "professional_service");

  const openMarketRfqs = countBySourcing(rfqList, "open");
  const invitedRfqs = countBySourcing(rfqList, "invited");
  const sealedBidRfqs = countBySourcing(rfqList, "sealed_bid");

  const projectSpecificRfqs = countByFramework(rfqList, "project_specific");
  const frameworkRfqs = countByFramework(rfqList, "framework");

  const constructionClassificationScore = Math.min(
    100,
    Math.round(
      (totalRfqs > 0 ? 35 : 0) +
        (materialRfqs > 0 ? 10 : 0) +
        (tradeRfqs > 0 ? 10 : 0) +
        (equipmentRfqs > 0 ? 10 : 0) +
        (serviceRfqs > 0 ? 10 : 0) +
        (openMarketRfqs > 0 ? 8 : 0) +
        (invitedRfqs > 0 ? 8 : 0) +
        (sealedBidRfqs > 0 ? 9 : 0),
    ),
  );

  const procurementMixStatus =
    constructionClassificationScore >= 80
      ? "Mature RFQ Mix"
      : constructionClassificationScore >= 60
        ? "Developing RFQ Mix"
        : constructionClassificationScore >= 35
          ? "Early RFQ Mix"
          : "No RFQ Mix Yet";

  const executiveScoreEvidence = buildAnalyticsExecutiveScoreEvidence({
    evidenceState: supplierCommercialEvidenceState,
    totalRfqs,
    supplierQuotes,
    awardedContracts,
    budgetTotal,
    avgQuotesPerRfq,
    awardRate,
    budgetUtilization,
    supplierReliabilityScore,
    supplierDiversificationScore,
    observedCommercialOpportunity,
    constructionClassificationScore,
  });
  const {
    supplierActivityScore,
    competitionScore,
    awardScore,
    procurementHealthScore,
    procurementRiskIndex,
    procurementMaturityScore,
    dataQualityScore,
    enterpriseProcurementScore,
    supplierEngagementScore,
    executiveReadinessScore,
    boardHealthIndex,
    benchmarkReadinessScore,
    decisionSupportReadiness,
    procurementOpportunityScore,
    boardReadinessScore,
    ceoReadinessScore,
    internalPerformanceIndex,
    procurementPerformanceIndex,
    supplierPerformanceIndex,
    costOpportunityIndex,
    portfolioHealthIndex,
  } = executiveScoreEvidence;

  const procurementHealth =
    procurementHealthScore === null
      ? unavailableCommercialEvidenceLabel ?? "Insufficient Data"
      : getHealthLabel(procurementHealthScore);
  const competitionIndex =
    unavailableCommercialEvidenceLabel ?? getCompetitionLabel(avgQuotesPerRfq);
  const dominantScope =
    [
      { label: "Material", value: materialRfqs },
      { label: "Trade", value: tradeRfqs },
      { label: "Equipment", value: equipmentRfqs },
      { label: "Service", value: serviceRfqs },
    ].sort((a, b) => b.value - a.value)[0]?.label || "N/A";

  const dominantSourcing =
    [
      { label: "Open", value: openMarketRfqs },
      { label: "Invited", value: invitedRfqs },
      { label: "Sealed Bid", value: sealedBidRfqs },
    ].sort((a, b) => b.value - a.value)[0]?.label || "N/A";

  const { executiveSummary } = buildGovernedAnalyticsNarrative({
    evidenceState: supplierCommercialEvidenceState,
    totalRfqs,
    procurementHealth,
    competitionIndex,
    dominantScope,
    dominantSourcing,
    awardRate,
    supplierQuotes,
    commercialInsights,
    constructionClassificationScore,
    avgQuotesPerRfq,
    sealedBidRfqs,
    frameworkRfqs,
    budgetUtilization,
    topCategory,
  });

  const rfqDecisionReadiness = buildRfqDecisionReadiness({
    rfqList,
    quoteList,
    commerciallyOpenRfqIdSet,
    safeSubmissionCountByRfqId,
  });

  const supplierDependencyRisk =
    commercialEvidenceUnavailable ||
    procurementRiskIndex === null ||
    procurementOpportunityScore === null ||
    enterpriseProcurementScore === null
      ? executiveEvidenceLabel
      : vendorLeaderboard.length <= 1
        ? "Critical"
        : vendorLeaderboard.length <= 3
          ? "Medium"
          : "Low";
  const topVendorRevenue = vendorLeaderboard[0]?.revenue || 0;

  const vendorConcentrationRisk =
    awardedVolume > 0
      ? Math.round((topVendorRevenue / awardedVolume) * 100)
      : 0;

  const concentrationLevel =
    vendorConcentrationRisk >= 70
      ? "High"
      : vendorConcentrationRisk >= 40
        ? "Moderate"
        : "Low";

  const executiveBenchmarkStatus =
    benchmarkReadinessScore === null
      ? executiveEvidenceLabel
      : benchmarkReadinessScore >= 85
      ? "Board Ready"
      : benchmarkReadinessScore >= 70
        ? "Executive Ready"
        : benchmarkReadinessScore >= 50
          ? "Operational"
          : "Insufficient Data";

  const supplierNetworkBenchmark =
    commercialEvidenceUnavailable || internalPerformanceIndex === null
      ? executiveEvidenceLabel
      : supplierParticipationCount >= 10
        ? "Scaled"
        : supplierParticipationCount >= 5
          ? "Developing"
          : supplierParticipationCount > 0
            ? "Early"
            : "Insufficient Data";

  const riskBenchmark =
    procurementRiskIndex === null
      ? executiveEvidenceLabel
      : procurementRiskIndex <= 25
      ? "Low Exposure"
      : procurementRiskIndex <= 50
        ? "Moderate Exposure"
        : procurementRiskIndex <= 75
          ? "Elevated Exposure"
          : "Critical Exposure";

  const enterpriseCommandStatus =
    enterpriseProcurementScore === null
      ? executiveEvidenceLabel
      : commandStatus(enterpriseProcurementScore);

  const riskCommandStatus = riskComplianceEvidence.stateLabel;

  const opportunityCommandStatus =
    procurementOpportunityScore === null
      ? executiveEvidenceLabel
      : procurementOpportunityScore >= 80
      ? "High Opportunity"
      : procurementOpportunityScore >= 60
        ? "Strong Opportunity"
        : procurementOpportunityScore >= 40
          ? "Emerging Opportunity"
          : "Limited Opportunity";

  const governanceReadiness =
    executiveReadinessScore === null
      ? executiveEvidenceLabel
      : executiveReadinessScore >= 80
      ? "Board Ready"
      : executiveReadinessScore >= 60
        ? "Executive Review"
        : "Operational Review";

  const financialVisibility =
    dataQualityScore === null
      ? executiveEvidenceLabel
      : dataQualityScore >= 80
      ? "High"
      : dataQualityScore >= 60
        ? "Moderate"
        : "Limited";

  const riskVisibility = riskComplianceEvidence.stateLabel;

  const ceoPriorityLevel =
    ceoReadinessScore === null
      ? executiveEvidenceLabel
      : ceoReadinessScore >= 85
      ? "Strategic Expansion"
      : ceoReadinessScore >= 70
        ? "Executive Optimization"
        : ceoReadinessScore >= 55
          ? "Operational Stabilization"
          : "Immediate Leadership Attention";

  const ceoRiskLevel = riskComplianceEvidence.stateLabel;

  const ceoOpportunityLevel =
    procurementOpportunityScore === null
      ? executiveEvidenceLabel
      : procurementOpportunityScore >= 80
      ? "High Opportunity"
      : procurementOpportunityScore >= 60
        ? "Strong Opportunity"
        : "Emerging Opportunity";

  const ceoPriorityQueue = [
    `Board Readiness: ${formatCurrentEvidenceScore(boardReadinessScore)}`,
    `Enterprise Score: ${formatCurrentEvidenceScore(enterpriseProcurementScore)}`,
    `Executive Readiness: ${formatCurrentEvidenceScore(executiveReadinessScore)}`,
    `Benchmark Status: ${executiveBenchmarkStatus}`,
  ];

  const ceoCriticalRisks =
    riskComplianceEvidence.indicators.length > 0
      ? riskComplianceEvidence.indicators.slice(0, 3)
      : [riskComplianceEvidence.narrative];

  const ceoStrategicOpportunities = [
    `Supplier Engagement: ${formatCurrentEvidenceScore(supplierEngagementScore)}`,
    `Procurement Opportunity: ${formatCurrentEvidenceScore(procurementOpportunityScore)}`,
    `Benchmark Readiness: ${formatCurrentEvidenceScore(benchmarkReadinessScore)}`,
  ];

  const ceoMorningBrief = commercialEvidenceUnavailable
    ? `${executiveEvidenceLabel}: executive supplier and commercial scoring is unavailable under the current evidence controls. Non-commercial RFQ classification evidence remains available independently.`
    : `
Nexus Pavilion executive intelligence indicates a CEO readiness score
of ${ceoReadinessScore}/100. Current board readiness is
${boardReadinessScore}/100 with ${executiveBenchmarkStatus}
benchmark status. Enterprise procurement performance is
${enterpriseProcurementScore}/100 while procurement risk exposure
remains ${ceoRiskLevel.toLowerCase()}.
`;

  const bestProcurementCategory = topCategory;

  const commercialOpportunityLevel =
    commercialInsights.state !== "available"
      ? "Evidence Limited"
      : observedCommercialOpportunity > 50000
        ? "Major"
        : observedCommercialOpportunity > 10000
          ? "Strong"
          : observedCommercialOpportunity > 0
            ? "Moderate"
            : "Low";

  const executiveCommandRecommendation =
    commercialEvidenceUnavailable || internalPerformanceIndex === null
      ? `${executiveEvidenceLabel}: defer supplier coverage and dependency conclusions until commercial evidence becomes available.`
      : boardHealthIndex !== null &&
          benchmarkReadinessScore !== null &&
          procurementRiskIndex !== null &&
          boardHealthIndex >= 85 &&
          benchmarkReadinessScore >= 80 &&
          procurementRiskIndex <= 35
        ? "Board-ready environment. Accelerate strategic procurement initiatives."
        : procurementRiskIndex !== null && procurementRiskIndex >= 70
          ? "High risk exposure detected. Prioritize mitigation before expansion."
          : supplierDependencyRisk === "Critical"
            ? "Supplier concentration risk detected. Diversify supplier network."
            : procurementOpportunityScore !== null &&
                procurementOpportunityScore >= 70
              ? "Strong opportunity signals detected. Increase procurement leverage."
              : "Continue operational optimization and monitor performance.";

  const boardPresentationStatus =
    boardHealthIndex === null || benchmarkReadinessScore === null
      ? executiveEvidenceLabel
      : boardHealthIndex >= 85 && benchmarkReadinessScore >= 80
      ? "Ready For Board Review"
      : boardHealthIndex >= 70
        ? "Executive Review Required"
        : "Operational Improvement Required";

  const boardRiskPosition = riskComplianceEvidence.stateLabel;

  const boardStrategicPosition =
    commercialEvidenceUnavailable ||
    procurementRiskIndex === null ||
    procurementOpportunityScore === null ||
    enterpriseProcurementScore === null
      ? `Commercial Evidence ${executiveEvidenceLabel}`
      : procurementOpportunityScore !== null && procurementOpportunityScore >= 70
        ? "Growth Opportunity"
        : supplierDependencyRisk === "Critical"
          ? "Supplier Diversification Required"
          : "Operational Optimization";

  const executiveAlerts: ExecutiveAlert[] = [];
  if (constructionClassificationScore < 60) {
    executiveAlerts.push({
      level: "warning",
      title: "RFQ Classification Maturity Is Low",
      message:
        "Improve material, trade, equipment, service, sourcing, and framework classification to strengthen intelligence quality.",
    });
  }

  if (
    hasCommercialOpportunity &&
    observedCommercialOpportunity >= 50_000
  ) {
    executiveAlerts.push({
      level: "opportunity",
      title: "Material Commercial Opportunity",
      message: `Visible within-RFQ quotation evidence identifies ${observedCommercialOpportunity.toLocaleString()} dollars in estimated commercial opportunity across ${commercialInsights.comparableRfqCount} comparable RFQs.`,
    });
  }

  if (dataQualityScore !== null && dataQualityScore >= 75) {
    executiveAlerts.push({
      level: "healthy",
      title: "Data Quality Supports Decision Review",
      message: "Recorded procurement data meets the current decision-support threshold.",
    });
  }

  if (commercialEvidenceUnavailable) {
    executiveAlerts.push({
      level: "warning",
      title: `Supplier Commercial Evidence ${executiveEvidenceLabel}`,
      message: `${executiveEvidenceLabel}: supplier identities and commercial evidence are unavailable under the current evidence controls.`,
    });
  } else if (procurementRiskIndex !== null && procurementRiskIndex >= 35) {
    executiveAlerts.push({
      level: "warning",
      title: "Supplier Dependency Risk",
      message: "Supplier concentration should be reviewed to reduce exposure.",
    });
  }

  if (!commercialEvidenceUnavailable && supplierParticipationCount <= 3) {
    executiveAlerts.push({
      level: "warning",
      title: "Limited Supplier Participation",
      message: "Expand supplier coverage to improve competition and pricing.",
    });
  }

  const executiveRecommendations = [
    {
      role: "CEO Action",
      action:
        procurementOpportunityScore === null
          ? `Commercial opportunity scoring is ${executiveEvidenceLabel.toLowerCase()}.`
          : procurementOpportunityScore >= 80
          ? `Prioritize ${bestProcurementCategory} and ${dominantScope} procurement as strategic growth and commercial-leverage areas.`
          : "Maintain procurement discipline while scaling executive visibility and classified RFQ activity.",
    },
    {
      role: "CFO Action",
      action: commercialOpportunityAction,
    },
    {
      role: "Procurement Director",
      action:
        commercialEvidenceUnavailable
          ? "Reassess supplier participation and dependency after complete commercial evidence becomes available."
          : supplierParticipationCount <= 3
            ? "Expand supplier participation to reduce supplier dependency risk."
            : `Continue strengthening supplier performance, ${dominantSourcing.toLowerCase()} workflows, and category coverage.`,
    },
    {
      role: "Board Priority",
      action:
        boardHealthIndex === null
          ? "Defer composite executive scoring until commercial evidence is available."
          : boardHealthIndex >= 70
          ? "Scale procurement intelligence adoption across enterprise stakeholders."
          : "Improve procurement data maturity, supplier coverage, RFQ classification, and award conversion.",
    },
  ];

  const categoryIntelligence = Object.entries(categoryCounts)
    .map(([category, count]) => {
      const categoryRfqs = rfqList.filter(
        (rfq) => (rfq.category || "Uncategorized") === category,
      );

      const categoryRfqIds = categoryRfqs.map((rfq) => rfq.id);

      const categoryQuotes = quoteList.filter((quote) =>
        categoryRfqIds.includes(quote.rfq_id),
      );

      const safeCategoryResponses = categoryRfqIds.reduce(
        (total, rfqId) =>
          total + (safeSubmissionCountByRfqId[rfqId] ?? 0),
        0,
      );
      const categoryHasSealedCommercialEvidence = categoryRfqIds.some(
        (rfqId) =>
          !commerciallyOpenRfqIdSet.has(rfqId) &&
          (safeSubmissionCountByRfqId[rfqId] ?? 0) > 0,
      );
      const categoryCommercialEvidenceState =
        resolveCommercialEvidenceStateForSealedParticipation({
          globalEvidenceState: commercialInsights.state,
          hasSealedCommercialEvidence: categoryHasSealedCommercialEvidence,
        });
      const categoryCommercialEvidenceUnavailable =
        categoryCommercialEvidenceState !== "available";

      const categoryAwards = categoryQuotes.filter(
        (quote) => quote.decision === "awarded",
      );

      const categorySpend = categoryAwards.reduce(
        (total, quote) => total + Number(quote.amount || 0),
        0,
      );

      const categoryWinRate =
        categoryQuotes.length > 0
          ? Math.round((categoryAwards.length / categoryQuotes.length) * 100)
          : 0;

      const categoryOpportunityScore = Math.min(
        100,
        Math.round(
          count * 20 +
            categoryQuotes.length * 10 +
            categoryWinRate * 0.3 +
            Math.min(categorySpend / 10000, 25),
        ),
      );

      return {
        category,
        rfqs: count,
        quotes: safeCategoryResponses,
        commercialEvidenceState: categoryCommercialEvidenceState,
        awards: categoryCommercialEvidenceUnavailable
          ? null
          : categoryAwards.length,
        spend: categoryCommercialEvidenceUnavailable ? null : categorySpend,
        winRate: categoryCommercialEvidenceUnavailable
          ? null
          : categoryWinRate,
        opportunityScore: categoryCommercialEvidenceUnavailable
          ? null
          : categoryOpportunityScore,
      };
    })
    .sort((a, b) =>
      commercialEvidenceUnavailable || hasSealedSubmissionEvidence
        ? b.rfqs - a.rfqs || a.category.localeCompare(b.category)
        : (b.opportunityScore ?? 0) - (a.opportunityScore ?? 0),
    )
    .slice(0, 5);

  const internalPerformanceStatus =
    internalPerformanceIndex === null
      ? executiveEvidenceLabel
      : internalPerformanceIndex >= 85
      ? "Strong"
      : internalPerformanceIndex >= 70
        ? "Established"
        : internalPerformanceIndex >= 55
          ? "Developing"
          : "Early";

  const procurementCommandRoom = [
    {
      title: "Board Readiness",
      value: executiveBenchmarkStatus,
    },
    {
      title: "Decision Evidence",
      value: decisionSupportReadiness?.label ?? executiveEvidenceLabel,
    },
    {
      title: "Risk Position",
      value: riskBenchmark,
    },
    {
      title: "Opportunity Position",
      value:
        procurementOpportunityScore === null
          ? executiveEvidenceLabel
          : procurementOpportunityScore >= 80
          ? "High"
          : procurementOpportunityScore >= 60
            ? "Medium"
            : "Low",
    },
    {
      title: "Supplier Strength",
      value: supplierNetworkBenchmark,
    },
    {
      title: "Internal Performance",
      value: internalPerformanceStatus,
    },
  ];

  const procurementCommandRoomStatus =
    boardHealthIndex === null || executiveReadinessScore === null
      ? executiveEvidenceLabel
      : boardHealthIndex >= 80 && executiveReadinessScore >= 80
      ? "Executive Control"
      : boardHealthIndex >= 65
        ? "Operational Control"
        : "Capability Development";

  const boardPresentationReadiness =
    benchmarkReadinessScore === null
      ? executiveEvidenceLabel
      : benchmarkReadinessScore >= 85
      ? "Board Ready"
      : benchmarkReadinessScore >= 70
        ? "Executive Ready"
        : "Preparation Required";

  const boardNarrative =
    procurementRiskIndex === null || procurementOpportunityScore === null
      ? `${executiveEvidenceLabel}: supplier and commercial executive evidence is unavailable under the current evidence controls.`
      : procurementRiskIndex >= 60
      ? "Board attention should focus on supplier dependency, concentration risk, and procurement resilience."
      : procurementOpportunityScore >= 80
        ? "Board attention should focus on growth opportunities, validated commercial evidence, and supplier expansion."
        : "Board attention should focus on maintaining procurement performance and strengthening executive readiness.";

  const boardPresentationMetrics = [
    {
      title: "Board Readiness",
      value: formatCurrentEvidenceScore(boardReadinessScore),
    },
    {
      title: "Board Health",
      value: formatCurrentEvidenceScore(boardHealthIndex),
    },
    {
      title: "Executive Readiness",
      value: formatCurrentEvidenceScore(executiveReadinessScore),
    },
    {
      title: "Decision Evidence",
      value: formatCurrentEvidenceScore(decisionSupportReadiness?.score ?? null),
    },
  ];
  const boardRiskPriorities = [
    {
      title:
        commercialEvidenceUnavailable || procurementRiskIndex === null
          ? "Supplier Commercial Evidence"
          : procurementRiskIndex >= 60
            ? "Supplier Dependency Risk"
            : "Supplier Risk Position",
      priority:
        commercialEvidenceUnavailable || procurementRiskIndex === null
          ? "Review"
          : procurementRiskIndex >= 60
            ? "Critical"
            : procurementRiskIndex >= 40
              ? "Moderate"
              : "Monitor",
      impact:
        commercialEvidenceUnavailable || procurementRiskIndex === null
          ? "Unavailable"
          : procurementRiskIndex >= 60
            ? "High"
            : procurementRiskIndex >= 40
              ? "Medium"
              : "Low",
      attention:
        commercialEvidenceUnavailable || procurementRiskIndex === null
          ? "After Opening"
          : procurementRiskIndex >= 60
            ? "Immediate"
            : procurementRiskIndex >= 40
              ? "90 Days"
              : "Ongoing",
      summary:
        commercialEvidenceUnavailable || procurementRiskIndex === null
          ? "Supplier dependency cannot be assessed while supplier and commercial evidence is unavailable."
          : procurementRiskIndex >= 60
            ? "Supplier dependency requires board visibility before procurement volume scales further."
            : procurementRiskIndex >= 40
              ? "Supplier dependency should remain under management review as procurement activity expands."
              : "Supplier risk is currently controlled but should continue to be monitored.",
    },
    {
      title:
        commercialEvidenceUnavailable
          ? "Supplier Competition Evidence"
          : supplierParticipationCount <= 3
            ? "Limited Supplier Competition"
            : "Supplier Competition Health",
      priority:
        commercialEvidenceUnavailable
          ? "Review"
          : supplierParticipationCount <= 3
            ? "Critical"
            : supplierParticipationCount <= 6
              ? "Moderate"
              : "Monitor",
      impact:
        commercialEvidenceUnavailable
          ? "Unavailable"
          : supplierParticipationCount <= 3
            ? "High"
            : supplierParticipationCount <= 6
              ? "Medium"
              : "Low",
      attention:
        commercialEvidenceUnavailable
          ? "After Opening"
          : supplierParticipationCount <= 3
            ? "Immediate"
            : supplierParticipationCount <= 6
              ? "90 Days"
              : "Ongoing",
      summary:
        commercialEvidenceUnavailable
          ? "Supplier competition cannot be assessed while supplier and commercial evidence is unavailable."
          : supplierParticipationCount <= 3
            ? "Limited supplier participation may reduce quote quality, competitive leverage, and decision confidence."
            : supplierParticipationCount <= 6
              ? "Supplier participation is developing and should be expanded to improve competitive coverage."
              : "Supplier participation supports healthy procurement competition.",
    },
    {
      title:
        constructionClassificationScore < 60
          ? "RFQ Classification Maturity"
          : "Structured RFQ Intelligence",
      priority:
        constructionClassificationScore < 45
          ? "Critical"
          : constructionClassificationScore < 60
            ? "Moderate"
            : "Monitor",
      impact:
        constructionClassificationScore < 45
          ? "High"
          : constructionClassificationScore < 60
            ? "Medium"
            : "Low",
      attention:
        constructionClassificationScore < 45
          ? "Immediate"
          : constructionClassificationScore < 60
            ? "90 Days"
            : "Ongoing",
      summary:
        constructionClassificationScore < 60
          ? "RFQ classification maturity should improve before executive reporting relies heavily on category-level intelligence."
          : "Structured RFQ intelligence is active and supports executive interpretation.",
    },
    {
      title:
        commercialEvidenceUnavailable
          ? "Quotation Award Evidence"
          : awardRate < 25
            ? "Award Execution Risk"
            : "Quotation Award Outcome Health",
      priority:
        commercialEvidenceUnavailable
          ? "Review"
          : awardRate < 25
            ? "Critical"
            : awardRate < 45
              ? "Moderate"
              : "Monitor",
      impact: commercialEvidenceUnavailable
        ? "Unavailable"
        : awardRate < 25
          ? "High"
          : awardRate < 45
            ? "Medium"
            : "Low",
      attention:
        commercialEvidenceUnavailable
          ? "After Evidence Access"
          : awardRate < 25
            ? "Immediate"
            : awardRate < 45
              ? "90 Days"
              : "Ongoing",
      summary:
        commercialEvidenceUnavailable
          ? `${executiveEvidenceLabel}: quotation award outcomes cannot be assessed from unavailable commercial evidence.`
          : awardRate < 25
          ? "Award execution history is not yet strong enough to support high-confidence procurement decision patterns."
          : awardRate < 45
            ? "Award conversion is developing and should be monitored as RFQ activity increases."
            : "Award conversion supports procurement decision confidence.",
    },
  ];

  const boardDeckSlides = [
    {
      slide: "01",
      title: "Executive Summary",
      focus: boardPresentationReadiness,
      narrative: boardNarrative,
    },
    {
      slide: "02",
      title: "Board Readiness",
      focus: formatCurrentEvidenceScore(benchmarkReadinessScore),
      narrative:
        "Board readiness reflects procurement maturity, executive confidence, supplier engagement, and benchmark strength.",
    },
    {
      slide: "03",
      title: "Risk Priorities",
      focus: boardRiskPriorities[0]?.title || "Risk Monitoring",
      narrative:
        boardRiskPriorities[0]?.summary ||
        "Procurement risk remains under executive monitoring.",
    },
    {
      slide: "04",
      title: "Opportunity Priorities",
      focus:
        procurementOpportunityScore === null
          ? executiveEvidenceLabel
          : procurementOpportunityScore >= 80
          ? "High Opportunity"
          : procurementOpportunityScore >= 60
            ? "Medium Opportunity"
            : "Opportunity Monitoring",
      narrative:
        procurementOpportunityScore === null
          ? `Procurement opportunity scoring is ${executiveEvidenceLabel.toLowerCase()} until complete commercial evidence becomes available.`
          : procurementOpportunityScore >= 80
          ? "Procurement opportunity is strong and should be reviewed for board-level growth planning."
          : procurementOpportunityScore >= 60
            ? "Procurement opportunity is developing and should remain under executive review."
            : "Procurement opportunities remain under executive monitoring.",
    },
    {
      slide: "05",
      title: "Decision Evidence",
      focus: formatCurrentEvidenceScore(decisionSupportReadiness?.score ?? null),
      narrative:
        "Decision evidence reflects data quality, internal benchmark readiness, supplier participation, and procurement signal quality.",
    },
    {
      slide: "06",
      title: "Executive Recommendation",
      focus: procurementCommandRoomStatus,
      narrative: executiveCommandRecommendation,
    },
  ];

  const topQuarterOpportunities = [
    `${bestProcurementCategory} category expansion`,
    commercialInsights.state === "available"
      ? `${commercialOpportunityLevel} observed quotation opportunity`
      : `Commercial evidence — ${commercialOpportunityDisplay}`,
    `${dominantScope} RFQ mix growth`,
    "Supplier network growth",
  ];
  const executiveOpportunityRanking = commercialEvidenceUnavailable ? [] : [
    {
      title: `${bestProcurementCategory} Expansion`,
      priority:
        procurementOpportunityScore === null
          ? executiveEvidenceLabel
          : procurementOpportunityScore >= 80
          ? "Immediate"
          : procurementOpportunityScore >= 60
            ? "90 Days"
            : "Strategic",
      impact:
        procurementOpportunityScore === null
          ? "Unavailable"
          : procurementOpportunityScore >= 80
          ? "High"
          : procurementOpportunityScore >= 60
            ? "Medium"
            : "Long-Term",
      valueLabel: "Opportunity Score",
      value: formatCurrentEvidenceScore(procurementOpportunityScore),
      summary: `Expand procurement activity within ${bestProcurementCategory} to increase sourcing coverage and operational leverage.`,
    },
    {
      title: "Quotation Opportunity",
      priority:
        commercialInsights.state === "available" &&
        observedCommercialOpportunity >= 10000
          ? "Immediate"
          : commercialInsights.state === "available" &&
              observedCommercialOpportunity >= 5000
            ? "90 Days"
            : "Strategic",
      impact:
        commercialInsights.state === "available" &&
        observedCommercialOpportunity >= 10000
          ? "High"
          : commercialInsights.state === "available" &&
              observedCommercialOpportunity >= 5000
            ? "Medium"
            : commercialInsights.state === "available"
              ? "Long-Term"
              : "Medium",
      valueLabel: "Observed Quotation Opportunity",
      value: commercialOpportunityDisplay,
      summary:
        commercialInsights.state === "available"
          ? `Visible within-RFQ quotation evidence indicates a ${commercialOpportunityLevel.toLowerCase()} estimated opportunity.`
          : commercialInsights.limitation,
    },
    {
      title: "Supplier Network Growth",
      priority:
        supplierEngagementScore === null
          ? executiveEvidenceLabel
          : supplierEngagementScore < 60
          ? "Immediate"
          : supplierEngagementScore < 80
            ? "90 Days"
            : "Strategic",
      impact:
        supplierEngagementScore === null
          ? "Unavailable"
          : supplierEngagementScore < 60
            ? "High"
            : "Medium",
      valueLabel: "Supplier Engagement",
      value: formatCurrentEvidenceScore(supplierEngagementScore),
      summary:
        "Expand supplier participation to improve competition, quote coverage, and decision confidence.",
    },
    {
      title: `${dominantScope} RFQ Growth`,
      priority: "Strategic",
      impact: "Medium",
      valueLabel: "Dominant Procurement Scope",
      value: dominantScope,
      summary:
        "Increase RFQ volume within the dominant procurement scope to strengthen market intelligence.",
    },
  ];

  const executiveOpportunityIntelligence = executiveOpportunityRanking.map(
    (opportunity, index) => ({
      ...opportunity,
      rank: index + 1,
      businessImpact:
        opportunity.impact === "High"
          ? "High business impact with direct executive visibility."
          : opportunity.impact === "Medium"
            ? "Moderate business impact with operational improvement potential."
            : "Long-term strategic value requiring continued development.",
      executionHorizon:
        opportunity.priority === "Immediate"
          ? "Immediate executive action"
          : opportunity.priority === "90 Days"
            ? "90-day execution window"
            : "Strategic planning cycle",
      boardPriority:
        opportunity.priority === "Immediate"
          ? "High"
          : opportunity.priority === "90 Days"
            ? "Medium"
            : "Monitor",
      ceoRecommendation:
        opportunity.priority === "Immediate"
          ? "Assign executive ownership and begin action planning immediately."
          : opportunity.priority === "90 Days"
            ? "Include in the next quarterly procurement leadership review."
            : "Track as a strategic opportunity for future procurement expansion.",
    }),
  );

  const boardRecommendation =
    commercialEvidenceUnavailable || internalPerformanceIndex === null
      ? `${executiveEvidenceLabel}: defer supplier coverage, dependency, and competition conclusions until complete commercial evidence becomes available.`
      : procurementRiskIndex >= 60
        ? "Reduce supplier dependency and review award concentration before scaling procurement volume."
        : procurementOpportunityScore >= 80
          ? "Prioritize high-opportunity procurement categories and expand supplier participation; validate commercial evidence before value-capture decisions."
          : enterpriseProcurementScore >= 75
            ? "Continue scaling competitive RFQs while maintaining supplier performance, RFQ structure, and decision evidence readiness."
            : "Improve RFQ participation, supplier coverage, classification maturity, and procurement data quality to strengthen executive confidence.";

  const benchmarkMatrix = [
    { title: "Operating Health", score: internalPerformanceIndex },
    { title: "Procurement Maturity", score: procurementPerformanceIndex },
    { title: "Supplier Strength", score: supplierPerformanceIndex },
    { title: "Cost Opportunity", score: costOpportunityIndex },
  ];
  const internalPerformancePosition =
    internalPerformanceIndex === null
      ? executiveEvidenceLabel
      : internalPerformanceIndex >= 85
      ? "Strong Internal Position"
      : internalPerformanceIndex >= 70
        ? "Established Internal Position"
        : internalPerformanceIndex >= 55
          ? "Developing Internal Position"
          : "Early Internal Position";

  const internalEvidenceReadiness =
    benchmarkReadinessScore === null || dataQualityScore === null
      ? executiveEvidenceLabel
      : benchmarkReadinessScore >= 80 && dataQualityScore >= 70
      ? "High Evidence Readiness"
      : benchmarkReadinessScore >= 60 && dataQualityScore >= 50
        ? "Moderate Evidence Readiness"
        : "Limited Evidence Readiness";

  const internalPerformanceNarrative =
    commercialEvidenceUnavailable || internalPerformanceIndex === null
      ? `Internal procurement activity is recorded. ${executiveEvidenceLabel}: supplier participation, reliability, and commercial performance conclusions are unavailable.`
      : internalPerformanceIndex >= 85
        ? "Internal procurement performance signals indicate a strong operating position across health, supplier participation, competition, and classification maturity."
        : internalPerformanceIndex >= 70
          ? "Internal procurement performance signals indicate an established operating position. Continued improvement should focus on supplier depth, award history, and financial validation."
          : internalPerformanceIndex >= 55
            ? "Internal procurement performance signals indicate a developing operating position. Stronger RFQ volume, supplier coverage, and award validation are required before broader executive reliance."
            : "Internal procurement performance remains at an early evidence stage. Executive use should stay focused on transparent improvement until procurement activity, supplier participation, and decision history improve.";

  const internalPerformanceRecommendation =
    commercialEvidenceUnavailable || internalPerformanceIndex === null
      ? "Reassess supplier coverage, reliability, and commercial performance after complete evidence becomes available."
      : internalPerformanceIndex >= 85
        ? "Maintain governance discipline while scaling procurement intelligence across additional categories and supplier segments."
        : internalPerformanceIndex >= 70
          ? "Prioritize supplier network expansion, award workflow completion, and evidence validation to strengthen internal operating performance."
          : internalPerformanceIndex >= 55
            ? "Strengthen RFQ activity, supplier participation, and procurement data quality before positioning the platform as board-ready."
            : "Focus on foundational procurement data capture before using internal performance output for executive decisions.";

  const decisionEvidenceDrivers = [
    `Data Quality: ${formatCurrentEvidenceScore(dataQualityScore)}`,
    commercialEvidenceUnavailable
      ? `Supplier Engagement: ${executiveEvidenceLabel}`
      : `Supplier Engagement: ${formatCurrentEvidenceScore(supplierEngagementScore)}`,
    `Benchmark Readiness: ${formatCurrentEvidenceScore(benchmarkReadinessScore)}`,
  ];

  const decisionEvidenceRisks = [
    procurementRiskIndex === null
      ? `Procurement risk evidence is ${executiveEvidenceLabel.toLowerCase()}.`
      : procurementRiskIndex >= 60
      ? "Procurement risk exposure may limit decision readiness."
      : "Procurement risk is not currently blocking decision readiness.",
    commercialEvidenceUnavailable || supplierEngagementScore === null
      ? `Supplier engagement evidence is ${executiveEvidenceLabel.toLowerCase()}.`
      : supplierEngagementScore < 50
        ? "Supplier engagement remains below executive decision threshold."
        : "Supplier engagement supports decision interpretation.",
    dataQualityScore === null
      ? `Data quality scoring is ${executiveEvidenceLabel.toLowerCase()}.`
      : dataQualityScore < 60
      ? "Data quality requires improvement before stronger executive reliance."
      : "Data quality supports executive reporting readiness.",
    benchmarkReadinessScore === null
      ? `Benchmark readiness is ${executiveEvidenceLabel.toLowerCase()}.`
      : benchmarkReadinessScore < 60
      ? "Benchmark readiness is still below the board-review threshold."
      : "Internal benchmark readiness supports executive review.",
  ];

  const executiveDecisionQueue = [
    commercialEvidenceUnavailable || procurementRiskIndex === null
      ? "Reassess supplier concentration after complete commercial evidence becomes available."
      : procurementRiskIndex >= 50
        ? "Review supplier concentration risk."
        : "Maintain supplier diversification strategy.",
    hasCommercialOpportunity &&
    observedCommercialOpportunity > 10000
      ? `Validate $${observedCommercialOpportunity.toLocaleString()} in observed within-RFQ quotation opportunity.`
      : commercialOpportunityAction,
    constructionClassificationScore < 60
      ? "Improve construction RFQ classification maturity."
      : "Maintain RFQ classification discipline.",
    commercialEvidenceUnavailable
      ? "Reassess quotation award follow-through after complete commercial evidence becomes available."
      : awardRate < 25
        ? "Improve quotation decision follow-through and award execution."
        : "Maintain quotation award follow-through.",
  ];
  const ceoActionCenter = [
    {
      phase: "Immediate",
      title: "Executive Attention",
      summary: boardRecommendation,
    },
    {
      phase: "30 Days",
      title: "Operational Focus",
      summary:
        executiveDecisionQueue[0] ||
        "Maintain procurement operating discipline.",
    },
    {
      phase: "90 Days",
      title: "Growth Initiative",
      summary:
        executiveOpportunityRanking[0]?.summary ||
        "Expand procurement intelligence coverage.",
    },
    {
      phase: "Strategic",
      title: "Enterprise Direction",
      summary: executiveCommandRecommendation,
    },
  ];

  const ceoOperatingStatus =
    enterpriseProcurementScore === null || executiveReadinessScore === null
      ? executiveEvidenceLabel
      : enterpriseProcurementScore >= 80 && executiveReadinessScore >= 80
      ? "Executive Growth Mode"
      : enterpriseProcurementScore >= 65
        ? "Operational Scaling Mode"
        : "Capability Development Mode";

  const ceoDecisionPosture =
    decisionSupportReadiness === null
      ? executiveEvidenceLabel
      : decisionSupportReadiness.status === "board-ready"
      ? "Proceed"
      : decisionSupportReadiness.status === "management-ready"
        ? "Proceed With Review"
        : "Require Validation";

  const procurementCommandCenter = [
    {
      title: "Top Risk",
      value: boardRiskPriorities[0]?.title || "No Critical Risks",
      status: boardRiskPriorities[0]?.priority || "Monitor",
    },
    {
      title: "Top Opportunity",
      value:
        executiveOpportunityRanking[0]?.title || "No Opportunity Identified",
      status: executiveOpportunityRanking[0]?.priority || "Strategic",
    },
    {
      title: "CEO Priority",
      value: ceoActionCenter[0]?.title || "No Active Priority",
      status: ceoDecisionPosture,
    },
    {
      title: "Decision Support Readiness",
      value: decisionSupportReadiness?.label ?? executiveEvidenceLabel,
      status: executiveBenchmarkStatus,
    },
  ];

  const commandCenterStatus =
    enterpriseProcurementScore === null || decisionSupportReadiness === null
      ? executiveEvidenceLabel
      : enterpriseProcurementScore >= 80 &&
          decisionSupportReadiness.status === "board-ready"
      ? "Command Ready"
      : enterpriseProcurementScore >= 65
        ? "Operational Command"
        : "Developing Command";

  const portfolioStatus =
    commercialEvidenceUnavailable || portfolioHealthIndex === null
      ? executiveEvidenceLabel
      : portfolioHealthIndex >= 85
        ? "Excellent"
        : portfolioHealthIndex >= 70
          ? "Healthy"
          : portfolioHealthIndex >= 55
            ? "Moderate"
            : "Needs Attention";

  const portfolioRecommendations: string[] = [];

  if (commercialEvidenceUnavailable) {
    portfolioRecommendations.push(
      "Reassess supplier portfolio coverage after sealed commercial evidence becomes available.",
    );
  } else if (suppliersWithLimitedQuoteHistory > 0) {
    portfolioRecommendations.push(
      "Increase supplier history depth for suppliers with limited quotation participation.",
    );
  }

  if (!commercialEvidenceUnavailable && supplierDiversificationScore < 60) {
    portfolioRecommendations.push(
      "Expand supplier participation to improve supply-base coverage.",
    );
  }

  if (!commercialEvidenceUnavailable && suppliersWithAwardHistory < 3) {
    portfolioRecommendations.push(
      "Gather more award history across the active supplier set.",
    );
  }

  if (!commercialEvidenceUnavailable && vendorConcentrationRisk >= 70) {
    portfolioRecommendations.push(
      "Reduce supplier concentration in awarded revenue.",
    );
  }

  if (portfolioRecommendations.length === 0) {
    portfolioRecommendations.push(
      "Maintain quotation discipline and continue recording commercial evidence.",
    );
  }

  const topRisk = buildDecisionStreamRiskMessage({
    evidenceState: supplierCommercialEvidenceState,
    totalSubmissions: safeSubmissionParticipation.totalSubmissions,
    fallbackMessage:
      governedRiskComplianceEvidence.indicators[0] ??
      governedRiskComplianceEvidence.narrative,
  });

  const topOpportunity =
    commercialInsights.state === "available"
      ? hasCommercialOpportunity
        ? `Current visible portfolio evidence contains ${observedCommercialOpportunity.toLocaleString()} dollars in estimated within-RFQ quotation opportunity across ${commercialInsights.comparableRfqCount} comparable RFQs.`
        : "Comparable visible RFQ pricing currently shows no positive estimated within-RFQ quotation opportunity."
      : commercialInsights.limitation;

  const ceoPriority =
    procurementOpportunityScore === null
      ? `Procurement opportunity scoring is ${executiveEvidenceLabel.toLowerCase()}.`
      : procurementOpportunityScore >= 70
      ? "Scale supplier network, category expansion, and RFQ intelligence maturity."
      : "Improve procurement growth initiatives.";

  const cfoPriority = commercialOpportunityAction;

  const procurementPriority =
    commercialEvidenceUnavailable
      ? `Supplier competition evidence is ${executiveEvidenceLabel.toLowerCase()}.`
      : avgQuotesPerRfq < 2
        ? "Increase RFQ competition and supplier engagement."
        : "Maintain healthy procurement competition levels.";
  const dailyExecutiveBriefing = [
    { title: "CEO", message: ceoPriority },
    { title: "CFO", message: cfoPriority },
    { title: "Procurement", message: procurementPriority },
    { title: "Risk", message: topRisk },
    { title: "Opportunity", message: topOpportunity },
  ];

  const activityChartData = [
    { name: "RFQs", value: totalRfqs },
    { name: "Active", value: activeRfqs },
    ...(supplierCommercialEvidenceState === "available"
      ? [
          { name: "Quotes", value: supplierQuotes },
          { name: "Awards", value: awardedContracts },
        ]
      : []),
  ];

  const valueChartData =
    supplierCommercialEvidenceState === "available"
      ? [
          { name: "Volume", value: procurementVolume },
          { name: "Awarded", value: awardedVolume },
          { name: "Avg Quote", value: averageQuote },
          {
            name: "Observed Opportunity",
            value: observedCommercialOpportunity,
          },
        ]
      : [];

  const rfqMixChartData = [
    { name: "Material", value: materialRfqs },
    { name: "Trade", value: tradeRfqs },
    { name: "Equipment", value: equipmentRfqs },
    { name: "Service", value: serviceRfqs },
  ];

  const procurementOutlook = historicalPatterns.narrative;

  const forecast30Days = historicalPatterns.rfqCreation.summary;
  const forecast60Days = historicalPatterns.quoteSubmission.summary;
  const forecast90Days = historicalPatterns.supplierParticipation.summary;

  const riskTrajectory = historicalPatterns.rfqCreation.directionLabel;
  const opportunityTrajectory =
    historicalPatterns.submittedQuoteValue.directionLabel;

  const executiveForecastStatus = historicalPatterns.statusLabel;
  const boardForecastNarrative = historicalPatterns.narrative;

  const bestCaseScenario = historicalPatterns.rfqCreation.summary;
  const expectedCaseScenario =
    historicalPatterns.supplierParticipation.summary;
  const riskCaseScenario = historicalPatterns.submittedQuoteValue.summary;

  const forecastConfidenceLevel =
    decisionSupportReadiness?.label ?? executiveEvidenceLabel;
  const executiveScenarioStatus = historicalPatterns.statusLabel;
  const boardForecastBriefing = historicalPatterns.narrative;

  const boardForecastPriority =
    procurementRiskIndex === null || procurementOpportunityScore === null
      ? executiveEvidenceLabel
      : procurementRiskIndex >= 60
      ? "Risk Stabilization"
      : procurementOpportunityScore >= 80
        ? "Opportunity Review"
        : "Operational Improvement";
  const executivePresentationExports = [
    {
      title: "Board Brief",
      status: boardPresentationReadiness,
      audience: "Board Members",
    },
    {
      title: "CEO Brief",
      status: executiveScenarioStatus,
      audience: "Chief Executive Officer",
    },
    {
      title: "Procurement Brief",
      status: executiveBenchmarkStatus,
      audience: "Procurement Leadership",
    },
    {
      title: "Executive Summary",
      status: executiveForecastStatus,
      audience: "Executive Team",
    },
  ];

  const exportReadinessStatus =
    benchmarkReadinessScore === null || executiveReadinessScore === null
      ? executiveEvidenceLabel
      : benchmarkReadinessScore >= 80 && executiveReadinessScore >= 80
      ? "Export Ready"
      : "Review Required";

  const boardAutomationStatus =
    exportReadinessStatus === "Export Ready"
      ? "Automation Ready"
      : "Requires Review";

  const boardPackageLifecycle =
    exportReadinessStatus === "Export Ready"
      ? "Ready for board package generation"
      : "Pending executive validation";

  const boardDistributionStatus =
    benchmarkReadinessScore === null || executiveReadinessScore === null
      ? executiveEvidenceLabel
      : benchmarkReadinessScore >= 80 && executiveReadinessScore >= 80
      ? "Distribution Ready"
      : "Distribution Hold";

  const boardApprovalWorkflow =
    boardDistributionStatus === "Distribution Ready"
      ? "Ready for board review"
      : "Requires executive approval";

  const boardAutomationItems = [
    {
      title: "Board Package",
      status: boardAutomationStatus,
    },
    {
      title: "Readiness Validation",
      status: exportReadinessStatus,
    },
    {
      title: "Distribution Status",
      status: boardDistributionStatus,
    },
    {
      title: "Approval Workflow",
      status: boardApprovalWorkflow,
    },
  ];

  const boardPackageStages = [
    {
      stage: "Data Collection",
      status: "Complete",
    },
    {
      stage: "Executive Validation",
      status:
        executiveReadinessScore === null
          ? executiveEvidenceLabel
          : executiveReadinessScore >= 80
            ? "Complete"
            : "In Progress",
    },
    {
      stage: "Board Preparation",
      status:
        benchmarkReadinessScore === null
          ? executiveEvidenceLabel
          : benchmarkReadinessScore >= 80
            ? "Ready"
            : "Pending",
    },
    {
      stage: "Board Distribution",
      status: boardDistributionStatus,
    },
  ];

  const boardDistributionChannels = [
    {
      channel: "Board Members",
      status: boardDistributionStatus,
    },
    {
      channel: "CEO Office",
      status: "Ready",
    },
    {
      channel: "Executive Committee",
      status:
        executiveReadinessScore === null
          ? executiveEvidenceLabel
          : executiveReadinessScore >= 80
            ? "Ready"
            : "Pending",
    },
    {
      channel: "Audit Committee",
      status:
        procurementRiskIndex === null
          ? executiveEvidenceLabel
          : procurementRiskIndex <= 50
            ? "Ready"
            : "Review Required",
    },
  ];

  const boardDistributionReadiness =
    boardDistributionStatus === "Distribution Ready"
      ? "Ready For Distribution"
      : "Executive Review Required";

  const boardApprovalStages = [
    {
      stage: "Executive Review",
      status:
        executiveReadinessScore === null
          ? executiveEvidenceLabel
          : executiveReadinessScore >= 80
            ? "Approved"
            : "Pending",
    },
    {
      stage: "Risk Validation",
      status:
        procurementRiskIndex === null
          ? executiveEvidenceLabel
          : procurementRiskIndex <= 50
            ? "Approved"
            : "Review Required",
    },
    {
      stage: "Board Package Approval",
      status:
        boardDistributionStatus === "Distribution Ready"
          ? "Approved"
          : "Pending",
    },
    {
      stage: "Distribution Authorization",
      status:
        boardDistributionReadiness === "Ready For Distribution"
          ? "Authorized"
          : "Hold",
    },
  ];

  const boardApprovalStatus =
    boardDistributionReadiness === "Ready For Distribution"
      ? "Board Approved"
      : "Awaiting Approval";

  const topQuarterRisks = [
    commercialEvidenceUnavailable || procurementRiskIndex === null
      ? `Supplier dependency evidence ${executiveEvidenceLabel.toLowerCase()}`
      : procurementRiskIndex >= 50
        ? "Supplier dependency"
        : "Low risk exposure",
    commercialEvidenceUnavailable
      ? `Supplier competition evidence ${executiveEvidenceLabel.toLowerCase()}`
      : supplierParticipationCount <= 3
        ? "Limited supplier competition"
        : "Healthy supplier participation",
    constructionClassificationScore < 60
      ? "Low RFQ classification maturity"
      : "Structured RFQ intelligence active",
  ];

  const executiveBrief =
    decisionSupportReadiness !== null && procurementRiskIndex !== null
      ? buildExecutiveBrief({
          opportunity: {
            topCategory,
            potentialSavings: observedCommercialOpportunity,
            avgQuotesPerRfq,
            supplierCount: supplierParticipationCount,
            commercialEvidenceState: commercialInsights.state,
          },
          executiveRecommendation: executiveCommandRecommendation,
          decisionSupportReadinessScore: decisionSupportReadiness.score,
          topRisk,
          procurementRiskIndex,
          supplierCount: supplierParticipationCount,
          avgQuotesPerRfq,
          classificationScore: constructionClassificationScore,
        })
      : null;
  const executiveNarrative = executiveBrief
    ? buildExecutiveNarrative(executiveBrief)
    : null;

  return (
    <main className="analytics-report-root min-h-screen bg-transparent px-4 py-5 text-white sm:px-6 lg:px-8 lg:py-6">
      <div className="mx-auto w-full max-w-[1600px]">
        <BoardReportCover
          companyName={reportCompanyName}
          generatedAt={reportGeneratedAt}
        />

        <TableOfContents
          companyName={reportCompanyName}
          generatedAt={reportGeneratedAt}
        />

        {enterpriseProcurementScore !== null &&
        procurementRiskIndex !== null &&
        decisionSupportReadiness !== null ? (
          <ExecutiveSummary
          companyName={reportCompanyName}
          generatedAt={reportGeneratedAt}
          procurementHealth={enterpriseProcurementScore}
          opportunityValue={commercialOpportunityDisplay}
          riskLevel={
            procurementRiskIndex >= 70
              ? "High"
              : procurementRiskIndex >= 40
                ? "Moderate"
                : "Low"
          }
          decisionSupportReadiness={decisionSupportReadiness.label}
          findings={[
            internalPerformanceNarrative,
            executiveCommandRecommendation,
            procurementOutlook,
          ]}
          risks={decisionEvidenceRisks}
          actions={[
            internalPerformanceRecommendation,
            executiveCommandRecommendation,
            boardForecastPriority,
          ]}
          recommendation={internalPerformanceRecommendation}
          />
        ) : (
          <section className="rounded-3xl border border-amber-300/20 bg-amber-400/[0.04] p-6 text-white">
            <p className="np-type-eyebrow text-amber-300!">Executive Summary</p>
            <h2 className="np-type-h2 mt-3">{executiveEvidenceLabel}</h2>
            <p className="np-type-body mt-3">
              Executive scoring is unavailable under the current supplier and
              commercial evidence controls.
            </p>
          </section>
        )}

        <BoardExecutiveReport
          companyName={reportCompanyName}
          generatedAt={reportGeneratedAt}
          decisionStatement={
            executiveNarrative
              ? `${executiveNarrative.headline} ${executiveNarrative.summary}`
              : `${executiveEvidenceLabel}: executive scoring is unavailable under the current supplier and commercial evidence controls.`
          }
          recommendation={internalPerformanceRecommendation}
          boardPriority={boardForecastPriority}
          enterpriseScore={enterpriseProcurementScore}
          boardReadiness={boardReadinessScore}
          decisionReadiness={decisionSupportReadiness?.score ?? null}
          riskIndex={procurementRiskIndex}
          riskComplianceEvidence={governedRiskComplianceEvidence}
          opportunityValue={commercialOpportunityDisplay}
          procurementVolume={procurementVolumeDisplay}
          awardedVolume={
            unavailableCommercialEvidenceLabel ??
            `$${awardedVolume.toLocaleString()}`
          }
          awardRate={`${awardRate}%`}
          supplierCount={supplierParticipationCount}
          supplierEngagement={supplierEngagementScore}
          supplierDiversification={supplierDiversificationScore}
          portfolioHealth={portfolioHealthIndex}
          supplierCommercialEvidenceState={
            supplierCommercialEvidenceState
          }
          forecastConfidence={forecastConfidenceLevel}
          forecastNarrative={boardForecastBriefing}
          benchmarkPosition={internalPerformancePosition}
          benchmarkScore={benchmarkReadinessScore}
          findings={[
            internalPerformanceNarrative,
            procurementOutlook,
            executiveSummary,
          ]}
          risks={decisionEvidenceRisks}
          opportunities={topQuarterOpportunities}
          actions={[
            internalPerformanceRecommendation,
            executiveCommandRecommendation,
            boardForecastPriority,
          ]}
        />

        <ReportEndPage
          companyName={reportCompanyName}
          generatedAt={reportGeneratedAt}
        />

        <div className="analytics-screen-content">

        <ReportSectionDivider
          number={1}
          title="Executive Overview"
          description="Enterprise posture, commercial opportunity, performance signals, and the priorities requiring board attention."
          companyName={reportCompanyName}
          generatedAt={reportGeneratedAt}
        />

        <div className="flex min-h-10 items-center justify-between gap-4">
          <Link
            href="/dashboard"
            className="group inline-flex min-h-10 items-center gap-2 rounded-lg text-sm font-semibold text-slate-400 transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C8A646]/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[#07111F]"
          >
            <span
              aria-hidden="true"
              className="transition-transform group-hover:-translate-x-1"
            >
              ←
            </span>
            Back to Dashboard
          </Link>

          <p className="np-type-meta hidden sm:block">
            Boardroom intelligence workspace
          </p>
        </div>

        <header className="relative mt-3 overflow-hidden rounded-3xl border border-white/10 bg-[#061426]/88 shadow-executive">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#C8A646]/70 to-transparent"
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -right-24 -top-32 h-80 w-80 rounded-full bg-[#2CC4E8]/[0.055] blur-3xl"
          />

          <div className="relative px-5 py-5 sm:px-6 lg:px-7">
            <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(520px,0.82fr)] xl:items-center">
              <div className="min-w-0 max-w-4xl">
                <div className="flex flex-wrap items-center gap-3">
                  <p className="np-type-eyebrow">
                    Nexus Pavilion Executive Intelligence
                  </p>
                  <span className="hidden h-1 w-1 rounded-full bg-white/20 sm:block" />
                  <p className="np-type-meta">
                    Current operating posture
                  </p>
                </div>

                <h1 className="np-type-h1 mt-2.5 max-w-4xl">
                  Executive Procurement Operating System
                </h1>

                <p className="np-type-body mt-2.5 max-w-3xl">
                  A decision-first command environment for procurement
                  performance, risk exposure, supplier resilience, opportunity
                  capture, and board-level readiness.
                </p>
              </div>

              <section
                aria-label="Executive operating posture"
                className="min-w-0"
              >
                <div className="mb-2.5 flex items-center justify-between gap-4">
                  <p className="np-type-meta">
                    Operating posture
                  </p>
                  <p className="np-type-meta text-[#9BE8F8]!">
                    Validated intelligence
                  </p>
                </div>

                <div className="grid grid-cols-2 overflow-hidden rounded-2xl border border-white/10 bg-black/10 sm:grid-cols-4">
                  {[
                    ["Enterprise", formatCurrentEvidenceScore(enterpriseProcurementScore)],
                    [
                      "Decision readiness",
                      formatCurrentEvidenceScore(decisionSupportReadiness?.score ?? null),
                    ],
                    ["Risk exposure", formatCurrentEvidenceScore(procurementRiskIndex)],
                    ["Board readiness", formatCurrentEvidenceScore(boardReadinessScore)],
                  ].map(([label, value], index) => (
                    <div
                      key={label}
                      className={`min-w-0 px-3 py-3.5 sm:px-4 ${
                        index % 2 === 1 ? "border-l border-white/10" : ""
                      } ${index >= 2 ? "border-t border-white/10 sm:border-t-0" : ""} ${
                        index > 0 ? "sm:border-l sm:border-white/10" : ""
                      }`}
                    >
                      <p className="np-type-meta truncate">
                        {label}
                      </p>
                      <p className="np-type-kpi mt-1.5 text-lg tabular-nums">
                        {value}
                      </p>
                    </div>
                  ))}
                </div>
              </section>
            </div>
          </div>

          <nav
            aria-label="Analytics sections"
            className="relative overflow-x-auto border-t border-white/10 bg-black/10 px-3 py-2 sm:px-4"
          >
            <div className="flex min-w-max items-center gap-1.5">
              {[
                ["#executive-brief", "Executive Overview"],
                ["#decision-command-center", "Decision Intelligence"],
                ["#procurement-intelligence", "Portfolio Intelligence"],
                ["#board-intelligence", "Board & Governance"],
                ["#reports", "Reports & Distribution"],
              ].map(([href, label]) => (
                <a
                  key={href}
                  href={href}
                  className="np-type-meta inline-flex min-h-8 items-center rounded-lg border border-transparent px-3 text-slate-400 transition-colors hover:border-white/10 hover:bg-white/[0.045] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C8A646]/70"
                >
                  {label}
                </a>
              ))}
            </div>
          </nav>
        </header>

        <section id="executive-brief" className="relative scroll-mt-24 pt-3">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute left-1/2 top-0 h-3 w-px -translate-x-1/2 bg-gradient-to-b from-[#C8A646]/35 to-transparent"
          />
          {executiveBrief && executiveNarrative && enterpriseProcurementScore !== null ? (
            <BoardroomSnapshot
              executiveBrief={executiveBrief}
              quotedPortfolioValue={procurementVolume}
              commercialOpportunityValue={commercialOpportunityDisplay}
              commercialOpportunityContext={commercialInsights.limitation}
              enterpriseProcurementScore={enterpriseProcurementScore}
              constructionClassificationScore={constructionClassificationScore}
              executiveNarrative={executiveNarrative}
            />
          ) : (
            <div className="rounded-3xl border border-amber-300/15 bg-amber-400/[0.04] p-6 text-white">
              <p className="np-type-eyebrow text-amber-300!">Executive Overview</p>
              <h2 className="np-type-h2 mt-3">{executiveEvidenceLabel}</h2>
              <p className="np-type-body mt-3">
                Composite executive intelligence is withheld while supplier
                and commercial evidence is unavailable.
              </p>
            </div>
          )}
        </section>
        <ReportSectionDivider
          number={2}
          title="Decision Intelligence"
          description="Decision readiness, commercial exposure, opportunity capture, and the evidence supporting executive action."
          companyName={reportCompanyName}
          generatedAt={reportGeneratedAt}
          tone="light"
        />

        <section
          id="decision-command"
          className="scroll-mt-24 mt-6 overflow-hidden rounded-3xl border border-white/10 bg-[#061426]/82 text-white"
        >
          <div className="border-b border-white/10 px-5 py-5 sm:px-6 lg:px-7">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="np-type-eyebrow">
                  Portfolio Intelligence
                </p>

                <h2 className="np-type-h2 mt-2">
                  Procurement Structure & Classification
                </h2>

                <p className="np-type-body mt-2.5 max-w-3xl">
                  {executiveCommandRecommendation}
                </p>
              </div>

              <div className="flex w-fit items-center gap-4 rounded-2xl border border-white/10 bg-white/[0.035] px-4 py-3">
                <div>
                  <p className="np-type-meta">
                    Classification maturity
                  </p>
                  <p className="np-type-kpi mt-1 text-xl tabular-nums">
                    {constructionClassificationScore}/100
                  </p>
                </div>
                <span className="h-9 w-px bg-white/10" />
                <p className="np-type-meta max-w-40">
                  {procurementMixStatus}
                </p>
              </div>
            </div>
          </div>

          <div className="p-5 sm:p-6 lg:p-7">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="max-w-4xl">
                <p className="np-type-meta">
                  RFQ classification profile
                </p>

                <h3 className="np-type-h3 mt-2">
                  Construction Procurement Mix
                </h3>

                <p className="np-type-body mt-2.5">
                  A consolidated view of procurement scope, sourcing method, and
                  contract structure used to strengthen supplier matching, quote
                  comparison, risk scoring, and executive interpretation.
                </p>
              </div>

              <div className="inline-flex w-fit items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.035] px-4 py-3">
                <div>
                  <p className="np-type-meta">
                    Classification Maturity
                  </p>
                  <p className="np-type-kpi mt-1 text-xl tabular-nums">
                    {constructionClassificationScore}/100
                  </p>
                </div>
                <span className="h-9 w-px bg-white/10" />
                <p className="np-type-meta max-w-36">
                  {procurementMixStatus}
                </p>
              </div>
            </div>

            <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1.25fr)_minmax(380px,0.75fr)]">
              <div className="rounded-3xl border border-white/10 bg-black/15 p-4 sm:p-5">
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="np-type-meta">
                      Procurement Scope Distribution
                    </p>
                    <p className="np-type-body mt-1">
                      Dominant scope: {dominantScope}
                    </p>
                  </div>
                  <span className="np-type-meta rounded-full border border-white/10 bg-white/[0.045] px-3 py-1">
                    {totalRfqs} classified RFQs
                  </span>
                </div>

                <AnalyticsChart data={rfqMixChartData} />

                <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {[
                    ["Material", materialRfqs],
                    ["Trade", tradeRfqs],
                    ["Equipment", equipmentRfqs],
                    ["Service", serviceRfqs],
                  ].map(([label, value]) => (
                    <div
                      key={label}
                      className="rounded-2xl border border-white/10 bg-white/[0.035] px-4 py-3"
                    >
                      <p className="np-type-meta">
                        {label}
                      </p>
                      <p className="np-type-kpi mt-2 text-2xl tabular-nums">
                        {value}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid gap-4">
                <div className="rounded-3xl border border-white/10 bg-white/[0.045] p-5 sm:p-6">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="np-type-meta">
                        Sourcing Profile
                      </p>
                      <h4 className="np-type-h3 mt-2">
                        {dominantSourcing} Led
                      </h4>
                    </div>
                    <span className="np-type-meta rounded-full border border-[#2CC4E8]/20 bg-[#2CC4E8]/10 px-3 py-1 text-[#9BE8F8]!">
                      {openMarketRfqs + invitedRfqs + sealedBidRfqs} workflows
                    </span>
                  </div>

                  <div className="mt-5 grid gap-3 sm:grid-cols-3 xl:grid-cols-1">
                    {[
                      ["Open Market", openMarketRfqs],
                      ["Invited", invitedRfqs],
                      ["Sealed Bid", sealedBidRfqs],
                    ].map(([label, value]) => (
                      <div
                        key={label}
                        className="flex items-center justify-between rounded-2xl border border-white/10 bg-[#061426]/70 px-4 py-3"
                      >
                        <p className="np-type-meta">
                          {label}
                        </p>
                        <p className="np-type-kpi text-lg tabular-nums">{value}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-3xl border border-white/10 bg-white/[0.045] p-5 sm:p-6">
                  <p className="np-type-meta">
                    Contract Structure
                  </p>

                  <div className="mt-4 grid grid-cols-2 gap-3">
                    <div className="rounded-2xl border border-white/10 bg-[#061426]/70 p-4">
                      <p className="np-type-meta">
                        Project Specific
                      </p>
                      <p className="np-type-kpi mt-2 text-2xl tabular-nums">
                        {projectSpecificRfqs}
                      </p>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-[#061426]/70 p-4">
                      <p className="np-type-meta">
                        Framework
                      </p>
                      <p className="np-type-kpi mt-2 text-2xl tabular-nums">
                        {frameworkRfqs}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-amber-300/15 bg-amber-400/[0.04] p-4 sm:p-5">
                  <p className="np-type-eyebrow text-amber-300!">
                    Executive Interpretation
                  </p>
                  <p className="np-type-body mt-2.5">
                    The portfolio is currently led by{" "}
                    {dominantScope.toLowerCase()} procurement and{" "}
                    {dominantSourcing.toLowerCase()} sourcing. Classification
                    maturity is
                    {` ${constructionClassificationScore}/100`}; incomplete
                    scope, sourcing, or framework records should be resolved
                    before category-level intelligence is used for
                    higher-confidence executive decisions.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <IntelligenceDashboard
          executiveAlerts={executiveAlerts}
          executiveRecommendations={executiveRecommendations}
          dailyExecutiveBriefing={dailyExecutiveBriefing}
          decisionSupportReadiness={decisionSupportReadiness}
          supplierReliabilityScore={supplierReliabilityScore}
          supplierCommercialEvidenceState={
            supplierCommercialEvidenceState
          }
        />

        <section className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            title="Health Score"
            value={formatCurrentEvidenceScore(procurementHealthScore)}
          />
          <MetricCard title="Procurement Health" value={procurementHealth} />
          <MetricCard title="Competition Index" value={competitionIndex} />
          <MetricCard
            title="Avg Quotes / RFQ"
            value={
              unavailableCommercialEvidenceLabel ?? avgQuotesPerRfq.toString()
            }
          />
        </section>
        <section className="mt-6 rounded-3xl border border-white/10 bg-[#061426]/82 p-5 text-white sm:p-6 lg:p-7">
          <p className="np-type-eyebrow">
            Decision Intelligence
          </p>

          <h2 className="np-type-h2 mt-2">
            Executive Decision Support Readiness
          </h2>
          <p className="np-type-body mt-2.5 max-w-4xl">
            Nexus Pavilion evaluates whether procurement intelligence is
            reliable enough to support executive interpretation, board
            reporting, and strategic decision guidance.
          </p>

          <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <MetricCard
              title="Readiness Score"
              value={formatCurrentEvidenceScore(decisionSupportReadiness?.score ?? null)}
            />
            <MetricCard
              title="Readiness Level"
              value={decisionSupportReadiness?.label ?? executiveEvidenceLabel}
            />
            <MetricCard
              title="Decision Evidence"
              value={formatCurrentEvidenceScore(decisionSupportReadiness?.score ?? null)}
            />
            <MetricCard
              title="Evidence Readiness"
              value={internalEvidenceReadiness}
            />
          </div>

          <div className="mt-5 grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
            <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-5">
              <p className="np-type-meta">
                Readiness Drivers
              </p>

              <div className="mt-4 space-y-3">
                {decisionEvidenceDrivers.map((driver) => (
                  <div
                    key={driver}
                    className="rounded-2xl border border-white/10 bg-[#061426]/70 p-4"
                  >
                    <p className="np-type-body">
                      {driver}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-[#2CC4E8]/15 bg-[#2CC4E8]/[0.045] p-5 text-white">
              <p className="np-type-eyebrow">
                Executive Guidance
              </p>

              <h3 className="np-type-h3 mt-4">
                {decisionSupportReadiness?.label ?? executiveEvidenceLabel}
              </h3>

              <p className="np-type-body mt-4">
                {decisionSupportReadiness?.guidance ??
                  "Executive guidance is unavailable until sealed supplier and commercial evidence becomes available."}
              </p>
            </div>
          </div>

          <div className="mt-5 rounded-2xl border border-amber-300/15 bg-amber-400/[0.04] p-5">
            <p className="np-type-eyebrow text-amber-300!">
              Readiness Constraints
            </p>

            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {decisionEvidenceRisks.map((risk) => (
                <div
                  key={risk}
                  className="rounded-2xl border border-white/10 bg-[#061426]/70 p-4"
                >
                  <p className="np-type-body">{risk}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <div id="opportunity-intelligence" className="scroll-mt-6">
          <ExecutiveOpportunityRanking
            opportunities={executiveOpportunityRanking}
            intelligence={executiveOpportunityIntelligence}
            commercialEvidenceState={supplierCommercialEvidenceState}
          />
        </div>

        <div id="decision-command-center" className="scroll-mt-6 mt-8">
          <CEOActionCenter
            ceoOperatingStatus={ceoOperatingStatus}
            ceoDecisionPosture={ceoDecisionPosture}
            executiveBenchmarkStatus={executiveBenchmarkStatus}
            executiveCommandRecommendation={executiveCommandRecommendation}
            ceoActionCenter={ceoActionCenter}
            commercialEvidenceState={supplierCommercialEvidenceState}
          />
        </div>

        <section id="executive-intelligence" className="scroll-mt-6">
          <ExecutiveDashboard
            ceoMorningBrief={ceoMorningBrief}
            ceoReadinessScore={ceoReadinessScore}
            ceoPriorityLevel={ceoPriorityLevel}
            ceoRiskLevel={ceoRiskLevel}
            ceoOpportunityLevel={ceoOpportunityLevel}
            ceoPriorityQueue={ceoPriorityQueue}
            ceoCriticalRisks={ceoCriticalRisks}
            ceoStrategicOpportunities={ceoStrategicOpportunities}
            boardHealthIndex={boardHealthIndex}
            benchmarkReadinessScore={benchmarkReadinessScore}
            enterpriseCommandStatus={enterpriseCommandStatus}
            riskCommandStatus={riskCommandStatus}
            opportunityCommandStatus={opportunityCommandStatus}
            executiveCommandRecommendation={executiveCommandRecommendation}
            riskComplianceEvidence={riskComplianceEvidence}
            procurementMaturityScore={procurementMaturityScore}
            decisionSupportReadiness={decisionSupportReadiness}
            procurementOutlook={procurementOutlook}
            riskTrajectory={riskTrajectory}
            opportunityTrajectory={opportunityTrajectory}
            executiveForecastStatus={executiveForecastStatus}
            forecast30Days={forecast30Days}
            forecast60Days={forecast60Days}
            forecast90Days={forecast90Days}
            boardForecastNarrative={boardForecastNarrative}
            bestCaseScenario={bestCaseScenario}
            expectedCaseScenario={expectedCaseScenario}
            riskCaseScenario={riskCaseScenario}
            forecastConfidenceLevel={forecastConfidenceLevel}
            executiveScenarioStatus={executiveScenarioStatus}
            executivePresentationExports={executivePresentationExports}
            exportReadinessStatus={exportReadinessStatus}
            benchmarkMatrix={benchmarkMatrix}
            benchmarkPeerPosition={internalPerformancePosition}
            benchmarkStatus={internalPerformanceStatus}
            benchmarkConfidence={internalEvidenceReadiness}
            benchmarkNarrative={internalPerformanceNarrative}
            benchmarkBoardRecommendation={internalPerformanceRecommendation}
            supplierReliabilityScore={supplierReliabilityScore}
            supplierCommercialEvidenceState={
              supplierCommercialEvidenceState
            }
          />
        </section>
        <section className="mt-8 rounded-3xl border border-white/10 bg-slate-950 p-5 text-white shadow-executive sm:p-7 lg:p-8">
          <p className="np-type-eyebrow">
            Board Historical Pattern Briefing
          </p>

          <h2 className="np-type-h2 mt-3">
            Executive Historical Pattern Narrative
          </h2>

          <div className="mt-8 grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
              <p className="np-type-eyebrow">
                Board Priority
              </p>

              <h3 className="np-type-h3 mt-3">
                {boardForecastPriority}
              </h3>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
              <p className="np-type-eyebrow">
                Decision Evidence Readiness
              </p>

              <h3 className="np-type-h3 mt-3">
                {forecastConfidenceLevel}
              </h3>
            </div>
          </div>

          <div className="mt-8 rounded-3xl border border-white/10 bg-white/5 p-6">
            <p className="np-type-eyebrow">
              Board Narrative
            </p>

            <p className="np-type-body mt-4">
              {boardForecastBriefing}
            </p>
          </div>
        </section>

        <ReportSectionDivider
          number={3}
          title="Board & Governance"
          description="Historical pattern evidence, internal performance position, governance readiness, and board-level risk priorities."
          companyName={reportCompanyName}
          generatedAt={reportGeneratedAt}
        />

        <section id="board-intelligence" className="scroll-mt-6">
          {boardReadinessScore !== null ? (
            <BoardDashboard
            boardReadinessScore={boardReadinessScore}
            governanceReadiness={governanceReadiness}
            financialVisibility={financialVisibility}
            riskVisibility={riskVisibility}
            boardRecommendation={boardRecommendation}
            boardRiskPriorities={boardRiskPriorities}
            boardPresentationMetrics={boardPresentationMetrics}
            boardPresentationReadiness={boardPresentationReadiness}
            boardNarrative={boardNarrative}
            boardDeckSlides={boardDeckSlides}
            boardAutomationItems={boardAutomationItems}
            boardAutomationStatus={boardAutomationStatus}
            boardPackageLifecycle={boardPackageLifecycle}
            boardPackageStages={boardPackageStages}
            boardDistributionChannels={boardDistributionChannels}
            boardDistributionReadiness={boardDistributionReadiness}
            boardApprovalStages={boardApprovalStages}
            boardApprovalStatus={boardApprovalStatus}
            />
          ) : (
            <div className="rounded-3xl border border-amber-300/15 bg-amber-400/[0.04] p-6 text-white">
              <p className="np-type-eyebrow text-amber-300!">Board Intelligence</p>
              <h2 className="np-type-h2 mt-3">{executiveEvidenceLabel}</h2>
              <p className="np-type-body mt-3">
                Board readiness scoring is withheld while required supplier
                and commercial evidence is unavailable.
              </p>
            </div>
          )}
        </section>

        <section className="mt-8 rounded-3xl border border-white/10 bg-[#061426]/88 p-5 text-white shadow-executive sm:p-7 lg:p-8">
          <p className="np-type-eyebrow">
            Executive Procurement Intelligence
          </p>

          <div className="mt-4 grid gap-6 lg:grid-cols-[1.3fr_0.7fr]">
            <div>
              <h2 className="np-type-h2">
                Procurement Health Summary
              </h2>

              <p className="np-type-body mt-3 max-w-4xl">
                {executiveSummary}
              </p>
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/[0.045] p-6">
              <p className="np-type-meta">
                Evidence Signals
              </p>

              <div className="mt-4 space-y-3">
                <SignalRow
                  label="Supplier Activity"
                  value={formatCurrentEvidenceScore(supplierActivityScore)}
                />
                <SignalRow
                  label="Competition"
                  value={formatCurrentEvidenceScore(competitionScore)}
                />
                <SignalRow
                  label="Quotation Award Signal"
                  value={formatCurrentEvidenceScore(awardScore)}
                />
                <SignalRow
                  label="RFQ Maturity"
                  value={`${constructionClassificationScore}/100`}
                />
              </div>
            </div>
          </div>
        </section>

        <section className="mt-8 grid gap-6 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard title="Total RFQs" value={totalRfqs.toString()} />
          <MetricCard title="Active RFQs" value={activeRfqs.toString()} />
          <MetricCard
            title="Awarded Contracts"
            value={
              unavailableCommercialEvidenceLabel ?? awardedContracts.toString()
            }
          />
          <MetricCard
            title="Supplier Quotes"
            value={
              unavailableCommercialEvidenceLabel ?? supplierQuotes.toString()
            }
          />
        </section>

        <section className="mt-6 grid gap-6 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            title="Procurement Volume"
            value={procurementVolumeDisplay}
          />
          <MetricCard
            title="Awarded Volume"
            value={
              unavailableCommercialEvidenceLabel ??
              `$${awardedVolume.toLocaleString()}`
            }
          />
          <MetricCard
            title="Average Quote"
            value={
              unavailableCommercialEvidenceLabel ??
              `$${averageQuote.toLocaleString()}`
            }
          />
          <MetricCard
            title="Award Rate"
            value={unavailableCommercialEvidenceLabel ?? `${awardRate}%`}
          />
        </section>

        <ReportSectionDivider
          number={4}
          title="Portfolio Intelligence"
          description="Procurement structure, supplier resilience, sourcing performance, and portfolio health across active activity."
          companyName={reportCompanyName}
          generatedAt={reportGeneratedAt}
          tone="light"
        />

        <section id="procurement-intelligence" className="scroll-mt-6">
          <ProcurementDashboard
            procurementCommandRoom={procurementCommandRoom}
            procurementCommandRoomStatus={procurementCommandRoomStatus}
            procurementCommandCenter={procurementCommandCenter}
            commandCenterStatus={commandCenterStatus}
            executiveCommandRecommendation={executiveCommandRecommendation}
            activityChartData={activityChartData}
            valueChartData={valueChartData}
            rfqDecisionReadiness={rfqDecisionReadiness}
            rfqList={rfqList}
            procurementScopeLabels={PROCUREMENT_SCOPE_LABELS}
            sourcingMethodLabels={SOURCING_METHOD_LABELS}
            contractFrameworkLabels={CONTRACT_FRAMEWORK_LABELS}
            categoryIntelligence={categoryIntelligence}
            supplierCommercialEvidenceState={
              supplierCommercialEvidenceState
            }
            portfolioHealthIndex={portfolioHealthIndex}
            suppliersWithAwardHistory={suppliersWithAwardHistory}
            suppliersWithMultipleAwards={suppliersWithMultipleAwards}
            suppliersWithLimitedQuoteHistory={
              suppliersWithLimitedQuoteHistory
            }
            supplierDiversificationScore={supplierDiversificationScore}
            supplierParticipationCount={supplierParticipationCount}
            awardHistoryCoverage={awardHistoryCoverage}
            commercialInsights={commercialInsights}
            procurementInsights={governedProcurementInsights}
            portfolioStatus={portfolioStatus}
            portfolioRecommendations={portfolioRecommendations}
          />
        </section>

        <section id="reports" className="scroll-mt-6">
          <ExecutiveExportPanel />
        </section>

        <section className="mt-8 rounded-3xl border border-white/10 bg-[#061426]/88 p-5 text-white shadow-executive sm:p-7 lg:p-8">
          <p className="np-type-eyebrow">
            Executive Internal Performance
          </p>

          <h2 className="np-type-h2 mt-3">
            Internal Procurement Performance
          </h2>

          <p className="np-type-body mt-4 max-w-4xl">
            Assess procurement maturity, supplier network strength, risk
            exposure, internal operating position, and board readiness using
            validated Nexus Pavilion operating data. This is not an external
            peer or industry benchmark.
          </p>

          <div className="mt-8 grid gap-6 md:grid-cols-2 xl:grid-cols-5">
            <MetricCard
              title="Internal Benchmark Readiness"
              value={formatCurrentEvidenceScore(benchmarkReadinessScore)}
            />
            <MetricCard
              title="Readiness Status"
              value={executiveBenchmarkStatus}
            />
            <MetricCard
              title="Internal Position"
              value={internalPerformancePosition}
            />
            <MetricCard
              title="Supplier Network"
              value={supplierNetworkBenchmark}
            />
            <MetricCard title="Risk Position" value={riskBenchmark} />
          </div>

          <div className="mt-8 rounded-3xl border border-white/10 bg-slate-950 p-6">
            <p className="np-type-eyebrow">
              Internal Performance Interpretation
            </p>

            <h3 className="np-type-h3 mt-4">
              {internalPerformancePosition}
            </h3>

            <p className="np-type-body mt-4">
              {internalPerformanceNarrative}
            </p>

            <p className="np-type-body mt-4">
              {internalPerformanceRecommendation}
            </p>
          </div>
        </section>

        <section className="mt-8 rounded-3xl border border-white/10 bg-[#061426]/88 p-5 text-white shadow-executive sm:p-7 lg:p-8">
          <p className="np-type-eyebrow">
            Executive Procurement Intelligence
          </p>

          <h2 className="np-type-h2 mt-3">
            Board Decision Intelligence
          </h2>

          <p className="np-type-body mt-4 max-w-4xl">
            Executive interpretation layer converting procurement metrics,
            internal performance intelligence, supplier signals, and risk indicators into
            board-level actions.
          </p>
          <div className="mt-8 grid gap-6 lg:grid-cols-3">
            <div className="rounded-3xl border border-red-300/20 bg-red-400/10 p-6">
              <p className="np-type-meta text-red-300!">
                Board Risks
              </p>

              <div className="mt-4 space-y-3">
                {topQuarterRisks.map((risk) => (
                  <div
                    key={risk}
                    className="rounded-2xl border border-white/10 bg-[#061426]/70 p-4"
                  >
                    <p className="np-type-body">
                      {risk}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-3xl border border-emerald-300/20 bg-emerald-400/10 p-6">
              <p className="np-type-meta text-emerald-300!">
                Board Opportunities
              </p>

              <div className="mt-4 space-y-3">
                {topQuarterOpportunities.map((opportunity) => (
                  <div
                    key={opportunity}
                    className="rounded-2xl border border-white/10 bg-[#061426]/70 p-4"
                  >
                    <p className="np-type-body">
                      {opportunity}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-3xl border border-[#2CC4E8]/20 bg-[#2CC4E8]/10 p-6">
              <p className="np-type-meta text-[#9BE8F8]!">
                Executive Actions
              </p>

              <div className="mt-4 space-y-4">
                <div className="rounded-2xl border border-white/10 bg-[#061426]/70 p-4">
                  <p className="np-type-meta text-[#9BE8F8]!">
                    Immediate
                  </p>

                  <p className="np-type-body mt-2">
                    {boardRecommendation}
                  </p>
                </div>

                <div className="rounded-2xl border border-white/10 bg-[#061426]/70 p-4">
                  <p className="np-type-meta text-[#9BE8F8]!">
                    90 Days
                  </p>

                  <p className="np-type-body mt-2">
                    {executiveCommandRecommendation}
                  </p>
                </div>

                <div className="rounded-2xl border border-white/10 bg-[#061426]/70 p-4">
                  <p className="np-type-meta text-[#9BE8F8]!">
                    Strategic Position
                  </p>

                  <p className="np-type-body mt-2">
                    {executiveBenchmarkStatus}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        

        <section className="mt-8 rounded-3xl border border-white/10 bg-[#061426]/88 p-5 text-white shadow-executive sm:p-7 lg:p-8">
          <p className="np-type-eyebrow">
            Board Presentation Layer
          </p>

          <h2 className="np-type-h2 mt-3">
            Board Executive Summary
          </h2>

          <p className="np-type-body mt-4 max-w-4xl">
            Board-facing procurement summary consolidating readiness, enterprise
            status, risk position, and strategic direction from validated
            executive intelligence.
          </p>

          <div className="mt-8 grid gap-6 md:grid-cols-2 xl:grid-cols-4">
            <MetricCard
              title="Board Readiness"
              value={boardPresentationStatus}
            />
            <MetricCard
              title="Enterprise Status"
              value={enterpriseCommandStatus}
            />
            <MetricCard title="Risk Position" value={boardRiskPosition} />
            <MetricCard
              title="Strategic Position"
              value={boardStrategicPosition}
            />
          </div>

          <div className="mt-8 rounded-3xl border border-white/10 bg-white/[0.045] p-6">
            <p className="np-type-meta">
              Board Summary
            </p>

            <p className="np-type-body mt-4">
              {executiveCommandRecommendation}
            </p>
          </div>
        </section>

        <ReportSectionDivider
          number={5}
          title="Risk Intelligence"
          description="Concentration, supplier dependency, confidence constraints, and the actions required to protect decision quality."
          companyName={reportCompanyName}
          generatedAt={reportGeneratedAt}
        />

        <section id="risk-intelligence" className="scroll-mt-6">
          <ExecutiveRiskIntelligence
            supplierRanking={supplierRanking}
            supplierCommercialEvidenceState={supplierCommercialEvidenceState}
          />
        </section>

        <section className="mt-8 rounded-3xl border border-white/10 bg-slate-950 p-5 text-white shadow-executive sm:p-7 lg:p-8">
          <p className="np-type-eyebrow">
            Executive Operating System
          </p>

          <h2 className="np-type-h2 mt-3">Enterprise Command Layer</h2>

          <p className="np-type-body mt-4 max-w-4xl">
            Unified executive operating view across procurement performance,
            benchmark readiness, board health, enterprise risk, supplier
            engagement, and opportunity intelligence.
          </p>

          <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
            <DarkMetric
              title="Board Health"
              value={formatCurrentEvidenceScore(boardHealthIndex)}
            />
            <DarkMetric
              title="Benchmark"
              value={formatCurrentEvidenceScore(benchmarkReadinessScore)}
            />
            <DarkMetric title="Enterprise" value={enterpriseCommandStatus} />
            <DarkMetric title="Risk" value={riskCommandStatus} />
            <DarkMetric title="Opportunity" value={opportunityCommandStatus} />
          </div>

          <div className="mt-6 rounded-3xl border border-white/10 bg-white/5 p-6">
            <p className="np-type-eyebrow">
              Executive Recommendation
            </p>

            <p className="np-type-body mt-4">
              {executiveCommandRecommendation}
            </p>
          </div>
        </section>

        {executiveBrief && executiveNarrative ? (
          <ProcurementCopilotIntelligence
            executiveBrief={executiveBrief}
            executiveNarrative={executiveNarrative}
          />
        ) : null}

        <section id="board-reporting" className="scroll-mt-6">
          {executiveScoreEvidence.state === "available" ? (
            <BoardReportGenerator
            procurementRiskIndex={executiveScoreEvidence.procurementRiskIndex}
            procurementMaturityScore={executiveScoreEvidence.procurementMaturityScore}
            decisionSupportReadinessScore={executiveScoreEvidence.decisionSupportReadiness.score}
            dataQualityScore={executiveScoreEvidence.dataQualityScore}
            supplierDependencyRisk={supplierDependencyRisk}
            concentrationLevel={concentrationLevel}
            benchmarkReadinessScore={executiveScoreEvidence.benchmarkReadinessScore}
            boardHealthIndex={executiveScoreEvidence.boardHealthIndex}
            enterpriseProcurementScore={executiveScoreEvidence.enterpriseProcurementScore}
            executiveReadinessScore={executiveScoreEvidence.executiveReadinessScore}
            procurementEfficiencyScore={executiveScoreEvidence.procurementEfficiencyScore}
            supplierEngagementScore={executiveScoreEvidence.supplierEngagementScore}
            supplierCommercialEvidenceState={
              supplierCommercialEvidenceState
            }
            digitalMaturityScore={executiveScoreEvidence.digitalMaturityScore}
            />
          ) : (
            <LockedExecutiveOutput
              title="Board Reporting"
              evidenceState={executiveScoreEvidence.state}
            />
          )}
        </section>
        <section id="board-narrative" className="scroll-mt-6">
          {executiveScoreEvidence.state === "available" ? (
            <BoardNarrativeGenerator
            executiveBenchmarkStatus={executiveBenchmarkStatus}
            executiveStatus={executiveScoreEvidence.executiveStatus}
            boardHealthIndex={executiveScoreEvidence.boardHealthIndex}
            enterpriseProcurementScore={executiveScoreEvidence.enterpriseProcurementScore}
            executiveReadinessScore={executiveScoreEvidence.executiveReadinessScore}
            procurementRiskIndex={executiveScoreEvidence.procurementRiskIndex}
            supplierEngagementScore={executiveScoreEvidence.supplierEngagementScore}
            supplierCommercialEvidenceState={
              supplierCommercialEvidenceState
            }
            benchmarkReadinessScore={executiveScoreEvidence.benchmarkReadinessScore}
            boardRecommendation={boardRecommendation}
            procurementMaturityScore={executiveScoreEvidence.procurementMaturityScore}
            decisionSupportReadinessScore={executiveScoreEvidence.decisionSupportReadiness.score}
            decisionSupportReadinessLabel={executiveScoreEvidence.decisionSupportReadiness.label}
            />
          ) : (
            <LockedExecutiveOutput
              title="Board Narrative"
              evidenceState={executiveScoreEvidence.state}
            />
          )}
        </section>

        </div>
      </div>
    </main>
  );
}

function MetricCard({ title, value }: { title: string; value: string }) {
  return <ExecutiveMetricCard label={title} value={value} tone="blue" />;
}

function DarkMetric({ title, value }: { title: string; value: string }) {
  return <ExecutiveMetricCard label={title} value={value} tone="gold" />;
}

function SignalRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex min-w-0 items-center justify-between gap-4 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3">
      <p className="np-type-meta min-w-0">{label}</p>
      <p className="np-type-kpi shrink-0 text-sm tabular-nums">
        {value}
      </p>
    </div>
  );
}

function LockedExecutiveOutput({
  title,
  evidenceState,
}: {
  title: string;
  evidenceState: Exclude<CommercialEvidenceState, "available">;
}) {
  const evidenceLabel = getCommercialEvidenceLabel(evidenceState);

  return (
    <div className="mt-8 rounded-3xl border border-amber-300/15 bg-amber-400/[0.04] p-6 text-white">
      <p className="np-type-eyebrow text-amber-300!">{title}</p>
      <h2 className="np-type-h2 mt-3">{evidenceLabel}</h2>
      <p className="np-type-body mt-3">
        This output is unavailable under the current supplier and commercial
        evidence controls. No incomplete numeric score is reported.
      </p>
    </div>
  );
}
