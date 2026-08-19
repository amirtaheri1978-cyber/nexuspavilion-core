import AwardContractButton from "@/components/award-contract-button";
import { ExecutiveBadge } from "@/components/executive/executive-badge";
import { ExecutivePanel } from "@/components/executive/executive-panel";

export type RfqQuoteComparisonItem = {
  id: string;
  supplierLabel: string;
  amountLabel: string;
  amountNumber: number;
  timeline: string | null;
  validityDays: number;
  decision: string | null;
  rank: number;
  priceScore: number;
  timelineScore: number;
  performanceScore: number;
  riskScore: number;
  commercialScore?: number;
  technicalScore?: number;
  evaluationScore: number;
  awardProbability: number;
  riskLevel: string;
  budgetVarianceLabel: string;
  lowestBidVarianceLabel: string;
  isRecommended: boolean;
  isLowest: boolean;
  isHighest: boolean;
  isBelowAverage: boolean;
  canAward: boolean;
};

type RfqQuoteComparisonProps = {
  rfqTitle: string;
  quotes: RfqQuoteComparisonItem[];
  awarded: boolean;
};

function decisionTone(decision: string | null) {
  const value = String(decision || "").toLowerCase();
  if (value === "awarded") return "awarded" as const;
  if (value === "rejected" || value === "declined") return "risk" as const;
  return "pending" as const;
}

