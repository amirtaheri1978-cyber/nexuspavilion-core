import AwardContractButton from "@/components/award-contract-button";
import { ExecutiveBadge } from "@/components/executive/executive-badge";

type RFQOwnerQuote = {
  id: string;
  amountNumber: number;
  timeline: string | null;
  validity_days?: number | null;
  decision: string | null;
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

type RFQOwnerQuotesProps = {
  quotes: RFQOwnerQuote[];
  recommendedQuoteId: string | null;
  lowestAmount: number | null;
  highestAmount: number | null;
  averageBid: number;
  isOpen: boolean;
};

export function RFQOwnerQuotes({
  quotes,
  recommendedQuoteId,
  lowestAmount,
  highestAmount,
  averageBid,
  isOpen,
}: RFQOwnerQuotesProps) {
  return (
    <div className="mt-6 overflow-x-auto rounded-[28px] border border-white/10 bg-white/[0.035]">
      <div className="min-w-[1180px]">
        <div className="grid grid-cols-9 border-b border-white/10 bg-white/[0.055] px-6 py-4 text-xs font-black uppercase tracking-[0.15em] text-nexus-muted">
          <div>Rank</div>
          <div>Amount</div>
          <div>Timeline</div>
          <div>Validity</div>
          <div>Decision</div>
          <div>AI Score</div>
          <div>Risk</div>
          <div>Variance</div>
          <div>Actions</div>
        </div>

        {quotes.map((quote) => {
          const isRecommended = recommendedQuoteId === quote.id;
          const isLowest =
            lowestAmount !== null && quote.amountNumber === lowestAmount;
          const isHighest =
            highestAmount !== null &&
            highestAmount !== lowestAmount &&
            quote.amountNumber === highestAmount;
          const belowAverage =
            averageBid > 0 && quote.amountNumber <= averageBid;
          const canAward = isOpen && quote.decision !== "awarded";

          return (
            <div
              key={quote.id}
              className="grid grid-cols-9 items-center border-t border-white/10 px-6 py-5"
            >
              <div>
                <p className="text-2xl font-black text-nexus-white">
                  #{quote.rank}
                </p>

                {isRecommended ? (
                  <ExecutiveBadge tone="gold">Recommended</ExecutiveBadge>
                ) : null}
              </div>

              <div className="text-lg font-black text-nexus-white">
                {formatMoney(quote.amountNumber)}
              </div>

              <div className="text-sm font-semibold text-nexus-muted">
                {quote.timeline || "N/A"}
              </div>

              <div className="text-sm font-semibold text-nexus-muted">
                {quote.validity_days
                  ? `${quote.validity_days} days`
                  : "30 days"}
              </div>

              <div>
                <ExecutiveBadge tone="neutral">
                  {quote.decision || "Pending"}
                </ExecutiveBadge>
              </div>

              <div>
                <p
                  className={`text-lg font-black ${getScoreClass(
                    quote.totalScore,
                  )}`}
                >
                  {quote.totalScore}/100
                </p>

                <p className="mt-1 text-xs text-nexus-muted">
                  P {quote.priceScore} · T {quote.timelineScore} · R{" "}
                  {quote.riskScore}
                </p>
              </div>

              <div>
                <p className="text-sm font-black text-nexus-white">
                  {quote.riskLevel}
                </p>

                <p className="text-xs text-nexus-muted">
                  Confidence {quote.awardConfidence}%
                </p>
              </div>

              <div>
                <p className="text-xs font-bold text-nexus-muted">
                  Budget: {formatMoney(quote.budgetVariance)}
                </p>

                <p className="mt-1 text-xs font-bold text-nexus-muted">
                  Lowest: {formatMoney(quote.lowestBidVariance)}
                </p>
              </div>

              <div className="space-y-3">
                <div className="space-y-2">
                  {isLowest ? (
                    <ExecutiveBadge tone="success">
                      Lowest Bid
                    </ExecutiveBadge>
                  ) : null}

                  {belowAverage ? (
                    <ExecutiveBadge tone="blue">
                      Below Average
                    </ExecutiveBadge>
                  ) : null}

                  {quote.timelineScore >= 84 ? (
                    <ExecutiveBadge tone="success">
                      Strong Timeline
                    </ExecutiveBadge>
                  ) : null}

                  {isHighest ? (
                    <ExecutiveBadge tone="warning">
                      Highest Bid
                    </ExecutiveBadge>
                  ) : null}
                </div>

                {canAward ? (
                  <AwardContractButton quoteId={quote.id} />
                ) : null}

                {quote.decision === "awarded" ? (
                  <p className="text-xs font-black text-emerald-300">
                    Contract awarded
                  </p>
                ) : null}
              </div>
            </div>
          );
        })}

        {quotes.length === 0 ? <OwnerQuoteEmptyState /> : null}
      </div>
    </div>
  );
}

function OwnerQuoteEmptyState() {
  return (
    <div className="px-6 py-12 text-center">
      <p className="text-lg font-black text-nexus-white">
        No supplier submissions received.
      </p>

      <p className="mx-auto mt-2 max-w-xl text-sm font-semibold leading-6 text-nexus-muted">
        Supplier pricing and commercial evaluation will appear here after
        qualified submissions are received.
      </p>
    </div>
  );
}

function formatMoney(value: number) {
  if (!Number.isFinite(value)) {
    return "$0";
  }

  return `$${value.toLocaleString()}`;
}

function getScoreClass(score: number) {
  if (score >= 80) return "text-emerald-300";
  if (score >= 65) return "text-cyan-300";
  if (score >= 50) return "text-orange-300";

  return "text-red-300";
}