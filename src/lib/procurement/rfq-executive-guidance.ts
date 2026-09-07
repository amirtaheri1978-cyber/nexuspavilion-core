export type RFQRecommendedQuoteSummary = {
  rank: number;
  awardConfidence: number;
};

type RFQPredictedTimelineInput = {
  awardRecorded?: boolean;
  deadlinePassed: boolean;
  daysUntilDeadline: number | null;
  commercialEvaluationUnlocked: boolean;
  recommendedQuote: RFQRecommendedQuoteSummary | null;
};

type RFQCopilotSuggestionsInput = {
  awardRecorded?: boolean;
  isOwner: boolean;
  isOpen: boolean;
  quoteCount: number;
  documentCount: number;
  addendaCount: number;
  commercialEvaluationUnlocked: boolean;
  recommendedQuote: RFQRecommendedQuoteSummary | null;
  potentialSavings: number;
};

type RFQExecutiveBriefInput = {
  awardRecorded?: boolean;
  isOwner: boolean;
  isOpen: boolean;
  deadlinePassed: boolean;
  blindBiddingEnabled: boolean;
  commercialEvaluationUnlocked: boolean;
  quoteCount: number;
  documentCount: number;
  addendaCount: number;
  healthScore: number;
  recommendedQuote: RFQRecommendedQuoteSummary | null;
};

type RFQNextBestActionInput = {
  awardRecorded?: boolean;
  isOwner: boolean;
  isOpen: boolean;
  canSubmitQuote: boolean;
  quoteCount: number;
  documentCount: number;
  addendaCount: number;
  commercialEvaluationUnlocked: boolean;
  recommendedQuote: RFQRecommendedQuoteSummary | null;
};

function formatMoney(value: number | string | null | undefined) {
  const amount = Number(value);

  if (!Number.isFinite(amount)) {
    return "$0";
  }

  return `$${amount.toLocaleString()}`;
}

export function getPredictedTimeline({
  awardRecorded = false,
  deadlinePassed,
  daysUntilDeadline,
  commercialEvaluationUnlocked,
  recommendedQuote,
}: RFQPredictedTimelineInput) {
  if (awardRecorded) {
    return [
      { label: "Commercial Opening", value: "Complete" },
      { label: "Executive Review", value: "Complete" },
      { label: "Award Path", value: "Award Recorded" },
    ];
  }

  if (deadlinePassed || commercialEvaluationUnlocked) {
    return [
      { label: "Commercial Opening", value: "Available Now" },
      {
        label: "Executive Review",
        value: recommendedQuote ? "Ready Now" : "Pending Quotes",
      },
      {
        label: "Award Path",
        value: recommendedQuote ? "Ready for Validation" : "Not Ready",
      },
    ];
  }

  const days = Math.max(daysUntilDeadline ?? 0, 0);

  return [
    {
      label: "Commercial Opening",
      value: days === 0 ? "Today" : `In ${days} day${days === 1 ? "" : "s"}`,
    },
    {
      label: "Executive Review",
      value: `~${days + 1} day${days + 1 === 1 ? "" : "s"}`,
    },
    {
      label: "Award Path",
      value: `~${days + 3} day${days + 3 === 1 ? "" : "s"}`,
    },
  ];
}

export function getCopilotSuggestions({
  awardRecorded = false,
  isOwner,
  isOpen,
  quoteCount,
  documentCount,
  addendaCount,
  commercialEvaluationUnlocked,
  recommendedQuote,
  potentialSavings,
}: RFQCopilotSuggestionsInput) {
  if (!isOwner) {
    return [
      "Review all active RFQ documents before submitting or revising internal pricing.",
      "Confirm whether issued addenda require acknowledgement before the deadline.",
      "Keep your commercial proposal aligned with timeline, validity, and scope requirements.",
    ];
  }

  if (awardRecorded) {
    return [
      "Use the recorded award outcome as the commercial handoff reference for downstream procurement administration.",
      "Complete contract execution, signatures, purchase-order, and external-system steps in the systems responsible for those records.",
    ];
  }

  const suggestions: string[] = [];

  if (documentCount === 0) {
    suggestions.push(
      "Upload drawings, specifications, BOQ, or supporting files before inviting more suppliers.",
    );
  }

  if (isOpen && quoteCount === 0) {
    suggestions.push(
      "Invite qualified suppliers now to create competitive bid coverage before the deadline.",
    );
  }

  if (isOpen && quoteCount > 0 && quoteCount < 3) {
    suggestions.push(
      "Supplier competition is still light. Invite at least two more vendors if timing allows.",
    );
  }

  if (addendaCount === 0 && documentCount > 0) {
    suggestions.push(
      "No addenda have been issued. Monitor supplier questions and clarify scope early if needed.",
    );
  }

  if (!commercialEvaluationUnlocked) {
    suggestions.push(
      "Maintain blind bidding controls until commercial opening to protect procurement integrity.",
    );
  }

  if (recommendedQuote) {
    suggestions.push(
      `Validate the recommended supplier with ${recommendedQuote.awardConfidence}% award confidence before final award.`,
    );
  }

  if (potentialSavings > 0) {
    suggestions.push(
      `Potential savings are currently estimated at ${formatMoney(
        potentialSavings,
      )} versus average bid.`,
    );
  }

  return suggestions.slice(0, 4);
}

