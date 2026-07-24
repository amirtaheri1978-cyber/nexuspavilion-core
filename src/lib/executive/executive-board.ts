import type {
  ExecutiveBoardSummary,
  ExecutiveIntelligenceInput,
  ExecutiveReadiness,
} from "@/lib/executive/executive-types";

export function buildExecutiveBoard(
  {
    healthScore,
    quoteCount,
    documentCount,
    commercialEvaluationUnlocked,
    recommendedQuote,
  }: ExecutiveIntelligenceInput,
  readiness: ExecutiveReadiness,
): ExecutiveBoardSummary {
  if (!commercialEvaluationUnlocked) {
    return {
      status: "Commercial Locked",
      confidence: 0,
      summary:
        "Commercial evaluation has not yet been opened. Board-level award discussion should wait until supplier pricing becomes available.",
      boardRecommendation:
        "Wait for commercial opening before executive review.",
    };
  }

  if (!recommendedQuote) {
    return {
      status: "Awaiting Recommendation",
      confidence: 35,
      summary:
        "Commercial data is available, but Nexus Pavilion does not yet have enough intelligence to recommend an award path.",
      boardRecommendation:
        "Continue supplier evaluation before presenting to the board.",
    };
  }

  /*
   * Board confidence remains a board-facing composite indicator.
   * It is retained for backward-compatible presentation, while
   * the underlying readiness decision is owned exclusively by
   * ExecutiveReadiness.
   */
  const confidence = Math.round(
    (
      recommendedQuote.awardConfidence +
      healthScore +
      Math.min(100, quoteCount * 25) +
      Math.min(100, documentCount * 20)
    ) / 4,
  );

  const supplierRiskIsLow =
    recommendedQuote.riskLevel.toLowerCase() === "low";

  /*
   * ExecutiveReadiness is the canonical operating-readiness
   * decision. Board governance adds only the supplier-risk gate
   * required for award escalation.
   */
  const boardReady =
    readiness.tone === "success" &&
    supplierRiskIsLow;

  return {
    status: boardReady
      ? "Board Ready"
      : "Executive Review",

    confidence,

    summary: boardReady
      ? "The procurement package demonstrates sufficient commercial, governance, supplier competition, and procurement health signals for board-level review."
      : supplierRiskIsLow
        ? readiness.recommendation
        : "Supplier risk requires additional executive validation before the procurement package can be escalated for board approval.",

    boardRecommendation: boardReady
      ? "Proceed to board approval."
      : supplierRiskIsLow
        ? "Complete the outstanding executive readiness requirements before board submission."
        : "Validate supplier risk and complete executive review before board submission.",
  };
}