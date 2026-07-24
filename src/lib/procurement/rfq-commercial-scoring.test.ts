import { describe, expect, it } from "vitest";

import {
  SUPPLIER_EVALUATION_WEIGHTS,
  getAwardConfidence,
  getPerformanceScore,
  getPriceScore,
  getRiskLevel,
  getRiskScore,
  getSupplierEvaluationScore,
  getTimelineMonths,
  getTimelineScore,
  getValidityScore,
} from "./rfq-commercial-scoring";

describe("RFQ commercial scoring policy", () => {
  describe("SUPPLIER_EVALUATION_WEIGHTS", () => {
    it("preserves the canonical supplier evaluation weights", () => {
      expect(SUPPLIER_EVALUATION_WEIGHTS).toEqual({
        price: 0.38,
        timeline: 0.22,
        performance: 0.18,
        riskReadiness: 0.14,
        validity: 0.08,
      });
    });

    it("keeps the supplier evaluation weights normalized to one", () => {
      const totalWeight = Object.values(
        SUPPLIER_EVALUATION_WEIGHTS,
      ).reduce((total, weight) => total + weight, 0);

      expect(totalWeight).toBeCloseTo(1, 10);
    });
  });

  describe("getTimelineMonths", () => {
    it("uses eighteen months when no timeline is provided", () => {
      expect(getTimelineMonths(null)).toBe(18);
      expect(getTimelineMonths("")).toBe(18);
    });

    it("converts quarter references into months", () => {
      expect(getTimelineMonths("Q1 delivery")).toBe(3);
      expect(getTimelineMonths("Q2 delivery")).toBe(6);
      expect(getTimelineMonths("Q3 delivery")).toBe(9);
      expect(getTimelineMonths("Q4 delivery")).toBe(12);
    });

    it("treats fast and quick delivery language as six months", () => {
      expect(getTimelineMonths("Fast delivery")).toBe(6);
      expect(getTimelineMonths("Quick turnaround")).toBe(6);
    });

    it("converts weeks into rounded calendar months", () => {
      expect(getTimelineMonths("4 weeks")).toBe(1);
      expect(getTimelineMonths("8 weeks")).toBe(2);
      expect(getTimelineMonths("26 weeks")).toBe(6);
    });

    it("uses numeric values as months when no week unit is present", () => {
      expect(getTimelineMonths("12 months")).toBe(12);
      expect(getTimelineMonths("18 month schedule")).toBe(18);
      expect(getTimelineMonths("24")).toBe(24);
    });
  });

  describe("getTimelineScore", () => {
    it.each([
      ["6 months", 100],
      ["9 months", 92],
      ["12 months", 84],
      ["16 months", 74],
      ["20 months", 62],
      ["24 months", 52],
      ["25 months", 40],
    ])(
      "returns %s timeline score for %s",
      (timeline, expectedScore) => {
        expect(getTimelineScore(timeline)).toBe(expectedScore);
      },
    );

    it("uses the fallback timeline score when no timeline is available", () => {
      expect(getTimelineScore(null)).toBe(62);
    });
  });

  describe("getPerformanceScore", () => {
    it("returns the baseline score when no performance evidence exists", () => {
      expect(getPerformanceScore(null)).toBe(55);
      expect(getPerformanceScore("General supplier response")).toBe(55);
    });

    it("adds four points for every recognized positive signal", () => {
      const message = [
        "Healthcare",
        "hospital",
        "infection control",
        "phased",
        "occupied",
        "quality assurance",
        "project management",
        "firestopping",
        "commissioning",
        "warranty",
        "experience",
        "certified",
        "COR",
        "WSIB",
      ].join(" ");

      expect(getPerformanceScore(message)).toBe(100);
    });

    it("matches positive signals without case sensitivity", () => {
      expect(
        getPerformanceScore(
          "HEALTHCARE QUALITY ASSURANCE PROJECT MANAGEMENT WARRANTY",
        ),
      ).toBe(71);
    });

    it("adds a documentation-depth bonus above five hundred characters", () => {
      const message = `healthcare ${"a".repeat(501)}`;

      expect(getPerformanceScore(message)).toBe(64);
    });

    it("adds both documentation-depth bonuses above nine hundred characters", () => {
      const message = `healthcare ${"a".repeat(901)}`;

      expect(getPerformanceScore(message)).toBe(69);
    });

    it("clamps the performance score at one hundred", () => {
      const message = [
        "healthcare",
        "hospital",
        "infection control",
        "phased",
        "occupied",
        "quality assurance",
        "project management",
        "firestopping",
        "commissioning",
        "warranty",
        "experience",
        "certified",
        "cor",
        "wsib",
        "a".repeat(1_000),
      ].join(" ");

      expect(getPerformanceScore(message)).toBe(100);
    });
  });

  describe("getRiskScore", () => {
    const completeRiskEvidence =
      "Quality planning, warranty coverage, and project management controls.";

    it("returns the baseline readiness score for a supported supplier position", () => {
      expect(
        getRiskScore({
          amountNumber: 100_000,
          budget: 120_000,
          timeline: "12 months",
          message: completeRiskEvidence,
        }),
      ).toBe(85);
    });

    it("penalizes a quote that exceeds the available budget", () => {
      expect(
        getRiskScore({
          amountNumber: 125_000,
          budget: 120_000,
          timeline: "12 months",
          message: completeRiskEvidence,
        }),
      ).toBe(67);
    });

    it("penalizes an abnormally low quote below sixty-five percent of budget", () => {
      expect(
        getRiskScore({
          amountNumber: 60_000,
          budget: 100_000,
          timeline: "12 months",
          message: completeRiskEvidence,
        }),
      ).toBe(73);
    });

    it("penalizes delivery timelines longer than twenty-four months", () => {
      expect(
        getRiskScore({
          amountNumber: 100_000,
          budget: 120_000,
          timeline: "30 months",
          message: completeRiskEvidence,
        }),
      ).toBe(70);
    });

    it("penalizes missing warranty, quality, and project-management evidence", () => {
      expect(
        getRiskScore({
          amountNumber: 100_000,
          budget: 120_000,
          timeline: "12 months",
          message: null,
        }),
      ).toBe(70);
    });

    it("combines all applicable risk-readiness penalties", () => {
      expect(
        getRiskScore({
          amountNumber: 130_000,
          budget: 100_000,
          timeline: "30 months",
          message: null,
        }),
      ).toBe(37);
    });

    it("does not apply budget penalties when no positive budget exists", () => {
      expect(
        getRiskScore({
          amountNumber: 130_000,
          budget: 0,
          timeline: "12 months",
          message: completeRiskEvidence,
        }),
      ).toBe(85);
    });

    it("never returns a risk-readiness score below twenty", () => {
      expect(
        getRiskScore({
          amountNumber: 1,
          budget: 100_000,
          timeline: "100 months",
          message: null,
        }),
      ).toBe(43);
    });
  });

  describe("getRiskLevel", () => {
    it.each([
      [100, "Low"],
      [80, "Low"],
      [79, "Medium"],
      [60, "Medium"],
      [59, "High"],
      [20, "High"],
    ] as const)(
      "maps risk-readiness score %s to %s risk",
      (score, expectedLevel) => {
        expect(getRiskLevel(score)).toBe(expectedLevel);
      },
    );
  });

  describe("getValidityScore", () => {
    it.each([
      [120, 100],
      [150, 100],
      [90, 92],
      [119, 92],
      [60, 84],
      [89, 84],
      [59, 72],
      [0, 72],
    ])(
      "returns validity score %s for %s days",
      (validityDays, expectedScore) => {
        expect(getValidityScore(validityDays)).toBe(expectedScore);
      },
    );
  });

  describe("getPriceScore", () => {
    it("returns one hundred for the lowest-priced supplier", () => {
      expect(
        getPriceScore({
          amountNumber: 100_000,
          lowestAmount: 100_000,
        }),
      ).toBe(100);
    });

    it("normalizes higher quotes against the lowest valid amount", () => {
      expect(
        getPriceScore({
          amountNumber: 125_000,
          lowestAmount: 100_000,
        }),
      ).toBe(80);
    });

    it("rounds normalized price scores to a whole number", () => {
      expect(
        getPriceScore({
          amountNumber: 120_000,
          lowestAmount: 100_000,
        }),
      ).toBe(83);
    });

    it("returns zero when the supplier amount is invalid", () => {
      expect(
        getPriceScore({
          amountNumber: 0,
          lowestAmount: 100_000,
        }),
      ).toBe(0);

      expect(
        getPriceScore({
          amountNumber: -1,
          lowestAmount: 100_000,
        }),
      ).toBe(0);
    });

    it("returns zero when no valid lowest amount exists", () => {
      expect(
        getPriceScore({
          amountNumber: 100_000,
          lowestAmount: null,
        }),
      ).toBe(0);

      expect(
        getPriceScore({
          amountNumber: 100_000,
          lowestAmount: 0,
        }),
      ).toBe(0);
    });
  });

  describe("getSupplierEvaluationScore", () => {
    it("returns one hundred when every evaluation dimension is one hundred", () => {
      expect(
        getSupplierEvaluationScore({
          priceScore: 100,
          timelineScore: 100,
          performanceScore: 100,
          riskScore: 100,
          validityScore: 100,
        }),
      ).toBe(100);
    });

    it("applies the canonical weighted evaluation policy", () => {
      expect(
        getSupplierEvaluationScore({
          priceScore: 90,
          timelineScore: 84,
          performanceScore: 71,
          riskScore: 85,
          validityScore: 92,
        }),
      ).toBe(85);
    });

    it("rounds weighted supplier evaluation scores", () => {
      expect(
        getSupplierEvaluationScore({
          priceScore: 83,
          timelineScore: 84,
          performanceScore: 67,
          riskScore: 85,
          validityScore: 92,
        }),
      ).toBe(81);
    });

    it("clamps supplier evaluation scores to the supported range", () => {
      expect(
        getSupplierEvaluationScore({
          priceScore: 200,
          timelineScore: 200,
          performanceScore: 200,
          riskScore: 200,
          validityScore: 200,
        }),
      ).toBe(100);

      expect(
        getSupplierEvaluationScore({
          priceScore: -100,
          timelineScore: -100,
          performanceScore: -100,
          riskScore: -100,
          validityScore: -100,
        }),
      ).toBe(0);
    });
  });

  describe("getAwardConfidence", () => {
    it("preserves evaluation scores within the supported confidence range", () => {
      expect(getAwardConfidence(85)).toBe(85);
    });

    it("enforces the minimum award-confidence threshold", () => {
      expect(getAwardConfidence(20)).toBe(35);
      expect(getAwardConfidence(35)).toBe(35);
    });

    it("enforces the maximum award-confidence threshold", () => {
      expect(getAwardConfidence(99)).toBe(99);
      expect(getAwardConfidence(120)).toBe(99);
    });
  });
});