import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

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
});
