import type {
  ExecutiveBoardSummary,
  ExecutiveIntelligenceInput,
  ExecutiveReadiness,
  ExecutiveSummary,
} from "@/lib/executive/executive-types";

export function buildExecutiveSummary(
  {
    commercialEvaluationUnlocked,
    recommendedQuote,
  }: ExecutiveIntelligenceInput,
  readiness: ExecutiveReadiness,
  board: ExecutiveBoardSummary,
): ExecutiveSummary {
  if (!commercialEvaluationUnlocked) {
    return {
      headline: "Commercial evaluation is locked",
      recommendation:
        "Wait for commercial opening before executive review.",
      topRisk:
        "Commercial submissions remain protected.",
      topOpportunity:
        "Continue supplier participation and document governance.",
      nextStep:
        "Monitor supplier activity until commercial opening.",
    };
  }

  if (!recommendedQuote) {
    return {
      headline: "Executive recommendation unavailable",
      recommendation:
        "Collect more supplier intelligence before award.",
      topRisk:
        "Insufficient award intelligence.",
      topOpportunity:
        "Increase supplier competition and improve procurement readiness.",
      nextStep:
        "Continue commercial evaluation.",
    };
  }

  if (board.status === "Board Ready") {
    return {
      headline: "Procurement package is board-ready.",
      recommendation:
        board.boardRecommendation,
      topRisk:
        "No material supplier risk currently prevents board escalation.",
      topOpportunity:
        "The validated procurement position supports executive approval and board consideration.",
      nextStep:
        "Begin the authorized board approval workflow.",
    };
  }

  return {
    headline: "Executive validation recommended.",
    recommendation:
      board.boardRecommendation,
    topRisk:
      board.summary,
    topOpportunity:
      readiness.completedControls > 0
        ? `${readiness.completedControls} of ${readiness.totalControls} executive readiness controls are currently satisfied.`
        : "The procurement package can progress once the foundational readiness controls are completed.",
    nextStep:
      readiness.recommendation,
  };
}