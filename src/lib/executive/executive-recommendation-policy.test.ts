import { describe, expect, it } from "vitest";

import {
  resolveExecutiveAwardPolicy,
  resolveExecutiveScorePriority,
  resolveExecutiveScoreTone,
  resolveSupplierCandidatePolicy,
  resolveSupplierRecommendationResultPolicy,
} from "@/lib/executive/executive-recommendation-policy";

describe("executive recommendation policy", () => {
  it("preserves canonical score tone and priority thresholds", () => {
    expect(resolveExecutiveScoreTone(85)).toBe(
      "success",
    );
    expect(resolveExecutiveScoreTone(70)).toBe("info");
    expect(resolveExecutiveScoreTone(55)).toBe(
      "warning",
    );
    expect(resolveExecutiveScoreTone(54)).toBe("risk");

    expect(resolveExecutiveScorePriority(85)).toBe(
      "low",
    );
    expect(resolveExecutiveScorePriority(70)).toBe(
      "medium",
    );
    expect(resolveExecutiveScorePriority(55)).toBe(
      "high",
    );
    expect(resolveExecutiveScorePriority(54)).toBe(
      "critical",
    );
  });

  it("normalizes supplier candidate status and wording", () => {
    expect(
      resolveSupplierCandidatePolicy({
        score: 90,
        availability: "available",
        riskLevel: "Low",
      }),
    ).toEqual({
      status: "Preferred Award Candidate",
      tone: "success",
      priority: "low",
      recommendation:
        "Advance this supplier to authorized award validation, subject to final governance and commercial confirmation.",
    });

    expect(
      resolveSupplierCandidatePolicy({
        score: 90,
        availability: "available",
        riskLevel: "Medium",
      }).status,
    ).toBe("Qualified Executive Review");

    expect(
      resolveSupplierCandidatePolicy({
        score: 40,
        availability: "insufficient_data",
        riskLevel: "Low",
      }),
    ).toEqual({
      status: "Insufficient Decision Evidence",
      tone: "neutral",
      priority: "high",
      recommendation:
        "Collect additional supplier evidence before forming an award recommendation.",
    });
  });

  it("normalizes supplier result states without requiring scoring logic", () => {
    expect(
      resolveSupplierRecommendationResultPolicy({
        state: "commercial_protected",
      }).status,
    ).toBe("Commercial Evaluation Protected");

    expect(
      resolveSupplierRecommendationResultPolicy({
        state: "ranking_available",
        supplierName: "Supplier A",
        supplierRecommendation:
          "Proceed to final validation.",
      }).recommendation,
    ).toBe(
      "Supplier A is the leading evaluated supplier. Proceed to final validation.",
    );

    expect(
      resolveSupplierRecommendationResultPolicy({
        state: "not_connected",
      }).status,
    ).toBe("Supplier Intelligence Not Connected");
  });

  it("normalizes the general executive award policy", () => {
    expect(
      resolveExecutiveAwardPolicy({
        commercialEvaluationUnlocked: false,
        hasRecommendedQuote: false,
        score: 20,
        riskLevel: null,
      }),
    ).toEqual({
      status: "Commercial Locked",
      tone: "warning",
      priority: "high",
      recommendation:
        "Commercial evaluation is still protected. Wait until commercial opening before making an award decision.",
    });

    expect(
      resolveExecutiveAwardPolicy({
        commercialEvaluationUnlocked: true,
        hasRecommendedQuote: true,
        score: 88,
        riskLevel: "Low",
      }).status,
    ).toBe("Award Ready");

    expect(
      resolveExecutiveAwardPolicy({
        commercialEvaluationUnlocked: true,
        hasRecommendedQuote: true,
        score: 50,
        riskLevel: "High",
      }).status,
    ).toBe("Needs Validation");
  });
});