export function getExecutiveBrief({
  awardRecorded = false,
  isOwner,
  isOpen,
  deadlinePassed,
  blindBiddingEnabled,
  commercialEvaluationUnlocked,
  quoteCount,
  documentCount,
  addendaCount,
  healthScore,
  recommendedQuote,
}: RFQExecutiveBriefInput) {
  if (!isOwner) {
    if (deadlinePassed) {
      return "This RFQ is closed for supplier submissions. Your company can review its own submitted quote and available procurement documents, while competitor commercial data remains confidential.";
    }

    return "This supplier workspace provides controlled access to the RFQ package, addenda, acknowledgement requirements, and your company's confidential submission status.";
  }

  if (awardRecorded) {
    return "This RFQ has a recorded award. The commercial decision is complete in Nexus Pavilion and can now support downstream commercial handoff. Contract execution, signatures, purchase-order status, and external-system completion are not tracked by this RFQ workspace.";
  }

  if (blindBiddingEnabled && !commercialEvaluationUnlocked) {
    return `This RFQ is operating under blind bidding control with ${quoteCount} supplier submission${
      quoteCount === 1 ? "" : "s"
    } received. Commercial pricing and supplier ranking remain locked until the official deadline.`;
  }

  if (recommendedQuote) {
    return `This workspace is ready for executive review. Nexus Pavilion currently ranks supplier #${recommendedQuote.rank} as the best-value option with ${recommendedQuote.awardConfidence}% award confidence based on price, timeline, performance, risk, and validity.`;
  }

  if (isOpen) {
    return `This RFQ is active with ${documentCount} document${
      documentCount === 1 ? "" : "s"
    }, ${addendaCount} addendum item${
      addendaCount === 1 ? "" : "s"
    }, and a procurement health score of ${healthScore}/100. Next priority is supplier engagement and bid coverage.`;
  }

  return "This RFQ is no longer accepting submissions. Review documents, addenda, supplier responses, commercial evaluation status, and award readiness before closing the procurement record.";
}

export function getNextBestAction({
  awardRecorded = false,
  isOwner,
  isOpen,
  canSubmitQuote,
  quoteCount,
  documentCount,
  addendaCount,
  commercialEvaluationUnlocked,
  recommendedQuote,
}: RFQNextBestActionInput) {
  if (!isOwner) {
    if (canSubmitQuote) {
      return "Submit your commercial proposal before deadline.";
    }

    return "Review the active RFQ package and monitor addenda acknowledgements.";
  }

  if (awardRecorded) {
    return "Proceed with downstream commercial handoff using the recorded award outcome.";
  }

  if (documentCount === 0) {
    return "Upload drawings, specifications, BOQ, or supporting documents.";
  }

  if (isOpen && quoteCount === 0) {
    return "Invite qualified suppliers to build competitive bid coverage.";
  }

  if (isOpen && quoteCount < 3) {
    return "Increase supplier coverage before the deadline.";
  }

  if (addendaCount === 0 && documentCount > 0) {
    return "Issue clarifications or addenda if scope questions arise.";
  }

  if (!commercialEvaluationUnlocked) {
    return "Maintain blind bidding control until commercial opening.";
  }

  if (recommendedQuote) {
    return "Open compare view and validate the recommended award path.";
  }

  return "Review RFQ governance, supplier activity, and award readiness.";
}