import { describe, expect, it } from "vitest";

import {
  buildExecutiveSupplierRecommendation,
  buildUnavailableSupplierRecommendation,
} from "@/lib/executive/executive-recommendation";

import type {
  ExecutiveSupplierRecommendationCandidate,
  ExecutiveSupplierSignal,
} from "@/lib/executive/executive-types";

function buildSignals(
  scores: number[],
): ExecutiveSupplierSignal[] {
  const keys = [
    "commercial_competitiveness",
    "delivery_reliability",
    "quality_performance",
    "compliance_readiness",
  ] as const;

  return scores.map((score, index) => ({
    key: keys[index],
    label: `Signal ${index + 1}`,
    availability: "available",
    score,
    tone:
      score >= 85
        ? "success"
        : score >= 70
          ? "info"
          : score >= 55
            ? "warning"
            : "risk",
    summary: `Signal ${index + 1} scored ${score}/100.`,
    evidence: [`Evidence ${index + 1}`],
  }));
}

function buildCandidate({
  supplierCompanyId,
  supplierName,
  totalScore,
  awardConfidence,
  riskLevel,
  signalScores,
}: {
  supplierCompanyId: string;
  supplierName: string;
  totalScore: number;
  awardConfidence: number;
  riskLevel: string;
  signalScores: number[];
}): ExecutiveSupplierRecommendationCandidate {
  return {
    supplierCompanyId,
    supplierName,
    category: "Acoustical Ceilings",
    location: "Toronto, Ontario",
    networkRole: "Supplier",
    avlStatus: "Approved",
    avlRating: 4.5,
    submittedQuoteCount: 5,
    awardedQuoteCount: 2,
    unsuccessfulQuoteCount: 3,
    totalQuotedValue: 1_000_000,
    totalAwardedValue: 400_000,
    currentQuote: {
      rank: 0,
      amountNumber: 250_000,
      awardConfidence,
      riskLevel,
      totalScore,
      priceScore: totalScore,
      timelineScore: totalScore,
      riskScore: totalScore,
      performanceScore: totalScore,
      budgetVariance: 0,
      lowestBidVariance: 0,
    },
    signals: buildSignals(signalScores),
  };
}

