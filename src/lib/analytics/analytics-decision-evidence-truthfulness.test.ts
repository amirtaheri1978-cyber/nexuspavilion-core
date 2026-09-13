import fs from "node:fs";
import path from "node:path";

import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import CategoryIntelligence from "@/components/analytics/procurement/category-intelligence";
import { ProcurementInsightMetrics } from "@/components/analytics/procurement/procurement-insight-metrics";
import { CEOActionCenter } from "@/components/analytics/ceo-action-center";
import { ProcurementCommandCenter } from "@/components/analytics/procurement-command-center";
import { SupplierPortfolioIntelligence } from "@/components/analytics/supplier-portfolio-intelligence";
import { ExecutiveOpportunityRanking } from "@/components/executive/executive-opportunity-ranking";
import ExecutiveRiskIntelligence from "@/components/executive-risk-intelligence";
import BoardReportGenerator from "@/components/board-report-generator";
import BoardNarrativeGenerator from "@/components/ai-board-narrative-generator";
import { BoardExecutiveReport } from "@/components/report-engine/BoardExecutiveReport";
import { IntelligenceDashboard } from "@/components/analytics/sections/intelligence-dashboard";
import { buildAnalyticsRfqSourceHref } from "@/lib/analytics/procurement-utils";
import { buildDecisionSupportReadiness } from "@/lib/analytics/executive/decision-support-readiness";
import { buildRiskComplianceEvidence } from "@/lib/analytics/executive/risk-intelligence";
import { calculateExecutiveReadiness } from "@/lib/executive/executive-readiness-score";
import { calculateExecutiveScore } from "@/lib/executive/executive-score";
import {
  buildAnalyticsExecutiveScoreEvidence,
  buildDecisionStreamRiskMessage,
  buildGovernedRiskComplianceEvidence,
  buildGovernedAnalyticsNarrative,
  buildRfqDecisionReadiness,
  buildSafeSubmissionParticipation,
  formatCommercialCurrencyEvidence,
  resolveCommercialEvidenceStateForSealedParticipation,
} from "@/app/analytics/page";
import { buildPortfolioIntelligence } from "@/lib/analytics/portfolio/portfolio-intelligence";

function readSource(relativePath: string) {
  return fs.readFileSync(path.join(process.cwd(), relativePath), "utf8");
}

