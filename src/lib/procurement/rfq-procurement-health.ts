export type RFQProcurementHealthBreakdownItem = {
  label: string;
  score: number;
  detail: string;
};

export type RFQExecutiveRiskItem = {
  label: string;
  level: string;
  detail: string;
};

type RFQHealthScoreInput = {
  isOpen: boolean;
  deadlinePassed: boolean;
  quoteCount: number;
  documentCount: number;
  addendaCount: number;
  hasBudget: boolean;
  hasDescription: boolean;
  blindBiddingEnabled: boolean;
  commercialEvaluationUnlocked: boolean;
};

type RFQProcurementHealthBreakdownInput = {
  quoteCount: number;
  documentCount: number;
  addendaCount: number;
  hasBudget: boolean;
  hasDescription: boolean;
  blindBiddingEnabled: boolean;
  commercialEvaluationUnlocked: boolean;
};

type RFQExecutiveRiskMatrixInput = {
  isOpen: boolean;
  deadlinePassed: boolean;
  quoteCount: number;
  documentCount: number;
  addendaCount: number;
  commercialEvaluationUnlocked: boolean;
};

export function getHealthScore({
  isOpen,
  deadlinePassed,
  quoteCount,
  documentCount,
  addendaCount,
  hasBudget,
  hasDescription,
  blindBiddingEnabled,
  commercialEvaluationUnlocked,
}: RFQHealthScoreInput) {
  let score = 44;

  if (isOpen) score += 8;
  if (!deadlinePassed) score += 8;
  if (quoteCount > 0) score += 12;
  if (quoteCount >= 3) score += 8;
  if (documentCount > 0) score += 12;
  if (documentCount >= 3) score += 6;
  if (addendaCount > 0) score += 4;
  if (hasBudget) score += 6;
  if (hasDescription) score += 6;
  if (blindBiddingEnabled) score += 5;
  if (commercialEvaluationUnlocked && quoteCount > 0) score += 5;

  return Math.max(0, Math.min(score, 100));
}

export function getHealthLabel(score: number) {
  if (score >= 86) return "Launch-Ready";
  if (score >= 72) return "Strong";
  if (score >= 56) return "Needs Attention";

  return "At Risk";
}

export function getHealthTone(score: number) {
  if (score >= 86) return "text-green-300";
  if (score >= 72) return "text-cyan-300";
  if (score >= 56) return "text-orange-300";

  return "text-red-300";
}

export function getProcurementHealthBreakdown({
  quoteCount,
  documentCount,
  addendaCount,
  hasBudget,
  hasDescription,
  blindBiddingEnabled,
  commercialEvaluationUnlocked,
}: RFQProcurementHealthBreakdownInput): RFQProcurementHealthBreakdownItem[] {
  const competition = Math.min(
    100,
    quoteCount * 28 + (quoteCount >= 3 ? 16 : 0)
  );

  const documentation = Math.min(
    100,
    documentCount * 18 + (hasDescription ? 20 : 0) + (hasBudget ? 16 : 0)
  );

  const governance = Math.min(
    100,
    58 + (blindBiddingEnabled ? 18 : 8) + (addendaCount > 0 ? 10 : 0)
  );

  const decisionReadiness = Math.min(
    100,
    commercialEvaluationUnlocked && quoteCount > 0
      ? 62 + quoteCount * 8 + documentCount * 3
      : 38 + quoteCount * 8 + documentCount * 4
  );

  return [
    {
      label: "Competition",
      score: competition,
      detail:
        quoteCount >= 3
          ? "Healthy supplier coverage"
          : "Supplier coverage can improve",
    },
    {
      label: "Documentation",
      score: documentation,
      detail:
        documentCount > 0
          ? "RFQ package is active"
          : "Document package missing",
    },
    {
      label: "Governance",
      score: governance,
      detail: blindBiddingEnabled
        ? "Controlled commercial process"
        : "Standard RFQ controls",
    },
    {
      label: "Decision Readiness",
      score: decisionReadiness,
      detail: commercialEvaluationUnlocked
        ? "Evaluation path is open"
        : "Awaiting commercial opening",
    },
  ];
}

export function getExecutiveRiskMatrix({
  isOpen,
  deadlinePassed,
  quoteCount,
  documentCount,
  addendaCount,
  commercialEvaluationUnlocked,
}: RFQExecutiveRiskMatrixInput): RFQExecutiveRiskItem[] {
  return [
    {
      label: "Schedule",
      level: deadlinePassed ? "Closed" : isOpen ? "Controlled" : "Watch",
      detail: deadlinePassed
        ? "Submission window has closed"
        : "Deadline is active and trackable",
    },
    {
      label: "Competition",
      level:
        quoteCount >= 3 ? "Strong" : quoteCount > 0 ? "Moderate" : "Low",
      detail:
        quoteCount >= 3
          ? "Bid coverage is healthy"
          : "More supplier participation recommended",
    },
    {
      label: "Documentation",
      level:
        documentCount >= 3
          ? "Strong"
          : documentCount > 0
            ? "Moderate"
            : "Low",
      detail:
        documentCount > 0
          ? "RFQ package has supporting files"
          : "Upload documents before supplier review",
    },
    {
      label: "Commercial",
      level: commercialEvaluationUnlocked ? "Open" : "Locked",
      detail: commercialEvaluationUnlocked
        ? "Commercial comparison is available"
        : "Commercial data remains protected",
    },
    {
      label: "Clarifications",
      level: addendaCount > 0 ? "Active" : "Quiet",
      detail:
        addendaCount > 0
          ? "Addenda history is present"
          : "No issued addenda yet",
    },
  ];
}