import { describe, expect, it } from "vitest";

import {
  buildExecutiveEvidenceAssessment,
  EXECUTIVE_EVIDENCE_DOMAINS,
} from "@/lib/executive/executive-evidence";

import type {
  ExecutiveSupplierSignal,
  ExecutiveSupplierSignalKey,
} from "@/lib/executive/executive-types";

function buildSignal(
  key: ExecutiveSupplierSignalKey,
  available = true,
): ExecutiveSupplierSignal {
  return {
    key,
    label: key,
    availability: available
      ? "available"
      : "insufficient_data",
    score: available ? 80 : null,
    tone: available ? "info" : "neutral",
    summary: `${key} evidence`,
    evidence: available ? [`${key} evidence`] : [],
  };
}

const ALL_SIGNAL_KEYS =
  EXECUTIVE_EVIDENCE_DOMAINS.flatMap(
    (domain) => domain.signalKeys,
  );

describe("buildExecutiveEvidenceAssessment", () => {
  it("classifies the complete signal taxonomy into canonical evidence domains", () => {
    const assessment =
      buildExecutiveEvidenceAssessment({
        signals: ALL_SIGNAL_KEYS.map((key) =>
          buildSignal(key),
        ),
        hasCurrentQuote: true,
        riskLevel: "Low",
      });

    expect(
      assessment.domains.map((domain) => domain.key),
    ).toEqual([
      "commercial",
      "historical",
      "governance",
      "operational_fit",
    ]);

    expect(assessment.coverage).toBe(100);
    expect(assessment.decisionReadiness).toBe("ready");
  });

  it("marks partially connected domains without treating them as missing", () => {
    const assessment =
      buildExecutiveEvidenceAssessment({
        signals: [
          buildSignal("commercial_competitiveness"),
          buildSignal("procurement_risk"),
          buildSignal("historical_award_performance"),
          buildSignal("category_alignment"),
        ],
        hasCurrentQuote: true,
        riskLevel: "Low",
      });

    expect(
      assessment.domains.find(
        (domain) => domain.key === "historical",
      )?.readiness,
    ).toBe("partial");

    expect(
      assessment.domains.find(
        (domain) => domain.key === "governance",
      )?.readiness,
    ).toBe("missing");

    expect(assessment.decisionReadiness).toBe(
      "review_required",
    );
  });

  it("requires a current quote and foundational commercial evidence", () => {
    const missingQuote =
      buildExecutiveEvidenceAssessment({
        signals: ALL_SIGNAL_KEYS.map((key) =>
          buildSignal(key),
        ),
        hasCurrentQuote: false,
        riskLevel: null,
      });

    const missingRiskEvidence =
      buildExecutiveEvidenceAssessment({
        signals: [
          buildSignal("commercial_competitiveness"),
          buildSignal("delivery_reliability"),
          buildSignal("quality_performance"),
        ],
        hasCurrentQuote: true,
        riskLevel: "Low",
      });

    expect(missingQuote.decisionReadiness).toBe(
      "insufficient_evidence",
    );

    expect(
      missingRiskEvidence.missingFoundationalSignalKeys,
    ).toContain("procurement_risk");

    expect(
      missingRiskEvidence.decisionReadiness,
    ).toBe("insufficient_evidence");
  });

  it("routes governance gaps and high risk to executive review", () => {
    const signals = ALL_SIGNAL_KEYS.map((key) =>
      buildSignal(key),
    ).filter(
      (signal) =>
        signal.key !== "compliance_readiness",
    );

    const governanceGap =
      buildExecutiveEvidenceAssessment({
        signals,
        hasCurrentQuote: true,
        riskLevel: "Low",
      });

    const highRisk =
      buildExecutiveEvidenceAssessment({
        signals: ALL_SIGNAL_KEYS.map((key) =>
          buildSignal(key),
        ),
        hasCurrentQuote: true,
        riskLevel: "High",
      });

    expect(
      governanceGap.missingGovernanceSignalKeys,
    ).toContain("compliance_readiness");

    expect(governanceGap.decisionReadiness).toBe(
      "review_required",
    );

    expect(highRisk.decisionReadiness).toBe(
      "review_required",
    );
  });

  it("uses the canonical taxonomy denominator even when signals are absent", () => {
    const assessment =
      buildExecutiveEvidenceAssessment({
        signals: [
          buildSignal("commercial_competitiveness"),
        ],
        hasCurrentQuote: true,
        riskLevel: "Low",
      });

    expect(assessment.availableSignalCount).toBe(1);
    expect(assessment.totalSignalCount).toBe(11);
    expect(assessment.coverage).toBe(9);
  });
});