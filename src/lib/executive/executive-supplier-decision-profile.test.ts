import { describe, expect, it } from "vitest";

import { buildExecutiveSupplierDecisionProfile } from "@/lib/executive/executive-supplier-decision-profile";

import type {
  ExecutiveEvidenceAssessment,
  ExecutiveSupplierRecommendationCandidate,
  ExecutiveSupplierSignal,
} from "@/lib/executive/executive-types";

function buildSignals(): ExecutiveSupplierSignal[] {
  return [
    {
      key: "commercial_competitiveness",
      label: "Commercial Competitiveness",
      availability: "available",
      score: 92,
      tone: "success",
      summary:
        "Commercial positioning is highly competitive.",
      evidence: ["Canonical quote evaluation"],
    },
    {
      key: "delivery_reliability",
      label: "Delivery Reliability",
      availability: "available",
      score: 78,
      tone: "info",
      summary:
        "Delivery history supports reliable execution.",
      evidence: ["Historical delivery record"],
    },
    {
      key: "compliance_readiness",
      label: "Compliance Readiness",
      availability: "insufficient_data",
      score: null,
      tone: "neutral",
      summary:
        "Compliance evidence is incomplete.",
      evidence: [],
    },
  ];
}

function buildCandidate(): ExecutiveSupplierRecommendationCandidate {
  return {
    supplierCompanyId: "supplier-a",
    supplierName: "Supplier A",
    category: "Acoustical Ceilings",
    location: "Toronto, Ontario",
    networkRole: "Supplier",
    avlStatus: "Approved",
    avlRating: 4.6,
    submittedQuoteCount: 6,
    awardedQuoteCount: 3,
    unsuccessfulQuoteCount: 3,
    totalQuotedValue: 1_200_000,
    totalAwardedValue: 625_000,
    currentQuote: {
      rank: 1,
      amountNumber: 250_000,
      awardConfidence: 86,
      riskLevel: "Medium",
      totalScore: 88,
      priceScore: 90,
      timelineScore: 85,
      riskScore: 75,
      performanceScore: 88,
      budgetVariance: 0,
      lowestBidVariance: 0,
    },
    signals: buildSignals(),
  };
}

function buildEvidenceAssessment(): ExecutiveEvidenceAssessment {
  return {
    coverage: 64,
    availableSignalCount: 7,
    totalSignalCount: 11,
    domains: [
      {
        key: "commercial",
        label: "Commercial",
        availableSignalCount: 3,
        totalSignalCount: 4,
        coverage: 75,
        readiness: "partial",
        availableSignalKeys: [
          "commercial_competitiveness",
          "delivery_reliability",
          "quality_performance",
        ],
        missingSignalKeys: ["procurement_risk"],
      },
    ],
    missingSignalKeys: [
      "compliance_readiness",
      "capacity_confidence",
    ],
    missingFoundationalSignalKeys: [],
    missingGovernanceSignalKeys: [
      "compliance_readiness",
      "capacity_confidence",
    ],
    decisionReadiness: "review_required",
  };
}

describe("buildExecutiveSupplierDecisionProfile", () => {
  it("assembles identity, commercial, evidence, confidence, and recommendation outputs", () => {
    const profile =
      buildExecutiveSupplierDecisionProfile({
        candidate: buildCandidate(),
        rank: 1,
        score: 88,
        status: "Qualified Executive Review",
        tone: "success",
        priority: "low",
        dataAvailability: "available",
        evidenceAssessment:
          buildEvidenceAssessment(),
        confidenceAssessment: {
          score: 76,
          level: "medium",
        },
        recommendation:
          "Retain this supplier in the executive shortlist and validate the remaining commercial, delivery, and governance conditions.",
        rationale: [
          "Commercial positioning is highly competitive.",
        ],
        risks: [
          {
            title: "Procurement Risk Exposure",
            severity: "warning",
            summary:
              "The current commercial evaluation classifies this supplier as Medium risk.",
          },
        ],
      });

    expect(profile.identity.supplierCompanyId).toBe(
      "supplier-a",
    );
    expect(profile.commercialPosition.score).toBe(88);
    expect(profile.decision.confidenceScore).toBe(76);
    expect(profile.decision.decisionReadiness).toBe(
      "review_required",
    );
    expect(profile.evidenceGaps).toContain(
      "Compliance Readiness evidence is unavailable.",
    );
    expect(profile.nextActions.length).toBeGreaterThan(
      1,
    );
  });

  it("keeps the canonical quote score and does not recalculate ranking", () => {
    const profile =
      buildExecutiveSupplierDecisionProfile({
        candidate: buildCandidate(),
        rank: 3,
        score: 88,
        status: "Qualified Executive Review",
        tone: "success",
        priority: "low",
        dataAvailability: "available",
        evidenceAssessment:
          buildEvidenceAssessment(),
        confidenceAssessment: {
          score: 76,
          level: "medium",
        },
        recommendation: "Review supplier.",
        rationale: [],
        risks: [],
      });

    expect(profile.decision.rank).toBe(3);
    expect(profile.commercialPosition.score).toBe(88);
  });

  it("creates an executive narrative from canonical outputs", () => {
    const profile =
      buildExecutiveSupplierDecisionProfile({
        candidate: buildCandidate(),
        rank: 1,
        score: 88,
        status: "Qualified Executive Review",
        tone: "success",
        priority: "low",
        dataAvailability: "available",
        evidenceAssessment:
          buildEvidenceAssessment(),
        confidenceAssessment: {
          score: 76,
          level: "medium",
        },
        recommendation: "Review supplier.",
        rationale: [],
        risks: [],
      });

    expect(profile.executiveNarrative).toContain(
      "Supplier A is ranked #1",
    );
    expect(profile.executiveNarrative).toContain(
      "64% canonical evidence coverage",
    );
    expect(profile.executiveNarrative).toContain(
      "medium decision confidence (76/100)",
    );
  });
});