describe("buildExecutiveSupplierRecommendation", () => {
  it("protects supplier intelligence while commercial evaluation is locked", () => {
    const result =
      buildExecutiveSupplierRecommendation({
        rfqSlug: "test-rfq",
        rfqCategory: "Acoustical Ceilings",
        rfqLocation: "Toronto",
        procurementScope: "Supply and installation",
        sourcingMethod: "invited",
        commercialEvaluationUnlocked: false,
        candidates: [],
      });

    expect(result.availability).toBe(
      "not_operational",
    );

    expect(result.recommendedSupplier).toBeNull();
    expect(result.rankedSuppliers).toEqual([]);
  });

  it("ranks candidates using the canonical current quote score", () => {
    const result =
      buildExecutiveSupplierRecommendation({
        rfqSlug: "test-rfq",
        rfqCategory: "Acoustical Ceilings",
        rfqLocation: "Toronto",
        procurementScope: "Supply and installation",
        sourcingMethod: "invited",
        commercialEvaluationUnlocked: true,
        candidates: [
          buildCandidate({
            supplierCompanyId: "supplier-b",
            supplierName: "Supplier B",
            totalScore: 78,
            awardConfidence: 78,
            riskLevel: "Medium",
            signalScores: [90, 90, 90, 90],
          }),
          buildCandidate({
            supplierCompanyId: "supplier-a",
            supplierName: "Supplier A",
            totalScore: 91,
            awardConfidence: 91,
            riskLevel: "Low",
            signalScores: [75, 75, 75, 75],
          }),
        ],
      });

    expect(
      result.recommendedSupplier?.supplierCompanyId,
    ).toBe("supplier-a");

    expect(
      result.recommendedSupplier?.score,
    ).toBe(91);

    expect(
      result.rankedSuppliers.map(
        (supplier) => supplier.rank,
      ),
    ).toEqual([1, 2]);
  });

  it("creates executive rationale and procurement risks from signals", () => {
    const result =
      buildExecutiveSupplierRecommendation({
        rfqSlug: "test-rfq",
        rfqCategory: "Acoustical Ceilings",
        rfqLocation: "Toronto",
        procurementScope: "Supply and installation",
        sourcingMethod: "invited",
        commercialEvaluationUnlocked: true,
        candidates: [
          buildCandidate({
            supplierCompanyId: "supplier-a",
            supplierName: "Supplier A",
            totalScore: 72,
            awardConfidence: 72,
            riskLevel: "Medium",
            signalScores: [88, 82, 48, 76],
          }),
        ],
      });

    const supplier = result.recommendedSupplier;

    expect(supplier).not.toBeNull();
    expect(supplier?.rationale.length).toBeGreaterThan(
      0,
    );

    expect(
      supplier?.risks.some(
        (risk) => risk.title === "Signal 3",
      ),
    ).toBe(true);

    expect(
      supplier?.risks.some(
        (risk) =>
          risk.title === "Procurement Risk Exposure",
      ),
    ).toBe(true);
  });

  it("uses signal intelligence only when no canonical quote score exists", () => {
    const candidate = buildCandidate({
      supplierCompanyId: "supplier-a",
      supplierName: "Supplier A",
      totalScore: 90,
      awardConfidence: 90,
      riskLevel: "Low",
      signalScores: [80, 80, 80, 80],
    });

    candidate.currentQuote = null;

    const result =
      buildExecutiveSupplierRecommendation({
        rfqSlug: "test-rfq",
        rfqCategory: null,
        rfqLocation: null,
        procurementScope: null,
        sourcingMethod: null,
        commercialEvaluationUnlocked: true,
        candidates: [candidate],
      });

    expect(result.recommendedSupplier?.score).toBe(80);
  });

  it("marks candidates with limited evidence as insufficient data", () => {
    const candidate = buildCandidate({
      supplierCompanyId: "supplier-a",
      supplierName: "Supplier A",
      totalScore: 90,
      awardConfidence: 90,
      riskLevel: "Low",
      signalScores: [90, 90, 90, 90],
    });

    candidate.signals = [
      {
        ...candidate.signals[0],
        availability: "available",
      },
      {
        ...candidate.signals[1],
        availability: "insufficient_data",
        score: null,
      },
      {
        ...candidate.signals[2],
        availability: "insufficient_data",
        score: null,
      },
      {
        ...candidate.signals[3],
        availability: "insufficient_data",
        score: null,
      },
    ];

    const result =
      buildExecutiveSupplierRecommendation({
        rfqSlug: "test-rfq",
        rfqCategory: null,
        rfqLocation: null,
        procurementScope: null,
        sourcingMethod: null,
        commercialEvaluationUnlocked: true,
        candidates: [candidate],
      });

    expect(result.recommendedSupplier).toBeNull();

    expect(result.rankedSuppliers[0].dataAvailability).toBe(
      "insufficient_data",
    );
  });
  it("adds domain-aware evidence assessment without changing supplier ranking", () => {
    const result =
      buildExecutiveSupplierRecommendation({
        rfqSlug: "test-rfq",
        rfqCategory: "Acoustical Ceilings",
        rfqLocation: "Toronto",
        procurementScope: "Supply and installation",
        sourcingMethod: "invited",
        commercialEvaluationUnlocked: true,
        candidates: [
          buildCandidate({
            supplierCompanyId: "supplier-b",
            supplierName: "Supplier B",
            totalScore: 80,
            awardConfidence: 80,
            riskLevel: "Low",
            signalScores: [95, 95, 95, 95],
          }),
          buildCandidate({
            supplierCompanyId: "supplier-a",
            supplierName: "Supplier A",
            totalScore: 91,
            awardConfidence: 91,
            riskLevel: "Low",
            signalScores: [75, 75, 75, 75],
          }),
        ],
      });

    expect(
      result.rankedSuppliers.map(
        (supplier) => supplier.supplierCompanyId,
      ),
    ).toEqual(["supplier-a", "supplier-b"]);

    expect(
      result.rankedSuppliers[0].evidenceAssessment
        .totalSignalCount,
    ).toBe(11);

    expect(
      result.rankedSuppliers[0].evidenceAssessment
        .decisionReadiness,
    ).toBe("insufficient_evidence");
  });

  it("keeps legacy data coverage independent from canonical evidence taxonomy coverage", () => {
    const result =
      buildExecutiveSupplierRecommendation({
        rfqSlug: "test-rfq",
        rfqCategory: "Acoustical Ceilings",
        rfqLocation: "Toronto",
        procurementScope: "Supply and installation",
        sourcingMethod: "invited",
        commercialEvaluationUnlocked: true,
        candidates: [
          buildCandidate({
            supplierCompanyId: "supplier-a",
            supplierName: "Supplier A",
            totalScore: 91,
            awardConfidence: 91,
            riskLevel: "Low",
            signalScores: [90, 90, 90, 90],
          }),
        ],
      });

    const supplier = result.rankedSuppliers[0];

    expect(supplier.dataCoverage).toBe(100);
    expect(
      supplier.evidenceAssessment.coverage,
    ).toBe(36);
  });

});

describe("buildUnavailableSupplierRecommendation", () => {
  it("returns an explicit not-operational state before candidate integration", () => {
    const result =
      buildUnavailableSupplierRecommendation();

    expect(result.availability).toBe(
      "not_operational",
    );

    expect(result.confidence).toBe("unavailable");
    expect(result.recommendedSupplier).toBeNull();
  });
});