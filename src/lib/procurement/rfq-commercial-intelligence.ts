export type Quote = {
  id: string;
  company_id: string | null;
  user_id: string | null;
  amount: number | string | null;
  timeline: string | null;
  message: string | null;
  decision: string | null;
  validity_days?: number | null;
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
  riskLevel: string;
  budgetVariance: number;
  lowestBidVariance: number;
};

type BuildCommercialIntelligenceInput = {
  quoteList: Quote[];
  budget: number;
  commercialEvaluationUnlocked: boolean;
  isOwner: boolean;
};

export type CommercialIntelligence = {
  scoredQuotes: ScoredQuote[];
  recommendedQuote: ScoredQuote | null;
  awardedQuote: ScoredQuote | null | undefined;
  lowestAmount: number | null;
  highestAmount: number | null;
  averageBid: number;
  potentialSavings: number;
};

function getTimelineMonths(timeline: string | null) {
  const value = String(timeline || "").toLowerCase();
  const numberMatch = value.match(/\d+/);
  const amount = numberMatch ? Number(numberMatch[0]) : null;

  if (!amount) {
    if (value.includes("q1")) return 3;
    if (value.includes("q2")) return 6;
    if (value.includes("q3")) return 9;
    if (value.includes("q4")) return 12;
    if (value.includes("fast") || value.includes("quick")) return 6;
    return 18;
  }

  if (value.includes("week")) {
    return Math.max(1, Math.round(amount / 4.345));
  }

  if (value.includes("month")) {
    return amount;
  }

  return amount;
}

function getTimelineScore(timeline: string | null) {
  const months = getTimelineMonths(timeline);

  if (months <= 6) return 100;
  if (months <= 9) return 92;
  if (months <= 12) return 84;
  if (months <= 16) return 74;
  if (months <= 20) return 62;
  if (months <= 24) return 52;

  return 40;
}

function getPerformanceScore(message: string | null) {
  const value = String(message || "").toLowerCase();

  let score = 55;

  const positiveSignals = [
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
  ];

  positiveSignals.forEach((signal) => {
    if (value.includes(signal)) score += 4;
  });

  if (value.length > 500) score += 5;
  if (value.length > 900) score += 5;

  return Math.min(score, 100);
}

function getRiskScore({
  amountNumber,
  budget,
  timeline,
  message,
}: {
  amountNumber: number;
  budget: number;
  timeline: string | null;
  message: string | null;
}) {
  let score = 85;

  const timelineMonths = getTimelineMonths(timeline);
  const value = String(message || "").toLowerCase();

  if (budget > 0 && amountNumber > budget) score -= 18;
  if (budget > 0 && amountNumber < budget * 0.65) score -= 12;
  if (timelineMonths > 24) score -= 15;
  if (!value.includes("warranty")) score -= 5;
  if (!value.includes("quality")) score -= 5;
  if (!value.includes("project management")) score -= 5;

  return Math.max(20, Math.min(score, 100));
}

function getRiskLevel(score: number) {
  if (score >= 80) return "Low";
  if (score >= 60) return "Medium";
  return "High";
}

export function buildCommercialIntelligence({
  quoteList,
  budget,
  commercialEvaluationUnlocked,
  isOwner,
}: BuildCommercialIntelligenceInput): CommercialIntelligence {
  const amounts = commercialEvaluationUnlocked
    ? quoteList
        .map((quote) => Number(quote.amount))
        .filter((amount) => Number.isFinite(amount))
    : [];

  const lowestAmount = amounts.length > 0 ? Math.min(...amounts) : null;
  const highestAmount = amounts.length > 0 ? Math.max(...amounts) : null;

  const averageBid =
    amounts.length > 0
      ? Math.round(
          amounts.reduce((total, amount) => total + amount, 0) /
            amounts.length,
        )
      : 0;

  const scoredQuotesUnranked = commercialEvaluationUnlocked
    ? quoteList.map((quote) => {
        const amount = Number(quote.amount);
        const amountNumber = Number.isFinite(amount) ? amount : 0;

        const priceScore =
          lowestAmount && amountNumber > 0
            ? Math.min(
                100,
                Math.round((lowestAmount / amountNumber) * 100),
              )
            : 0;

        const timelineScore = getTimelineScore(quote.timeline);
        const performanceScore = getPerformanceScore(quote.message);
        const riskScore = getRiskScore({
          amountNumber,
          budget,
          timeline: quote.timeline,
          message: quote.message,
        });

        const validityDays = Number(quote.validity_days || 30);

        const validityScore =
          validityDays >= 120
            ? 100
            : validityDays >= 90
              ? 92
              : validityDays >= 60
                ? 84
                : 72;

        const totalScore = Math.min(
          100,
          Math.round(
            priceScore * 0.38 +
              timelineScore * 0.22 +
              performanceScore * 0.18 +
              riskScore * 0.14 +
              validityScore * 0.08,
          ),
        );

        const budgetVariance = budget > 0 ? amountNumber - budget : 0;
        const lowestBidVariance =
          lowestAmount && amountNumber > 0
            ? amountNumber - lowestAmount
            : 0;

        return {
          ...quote,
          amountNumber,
          rank: 0,
          priceScore,
          timelineScore,
          riskScore,
          performanceScore,
          totalScore,
          awardConfidence: Math.min(99, Math.max(35, totalScore)),
          riskLevel: getRiskLevel(riskScore),
          budgetVariance,
          lowestBidVariance,
        };
      })
    : [];

  const scoredQuotes: ScoredQuote[] = scoredQuotesUnranked
    .sort((a, b) => b.totalScore - a.totalScore)
    .map((quote, index) => ({
      ...quote,
      rank: index + 1,
    }));

  const recommendedQuote =
    isOwner && scoredQuotes.length > 0 ? scoredQuotes[0] : null;

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
