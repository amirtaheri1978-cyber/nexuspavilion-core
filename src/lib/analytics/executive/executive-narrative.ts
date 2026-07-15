import type { ExecutiveBrief } from "@/lib/analytics/executive/executive-brief";

export type ExecutiveNarrative = {
  headline: string;
  summary: string;
  priority: string;
};

function getConfidenceDescription(
  level: ExecutiveBrief["confidence"]["level"],
): string {
  switch (level) {
    case "high":
      return "Decision confidence is high";

    case "moderate":
      return "Decision confidence is moderate";

    default:
      return "Decision confidence remains limited";
  }
}

function getOpportunityPosition(
  brief: ExecutiveBrief,
): string {
  const { opportunity } = brief;

  if (opportunity.severity === "high") {
    return "Commercial opportunity is material and warrants leadership attention.";
  }

  if (opportunity.severity === "medium") {
    return "Commercial opportunity is developing but requires further validation.";
  }

  return "Commercial opportunity is currently limited.";
}

function getRiskPosition(
  brief: ExecutiveBrief,
): string {
  const { risk } = brief;

  if (risk.severity === "high") {
    return "Portfolio exposure requires immediate management intervention.";
  }

  if (risk.severity === "medium") {
    return "Portfolio exposure remains manageable but should be actively monitored.";
  }

  return "Portfolio risk remains controlled.";
}

function getActionPosition(
  brief: ExecutiveBrief,
): string {
  const { action } = brief;

  if (action.severity === "high") {
    return "Major procurement action should pause until the supporting evidence is reviewed.";
  }

  if (action.severity === "medium") {
    return "Leadership should validate the current evidence before expanding commitments.";
  }

  return "Current conditions support structured executive action.";
}

function buildHeadline(
  brief: ExecutiveBrief,
): string {
  const { action, opportunity, risk } = brief;

  if (action.severity === "high") {
    return "Leadership intervention is required before major procurement action.";
  }

  if (
    opportunity.severity === "high" &&
    risk.severity === "low"
  ) {
    return "Portfolio conditions support confident commercial action.";
  }

  if (
    opportunity.severity === "high" &&
    risk.severity === "medium"
  ) {
    return "Commercial opportunity is strong, with manageable portfolio exposure.";
  }

  if (risk.severity === "high") {
    return "Portfolio exposure requires immediate executive attention.";
  }

  if (opportunity.severity === "high") {
    return "The portfolio presents a material commercial opportunity.";
  }

  return "Procurement conditions support structured executive review.";
}

export function buildExecutiveNarrative(
  brief: ExecutiveBrief,
): ExecutiveNarrative {
  const headline = buildHeadline(brief);

  const summary = [
    getActionPosition(brief),
    getOpportunityPosition(brief),
    getRiskPosition(brief),
    `${getConfidenceDescription(
  brief.confidence.level,
)} (${brief.confidence.score}/100).`
  ].join(" ");

  const priority =
    brief.action.recommendation ||
    "Review the current procurement evidence before authorizing further action.";

  return {
    headline,
    summary,
    priority,
  };
}