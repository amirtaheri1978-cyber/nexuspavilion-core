import type {
  ExecutiveBoardSummary,
  ExecutiveIntelligenceInput,
  ExecutiveNegotiation,
  ExecutiveReadiness,
  ExecutiveResult,
  ExecutiveScenario,
  ExecutiveSupplierRecommendationResult,
  ExecutiveTone,
} from "@/lib/executive/executive-types";

function resolveAwardScenarioTone(
  board: ExecutiveBoardSummary,
  recommendation: ExecutiveResult,
): ExecutiveTone {
  if (board.status === "Board Ready") {
    return "success";
  }

  return recommendation.tone;
}

export function buildExecutiveScenarios(
  {
    recommendedQuote,
    averageBid = 0,
    quoteCount,
    budget = 0,
  }: ExecutiveIntelligenceInput,
  readiness: ExecutiveReadiness,
  recommendation: ExecutiveResult,
  supplierRecommendation: ExecutiveSupplierRecommendationResult,
  negotiation: ExecutiveNegotiation | null,
  board: ExecutiveBoardSummary,
): ExecutiveScenario[] {
  if (!recommendedQuote) {
    return [
      {
        title: "Await Commercial Evaluation",
        tone: "warning",
        recommendation:
          "Scenario modeling becomes available after a recommended supplier has been identified.",
        costImpact: "Pending",
        timeImpact: "Pending",
        riskImpact: "Pending",
        boardView: board.status,
      },
    ];
  }

  const savings =
    averageBid > 0
      ? averageBid - recommendedQuote.amountNumber
      : 0;

  const budgetDelta =
    budget > 0
      ? budget - recommendedQuote.amountNumber
      : 0;

  const recommendedSupplier =
    supplierRecommendation.recommendedSupplier;

  return [
    {
      title: "Award Now",
      tone: resolveAwardScenarioTone(
        board,
        recommendation,
      ),
      recommendation:
        board.status === "Board Ready"
          ? board.boardRecommendation
          : recommendation.recommendation,
      costImpact:
        savings > 0
          ? `${Math.round(savings).toLocaleString()} below average bid`
          : "Commercial position neutral",
      timeImpact: "Fastest route to contract award.",
      riskImpact: recommendedQuote.riskLevel,
      boardView: board.status,
    },
    {
      title: "Negotiate",
      tone: negotiation?.tone ?? "warning",
      recommendation:
        negotiation?.recommendation ??
        "Confirm commercial leverage before opening a supplier negotiation cycle.",
      costImpact:
        negotiation && negotiation.targetImprovement > 0
          ? `${negotiation.targetImprovement.toLocaleString()} target improvement`
          : "Potential additional savings.",
      timeImpact: "Short negotiation cycle.",
      riskImpact:
        recommendedSupplier &&
        recommendedSupplier.risks.length === 0
          ? "Controlled if scope and supplier commitments remain unchanged."
          : "Supplier and commercial risks should remain under active review.",
      boardView:
        negotiation?.tone === "success"
          ? "Negotiation leverage available"
          : "Executive negotiation review required",
    },
    {
      title: "Extend RFQ",
      tone: quoteCount < 3 ? "warning" : "info",
      recommendation:
        quoteCount < 3
          ? "Increase qualified supplier participation before final award validation."
          : "Extend only when additional market coverage is expected to materially improve the procurement outcome.",
      costImpact: "May improve pricing competition.",
      timeImpact: "Delays the procurement schedule.",
      riskImpact:
        quoteCount < 3
          ? "May reduce limited-competition risk."
          : "May introduce schedule exposure without material competitive benefit.",
      boardView:
        quoteCount < 3
          ? "Use when market coverage remains limited."
          : "Use only with a documented commercial rationale.",
    },
    {
      title: "Rebid",
      tone:
        readiness.tone === "risk"
          ? "risk"
          : "warning",
      recommendation:
        readiness.tone === "risk"
          ? "Consider rebidding only after confirming that the current evidence, scope, or governance deficiencies cannot be corrected within the active RFQ."
          : "Restart procurement only when material scope, governance, or market defects invalidate the current award path.",
      costImpact:
        budgetDelta < 0
          ? "May support budget recovery through a reset commercial process."
          : "Creates additional procurement and market-engagement cost.",
      timeImpact: "Longest schedule impact.",
      riskImpact: "Resets the procurement process.",
      boardView: "Last-resort governance option.",
    },
  ];
}
