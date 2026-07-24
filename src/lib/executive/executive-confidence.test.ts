import { describe, expect, it } from "vitest";

import {
  buildDecisionConfidenceAssessment,
  buildSupplierConfidenceAssessment,
} from "@/lib/executive/executive-confidence";

import type {
  ExecutiveEvidenceAssessment,
  ExecutiveSupplierRecommendation,
  ExecutiveSupplierSignal,
  ExecutiveSupplierSignalKey,
} from "@/lib/executive/executive-types";

function buildEvidenceAssessment({
  coverage,
  readiness,
}: {
  coverage: number;
  readiness:
    | "ready"
    | "review_required"
    | "insufficient_evidence";
}): ExecutiveEvidenceAssessment {
  return {
    coverage,
    availableSignalCount: Math.round(
      (coverage / 100) * 11,
    ),
    totalSignalCount: 11,
    domains: [],
    missingSignalKeys: [],
    missingFoundationalSignalKeys: [],
    missingGovernanceSignalKeys: [],
    decisionReadiness: readiness,
  };
}

function buildSignals(
  scores: number[],
): ExecutiveSupplierSignal[] {
  const keys: ExecutiveSupplierSignalKey[] = [
    "commercial_competitiveness",
    "delivery_reliability",
    "quality_performance",
    "historical_award_performance",
    "response_reliability",
    "compliance_readiness",
    "capacity_confidence",
    "procurement_risk",
  ];

  return scores.map((score, index) => ({
    key: keys[index],
    label: keys[index],
    availability: "available",
    score,
    tone: "info",
    summary: `${keys[index]} scored ${score}.`,
    evidence: [`Evidence ${index + 1}`],
  }));
}

function buildRecommendation({
  supplierCompanyId,
  score,
  confidenceScore,
  dataAvailability = "available",
}: {
  supplierCompanyId: string;
  score: number;
  confidenceScore: number;
  dataAvailability?: "available" | "insufficient_data";
}): ExecutiveSupplierRecommendation {
  return {
    supplierCompanyId,
    supplierName: supplierCompanyId,
    rank: 0,
    score,
    status: "Qualified Executive Review",
    tone: "info",
    priority: "medium",
    confidence:
      confidenceScore >= 80
        ? "high"
        : confidenceScore >= 65
          ? "medium"
          : "low",
    confidenceAssessment: {
      score: confidenceScore,
      level:
        confidenceScore >= 80
          ? "high"
          : confidenceScore >= 65
            ? "medium"
            : "low",
      factors: [],
      summary: "Supplier confidence.",
    },
    dataAvailability,
    dataCoverage: 100,
    evidenceAssessment: buildEvidenceAssessment({
      coverage: 100,
      readiness: "ready",
    }),
    recommendation: "Review supplier.",
    rationale: [],
    risks: [],
    signals: [],
  };
}

describe("buildSupplierConfidenceAssessment", () => {
  it("keeps confidence low when supplier score may be high but evidence is weak", () => {
    const assessment =
      buildSupplierConfidenceAssessment({
        evidenceAssessment:
          buildEvidenceAssessment({
            coverage: 27,
            readiness: "insufficient_evidence",
          }),
        signals: buildSignals([95, 94]),
        submittedQuoteCount: 0,
        awardedQuoteCount: 0,
        riskLevel: null,
      });

    expect(assessment.level).toBe("low");
    expect(assessment.score).not.toBeNull();
    expect(assessment.score).toBeLessThan(65);
  });

  it("increases confidence when historical validation depth improves", () => {
    const baseInput = {
      evidenceAssessment:
        buildEvidenceAssessment({
          coverage: 82,
          readiness: "ready" as const,
        }),
      signals: buildSignals([
        82, 80, 84, 81, 83, 80, 82, 81,
      ]),
      riskLevel: "Low",
    };

    const limited =
      buildSupplierConfidenceAssessment({
        ...baseInput,
        submittedQuoteCount: 1,
        awardedQuoteCount: 0,
      });

    const validated =
      buildSupplierConfidenceAssessment({
        ...baseInput,
        submittedQuoteCount: 8,
        awardedQuoteCount: 3,
      });

    expect(validated.score).toBeGreaterThan(
      limited.score ?? 0,
    );
  });

  it("reduces confidence when available signals conflict materially", () => {
    const stable =
      buildSupplierConfidenceAssessment({
        evidenceAssessment:
          buildEvidenceAssessment({
            coverage: 82,
            readiness: "ready",
          }),
        signals: buildSignals([
          82, 80, 84, 81, 83, 80, 82, 81,
        ]),
        submittedQuoteCount: 5,
        awardedQuoteCount: 2,
        riskLevel: "Low",
      });

    const conflicting =
      buildSupplierConfidenceAssessment({
        evidenceAssessment:
          buildEvidenceAssessment({
            coverage: 82,
            readiness: "ready",
          }),
        signals: buildSignals([
          98, 42, 91, 35, 88, 47, 95, 38,
        ]),
        submittedQuoteCount: 5,
        awardedQuoteCount: 2,
        riskLevel: "Low",
      });

    expect(stable.score).toBeGreaterThan(
      conflicting.score ?? 0,
    );
  });
});

describe("buildDecisionConfidenceAssessment", () => {
  it("increases confidence when the leading supplier has clear separation", () => {
    const closeSuppliers = [
      buildRecommendation({
        supplierCompanyId: "supplier-a",
        score: 90,
        confidenceScore: 82,
      }),
      buildRecommendation({
        supplierCompanyId: "supplier-b",
        score: 89,
        confidenceScore: 80,
      }),
    ];

    const separatedSuppliers = [
      buildRecommendation({
        supplierCompanyId: "supplier-a",
        score: 90,
        confidenceScore: 82,
      }),
      buildRecommendation({
        supplierCompanyId: "supplier-b",
        score: 74,
        confidenceScore: 80,
      }),
    ];

    const close =
      buildDecisionConfidenceAssessment({
        recommendedSupplier: closeSuppliers[0],
        rankedSuppliers: closeSuppliers,
        suppliersWithSufficientData: 2,
      });

    const separated =
      buildDecisionConfidenceAssessment({
        recommendedSupplier:
          separatedSuppliers[0],
        rankedSuppliers: separatedSuppliers,
        suppliersWithSufficientData: 2,
      });

    expect(separated.score).toBeGreaterThan(
      close.score ?? 0,
    );
  });

  it("does not claim high comparative confidence for a single supplier", () => {
    const supplier = buildRecommendation({
      supplierCompanyId: "supplier-a",
      score: 95,
      confidenceScore: 95,
    });

    const assessment =
      buildDecisionConfidenceAssessment({
        recommendedSupplier: supplier,
        rankedSuppliers: [supplier],
        suppliersWithSufficientData: 1,
      });

    expect(assessment.level).not.toBe("high");
  });

  it("returns unavailable confidence without a recommended supplier", () => {
    const assessment =
      buildDecisionConfidenceAssessment({
        recommendedSupplier: null,
        rankedSuppliers: [],
        suppliersWithSufficientData: 0,
      });

    expect(assessment.level).toBe("unavailable");
    expect(assessment.score).toBeNull();
  });
});