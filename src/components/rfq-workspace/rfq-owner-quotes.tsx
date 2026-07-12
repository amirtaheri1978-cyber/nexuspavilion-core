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

type DecisionTone = "success" | "warning" | "risk" | "neutral";

export function RFQOwnerQuotes({
  quotes,
  recommendedQuoteId,
  lowestAmount,
  highestAmount,
  averageBid,
  isOpen,
}: RFQOwnerQuotesProps) {
  return (
    <section
      className="mt-6"
      aria-labelledby="rfq-owner-quotes-title"
    >
      <div className="sr-only">
        <h3 id="rfq-owner-quotes-title">
          Buyer Commercial Evaluation
        </h3>
      </div>

      <div className="overflow-x-auto rounded-[28px] border border-white/10 bg-white/[0.035]">
        <div
          className="min-w-[1280px]"
          role="table"
          aria-label="Supplier commercial evaluation and award controls"
        >
          <div
            className="grid grid-cols-[0.7fr_1.15fr_1fr_0.85fr_1fr_1.3fr_1.05fr_1.3fr_1.35fr] border-b border-white/10 bg-white/[0.055] px-6 py-4 text-xs font-black uppercase tracking-[0.15em] text-nexus-muted"
            role="row"
          >
            <div role="columnheader">Rank</div>
            <div role="columnheader">Commercial Offer</div>
            <div role="columnheader">Timeline</div>
            <div role="columnheader">Validity</div>
            <div role="columnheader">Decision Status</div>
            <div role="columnheader">Evaluation Score</div>
            <div role="columnheader">Risk Position</div>
            <div role="columnheader">Commercial Variance</div>
            <div role="columnheader">Award Signals &amp; Actions</div>
          </div>

          <div role="rowgroup">
            {quotes.map((quote) => {
              const isRecommended = recommendedQuoteId === quote.id;

              const isLowest =
                lowestAmount !== null &&
                quote.amountNumber === lowestAmount;

              const isHighest =
                highestAmount !== null &&
                highestAmount !== lowestAmount &&
                quote.amountNumber === highestAmount;

              const belowAverage =
                averageBid > 0 &&
                quote.amountNumber <= averageBid;

              const canAward =
                isOpen &&
                quote.decision !== "awarded";

              const decisionLabel =
                quote.decision || "Pending";

              return (
                <article
                  key={quote.id}
                  className="grid grid-cols-[0.7fr_1.15fr_1fr_0.85fr_1fr_1.3fr_1.05fr_1.3fr_1.35fr] items-start border-t border-white/10 px-6 py-5 transition duration-200 hover:bg-white/[0.025]"
                  role="row"
                  aria-label={`Supplier quote ranked ${quote.rank}, amount ${formatMoney(
                    quote.amountNumber,
                  )}, status ${decisionLabel}`}
                >
                  <div
                    className="min-w-0 pr-4"
                    role="cell"
                  >
                    <p className="text-2xl font-black tracking-tight text-nexus-white">
                      #{quote.rank}
                    </p>

                    {isRecommended ? (
                      <div className="mt-2">
                        <ExecutiveBadge tone="gold">
                          Recommended
                        </ExecutiveBadge>
                      </div>
                    ) : null}
                  </div>

                  <div
                    className="min-w-0 pr-4"
                    role="cell"
                  >
                    <p className="break-words text-lg font-black text-nexus-white">
                      {formatMoney(quote.amountNumber)}
                    </p>

                    <p className="mt-1 text-xs font-semibold leading-5 text-nexus-muted">
                      Submitted commercial value
                    </p>
                  </div>

                  <div
                    className="min-w-0 pr-4"
                    role="cell"
                  >
                    <p className="break-words text-sm font-semibold leading-6 text-nexus-muted">
                      {quote.timeline || "Not specified"}
                    </p>
                  </div>

                  <div
                    className="min-w-0 pr-4"
                    role="cell"
                  >
                    <p className="text-sm font-semibold leading-6 text-nexus-muted">
                      {quote.validity_days
                        ? `${quote.validity_days} days`
                        : "30 days"}
                    </p>
                  </div>

                  <div
                    className="min-w-0 pr-4"
                    role="cell"
                  >
                    <ExecutiveBadge
                      tone={getDecisionTone(quote.decision)}
                    >
                      {decisionLabel}
                    </ExecutiveBadge>
                  </div>

                  <div
                    className="min-w-0 pr-4"
                    role="cell"
                  >
                    <p
                      className={`text-lg font-black ${getScoreClass(
                        quote.totalScore,
                      )}`}
                    >
                      {quote.totalScore}/100
                    </p>

                    <p className="mt-1 break-words text-xs font-semibold leading-5 text-nexus-muted">
                      Price {quote.priceScore} · Timeline{" "}
                      {quote.timelineScore} · Performance{" "}
                      {quote.performanceScore} · Risk{" "}
                      {quote.riskScore}
                    </p>
                  </div>

                  <div
                    className="min-w-0 pr-4"
                    role="cell"
                  >
                    <p className="break-words text-sm font-black text-nexus-white">
                      {quote.riskLevel}
                    </p>

                    <p className="mt-1 text-xs font-semibold leading-5 text-nexus-muted">
                      {quote.awardConfidence}% award confidence
                    </p>
                  </div>

                  <div
                    className="min-w-0 pr-4"
                    role="cell"
                  >
                    <VarianceSignal
                      label="Budget"
                      value={quote.budgetVariance}
                    />

                    <div className="mt-3">
                      <VarianceSignal
                        label="Lowest Bid"
                        value={quote.lowestBidVariance}
                      />
                    </div>
                  </div>

                  <div
                    className="min-w-0"
                    role="cell"
                  >
                    <div className="flex flex-wrap gap-2">
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
                      <div className="mt-4">
                        <AwardContractButton quoteId={quote.id} />
                      </div>
                    ) : null}

                    {quote.decision === "awarded" ? (
                      <div className="mt-4">
                        <ExecutiveBadge tone="success">
                          Contract Awarded
                        </ExecutiveBadge>
                      </div>
                    ) : null}
                  </div>
                </article>
              );
            })}
          </div>

          {quotes.length === 0 ? <OwnerQuoteEmptyState /> : null}
        </div>
      </div>
    </section>
  );
}

