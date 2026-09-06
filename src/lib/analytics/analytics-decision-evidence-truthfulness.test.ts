import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { buildAnalyticsRfqSourceHref } from "@/lib/analytics/procurement-utils";
import { buildDecisionSupportReadiness } from "@/lib/analytics/executive/decision-support-readiness";
import { calculateExecutiveReadiness } from "@/lib/executive/executive-readiness-score";
import { calculateExecutiveScore } from "@/lib/executive/executive-score";

function readSource(relativePath: string) {
  return fs.readFileSync(path.join(process.cwd(), relativePath), "utf8");
}

const analyticsPage = readSource("src/app/analytics/page.tsx");
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
    expect(executiveTrendSource).toContain(
      "not forecasts or outcome probabilities",
    );

    expect(executiveHistoricalPatternSurface).toContain(
      "Current vs Prior 30-Day Activity",
    );
    expect(executiveHistoricalPatternSurface).toContain(
      "Recorded procurement evidence",
    );
    expect(executiveHistoricalPatternSurface).not.toMatch(
      /30 \/ 60 \/ 90 Day Procurement Forecast|Forward-looking executive intelligence|projecting procurement outlook|Forecast status/i,
    );

    expect(executiveHistoricalContextSurface).toContain(
      "Observed Procurement Pattern Context",
    );
    expect(executiveHistoricalContextSurface).toContain(
      "does not model future outcomes",
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
    expect(boardExecutiveReport).not.toContain('eyebrow="Forward outlook"');
  });

  it("keeps executive visual semantics aligned with the underlying evidence", () => {
    expect(analyticsPage).not.toMatch(/savings\s+savings/i);
    expect(analyticsPage).toContain('valueLabel: "Opportunity Score"');
    expect(analyticsPage).toContain(
      'valueLabel: "Estimated Savings Opportunity"',
    );
    expect(analyticsPage).toContain('valueLabel: "Supplier Engagement"');
    expect(analyticsPage).toContain(
      'valueLabel: "Dominant Procurement Scope"',
    );
    expect(analyticsPage).toContain(
      'title: "Board Readiness",\n      value: `${boardReadinessScore}/100`,',
    );

    expect(executiveOpportunityRankingSurface).toContain(
      "valueLabel?: string",
    );
    expect(executiveOpportunityRankingSurface).toContain(
      '{opportunity.valueLabel || "Opportunity Value"}',
    );

    expect(executiveRiskCenterSurface).toContain(
      "const primaryRiskPosition =",
    );
    expect(executiveRiskCenterSurface).toContain(
      '"Moderate enterprise exposure"',
    );
    expect(executiveRiskCenterSurface).toContain("{primaryRiskPosition}");

    expect(analyticsChartSurface).toContain(
      'valueFormat?: "number" | "currency"',
    );
    expect(analyticsChartSurface).toContain("formatCompactCurrency");
    expect(procurementPipelineSurface).toContain('valueFormat="currency"');
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
      "decisionSupportReadinessScore={decisionSupportReadiness.score}",
    );
    expect(analyticsPage).toContain(
      "decisionSupportReadinessLabel={decisionSupportReadiness.label}",
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
    expect(supplierPortfolio).toContain("Award History");
    expect(supplierPortfolio).toContain("Limited Quote History");
    expect(supplierPortfolio).toContain("Not a trustworthiness score");

    expect(companyProfile).not.toContain("AI Supplier Intelligence");
    expect(companyProfile).not.toContain("supplierIntelligenceScore");
    expect(companyProfile).not.toContain("Procurement Fit");
    expect(companyProfile).not.toContain("Buyer suitability");
    expect(companyProfile).toContain("Supplier Performance Evidence");

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