function decisionLabel(decision: string | null) {
  const value = String(decision || "").trim();
  if (!value) return "Pending";
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function riskTone(riskLevel: string) {
  if (riskLevel === "Low Risk") return "success" as const;
  if (riskLevel === "High Risk") return "risk" as const;
  return "warning" as const;
}

export function RfqQuoteComparison({
  rfqTitle,
  quotes,
  awarded,
}: RfqQuoteComparisonProps) {
  if (quotes.length === 0) {
    return (
      <ExecutivePanel variant="operational" padding="lg" className="np-region">
        <p className="np-type-eyebrow">Comparison</p>
        <h2 className="np-type-h2 mt-3">No supplier quotes</h2>
        <p className="np-type-body mt-3">
          No supplier quotes have been submitted for this RFQ yet.
        </p>
      </ExecutivePanel>
    );
  }

  return (
    <ExecutivePanel
      variant="operational"
      padding="lg"
      className="np-region-major"
      aria-labelledby="rfq-comparison-heading"
    >
      <p className="np-type-eyebrow">Commercial comparison</p>
      <h2 id="rfq-comparison-heading" className="np-type-h2 mt-3">
        Quote comparison
      </h2>
      <p className="np-type-body mt-3 max-w-4xl">
        Ranked commercial evidence for this RFQ. The recommended quote is the
        highest current evaluation score, not a guaranteed award.
      </p>

      <div className="mt-6 hidden lg:block">
        <div className="overflow-x-auto rounded-executive border border-white/10">
          <table className="min-w-full border-collapse text-left">
            <caption className="sr-only">
              Supplier quote comparison for {rfqTitle}
            </caption>
            <thead className="bg-white/[0.04]">
              <tr>
                <th scope="col" className="np-type-meta px-4 py-3">
                  Rank
                </th>
                <th scope="col" className="np-type-meta px-4 py-3">
                  Supplier
                </th>
                <th scope="col" className="np-type-meta px-4 py-3">
                  Commercial offer
                </th>
                <th scope="col" className="np-type-meta px-4 py-3">
                  Timeline / validity
                </th>
                <th scope="col" className="np-type-meta px-4 py-3">
                  Evaluation
                </th>
                <th scope="col" className="np-type-meta px-4 py-3">
                  Risk and exceptions
                </th>
                <th scope="col" className="np-type-meta px-4 py-3">
                  Decision
                </th>
              </tr>
            </thead>
            <tbody>
              {quotes.map((quote) => (
                <tr
                  key={quote.id}
                  className={`border-t border-white/10 ${
                    quote.isRecommended ? "bg-nexus-gold/[0.07]" : ""
                  }`}
                >
                  <th scope="row" className="px-4 py-4 align-top">
                    <p className="np-type-kpi text-xl">#{quote.rank}</p>
                    {quote.isRecommended ? (
                      <div className="mt-2">
                        <ExecutiveBadge tone="recommended">
                          Recommended
                        </ExecutiveBadge>
                      </div>
                    ) : null}
                  </th>
                  <td className="px-4 py-4 align-top">
                    <p className="np-type-h3">{quote.supplierLabel}</p>
                  </td>
                  <td className="px-4 py-4 align-top">
                    <p className="np-type-kpi text-lg">{quote.amountLabel}</p>
                    {quote.isLowest ? (
                      <div className="mt-2">
                        <ExecutiveBadge tone="success">Lowest bid</ExecutiveBadge>
                      </div>
                    ) : null}
                  </td>
                  <td className="px-4 py-4 align-top">
                    <p className="np-type-body">
                      {quote.timeline || "Not specified"}
                    </p>
                    <p className="np-type-meta mt-1">
                      Validity {quote.validityDays} days
                    </p>
                  </td>
                  <td className="px-4 py-4 align-top">
                    <p className="np-type-kpi text-lg">
                      {quote.evaluationScore}/100
                    </p>
                    <p className="np-type-meta mt-1">
                      C {quote.commercialScore ?? quote.priceScore} · T{" "}
                      {quote.technicalScore ?? quote.timelineScore} · R{" "}
                      {quote.riskScore}
                    </p>
                    <p className="np-type-meta mt-1">
                      Award probability {quote.awardProbability}%
                    </p>
                  </td>
                  <td className="px-4 py-4 align-top">
                    <ExecutiveBadge tone={riskTone(quote.riskLevel)}>
                      {quote.riskLevel}
                    </ExecutiveBadge>
                    <p className="np-type-meta mt-2">
                      Budget {quote.budgetVarianceLabel}
                    </p>
                    <p className="np-type-meta mt-1">
                      Lowest {quote.lowestBidVarianceLabel}
                    </p>
                    <ExceptionBadges quote={quote} />
                  </td>
                  <td className="px-4 py-4 align-top">
                    <QuoteAction
                      quote={quote}
                      awarded={awarded}
                      rfqTitle={rfqTitle}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mt-6 grid gap-4 lg:hidden">
        {quotes.map((quote) => (
          <article
            key={quote.id}
            className={`rounded-executive border p-5 ${
              quote.isRecommended
                ? "border-nexus-gold/30 bg-nexus-gold/[0.08]"
                : "border-white/10 bg-black/20"
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="np-type-meta">Rank #{quote.rank}</p>
                <h3 className="np-type-h3 mt-2">{quote.supplierLabel}</h3>
              </div>
              {quote.isRecommended ? (
                <ExecutiveBadge tone="recommended">Recommended</ExecutiveBadge>
              ) : (
                <ExecutiveBadge tone={decisionTone(quote.decision)}>
                  {decisionLabel(quote.decision)}
                </ExecutiveBadge>
              )}
            </div>

            <dl className="mt-4 grid gap-3 sm:grid-cols-2">
              <ComparisonField label="Commercial offer" value={quote.amountLabel} />
              <ComparisonField
                label="Timeline"
                value={quote.timeline || "Not specified"}
              />
              <ComparisonField
                label="Validity"
                value={`${quote.validityDays} days`}
              />
              <ComparisonField
                label="Evaluation"
                value={`${quote.evaluationScore}/100`}
              />
              <ComparisonField
                label="Commercial / technical / risk"
                value={`C ${quote.commercialScore ?? quote.priceScore} · T ${
                  quote.technicalScore ?? quote.timelineScore
                } · R ${quote.riskScore}`}
              />
              <ComparisonField
                label="Award probability"
                value={`${quote.awardProbability}%`}
              />
              <ComparisonField label="Risk" value={quote.riskLevel} />
              <ComparisonField
                label="Budget variance"
                value={quote.budgetVarianceLabel}
              />
              <ComparisonField
                label="Variance vs lowest bid"
                value={quote.lowestBidVarianceLabel}
              />
            </dl>

            <div className="mt-4 flex flex-wrap gap-2">
              <ExceptionBadges quote={quote} />
            </div>

            <div className="mt-5">
              <QuoteAction quote={quote} awarded={awarded} rfqTitle={rfqTitle} />
            </div>
          </article>
        ))}
      </div>
    </ExecutivePanel>
  );
}

function ComparisonField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="np-type-meta">{label}</dt>
      <dd className="np-type-body mt-1 text-white">{value}</dd>
    </div>
  );
}

function ExceptionBadges({ quote }: { quote: RfqQuoteComparisonItem }) {
  return (
    <div className="mt-2 flex flex-wrap gap-2">
      {quote.isBelowAverage ? (
        <ExecutiveBadge tone="blue">Below average</ExecutiveBadge>
      ) : null}
      {quote.timelineScore >= 84 ? (
        <ExecutiveBadge tone="success">Strong timeline</ExecutiveBadge>
      ) : null}
      {quote.isHighest ? (
        <ExecutiveBadge tone="warning">Highest bid</ExecutiveBadge>
      ) : null}
    </div>
  );
}

function QuoteAction({
  quote,
  awarded,
  rfqTitle,
}: {
  quote: RfqQuoteComparisonItem;
  awarded: boolean;
  rfqTitle: string;
}) {
  if (quote.decision === "awarded") {
    return <ExecutiveBadge tone="awarded">Contract awarded</ExecutiveBadge>;
  }

  if (awarded || !quote.canAward) {
    return <ExecutiveBadge tone="locked">Award closed</ExecutiveBadge>;
  }

  return (
    <AwardContractButton
      quoteId={quote.id}
      rfqTitle={rfqTitle}
      supplierLabel={quote.supplierLabel}
      amountLabel={quote.amountLabel}
    />
  );
}