function OwnerQuoteEmptyState() {
  return (
    <div
      className="px-6 py-12 text-center"
      role="status"
    >
      <p className="text-lg font-black text-nexus-white">
        No Supplier Submissions Received
      </p>

      <p className="mx-auto mt-2 max-w-xl text-sm font-semibold leading-6 text-nexus-muted">
        Supplier commercial submissions and evaluation intelligence will
        appear here after qualified responses are received and made available
        for authorized review.
      </p>
    </div>
  );
}

function VarianceSignal({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <div className="min-w-0">
      <p className="text-[10px] font-black uppercase tracking-[0.16em] text-nexus-muted">
        {label}
      </p>

      <p className="mt-1 break-words text-xs font-bold leading-5 text-nexus-white">
        {formatSignedMoney(value)}
      </p>
    </div>
  );
}

function formatMoney(value: number) {
  if (!Number.isFinite(value)) {
    return "$0";
  }

  return `$${Math.round(value).toLocaleString()}`;
}

function formatSignedMoney(value: number) {
  if (!Number.isFinite(value) || value === 0) {
    return "$0";
  }

  const absoluteValue = formatMoney(Math.abs(value));

  return value > 0
    ? `+${absoluteValue}`
    : `-${absoluteValue}`;
}

function getDecisionTone(
  decision: string | null,
): DecisionTone {
  const normalizedDecision =
    decision?.trim().toLowerCase() ?? "";

  if (normalizedDecision === "awarded") {
    return "success";
  }

  if (
    normalizedDecision === "rejected" ||
    normalizedDecision === "declined"
  ) {
    return "risk";
  }

  if (
    normalizedDecision === "under review" ||
    normalizedDecision === "shortlisted"
  ) {
    return "warning";
  }

  return "neutral";
}

function getScoreClass(score: number) {
  if (score >= 80) return "text-nexus-gold";
  if (score >= 65) return "text-nexus-white";
  if (score >= 50) return "text-orange-300";

  return "text-red-300";
}