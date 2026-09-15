import {
  getAwardConfidence,
  getPerformanceScore,
  getPriceScore,
  getRiskLevel,
  getRiskScore,
  getSupplierEvaluationScore,
  getTimelineScore,
  getValidityScore,
  type SupplierRiskLevel,
} from "./rfq-commercial-scoring";

export type Quote = {
  id: string;
  company_id: string | null;
  user_id: string | null;
  amount: number | string | null;
  timeline: string | null;
  message: string | null;
  decision: string | null;
  validity_days?: number | null;
  created_at?: string | null;
  materialRevalidationStatus?: "current" | "requires_review";
  requiresMaterialRevalidation?: boolean;
  latestMaterialAddendumId?: string | null;
};

export type ScoredQuote = Quote & {
  amountNumber: number;
  rank: number;
  priceScore: number;
  timelineScore: number;
  riskScore: number;
  performanceScore: number;
  totalScore: number;
  awardConfidence: number;
  riskLevel: SupplierRiskLevel;
  budgetVariance: number;
  lowestBidVariance: number;
};

type BuildCommercialIntelligenceInput = {
  quoteList: Quote[];
  budget: number;
  commercialEvaluationUnlocked: boolean;
  isOwner: boolean;
};

type RfqCommercialOpeningInput = {
  deadline: string | null | undefined;
  now?: Date;
};

export function isRfqCommercialOpeningUnlocked({
  deadline,
  now = new Date(),
}: RfqCommercialOpeningInput): boolean {
  if (!deadline || Number.isNaN(now.getTime())) {
    return false;
  }

  const deadlineDate = new Date(deadline);

  if (Number.isNaN(deadlineDate.getTime())) {
    return false;
  }

  return now.getTime() > deadlineDate.getTime();
}

export type CommercialIntelligence = {
  scoredQuotes: ScoredQuote[];
  recommendedQuote: ScoredQuote | null;
  awardedQuote: ScoredQuote | null | undefined;
  lowestAmount: number | null;
  highestAmount: number | null;
  averageBid: number;
  potentialSavings: number;
};

function normalizeQuoteAmount(amount: Quote["amount"]) {
  const normalizedAmount = Number(amount);

  return Number.isFinite(normalizedAmount) ? normalizedAmount : 0;
}

function getCommercialAmounts({
  quoteList,
  commercialEvaluationUnlocked,
}: {
  quoteList: Quote[];
  commercialEvaluationUnlocked: boolean;
}) {
  if (!commercialEvaluationUnlocked) {
    return [];
  }

  return quoteList
    .map((quote) => Number(quote.amount))
    .filter((amount) => Number.isFinite(amount));
}

function getAverageBid(amounts: number[]) {
  if (amounts.length === 0) {
    return 0;
  }

  const totalAmount = amounts.reduce(
    (runningTotal, amount) => runningTotal + amount,
    0,
  );

  return Math.round(totalAmount / amounts.length);
}

function buildScoredQuote({
  quote,
  budget,
  lowestAmount,
}: {
  quote: Quote;
  budget: number;
  lowestAmount: number | null;
}): ScoredQuote {
  const amountNumber = normalizeQuoteAmount(quote.amount);

  const priceScore = getPriceScore({
    amountNumber,
    lowestAmount,
  });

  const timelineScore = getTimelineScore(quote.timeline);
  const performanceScore = getPerformanceScore(quote.message);

  const riskScore = getRiskScore({
    amountNumber,
    budget,
    timeline: quote.timeline,
    message: quote.message,
  });

  const validityDays = Number(quote.validity_days || 30);
  const validityScore = getValidityScore(validityDays);

  const totalScore = getSupplierEvaluationScore({
    priceScore,
    timelineScore,
    performanceScore,
    riskScore,
    validityScore,
  });

  const budgetVariance = budget > 0 ? amountNumber - budget : 0;

  const lowestBidVariance =
    lowestAmount && amountNumber > 0 ? amountNumber - lowestAmount : 0;

  return {
    ...quote,
    amountNumber,
    rank: 0,
    priceScore,
    timelineScore,
    riskScore,
    performanceScore,
    totalScore,
    awardConfidence: getAwardConfidence(totalScore),
    riskLevel: getRiskLevel(riskScore),
    budgetVariance,
    lowestBidVariance,
  };
}

function rankScoredQuotes(scoredQuotes: ScoredQuote[]) {
  return scoredQuotes
    .sort((firstQuote, secondQuote) => {
      return secondQuote.totalScore - firstQuote.totalScore;
    })
    .map((quote, index) => ({
      ...quote,
      rank: index + 1,
    }));
}

export function buildCommercialIntelligence({
  quoteList,
  budget,
  commercialEvaluationUnlocked,
  isOwner,
}: BuildCommercialIntelligenceInput): CommercialIntelligence {
  const decisionReadyQuoteList = commercialEvaluationUnlocked
    ? quoteList.filter((quote) => !quote.requiresMaterialRevalidation)
    : [];

  const reviewRequiredQuoteList = commercialEvaluationUnlocked
    ? quoteList.filter((quote) => quote.requiresMaterialRevalidation)
    : [];

  const decisionReadyAmounts = getCommercialAmounts({
    quoteList: decisionReadyQuoteList,
    commercialEvaluationUnlocked,
  });

  const evidenceAmounts = getCommercialAmounts({
    quoteList,
    commercialEvaluationUnlocked,
  });

  const lowestAmount =
    decisionReadyAmounts.length > 0 ? Math.min(...decisionReadyAmounts) : null;
  const highestAmount =
    decisionReadyAmounts.length > 0 ? Math.max(...decisionReadyAmounts) : null;
  const averageBid = getAverageBid(decisionReadyAmounts);

  const evidenceLowestAmount =
    evidenceAmounts.length > 0 ? Math.min(...evidenceAmounts) : null;

  const decisionReadyScoredQuotes = rankScoredQuotes(
    decisionReadyQuoteList.map((quote) =>
      buildScoredQuote({
        quote,
        budget,
        lowestAmount,
      }),
    ),
  );

  const reviewRequiredScoredQuotes = rankScoredQuotes(
    reviewRequiredQuoteList.map((quote) =>
      buildScoredQuote({
        quote,
        budget,
        lowestAmount: evidenceLowestAmount,
      }),
    ),
  ).map((quote, index) => ({
    ...quote,
    rank: decisionReadyScoredQuotes.length + index + 1,
  }));

  const scoredQuotes = [
    ...decisionReadyScoredQuotes,
    ...reviewRequiredScoredQuotes,
  ];

  const recommendedQuote =
    isOwner && decisionReadyScoredQuotes.length > 0
      ? decisionReadyScoredQuotes[0]
      : null;

  const awardedQuote = commercialEvaluationUnlocked
    ? scoredQuotes.find((quote) => quote.decision === "awarded")
    : null;

  const potentialSavings =
    recommendedQuote && averageBid
      ? averageBid - recommendedQuote.amountNumber
      : 0;

  return {
    scoredQuotes,
    recommendedQuote,
    awardedQuote,
    lowestAmount,
    highestAmount,
    averageBid,
    potentialSavings,
  };
}