function renderedText(markup: string) {
  return markup.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

const analyticsPage = readSource("src/app/analytics/page.tsx");
const dashboardPage = readSource("src/app/dashboard/page.tsx");
const analyticsVendors = readSource("src/app/analytics/vendors/page.tsx");
const publicCompanyPage = readSource("src/app/company/[slug]/page.tsx");
const publicDirectoryPage = readSource("src/app/directory/page.tsx");
const procurementContextRepository = readSource(
  "src/lib/procurement/procurement-context-repository.ts",
);
const evidenceEngine = readSource("src/components/ai-confidence-engine.tsx");
const decisionReadiness = readSource(
  "src/components/analytics/award-probability-forecast.tsx",
);
const boardReport = readSource("src/components/board-report-generator.tsx");
const boardNarrative = readSource(
  "src/components/ai-board-narrative-generator.tsx",
);
const visualQa = readSource(
  "src/app/dev/analytics-decision-evidence-visual-qa/page.tsx",
);
const executiveBenchmarkEngine = readSource(
  "src/components/analytics/Executive-benchmark-engine.tsx",
);
const executiveSummaryReport = readSource(
  "src/components/report-engine/ExecutiveSummary.tsx",
);
const boardExecutiveReport = readSource(
  "src/components/report-engine/BoardExecutiveReport.tsx",
);
const executiveHistoricalPatternSurface = readSource(
  "src/components/analytics/executive-forecast-engine.tsx",
);
const executiveHistoricalContextSurface = readSource(
  "src/components/analytics/executive-scenario-center.tsx",
);
const executiveTrendSource = readSource(
  "src/lib/analytics/executive/executive-trend.ts",
);
const analyticsProcurementUtils = readSource(
  "src/lib/analytics/procurement-utils.ts",
);
const analyticsSourceLoader = readSource(
  "src/lib/analytics/source-data/load-analytics-source-data.ts",
);
const executiveOpportunityRankingSurface = readSource(
  "src/components/executive/executive-opportunity-ranking.tsx",
);
const executiveRiskCenterSurface = readSource(
  "src/components/analytics/executive/executive-risk-center.tsx",
);
const analyticsChartSurface = readSource("src/components/analytics-chart.tsx");
const procurementPipelineSurface = readSource(
  "src/components/analytics/procurement-pipeline-intelligence.tsx",
);
const commercialInsightsSource = readSource(
  "src/lib/analytics/commercial/commercial-insights.ts",
);
const commercialInsightsPanel = readSource(
  "src/components/analytics/commercial/commercial-insights-panel.tsx",
);
const portfolioIntelligenceSource = readSource(
  "src/lib/analytics/portfolio/portfolio-intelligence.ts",
);
const analyticsNarrativeSource = readSource(
  "src/lib/analytics/narrative/analytics-narrative.ts",
);
const opportunityIntelligenceSource = readSource(
  "src/lib/analytics/executive/opportunity-intelligence.ts",
);
const boardroomSnapshotSurface = readSource(
  "src/components/analytics/boardroom-snapshot.tsx",
);

describe("analytics decision-evidence truthfulness", () => {
  it("normalizes the executive operating score across four defensible dimensions", () => {
    expect(calculateExecutiveScore(100, 80, 20, 60).score).toBe(80);
    expect(readSource("src/lib/executive/executive-score.ts")).not.toContain(
      "predictionAccuracy",
    );
  });

  it("normalizes executive readiness to enterprise and data quality", () => {
    expect(calculateExecutiveReadiness(70, 100)).toBe(83);
    expect(
      readSource("src/lib/executive/executive-readiness-score.ts"),
    ).not.toContain("predictionAccuracy");
  });

  it("uses three non-predictive readiness factors whose weights sum to one", () => {
    const result = buildDecisionSupportReadiness({
      dataQualityScore: 90,
      supplierEngagementScore: 75,
      benchmarkReadinessScore: 60,
    });

    expect(result.factors.map((factor) => factor.dimension)).toEqual([
      "data-quality",
      "supplier-engagement",
      "benchmark-readiness",
    ]);
    expect(
      result.factors.reduce((sum, factor) => sum + factor.weight, 0),
    ).toBeCloseTo(1);
    expect(JSON.stringify(result)).not.toContain("prediction");
  });

  it("removes manufactured prediction and model-performance claims", () => {
    expect(analyticsPage).not.toContain("const predictionAccuracy");
    expect(analyticsPage).not.toContain("const awardPredictionConfidence");
    expect(analyticsPage).not.toContain("const awardProbabilityForecast");
    expect(analyticsPage).not.toContain("const probability");
    expect(analyticsPage).not.toContain("Forecast Accuracy Above Target");
    expect(analyticsPage).not.toContain(
      "Prediction models are performing above the target threshold.",
    );
  });

  it("grounds cross-domain executive patterns in recorded historical activity", () => {
    expect(analyticsPage).toContain("buildExecutiveHistoricalPatterns");
    expect(analyticsPage).toContain("historicalPatterns.rfqCreation.summary");
    expect(analyticsPage).toContain("historicalPatterns.quoteSubmission.summary");
    expect(analyticsPage).toContain(
      "historicalPatterns.supplierParticipation.summary",
    );
    expect(analyticsPage).toContain(
      "historicalPatterns.submittedQuoteValue.summary",
    );
    expect(analyticsPage).not.toContain("forecastSavings");
    expect(analyticsPage).not.toContain("potentialSavings * 1.2");
    expect(analyticsPage).not.toContain(
      "Operational procurement growth expected.",
    );
    expect(analyticsPage).not.toContain(
      "Supplier participation expansion expected.",
    );
    expect(analyticsPage).not.toContain(
      "Board-ready procurement intelligence expected.",
    );
    expect(analyticsPage).not.toContain("const executiveScenarios");
    expect(analyticsPage).not.toContain("const executiveDecisionSimulator");
    expect(analyticsPage).not.toContain("const executiveForecastCenter");
    expect(analyticsPage).not.toContain("Scenario Intelligence");
    expect(analyticsPage).not.toContain("Decision Outcome Modeling");
    expect(analyticsPage).not.toContain("Forward-Looking Intelligence");

    expect(analyticsProcurementUtils).toContain("created_at?: string | null");
    expect(analyticsSourceLoader).toContain("created_at?: string | null");
    expect(analyticsSourceLoader).toContain('.order("created_at", { ascending: false })');

    expect(executiveTrendSource).toContain("buildExecutiveHistoricalPatterns");
    expect(executiveTrendSource).toContain("currentPeriodLabel");
    expect(executiveTrendSource).toContain("previousPeriodLabel");
    expect(executiveTrendSource).toContain("canViewQuoteHistory");
    expect(executiveTrendSource).toContain('"access-restricted"');
    expect(executiveTrendSource).toContain('"Limited Evidence"');
    expect(executiveTrendSource).toContain("currency provenance");
    expect(executiveTrendSource).not.toContain('currency: "USD"');
    expect(analyticsPage).toContain(
      "canViewQuoteHistory: commercialAccess.canViewIssuerCommercialAnalytics",
    );
    expect(executiveTrendSource).toContain(
      "not forecasts or outcome probabilities",
    );

    expect(executiveHistoricalPatternSurface).toContain(
      "Current vs Prior 30-Day Activity",
    );
    expect(executiveHistoricalPatternSurface).toContain(
      "Recorded procurement evidence",
    );
    expect(executiveHistoricalPatternSurface).toContain(
      "current membership access",
    );
    expect(executiveHistoricalPatternSurface).toContain("currency provenance");
    expect(executiveHistoricalPatternSurface).not.toMatch(
      /30 \/ 60 \/ 90 Day Procurement Forecast|Forward-looking executive intelligence|projecting procurement outlook|Forecast status/i,
    );

    expect(executiveHistoricalContextSurface).toContain(
      "Observed Procurement Pattern Context",
    );
    expect(executiveHistoricalContextSurface).toContain(
      "does not model future outcomes",
    );
    expect(executiveHistoricalContextSurface).toContain(
      "Currency provenance required",
    );
    expect(executiveHistoricalContextSurface).not.toMatch(
      /Strategic decision simulation|Strategic Scenario Modeling|Forecast Confidence Matrix|Best Case|Expected Case|Risk Case/,
    );

    expect(boardExecutiveReport).toContain(
      "Historical Patterns & Governance",
    );
    expect(boardExecutiveReport).toContain(
      "descriptive historical evidence, not a forecast",
    );
    expect(boardExecutiveReport).toContain(
      "current membership access permits",
    );
    expect(boardExecutiveReport).toContain("currency provenance");
    expect(boardExecutiveReport).not.toContain('eyebrow="Forward outlook"');
  });

  it("keeps risk and compliance insight evidence explainable, company-scoped, and self-declared", () => {
  const evidence = buildRiskComplianceEvidence({
    rfqs: [
      {
        id: "rfq-1",
        slug: "rfq-1",
        title: "Selective RFQ",
        category: "Material",
        location: null,
        budget: null,
        status: "open",
        created_at: "2026-08-20T00:00:00.000Z",
        deadline: "2026-09-01T00:00:00.000Z",
        procurement_scope: null,
        sourcing_method: "invited",
        contract_framework: "project_specific",
      },
    ],
    quotes: [],
    compliance: {
      insurance: [
        {
          name: "General Liability",
          provider: "Carrier",
          effective_on: "2026-01-01",
          expires_on: "2026-09-01",
        },
      ],
      workers_compensation: [],
      safety: [],
    },
    canViewQuoteHistory: true,
    asOf: new Date("2026-09-07T12:00:00.000Z"),
  });

  expect(evidence.compliance.evidenceLabel).toBe("Self-Declared");
  expect(evidence.compliance.expiredCount).toBe(1);
  expect(evidence.rfq.incompleteClassificationRfqs).toBe(1);
  expect(evidence.rfq.overdueOpenRfqs).toBe(1);
  expect(evidence.supplier.activeRfqsWithoutQuoteEvidence).toBe(1);
  expect(evidence.narrative).toContain("not a universal risk rating");
  expect(evidence.compliance.notice).toContain("not been independently verified");

  const restrictedEvidence = buildRiskComplianceEvidence({
    rfqs: [],
    quotes: [],
    compliance: {
      insurance: [],
      workers_compensation: [],
      safety: [],
    },
    canViewQuoteHistory: false,
    asOf: new Date("2026-09-07T12:00:00.000Z"),
  });

  expect(restrictedEvidence.supplier.evidenceState).toBe("access-restricted");
  expect(restrictedEvidence.state).toBe("insufficient-data");

  const riskCenter = readSource(
    "src/components/analytics/executive/executive-risk-center.tsx",
  );
  const riskIntelligence = readSource(
    "src/lib/analytics/executive/risk-intelligence.ts",
  );

  expect(analyticsSourceLoader).toContain("companyCompliance");
  expect(analyticsSourceLoader).toContain("loadCompanyCompliance");
  expect(analyticsPage).toContain("buildRiskComplianceEvidence");
  expect(analyticsPage).toContain("riskComplianceEvidence={riskComplianceEvidence}");
  expect(riskCenter).toContain("Risk &amp; Compliance Evidence");
  expect(riskCenter).toContain("Self-Declared Compliance Standing");
  expect(riskCenter).toContain("Company compliance records remain self-declared");
  expect(riskCenter).toContain("produce a universal enterprise risk rating");
  expect(riskIntelligence).toContain("COMPANY_COMPLIANCE_SELF_DECLARED_NOTICE");
  expect(boardExecutiveReport).toContain("Risk & compliance evidence");
  expect(boardExecutiveReport).toContain("not a universal risk rating");
  expect(boardReport).toContain("Internal Risk Signal Score");
  expect(boardReport).toContain("not a verified enterprise risk rating");
  expect(boardReport).not.toContain("- Procurement Risk Index:");
});

it("keeps executive visual semantics aligned with the underlying evidence", () => {
    expect(analyticsPage).not.toMatch(/savings\s+savings/i);
    expect(analyticsPage).toContain('valueLabel: "Opportunity Score"');
    expect(analyticsPage).toContain(
      'valueLabel: "Observed Quotation Opportunity"',
    );
    expect(analyticsPage).toContain('valueLabel: "Supplier Engagement"');
    expect(analyticsPage).toContain(
      'valueLabel: "Dominant Procurement Scope"',
    );
    expect(analyticsPage).toContain(
      'title: "Board Readiness",\n      value: formatCurrentEvidenceScore(boardReadinessScore),',
    );

    expect(executiveOpportunityRankingSurface).toContain(
      "valueLabel?: string",
    );
    expect(executiveOpportunityRankingSurface).toContain(
      '{opportunity.valueLabel || "Opportunity Value"}',
    );

    expect(executiveRiskCenterSurface).toContain(
      "Risk &amp; Compliance Evidence",
    );
    expect(executiveRiskCenterSurface).toContain(
      "Self-Declared Compliance Standing",
    );
    expect(executiveRiskCenterSurface).toContain(
      "Observed RFQ Review Indicators",
    );
    expect(executiveRiskCenterSurface).toContain(
      "riskComplianceEvidence.stateLabel",
    );
    expect(executiveRiskCenterSurface).not.toContain(
      '"Moderate enterprise exposure"',
    );
    expect(executiveRiskCenterSurface).not.toContain(
      "Procurement Risk Index",
    );

    expect(analyticsChartSurface).toContain(
      'valueFormat?: "number" | "currency"',
    );
    expect(analyticsChartSurface).toContain("formatCompactCurrency");
    expect(procurementPipelineSurface).toContain('valueFormat="currency"');
  });

  it("keeps commercial analytics permission-safe, within-RFQ, and explicit about evidence limits", () => {
    expect(analyticsSourceLoader).toContain(
      "canViewIssuerCommercialAnalytics",
    );
    expect(analyticsSourceLoader).toContain(
      "commercialAccess.canViewIssuerCommercialAnalytics &&",
    );
    expect(analyticsSourceLoader).toContain(
      "isRfqCommercialOpeningUnlocked",
    );
    expect(analyticsSourceLoader).toContain("commerciallyOpenRfqIds");
    expect(analyticsSourceLoader).toContain(
      '.in("rfq_id", commerciallyOpenRfqIds)',
    );

    expect(commercialInsightsSource).toContain(
      "isRfqCommercialOpeningUnlocked",
    );
    expect(commercialInsightsSource).not.toContain(
      'sourcingMethod === "open"',
    );
    expect(commercialInsightsSource).toContain(
      'state: "access-restricted"',
    );
    expect(commercialInsightsSource).toContain(
      'state: "policy-locked"',
    );
    expect(commercialInsightsSource).toContain(
      "calculateObservedQuotationOpportunity",
    );
    expect(commercialInsightsSource).toContain(
      "HIGH_DEVIATION_REVIEW_THRESHOLD_PERCENTAGE = 20",
    );
    expect(commercialInsightsSource).toContain(
      "positive visible quotations within the same RFQ",
    );
    expect(commercialInsightsSource).toContain(
      "not realized savings or an external market benchmark",
    );
    expect(commercialInsightsSource).not.toMatch(
      /AI anomaly|industry benchmark|statistical significance/i,
    );

    expect(dashboardPage).toContain("isRfqCommercialOpeningUnlocked");
    expect(dashboardPage).toContain("commerciallyOpenRfqIds");
    expect(dashboardPage).toContain(
      '.in("rfq_id", commerciallyOpenRfqIds)',
    );
    expect(dashboardPage).toContain(
      'supabase.rpc("count_rfq_quote_submissions", {',
    );
    expect(dashboardPage).toContain("const safeSubmissionCountResults =");
    expect(dashboardPage).toContain("let safeSubmissionCount = 0;");
    expect(dashboardPage).toContain('typeof value !== "number"');
    expect(dashboardPage).toContain("if (result.error || count === null)");
    expect(dashboardPage).toContain(
      'throw new Error("Unable to load company quote submission counts.")',
    );

    const dashboardPortfolioBuild = dashboardPage.slice(
      dashboardPage.indexOf("const portfolio = buildPortfolioIntelligence"),
      dashboardPage.indexOf("const awardedQuotes"),
    );
    expect(dashboardPortfolioBuild).toContain("quoteList");
    expect(dashboardPortfolioBuild).not.toContain("safeSubmissionCount");

    expect(dashboardPage).toContain("supplierQuotes: safeSubmissionCount");
    expect(dashboardPage).toContain("String(safeSubmissionCount)");
    expect(dashboardPage).toContain(
      "${safeSubmissionCount} supplier quotes received",
    );

    const dashboardCoverageSignal = dashboardPage.slice(
      dashboardPage.indexOf("const supplierQuoteCoverage"),
      dashboardPage.indexOf("const alerts"),
    );
    expect(dashboardCoverageSignal).toContain("safeSubmissionCount");
    expect(dashboardCoverageSignal).not.toContain("portfolio.supplierQuotes");

    const dashboardCoverageAlert = dashboardPage.slice(
      dashboardPage.indexOf("if (safeSubmissionCount < 3"),
      dashboardPage.indexOf("if (budgetVariance"),
    );
    expect(dashboardCoverageAlert).toContain("safeSubmissionCount");
    expect(dashboardCoverageAlert).not.toContain("portfolio.supplierQuotes");

    const dashboardAwardRate = dashboardPage.slice(
      dashboardPage.indexOf('label: "Award Rate"'),
      dashboardPage.indexOf('label: "Budget Utilization"'),
    );
    expect(dashboardAwardRate).toContain("portfolio.supplierQuotes");
    expect(dashboardAwardRate).not.toContain("safeSubmissionCount");

    const dashboardAverageQuotes = dashboardPage.slice(
      dashboardPage.indexOf('title: "Avg Quotes per RFQ"'),
      dashboardPage.indexOf('title: "Planned Budget"'),
    );
    expect(dashboardAverageQuotes).toContain("portfolio.avgQuotesPerRfq");
    expect(dashboardAverageQuotes).not.toContain("safeSubmissionCount");
    expect(analyticsVendors).toContain(
      "isRfqCommercialOpeningUnlocked",
    );
    expect(analyticsVendors).toContain("commerciallyOpenRfqIds");
    expect(analyticsVendors).toContain(
      '.in("rfq_id", commerciallyOpenRfqIds)',
    );

    expect(portfolioIntelligenceSource).toContain(
      "calculateObservedQuotationOpportunity",
    );
    expect(portfolioIntelligenceSource).not.toContain(
      "averageQuote > lowestQuote ? averageQuote - lowestQuote : 0",
    );

    expect(analyticsPage).toContain("buildCommercialInsights");
    expect(analyticsPage).toContain("commercialOpportunityDisplay");
    expect(analyticsPage).toContain(
      "commercialInsights={commercialInsights}",
    );
    expect(analyticsPage.match(/\bpotentialSavings\b/g)).toHaveLength(1);
    expect(analyticsPage).toContain(
      "potentialSavings: observedCommercialOpportunity",
    );
    expect(analyticsPage).not.toContain(
      'name: "Savings", value:',
    );

    expect(commercialInsightsPanel).toContain(
      "Permission-Safe Commercial Intelligence",
    );
    expect(commercialInsightsPanel).toContain(
      "Internal review threshold",
    );
    expect(commercialInsightsPanel).toContain(
      "not a statistical outlier classification",
    );
    expect(commercialInsightsPanel).toContain(
      "supplier approval, award recommendation, or realized",
    );
    expect(commercialInsightsPanel).not.toMatch(
      /approved supplier|recommended supplier|award recommendation:/i,
    );

    expect(opportunityIntelligenceSource).toContain(
      "commercialEvidenceState",
    );
    expect(opportunityIntelligenceSource).toContain(
      "authorized commercial review context",
    );
    expect(boardroomSnapshotSurface).toContain(
      "Observed Quotation Opportunity",
    );
    expect(analyticsNarrativeSource).toContain(
      "quotation award rate",
    );
    expect(boardExecutiveReport).toContain(
      "Within-RFQ quotation estimate; not realized savings",
    );
  });

  it("presents canonical evidence readiness and categorical RFQ state", () => {
    expect(evidenceEngine).toContain("decisionSupportReadiness.score");
    expect(evidenceEngine).toContain("Decision Evidence Readiness");
    expect(evidenceEngine).not.toMatch(/AI Confidence|Prediction Accuracy|Award Confidence/);
    expect(decisionReadiness).toContain("RFQ Decision Readiness");
    expect(decisionReadiness).toContain("Evaluation State");
    expect(decisionReadiness).not.toMatch(/Probability|probability/);
  });

  it("keeps report generation gated by factual readiness", () => {
    expect(boardReport).toContain("decisionSupportReadinessScore >= 50");
    expect(boardReport).toContain("if (!boardReady");
    expect(boardReport).toContain(
      "Executive decisions should not be generated from placeholder data",
    );
    expect(boardReport).not.toMatch(
      /AI Confidence|Award Prediction Confidence|Prediction Accuracy/,
    );
  });

  it("keeps board narrative deterministic and evidence-based", () => {
    expect(boardNarrative).toContain("Board Narrative Generator");
    expect(boardNarrative).toContain("Decision Evidence Readiness");
    expect(boardNarrative).toContain("Internal Benchmark Readiness");
    expect(boardNarrative).toContain("decisionSupportReadinessScore");
    expect(boardNarrative).toContain("decisionSupportReadinessLabel");
    expect(boardNarrative).toContain("assembled deterministically");
    expect(boardNarrative).toContain("normalizeSentenceFragment");
    expect(boardNarrative).toContain('replace(/[.!?]+$/, "")');
    expect(boardNarrative).toContain("if (!narrativeReady)");
    expect(boardNarrative).toContain("disabled={isGenerating || !narrativeReady}");
    expect(boardNarrative).toContain('"Narrative Locked"');
    expect(boardNarrative).toContain("narrativeReady && generatedPackage");
    expect(boardNarrative).not.toContain('title: "Narrative Locked"');
    expect(boardNarrative).not.toMatch(
      /AI Board Narrative Generator|AI narrative|Award Decision Confidence|awardPredictionConfidence|Industry Benchmark|industry benchmark|Industry Score|industryBenchmarkScore/,
    );

    expect(analyticsPage).toContain("<BoardNarrativeGenerator");
    expect(analyticsPage).toContain(
      "decisionSupportReadinessScore={executiveScoreEvidence.decisionSupportReadiness.score}",
    );
    expect(analyticsPage).toContain(
      "decisionSupportReadinessLabel={executiveScoreEvidence.decisionSupportReadiness.label}",
    );
    expect(analyticsPage).not.toContain(
      "awardPredictionConfidence={decisionSupportReadiness.label}",
    );

    expect(visualQa).toContain("<BoardNarrativeGenerator");
    expect(visualQa).toContain("Narrative-ready evidence");
    expect(visualQa).toContain("Narrative insufficient evidence gating");
  });

  it("keeps internal performance intelligence distinct from external benchmarking", () => {
    expect(analyticsPage).toContain("const internalPerformanceIndex");
    expect(analyticsPage).toContain("Internal Procurement Performance");
    expect(analyticsPage).toContain("Internal Benchmark Readiness");
    expect(analyticsPage).toContain("Evidence Signals");
    expect(analyticsPage).toContain("internal performance position");
    expect(analyticsPage).toContain("internal performance intelligence");
    expect(analyticsPage).not.toMatch(
      /industryBenchmarkScore|Top Quartile|Above Peer Median|Below Peer Benchmark|Peer Position|peer positioning|AI Signals|enterprise benchmark position|benchmark intelligence/i,
    );

    expect(executiveBenchmarkEngine).toContain("Internal Performance Intelligence");
    expect(executiveBenchmarkEngine).toContain("Internal performance matrix");
    expect(executiveBenchmarkEngine).toContain("not an external peer or industry");
    expect(executiveBenchmarkEngine).not.toMatch(
      /Industry Benchmark Intelligence|Top Quartile|Above Peer Median|Below Peer Benchmark|peer reference group|prediction confidence|enterprise procurement peer baseline/,
    );
  });

  it("removes unsupported AI, model, and peer claims from executive reports", () => {
    expect(executiveSummaryReport).toContain("evidence-based decision-support");
    expect(executiveSummaryReport).toContain("Executive Recommendation");
    expect(executiveSummaryReport).not.toMatch(
      /AI-supported|AI Executive Recommendation|Decision Confidence/,
    );

    expect(boardExecutiveReport).toContain("Internal performance position");
    expect(boardExecutiveReport).toContain("Internal benchmark readiness");
    expect(boardExecutiveReport).toContain("rule-based executive interpretation");
    expect(boardExecutiveReport).not.toMatch(
      /Peer position|model-supported executive interpretation|model-supported scoring/,
    );
  });

  it("builds fail-closed canonical RFQ source hrefs from slug only", () => {
    expect(buildAnalyticsRfqSourceHref("central-plant-upgrade")).toBe(
      "/rfq/central-plant-upgrade",
    );
    expect(buildAnalyticsRfqSourceHref("  central-plant-upgrade  ")).toBe(
      "/rfq/central-plant-upgrade",
    );
    expect(buildAnalyticsRfqSourceHref("plant/upgrade?x=1")).toBe(
      "/rfq/plant%2Fupgrade%3Fx%3D1",
    );
    expect(buildAnalyticsRfqSourceHref(null)).toBeNull();
    expect(buildAnalyticsRfqSourceHref(undefined)).toBeNull();
    expect(buildAnalyticsRfqSourceHref("")).toBeNull();
    expect(buildAnalyticsRfqSourceHref("   ")).toBeNull();
  });

  it("traces executive decision evidence to RFQ evaluation evidence by slug", () => {
    expect(analyticsPage).toContain(
      "sourceHref: buildAnalyticsRfqSourceHref(rfq.slug)",
    );
    expect(decisionReadiness).toContain("rfq-evaluation-evidence");
    expect(decisionReadiness).toContain("rfq.sourceHref");
    expect(decisionReadiness).toContain("href={rfq.sourceHref}");
    expect(evidenceEngine).toContain("Trace to RFQ Evidence");
    expect(evidenceEngine).toContain('href="#rfq-evaluation-evidence"');
    expect(decisionReadiness).not.toContain("rfq.id");
    expect(analyticsPage).not.toContain("source_rfq_id");
    expect(decisionReadiness).not.toContain("source_rfq_id");
    expect(evidenceEngine).not.toContain("source_rfq_id");
    expect(decisionReadiness).not.toMatch(
      /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i,
    );
  });

  it("lists only below-threshold readiness factors, weakest first", () => {
    const result = buildDecisionSupportReadiness({
      dataQualityScore: 42,
      supplierEngagementScore: 61,
      benchmarkReadinessScore: 88,
    });

    expect(result.limitingFactors.map((factor) => factor.dimension)).toEqual([
      "data-quality",
      "supplier-engagement",
    ]);
    expect(result.limitingFactors.every((factor) => factor.score < 70)).toBe(
      true,
    );
    expect(result.limitingFactors.map((factor) => factor.score)).toEqual([
      42, 61,
    ]);
    expect(result.limitingFactors.map((factor) => factor.label)).toEqual([
      "Data Quality",
      "Supplier Engagement",
    ]);
    expect(result.factors.map((factor) => factor.dimension)).toEqual([
      "data-quality",
      "supplier-engagement",
      "benchmark-readiness",
    ]);
    expect(result.factors.map((factor) => factor.label)).toEqual([
      "Data Quality",
      "Supplier Engagement",
      "Benchmark Readiness",
    ]);
    expect(result.factors.map((factor) => factor.score)).toEqual([42, 61, 88]);
  });

  it("returns no limiting factors when every readiness score is at least 70", () => {
    const result = buildDecisionSupportReadiness({
      dataQualityScore: 70,
      supplierEngagementScore: 81,
      benchmarkReadinessScore: 94,
    });

    expect(result.limitingFactors).toEqual([]);
  });

  it("renders evidence limitations only when limiting factors exist", () => {
    expect(evidenceEngine).toContain("decisionSupportReadiness.limitingFactors");
    expect(evidenceEngine).toContain("Evidence Limitations");
    expect(evidenceEngine).toContain("{factor.label}");
    expect(evidenceEngine).toContain("{factor.score}");
    expect(evidenceEngine).toContain(
      "decisionSupportReadiness.limitingFactors.length > 0",
    );
    expect(evidenceEngine).toContain("key={factor.dimension}");
    expect(evidenceEngine).toContain('id="evidence-limitations-heading"');
    expect(evidenceEngine).toContain(
      'aria-labelledby="evidence-limitations-heading"',
    );
    expect(evidenceEngine).not.toContain('role="alert"');
  });

  it("does not introduce predictive confidence claims in evidence limitations", () => {
    expect(evidenceEngine).not.toContain("AI Confidence");
    expect(evidenceEngine).not.toContain("Prediction Confidence");
    expect(evidenceEngine).not.toContain("Award Probability");
    expect(evidenceEngine).not.toContain("model confidence");
    expect(evidenceEngine).toContain("Trace to RFQ Evidence");
    expect(evidenceEngine).toContain('href="#rfq-evaluation-evidence"');
  });

  it("blocks reintroduction of universal supplier/AI trust scoring", () => {
    const analyticsSupplierIntelligence = readSource(
      "src/lib/analytics/supplier-intelligence.ts",
    );
    const executiveRiskIntelligence = readSource(
      "src/components/executive-risk-intelligence.tsx",
    );
    const supplierPortfolio = readSource(
      "src/components/analytics/supplier-portfolio-intelligence.tsx",
    );
    const companyProfile = readSource("src/app/company/[slug]/page.tsx");
    const vendorDashboard = readSource("src/app/vendor-dashboard/page.tsx");
    const supplierCommandCenter = readSource(
      "src/components/vendor-workspace/supplier-command-center.tsx",
    );
    const supplierScorecard = readSource(
      "src/components/vendor-workspace/supplier-scorecard.tsx",
    );
    const vendorDecisionWorkspace = readSource(
      "src/components/vendor-intelligence/vendor-decision-workspace.tsx",
    );
    const procurementSupplierIntelligence = readSource(
      "src/lib/procurement/supplier-intelligence.ts",
    );

    expect(analyticsSupplierIntelligence).not.toContain("aiScore");
    expect(analyticsSupplierIntelligence).not.toContain("financialRisk");
    expect(analyticsSupplierIntelligence).not.toContain("overallRisk");
    expect(analyticsSupplierIntelligence).not.toContain("Preferred Supplier");
    expect(analyticsSupplierIntelligence).toContain("compareSupplierEvidence");
    expect(analyticsSupplierIntelligence).toContain("suppliersWithAwardHistory");

    expect(executiveRiskIntelligence).not.toContain("AI Supplier Ranking Engine");
    expect(executiveRiskIntelligence).not.toContain("AI Score");
    expect(executiveRiskIntelligence).not.toContain("Supplier Risk Radar");
    expect(executiveRiskIntelligence).toContain("Supplier Performance Evidence");
    expect(executiveRiskIntelligence).toContain("Insufficient Data");

    expect(supplierPortfolio).not.toContain("Strategic Suppliers");
    expect(supplierPortfolio).not.toContain("Preferred Suppliers");
    expect(supplierPortfolio).not.toContain("High-Risk Suppliers");
    expect(supplierPortfolio).toContain("Award-History Coverage");
    expect(supplierPortfolio).toContain("Limited Quote History");
    expect(supplierPortfolio).toMatch(
      /Coverage is not a\s+trust score, approval status, or authorization signal\./,
    );

    expect(companyProfile).not.toContain("AI Supplier Intelligence");
    expect(companyProfile).not.toContain("supplierIntelligenceScore");
    expect(companyProfile).not.toContain("Procurement Fit");
    expect(companyProfile).not.toContain("Buyer suitability");
    expect(companyProfile).toContain("Supplier Commercial Evidence");

    expect(vendorDashboard).not.toContain("supplierScore");
    expect(vendorDashboard).not.toContain("awardProbability");
    expect(vendorDashboard).not.toContain("Preferred Strategic Partner");
    expect(supplierCommandCenter).not.toContain("Supplier Score");
    expect(supplierCommandCenter).not.toContain("Award Probability");
    expect(supplierScorecard).not.toContain("commercialScore");
    expect(supplierScorecard).not.toContain("Award Probability");

    expect(vendorDecisionWorkspace).not.toContain("Intelligence Score");
    expect(vendorDecisionWorkspace).not.toContain("Performance Rank");
    expect(vendorDecisionWorkspace).not.toContain("getSupplierIntelligenceScore");
    expect(vendorDecisionWorkspace).not.toContain("getSupplierIntelligenceRank");
    expect(procurementSupplierIntelligence).not.toContain(
      "getSupplierIntelligenceScore",
    );
    expect(procurementSupplierIntelligence).not.toContain(
      "getSupplierIntelligenceRank",
    );
    expect(procurementSupplierIntelligence).not.toContain("getPerformanceRank");

    expect(analyticsPage).not.toContain("strategicSuppliers");
    expect(analyticsPage).not.toContain("preferredSuppliers");
    expect(analyticsPage).not.toContain("highRiskSuppliers");
    expect(analyticsPage).not.toContain("supplierRiskRadar");
    expect(analyticsPage).toContain("suppliersWithAwardHistory");
    expect(analyticsPage).toContain("suppliersWithLimitedQuoteHistory");
  });

});
describe("analytics procurement insight denominator truthfulness", () => {
  const portfolioSource = readSource(
    "src/lib/analytics/portfolio/portfolio-intelligence.ts",
  );
  const supplierSource = readSource(
    "src/lib/analytics/supplier-intelligence.ts",
  );
  const procurementInsightSurface = readSource(
    "src/components/analytics/procurement/procurement-insight-metrics.tsx",
  );
  const supplierPortfolioSurface = readSource(
    "src/components/analytics/supplier-portfolio-intelligence.tsx",
  );
  const rfqDecisionSurface = readSource(
    "src/components/analytics/award-probability-forecast.tsx",
  );
  const boardExecutiveSurface = readSource(
    "src/components/report-engine/BoardExecutiveReport.tsx",
  );
  const analyticsPage10_03 = readSource("src/app/analytics/page.tsx");

  it("defines cycle, participation, and decision ratios with explicit evidence populations", () => {
    expect(portfolioSource).toContain("rfqSubmissionCoverage");
    expect(portfolioSource).toContain("quotationDecisionCoverage");
    expect(portfolioSource).toContain("quotationAwardRate");
    expect(portfolioSource).toContain("averageQuotationsPerRfq");
    expect(portfolioSource).toContain("averageActiveRfqAge");
    expect(portfolioSource).toContain(
      "No trusted terminal RFQ timestamp is available for completed-cycle duration.",
    );

    expect(procurementInsightSurface).toContain("Average Active RFQ Age");
    expect(procurementInsightSurface).toContain("RFQ Submission Coverage");
    expect(procurementInsightSurface).toContain("Quotation Decision Coverage");
    expect(procurementInsightSurface).toContain("Quotation Award Rate");
    expect(procurementInsightSurface).toContain("Average Quotations per RFQ");
    expect(procurementInsightSurface).toContain(
      "RFQs with submissions /",
    );
    expect(procurementInsightSurface).toContain(
      "quotations with decisions /",
    );
    expect(procurementInsightSurface).toContain(
      "awarded quotations /",
    );
    expect(procurementInsightSurface).not.toContain("Invitation Response Rate");
  });

  it("keeps supplier aggregates on the full observed supplier population instead of the top-20 display ranking", () => {
    expect(supplierSource).toContain(
      "const supplierParticipationCount = supplierEvidence.length",
    );
    expect(supplierSource).toContain("supplierEvidence.filter(");
    expect(supplierSource).toContain(
      "supplierEvidence.reduce((sum, vendor) => sum + vendor.winRate, 0)",
    );
    expect(supplierSource).not.toContain(
      "const supplierParticipationCount = supplierRanking.length",
    );

    expect(supplierPortfolioSurface).toContain("Participating Suppliers");
    expect(supplierPortfolioSurface).toContain("Award-History Coverage");
    expect(supplierPortfolioSurface).toContain(
      "Internal Diversification Score",
    );
    expect(supplierPortfolioSurface).toContain(
      "not a participation percentage",
    );
  });

  it("keeps RFQ evaluation state categorical and board reporting denominator-safe", () => {
    expect(rfqDecisionSurface).toMatch(
      /Quotation presence\s+does not indicate completed evaluation/,
    );
    expect(rfqDecisionSurface).toMatch(
      /does not present\s+an evaluation-completion percentage/,
    );

    expect(boardExecutiveSurface).toContain("Quotation award rate");
    expect(boardExecutiveSurface).toContain(
      "Awarded quotations / submitted quotations",
    );
    expect(boardExecutiveSurface).toContain(
      "Suppliers with recorded quotation history",
    );
    expect(boardExecutiveSurface).toContain(
      "Internal diversification score",
    );

    expect(analyticsPage10_03).toContain(
      "supplierParticipationCount={supplierParticipationCount}",
    );
    expect(analyticsPage10_03).toContain(
      "procurementInsights={governedProcurementInsights}",
    );
    expect(analyticsPage10_03).not.toContain(
      "Improve RFQ conversion and award execution.",
    );
    expect(analyticsPage10_03).not.toContain('label="Award Conversion"');
  });
  it("keeps public discovery surfaces free of quote-row commercial intelligence and gates buyer context by commercial opening", () => {
    expect(publicCompanyPage).not.toContain('.from("quotes")');
    expect(publicCompanyPage).toContain("Commercial Award Details");
    expect(publicCompanyPage).toContain("Access Restricted");
    expect(publicCompanyPage).toContain(
      "Commercial performance data is not published on public company",
    );

    expect(publicDirectoryPage).not.toContain('.from("quotes")');
    expect(publicDirectoryPage).toContain("Public Supplier Evidence");
    expect(publicDirectoryPage).toContain("Public Evidence Avg");
    expect(publicDirectoryPage).toContain(
      "Commercial quote history and award-value signals are excluded.",
    );
    expect(publicDirectoryPage).not.toContain("supplierScore");
    expect(publicDirectoryPage).not.toContain("winRate");
    expect(publicDirectoryPage).not.toContain("awardsWon");
    expect(publicDirectoryPage).not.toContain("awardedRevenue");
    expect(publicDirectoryPage).not.toContain("getRankTone");

    expect(procurementContextRepository).toContain(
      "isRfqCommercialOpeningUnlocked",
    );
    expect(procurementContextRepository).toContain(
      "const commerciallyOpenRfqIds = ownedRfqs",
    );
    expect(procurementContextRepository).toContain(
      '.in("rfq_id", commerciallyOpenRfqIds)',
    );
    expect(procurementContextRepository).toContain(
      "loadSupplierQuotes(supabase, identity.companyId)",
    );
  });
});

describe("analytics sealed-participation truthfulness", () => {
  const scoreInputs = {
    totalRfqs: 4,
    supplierQuotes: 8,
    awardedContracts: 2,
    budgetTotal: 1000,
    avgQuotesPerRfq: 2,
    awardRate: 25,
    budgetUtilization: 50,
    supplierReliabilityScore: 70,
    supplierDiversificationScore: 60,
    observedCommercialOpportunity: 10000,
    constructionClassificationScore: 80,
  } as const;

  it("marks every supplier/commercial executive score unavailable while evidence is locked", () => {
    const scores = buildAnalyticsExecutiveScoreEvidence({
      evidenceState: "policy-locked",
      ...scoreInputs,
    });

    expect(scores).toMatchObject({
      state: "policy-locked",
      supplierActivityScore: null,
      competitionScore: null,
      awardScore: null,
      commercialOpportunityEvidenceScore: null,
      procurementHealthScore: null,
      procurementRiskIndex: null,
      dataQualityScore: null,
      enterpriseProcurementScore: null,
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
    });
    expect(
      Object.values(scores).filter((value) => typeof value === "number"),
    ).toEqual([]);
  });

  it("preserves the established score formulas when commercial evidence is fully available", () => {
    const scores = buildAnalyticsExecutiveScoreEvidence({
      evidenceState: "available",
      ...scoreInputs,
    });

    expect(scores).toMatchObject({
      state: "available",
      supplierActivityScore: 96,
      competitionScore: 50,
      awardScore: 38,
      commercialOpportunityEvidenceScore: 85,
      procurementHealthScore: 67,
      executiveProcurementHealth: 45,
      procurementRiskIndex: 33,
      procurementMaturityScore: 57,
      dataQualityScore: 100,
    });
    expect(scores.decisionSupportReadiness).not.toBeNull();
    expect(
      Object.entries(scores)
        .filter(([key]) => key !== "state" && key !== "executiveStatus")
        .every(([, value]) => value !== null),
    ).toBe(true);
  });

  it("does not score partial commercial evidence or accept safe counts as score inputs", () => {
    const partialScores = buildAnalyticsExecutiveScoreEvidence({
      evidenceState: "policy-locked",
      ...scoreInputs,
      supplierQuotes: 3,
      avgQuotesPerRfq: 3,
      awardRate: 100,
    });
    const withSafeCount = buildAnalyticsExecutiveScoreEvidence({
      evidenceState: "policy-locked",
      ...scoreInputs,
      safeSubmissionCount: 999,
    } as Parameters<typeof buildAnalyticsExecutiveScoreEvidence>[0] & {
      safeSubmissionCount: number;
    });

    expect(partialScores).toEqual(withSafeCount);
    expect(partialScores.state).toBe("policy-locked");
    expect(partialScores.procurementHealthScore).toBeNull();
    expect(partialScores.procurementOpportunityScore).toBeNull();
  });

  it.each(["access-restricted", "insufficient-data"] as const)(
    "does not substitute a default commercial score when evidence is %s",
    (evidenceState) => {
      const scores = buildAnalyticsExecutiveScoreEvidence({
        evidenceState,
        ...scoreInputs,
      });

      expect(scores.state).toBe(evidenceState);
      expect(scores.commercialOpportunityEvidenceScore).toBeNull();
      expect(scores.procurementHealthScore).toBeNull();
      expect(scores.enterpriseProcurementScore).toBeNull();
      expect(scores.boardHealthIndex).toBeNull();
      expect(
        Object.values(scores).filter((value) => typeof value === "number"),
      ).toEqual([]);
    },
  );

  it("bypasses numeric narrative generation while commercial evidence is unavailable", () => {
    const narrativeInput = {
      totalRfqs: 1,
      procurementHealth: "Policy Locked",
      competitionIndex: "Policy Locked",
      dominantScope: "Material",
      dominantSourcing: "Sealed Bid",
      awardRate: 0,
      supplierQuotes: 0,
      commercialInsights: {
        state: "policy-locked" as const,
        asOf: "2026-09-12T12:00:00.000Z",
        reviewThresholdPercentage: 20,
        unlockedRfqCount: 0,
        lockedRfqCount: 1,
        visiblePositiveQuoteCount: 0,
        comparableRfqCount: 0,
        highDeviationRfqCount: 0,
        estimatedOpportunity: null,
        limitation: "Commercial evidence is locked.",
        rfqEvidence: [],
      },
      constructionClassificationScore: 80,
      avgQuotesPerRfq: 0,
      sealedBidRfqs: 1,
      frameworkRfqs: 0,
      budgetUtilization: 0,
      topCategory: "Concrete",
    };

    for (const evidenceState of [
      "policy-locked",
      "access-restricted",
      "insufficient-data",
    ] as const) {
      const result = buildGovernedAnalyticsNarrative({
        ...narrativeInput,
        evidenceState,
      });

      expect(result.executiveSummary).toContain(
        evidenceState === "policy-locked"
          ? "Policy Locked"
          : evidenceState === "access-restricted"
            ? "Access Restricted"
            : "Insufficient Data",
      );
      expect(result.executiveSummary).not.toContain("0 supplier quotes");
      expect(result.executiveSummary).not.toContain("award rate is 0%");
      expect(result.executiveSummary).not.toContain("$0 average quote");
    }

    const available = buildGovernedAnalyticsNarrative({
      ...narrativeInput,
      evidenceState: "available",
      supplierQuotes: 8,
      avgQuotesPerRfq: 2,
      awardRate: 25,
      commercialInsights: {
        ...narrativeInput.commercialInsights,
        state: "available",
        unlockedRfqCount: 1,
        lockedRfqCount: 0,
        visiblePositiveQuoteCount: 8,
        comparableRfqCount: 1,
        estimatedOpportunity: 10000,
      },
    });

    expect(available.executiveSummary).toContain(
      "quotation award rate is 25%, with 8 supplier quotes",
    );
  });

  it("reports sealed RFQ participation without claiming evaluation has opened", () => {
    const [readiness] = buildRfqDecisionReadiness({
      rfqList: [
        {
          id: "rfq-locked",
          title: "Sealed concrete package",
          category: "Concrete",
          procurement_scope: "material",
          sourcing_method: "sealed_bid",
          contract_framework: "project_specific",
          status: "open",
          slug: "sealed-concrete-package",
        },
      ],
      quoteList: [],
      commerciallyOpenRfqIdSet: new Set(),
      safeSubmissionCountByRfqId: { "rfq-locked": 1 },
    });

    expect(readiness).toMatchObject({
      quotes: 1,
      evaluationState: "Commercial Opening Pending",
    });
  });

  it("continues to report awaiting quotes when a locked RFQ has no submissions", () => {
    const [readiness] = buildRfqDecisionReadiness({
      rfqList: [
        {
          id: "rfq-empty",
          status: "published",
          slug: "empty-rfq",
        },
      ],
      quoteList: [],
      commerciallyOpenRfqIdSet: new Set(),
      safeSubmissionCountByRfqId: { "rfq-empty": 0 },
    });

    expect(readiness).toMatchObject({
      quotes: 0,
      evaluationState: "Awaiting Quotes",
    });
  });

  it("preserves active and awarded evaluation states after commercial opening", () => {
    const readiness = buildRfqDecisionReadiness({
      rfqList: [
        {
          id: "rfq-opened",
          status: "open",
          slug: "opened-rfq",
        },
        {
          id: "rfq-awarded",
          status: "awarded",
          slug: "awarded-rfq",
        },
      ],
      quoteList: [{ rfq_id: "rfq-opened" }, { rfq_id: "rfq-awarded" }],
      commerciallyOpenRfqIdSet: new Set(["rfq-opened", "rfq-awarded"]),
      safeSubmissionCountByRfqId: {
        "rfq-opened": 1,
        "rfq-awarded": 1,
      },
    });

    expect(readiness[0]).toMatchObject({
      quotes: 1,
      evaluationState: "Evaluation Active",
    });
    expect(readiness[1]).toMatchObject({
      quotes: 1,
      evaluationState: "Awarded",
    });
  });

  it("keeps safe readiness counts outside commercial portfolio calculations", () => {
    const [readiness] = buildRfqDecisionReadiness({
      rfqList: [{ id: "rfq-locked", status: "open", slug: "locked-rfq" }],
      quoteList: [],
      commerciallyOpenRfqIdSet: new Set(),
      safeSubmissionCountByRfqId: { "rfq-locked": 7 },
    });
    const portfolio = buildPortfolioIntelligence({
      rfqList: [
        {
          id: "rfq-locked",
          title: "Locked RFQ",
          category: "Concrete",
          location: null,
          budget: 1000,
          status: "open",
          created_at: "2026-09-01T00:00:00.000Z",
          deadline: "2026-10-01T00:00:00.000Z",
          procurement_scope: "material",
          sourcing_method: "sealed_bid",
          contract_framework: "project_specific",
        },
      ],
      quoteList: [],
      asOf: new Date("2026-09-12T12:00:00.000Z"),
    });

    expect(readiness.quotes).toBe(7);
    expect(portfolio.supplierQuotes).toBe(0);
    expect(portfolio.awardRate).toBe(0);
    expect(portfolio.averageQuote).toBe(0);
    expect(portfolio.procurementInsights.averageQuotationsPerRfq.value).toBe(0);
  });

  it("renders safe category responses while locking every commercial category value", () => {
    const text = renderedText(
      renderToStaticMarkup(
        createElement(CategoryIntelligence, {
          categoryIntelligence: [
            {
              category: "Concrete",
              rfqs: 1,
              quotes: 4,
              commercialEvidenceState: "policy-locked",
              awards: null,
              winRate: null,
              spend: null,
              opportunityScore: null,
            },
          ],
        }),
      ),
    );

    expect(text).toContain("Concrete");
    expect(text).toMatch(/4 Responses/);
    expect(text.match(/Policy Locked/g)).toHaveLength(4);
    expect(text).not.toContain("$0");
    expect(text).not.toContain("0/100");
  });

  it.each([
    ["access-restricted", "Access Restricted"],
    ["insufficient-data", "Insufficient Data"],
  ] as const)(
    "propagates %s through category commercial fields without numeric zeroes",
    (commercialEvidenceState, evidenceLabel) => {
      const text = renderedText(
        renderToStaticMarkup(
          createElement(CategoryIntelligence, {
            categoryIntelligence: [
              {
                category: "Concrete",
                rfqs: 1,
                quotes: 4,
                commercialEvidenceState,
                awards: null,
                winRate: null,
                spend: null,
                opportunityScore: null,
              },
            ],
          }),
        ),
      );

      expect(text).toMatch(/4 Responses/);
      expect(text.match(new RegExp(evidenceLabel, "g"))).toHaveLength(4);
      expect(text).not.toContain("$0");
      expect(text).not.toContain("0%");
      expect(text).not.toContain("0/100");
    },
  );

  it("preserves global category evidence state before applying category sealing", () => {
    expect(
      resolveCommercialEvidenceStateForSealedParticipation({
        globalEvidenceState: "access-restricted",
        hasSealedCommercialEvidence: true,
      }),
    ).toBe("access-restricted");
    expect(
      resolveCommercialEvidenceStateForSealedParticipation({
        globalEvidenceState: "insufficient-data",
        hasSealedCommercialEvidence: true,
      }),
    ).toBe("insufficient-data");
    expect(
      resolveCommercialEvidenceStateForSealedParticipation({
        globalEvidenceState: "policy-locked",
        hasSealedCommercialEvidence: false,
      }),
    ).toBe("policy-locked");
    expect(
      resolveCommercialEvidenceStateForSealedParticipation({
        globalEvidenceState: "available",
        hasSealedCommercialEvidence: true,
      }),
    ).toBe("policy-locked");
    expect(
      resolveCommercialEvidenceStateForSealedParticipation({
        globalEvidenceState: "available",
        hasSealedCommercialEvidence: false,
      }),
    ).toBe("available");
  });

  it("preserves numeric commercial category output when evidence is available", () => {
    const markup = renderToStaticMarkup(
      createElement(CategoryIntelligence, {
        categoryIntelligence: [
          {
            category: "Electrical",
            rfqs: 2,
            quotes: 4,
            commercialEvidenceState: "available",
            awards: 2,
            winRate: 50,
            spend: 1200,
            opportunityScore: 70,
          },
        ],
      }),
    );
    const text = renderedText(markup);

    expect(text).toMatch(/4 Responses/);
    expect(text).toMatch(/2 Decisions/);
    expect(text).toContain("50% Win rate");
    expect(text).toContain("$1,200 Portfolio value");
    expect(text).toContain("70/100 Potential");
    expect(markup).toContain("Electrical award conversion rate 50%");
    expect(markup).toContain("Electrical opportunity score 70 out of 100");
  });

  it("replaces supplier portfolio zeroes with governed locked state", () => {
    const text = renderedText(
      renderToStaticMarkup(
        createElement(SupplierPortfolioIntelligence, {
          commercialEvidenceState: "policy-locked",
          portfolioHealthIndex: 0,
          supplierParticipationCount: 0,
          awardHistoryCoverage: 0,
          suppliersWithAwardHistory: 0,
          suppliersWithMultipleAwards: 0,
          suppliersWithLimitedQuoteHistory: 0,
          supplierDiversificationScore: 0,
          portfolioStatus: "Needs Attention",
          portfolioRecommendations: [
            "Reassess supplier evidence after commercial opening.",
          ],
        }),
      ),
    );

    expect(text).toContain("Policy Locked");
    expect(text).toContain("Supplier identities and commercial history remain sealed");
    expect(text).not.toContain("0/100");
    expect(text).not.toContain("0%");
    expect(text).not.toContain("Needs Attention");
  });

  it("does not turn an empty sealed ranking into no-history supplier facts", () => {
    const text = renderedText(
      renderToStaticMarkup(
        createElement(ExecutiveRiskIntelligence, {
          supplierRanking: [],
          supplierCommercialEvidenceState: "policy-locked",
        }),
      ),
    );

    expect(text).toContain("Commercial Evidence Policy Locked");
    expect(text).not.toContain("No supplier history available");
    expect(text).not.toContain("0%");
    expect(text).not.toContain("0 supplier records");
  });

  it.each([
    ["access-restricted", "Commercial Evidence Access Restricted"],
    ["insufficient-data", "Commercial Evidence Insufficient Data"],
  ] as const)(
    "preserves the %s supplier evidence state in executive risk output",
    (supplierCommercialEvidenceState, expectedHeading) => {
      const text = renderedText(
        renderToStaticMarkup(
          createElement(ExecutiveRiskIntelligence, {
            supplierRanking: [],
            supplierCommercialEvidenceState,
          }),
        ),
      );

      expect(text).toContain(expectedHeading);
      expect(text).not.toContain("Commercial Evidence Policy Locked");
      expect(text).not.toContain("No supplier history available");
      expect(text).not.toContain("0 supplier records");
    },
  );

  it("preserves available supplier evidence in executive risk output", () => {
    const text = renderedText(
      renderToStaticMarkup(
        createElement(ExecutiveRiskIntelligence, {
          supplierRanking: [
            {
              name: "Supplier Alpha",
              quotes: 4,
              awards: 2,
              revenue: 1200,
              winRate: 50,
            },
          ],
          supplierCommercialEvidenceState: "available",
        }),
      ),
    );

    expect(text).toContain("Supplier Alpha");
    expect(text).toContain("1 supplier records");
    expect(text).not.toContain("Commercial Evidence Policy Locked");
    expect(text).not.toContain("Commercial Evidence Access Restricted");
    expect(text).not.toContain("Commercial Evidence Insufficient Data");
  });

  it("locks supplier metrics in board reporting and confidence wrappers", () => {
    const riskEvidence = buildRiskComplianceEvidence({
      rfqs: [],
      quotes: [],
      compliance: {
        insurance: [],
        workers_compensation: [],
        safety: [],
      },
      canViewQuoteHistory: false,
      asOf: new Date("2026-09-12T12:00:00.000Z"),
    });
    const boardText = renderedText(
      renderToStaticMarkup(
        createElement(BoardExecutiveReport, {
          companyName: "Nexus",
          generatedAt: "September 12, 2026",
          decisionStatement: "Review governed evidence.",
          recommendation: "Await commercial opening.",
          boardPriority: "Evidence governance",
          enterpriseScore: 80,
          boardReadiness: 80,
          decisionReadiness: 80,
          riskIndex: 20,
          riskComplianceEvidence: riskEvidence,
          opportunityValue: "Policy Locked",
          procurementVolume: "$0",
          awardedVolume: "$0",
          awardRate: "0%",
          supplierCount: 0,
          supplierEngagement: 0,
          supplierDiversification: 0,
          portfolioHealth: 0,
          supplierCommercialEvidenceState: "policy-locked",
          forecastConfidence: "Limited",
          forecastNarrative: "Governed evidence only.",
          benchmarkPosition: "Internal",
          benchmarkScore: 80,
          findings: [],
          risks: [],
          opportunities: [],
          actions: [],
        }),
      ),
    );
    const confidenceText = renderedText(
      renderToStaticMarkup(
        createElement(IntelligenceDashboard, {
          executiveAlerts: [],
          executiveRecommendations: [],
          dailyExecutiveBriefing: [],
          decisionSupportReadiness: buildDecisionSupportReadiness({
            dataQualityScore: 80,
            supplierEngagementScore: 0,
            benchmarkReadinessScore: 80,
          }),
          supplierReliabilityScore: 0,
          supplierCommercialEvidenceState: "policy-locked",
        }),
      ),
    );

    expect(boardText).toContain("Supplier network Policy Locked");
    expect(boardText).toContain("Supplier engagement Policy Locked");
    expect(boardText).toContain("Internal diversification score Policy Locked");
    expect(boardText).toContain("Portfolio health Policy Locked");
    expect(boardText).toContain("Enterprise health Policy Locked");
    expect(boardText).toContain("Board readiness Policy Locked");
    expect(boardText).toContain("Decision readiness Policy Locked");
    expect(boardText).toContain("Quotation award rate Policy Locked");
    expect(boardText).not.toContain("Quotation award rate 0%");
    expect(boardText).not.toContain("80/100");
    expect(confidenceText).toContain("Commercial Evidence Policy Locked");
    expect(confidenceText).not.toContain("Supplier Reliability 0/100");
  });

  it("uses access-restricted state instead of serializing a zero board award rate", () => {
    const riskEvidence = buildRiskComplianceEvidence({
      rfqs: [],
      quotes: [],
      compliance: { insurance: [], workers_compensation: [], safety: [] },
      canViewQuoteHistory: false,
      asOf: new Date("2026-09-12T12:00:00.000Z"),
    });
    const text = renderedText(
      renderToStaticMarkup(
        createElement(BoardExecutiveReport, {
          companyName: "Nexus",
          generatedAt: "September 12, 2026",
          decisionStatement: "Review governed evidence.",
          recommendation: "Request authorized access.",
          boardPriority: "Evidence governance",
          enterpriseScore: null,
          boardReadiness: null,
          decisionReadiness: null,
          riskIndex: null,
          riskComplianceEvidence: riskEvidence,
          opportunityValue: "Access Restricted",
          procurementVolume: "$1,000",
          awardedVolume: "Access Restricted",
          awardRate: "0%",
          supplierCount: 0,
          supplierEngagement: null,
          supplierDiversification: 0,
          portfolioHealth: null,
          supplierCommercialEvidenceState: "access-restricted",
          forecastConfidence: "Access Restricted",
          forecastNarrative: "Governed evidence only.",
          benchmarkPosition: "Access Restricted",
          benchmarkScore: null,
          findings: [],
          risks: [],
          opportunities: [],
          actions: [],
        }),
      ),
    );

    expect(text).toContain("Quotation award rate Access Restricted");
    expect(text).not.toContain("Quotation award rate 0%");
    expect(text).not.toMatch(/\d+\/100/);
  });

  it("keeps locked supplier scores out of report and narrative output", () => {
    const reportText = renderedText(
      renderToStaticMarkup(
        createElement(BoardReportGenerator, {
          procurementRiskIndex: 0,
          procurementMaturityScore: 80,
          decisionSupportReadinessScore: 80,
          dataQualityScore: 80,
          supplierDependencyRisk: "Critical",
          concentrationLevel: "Low",
          benchmarkReadinessScore: 80,
          boardHealthIndex: 80,
          enterpriseProcurementScore: 80,
          executiveReadinessScore: 80,
          procurementEfficiencyScore: 80,
          supplierEngagementScore: 0,
          supplierCommercialEvidenceState: "policy-locked",
          digitalMaturityScore: 80,
        }),
      ),
    );
    const narrativeText = renderedText(
      renderToStaticMarkup(
        createElement(BoardNarrativeGenerator, {
          executiveBenchmarkStatus: "Board Ready",
          executiveStatus: "Strong",
          boardHealthIndex: 80,
          enterpriseProcurementScore: 80,
          executiveReadinessScore: 80,
          procurementRiskIndex: 0,
          supplierEngagementScore: 0,
          supplierCommercialEvidenceState: "policy-locked",
          benchmarkReadinessScore: 80,
          boardRecommendation: "Review evidence.",
          procurementMaturityScore: 80,
          decisionSupportReadinessScore: 80,
          decisionSupportReadinessLabel: "Board Ready",
        }),
      ),
    );

    expect(boardReport).toContain("commercialEvidenceLabel");
    expect(reportText).toContain("Board Reporting Policy Locked");
    expect(reportText).not.toMatch(/\d+\/100/);
    expect(narrativeText).toContain("Board Narrative Policy Locked");
    expect(narrativeText).not.toMatch(/\d+\/100/);
  });

  it("keeps safe response evidence outside commercial and supplier builders", () => {
    expect(analyticsPage).toContain("const safeCategoryResponses");
    expect(analyticsPage).toContain("quotes: safeCategoryResponses");
    expect(analyticsPage).toContain("categoryHasSealedCommercialEvidence");
    expect(analyticsPage).toContain(
      "globalEvidenceState: commercialInsights.state",
    );

    const portfolioBuild = analyticsPage.slice(
      analyticsPage.indexOf("buildPortfolioIntelligence({"),
      analyticsPage.indexOf("const commercialInsights"),
    );
    const supplierBuild = analyticsPage.slice(
      analyticsPage.indexOf("buildSupplierIntelligence({"),
      analyticsPage.indexOf("buildPortfolioIntelligence({"),
    );
    const categoryScore = analyticsPage.slice(
      analyticsPage.indexOf("const categoryOpportunityScore"),
      analyticsPage.indexOf("return {", analyticsPage.indexOf("const categoryOpportunityScore")),
    );

    expect(portfolioBuild).not.toContain("safeSubmissionCountByRfqId");
    expect(supplierBuild).not.toContain("safeSubmissionCountByRfqId");
    expect(categoryScore).not.toContain("safeSubmissionCountByRfqId");

    expect(boardExecutiveReport).toContain(
      "supplierCommercialEvidenceState",
    );
    expect(
      readSource("src/components/analytics/sections/executive-dashboard.tsx"),
    ).toContain('supplierCommercialEvidenceState !== "available"');
  });

  it("uses safe participation for a locked decision stream and RFQ coverage only", () => {
    const participation = buildSafeSubmissionParticipation({
      rfqIds: ["rfq-locked"],
      safeSubmissionCountByRfqId: { "rfq-locked": 1 },
    });
    const fallbackMessage =
      "1 active RFQ has no submitted quotation evidence in the authorized analytics dataset.";
    const decisionStreamMessage = buildDecisionStreamRiskMessage({
      evidenceState: "policy-locked",
      totalSubmissions: participation.totalSubmissions,
      fallbackMessage,
    });
    const portfolio = buildPortfolioIntelligence({
      rfqList: [
        {
          id: "rfq-locked",
          title: "Sealed concrete package",
          category: "Concrete",
          location: null,
          budget: 1850000,
          status: "open",
          created_at: "2026-09-01T00:00:00.000Z",
          deadline: "2026-10-01T00:00:00.000Z",
          procurement_scope: "material",
          sourcing_method: "sealed_bid",
          contract_framework: "project_specific",
        },
      ],
      quoteList: [],
      asOf: new Date("2026-09-12T12:00:00.000Z"),
    });
    const metricsText = renderedText(
      renderToStaticMarkup(
        createElement(ProcurementInsightMetrics, {
          metrics: {
            ...portfolio.procurementInsights,
            rfqSubmissionCoverage: participation.rfqSubmissionCoverage,
          },
          commercialEvidenceState: "policy-locked",
        }),
      ),
    );

    expect(participation).toEqual({
      totalSubmissions: 1,
      rfqSubmissionCoverage: {
        numerator: 1,
        denominator: 1,
        percentage: 100,
        status: "available",
      },
    });
    expect(decisionStreamMessage).toContain("1 submitted quotation is recorded");
    expect(decisionStreamMessage).toContain(
      "commercial evidence remains policy locked",
    );
    expect(decisionStreamMessage).not.toContain("no submitted quotation evidence");
    expect(metricsText).toContain("RFQ Submission Coverage 100%");
    expect(metricsText).toContain("1 RFQs with submissions / 1 total RFQs");
    expect(metricsText).toContain("Average Quotations per RFQ Policy Locked");
    expect(metricsText).not.toContain("Average Quotations per RFQ 0.0");
    expect(formatCommercialCurrencyEvidence("policy-locked", 999999)).toBe(
      "Policy Locked",
    );
    expect(portfolio.supplierQuotes).toBe(0);
    expect(portfolio.procurementVolume).toBe(0);
    expect(portfolio.avgQuotesPerRfq).toBe(0);
  });

  it("preserves a truthful raw zero when no locked RFQ has submissions", () => {
    const participation = buildSafeSubmissionParticipation({
      rfqIds: ["rfq-empty"],
      safeSubmissionCountByRfqId: { "rfq-empty": 0 },
    });
    const fallbackMessage =
      "1 active RFQ has no submitted quotation evidence in the authorized analytics dataset.";

    expect(participation).toMatchObject({
      totalSubmissions: 0,
      rfqSubmissionCoverage: {
        numerator: 0,
        denominator: 1,
        percentage: 0,
      },
    });
    expect(
      buildDecisionStreamRiskMessage({
        evidenceState: "policy-locked",
        totalSubmissions: participation.totalSubmissions,
        fallbackMessage,
      }),
    ).toBe(fallbackMessage);
  });

  it.each([
    "1 self-declared compliance record is past the recorded expiry date.",
    "1 active RFQ has a recorded deadline earlier than the current review date.",
    "1 RFQ is missing one or more procurement classification fields.",
  ])(
    "preserves unrelated top-risk evidence while locked submissions exist: %s",
    (fallbackMessage) => {
      expect(
        buildDecisionStreamRiskMessage({
          evidenceState: "policy-locked",
          totalSubmissions: 1,
          fallbackMessage,
        }),
      ).toBe(fallbackMessage);
    },
  );

  it("governs only quotation-absence evidence in the board report", () => {
    const quotationAbsence =
      "1 active RFQ has no submitted quotation evidence in the authorized analytics dataset.";
    const complianceRisk =
      "1 self-declared compliance record is past the recorded expiry date.";
    const deadlineRisk =
      "1 active RFQ has a recorded deadline earlier than the current review date.";
    const classificationRisk =
      "1 RFQ is missing one or more procurement classification fields.";
    const baseRiskEvidence = buildRiskComplianceEvidence({
      rfqs: [],
      quotes: [],
      compliance: { insurance: [], workers_compensation: [], safety: [] },
      canViewQuoteHistory: false,
      asOf: new Date("2026-09-12T12:00:00.000Z"),
    });
    const governedRiskEvidence = buildGovernedRiskComplianceEvidence({
      evidenceState: "policy-locked",
      totalSubmissions: 1,
      riskComplianceEvidence: {
        ...baseRiskEvidence,
        narrative: quotationAbsence,
        indicators: [
          quotationAbsence,
          complianceRisk,
          deadlineRisk,
          classificationRisk,
        ],
      },
    });
    const boardText = renderedText(
      renderToStaticMarkup(
        createElement(BoardExecutiveReport, {
          companyName: "Nexus",
          generatedAt: "September 12, 2026",
          decisionStatement: "Review governed evidence.",
          recommendation: "Await commercial opening.",
          boardPriority: "Evidence governance",
          enterpriseScore: null,
          boardReadiness: null,
          decisionReadiness: null,
          riskIndex: null,
          riskComplianceEvidence: governedRiskEvidence,
          opportunityValue: "Policy Locked",
          procurementVolume: "Policy Locked",
          awardedVolume: "Policy Locked",
          awardRate: "0%",
          supplierCount: 0,
          supplierEngagement: null,
          supplierDiversification: 0,
          portfolioHealth: null,
          supplierCommercialEvidenceState: "policy-locked",
          forecastConfidence: "Policy Locked",
          forecastNarrative: "Governed evidence only.",
          benchmarkPosition: "Policy Locked",
          benchmarkScore: null,
          findings: [],
          risks: [],
          opportunities: [],
          actions: [],
        }),
      ),
    );

    expect(boardText).toContain("1 submitted quotation is recorded");
    expect(boardText).toContain(
      "commercial evidence remains policy locked",
    );
    expect(boardText).not.toContain(quotationAbsence);
    expect(boardText).toContain(complianceRisk);
    expect(boardText).toContain(deadlineRisk);
    expect(boardText).toContain(classificationRisk);
  });

  it("withholds locked opportunity ranking and CEO readiness without serializing commercial details", () => {
    const opportunity = {
      title: "Secret supplier opportunity",
      priority: "Immediate",
      impact: "High",
      value: "$999,999",
      valueLabel: "Observed Quotation Opportunity",
      summary: "Supplier Alpha submitted the lowest amount.",
    };
    const opportunityText = renderedText(
      renderToStaticMarkup(
        createElement(ExecutiveOpportunityRanking, {
          opportunities: [opportunity],
          intelligence: [
            {
              ...opportunity,
              rank: 1,
              businessImpact: "High commercial impact",
              executionHorizon: "Immediate executive action",
              boardPriority: "High",
              ceoRecommendation: "Award to Supplier Alpha",
            },
          ],
          commercialEvidenceState: "policy-locked",
        }),
      ),
    );
    const ceoText = renderedText(
      renderToStaticMarkup(
        createElement(CEOActionCenter, {
          ceoOperatingStatus: "Policy Locked",
          ceoDecisionPosture: "Policy Locked",
          executiveBenchmarkStatus: "Policy Locked",
          executiveCommandRecommendation: "Await commercial opening.",
          ceoActionCenter: [
            {
              phase: "Immediate",
              title: "Review governed evidence",
              summary: "Await commercial opening.",
            },
          ],
          commercialEvidenceState: "policy-locked",
        }),
      ),
    );

    expect(opportunityText).toContain("Opportunity Evidence Policy Locked");
    expect(opportunityText).not.toContain("Decision Intelligence Available");
    expect(opportunityText).not.toContain("Highest commercial priority");
    expect(opportunityText).not.toContain("Secret supplier opportunity");
    expect(opportunityText).not.toContain("Supplier Alpha");
    expect(opportunityText).not.toContain("$999,999");
    expect(ceoText).toContain("Decision layer Policy Locked");
    expect(ceoText).toContain("Decision evidence remains policy locked");
    expect(ceoText).toContain(
      "Executive review is deferred pending complete commercial evidence",
    );
    expect(ceoText).not.toContain("Active and decision-ready");
    expect(ceoText).not.toContain("ready for review");
    expect(ceoText).not.toContain("decision layer is active");
  });

  it("withholds active command claims while command evidence is policy locked", () => {
    const text = renderedText(
      renderToStaticMarkup(
        createElement(ProcurementCommandCenter, {
          procurementCommandRoom: [
            { title: "Board Readiness", value: "Policy Locked" },
          ],
          procurementCommandRoomStatus: "Policy Locked",
          procurementCommandCenter: [
            {
              title: "Decision Readiness",
              value: "Policy Locked",
              status: "Policy Locked",
            },
          ],
          commandCenterStatus: "Policy Locked",
          executiveCommandRecommendation:
            "Await complete commercial evidence.",
        }),
      ),
    );

    expect(text).toContain("Command room evidence remains policy locked");
    expect(text).toContain(
      "Command center alignment awaits complete commercial evidence",
    );
    expect(text).not.toContain("Command room readiness is active");
    expect(text).not.toContain("Command center alignment is active");
    expect(text).not.toContain("active command environment");
    expect(text).not.toContain("Command alignment active");
  });

  it("preserves available commercial metrics, ranking, and CEO state", () => {
    const metrics = {
      asOf: "2026-09-12T12:00:00.000Z",
      averageActiveRfqAge: {
        numerator: 10,
        denominator: 1,
        value: 10,
        unit: "days" as const,
        status: "available" as const,
      },
      rfqSubmissionCoverage: {
        numerator: 1,
        denominator: 1,
        percentage: 100,
        status: "available" as const,
      },
      quotationDecisionCoverage: {
        numerator: 1,
        denominator: 2,
        percentage: 50,
        status: "available" as const,
      },
      quotationAwardRate: {
        numerator: 1,
        denominator: 2,
        percentage: 50,
        status: "available" as const,
      },
      averageQuotationsPerRfq: {
        numerator: 2,
        denominator: 1,
        value: 2,
        unit: "quotations" as const,
        status: "available" as const,
      },
      completedCycleDuration: {
        value: null,
        unit: "days" as const,
        status: "insufficient-data" as const,
        limitation: "No trusted terminal timestamp.",
      },
    };
    const opportunity = {
      title: "Concrete opportunity",
      priority: "Immediate",
      impact: "High",
      value: "$25,000",
      summary: "Visible quotation evidence supports review.",
    };
    const metricsText = renderedText(
      renderToStaticMarkup(
        createElement(ProcurementInsightMetrics, {
          metrics,
          commercialEvidenceState: "available",
        }),
      ),
    );
    const opportunityText = renderedText(
      renderToStaticMarkup(
        createElement(ExecutiveOpportunityRanking, {
          opportunities: [opportunity],
          intelligence: [
            {
              ...opportunity,
              rank: 1,
              businessImpact: "High business impact",
              executionHorizon: "Immediate executive action",
              boardPriority: "High",
              ceoRecommendation: "Review the visible evidence.",
            },
          ],
          commercialEvidenceState: "available",
        }),
      ),
    );
    const ceoText = renderedText(
      renderToStaticMarkup(
        createElement(CEOActionCenter, {
          ceoOperatingStatus: "Executive Growth Mode",
          ceoDecisionPosture: "Proceed",
          executiveBenchmarkStatus: "Board Ready",
          executiveCommandRecommendation: "Proceed with review.",
          ceoActionCenter: [
            {
              phase: "Immediate",
              title: "Review visible evidence",
              summary: "Proceed with review.",
            },
          ],
          commercialEvidenceState: "available",
        }),
      ),
    );

    expect(metricsText).toContain("Quotation Decision Coverage 50%");
    expect(metricsText).toContain("Quotation Award Rate 50%");
    expect(metricsText).toContain("Average Quotations per RFQ 2.0");
    expect(opportunityText).toContain("Decision Intelligence Available");
    expect(opportunityText).toContain("[01] Highest commercial priority");
    expect(ceoText).toContain("Active and decision-ready");
    expect(ceoText).toContain("Executive priority is ready for review");
    expect(ceoText).toContain("CEO decision layer is active");
    const commandText = renderedText(
      renderToStaticMarkup(
        createElement(ProcurementCommandCenter, {
          procurementCommandRoom: [
            { title: "Board Readiness", value: "Board Ready" },
          ],
          procurementCommandRoomStatus: "Executive Control",
          procurementCommandCenter: [
            {
              title: "Decision Readiness",
              value: "Board Ready",
              status: "Active",
            },
          ],
          commandCenterStatus: "Command Ready",
          executiveCommandRecommendation: "Proceed with review.",
        }),
      ),
    );
    expect(commandText).toContain("Command room readiness is active");
    expect(commandText).toContain("Command center alignment is active");
    expect(commandText).toContain("active command environment");
    expect(commandText).toContain("Command alignment active");
    expect(formatCommercialCurrencyEvidence("available", 25000)).toBe(
      "$25,000",
    );
  });
});
