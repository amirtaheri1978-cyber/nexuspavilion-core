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
  embedded?: boolean;
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
  embedded = false,
}: RfqQuoteComparisonProps) {
  if (quotes.length === 0) {
    const empty = (
      <>
        <p className="np-type-eyebrow">Comparison</p>
        <h2 id="rfq-comparison-heading" className="np-type-h2 mt-3">
          No supplier quotes
        </h2>
        <p className="np-type-body mt-3">
          No supplier quotes have been submitted for this RFQ yet.
        </p>
      </>
    );

    if (embedded) {
      return (
        <section
          className="min-w-0"
          data-rfq-quote-comparison="true"
          aria-labelledby="rfq-comparison-heading"
        >
          {empty}
        </section>
      );
    }

    return (
      <ExecutivePanel
        variant="operational"
        padding="lg"
        className="np-region"
        data-rfq-quote-comparison="true"
      >
        {empty}
      </ExecutivePanel>
    );
  }

  const comparisonBody = (
    <>
      <p className="np-type-eyebrow">Commercial comparison</p>
      <h2 id="rfq-comparison-heading" className="np-type-h2 mt-3 min-w-0 text-pretty">
        Quote comparison
      </h2>
      <p className="np-type-body mt-3 max-w-4xl min-w-0 text-pretty">
        Ranked commercial evidence for this RFQ. The recommended quote is the
        highest current evaluation score, not a guaranteed award.
      </p>

      <div
        className="mt-6 hidden min-w-0 @min-[1500px]:block"
        data-rfq-quote-comparison-table="true"
      >
        <div className="rounded-executive border border-white/10">
          <table className="w-full table-fixed border-collapse text-left">
            <caption className="sr-only">
              Supplier quote comparison for {rfqTitle}
            </caption>
            <colgroup>
              <col className="w-[9%]" />
              <col className="w-[18%]" />
              <col className="w-[14%]" />
              <col className="w-[14%]" />
              <col className="w-[16%]" />
              <col className="w-[15%]" />
              <col className="w-[14%]" />
            </colgroup>
            <thead className="bg-white/[0.04]">
              <tr>
                <th scope="col" className="np-type-meta px-3 py-3">
                  Rank
                </th>
                <th scope="col" className="np-type-meta px-3 py-3">
                  Supplier
                </th>
                <th scope="col" className="np-type-meta px-3 py-3">
                  Commercial offer
                </th>
                <th scope="col" className="np-type-meta px-3 py-3">
                  Timeline / validity
                </th>
                <th scope="col" className="np-type-meta px-3 py-3">
                  Evaluation
                </th>
                <th scope="col" className="np-type-meta px-3 py-3">
                  Risk and exceptions
                </th>
                <th scope="col" className="np-type-meta px-3 py-3">
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
                  <th scope="row" className="min-w-0 px-3 py-4 align-top">
                    <p className="np-type-kpi text-xl">#{quote.rank}</p>
                    {quote.isRecommended ? (
                      <div className="mt-2">
                        <ExecutiveBadge tone="recommended">
                          Recommended
                        </ExecutiveBadge>
                      </div>
                    ) : null}
                  </th>
                  <td className="min-w-0 px-3 py-4 align-top">
                    <p className="np-type-h3 min-w-0 whitespace-normal text-pretty">
                      {quote.supplierLabel}
                    </p>
                  </td>
                  <td className="min-w-0 px-3 py-4 align-top">
                    <p className="np-type-kpi min-w-0 text-pretty text-lg">
                      {quote.amountLabel}
                    </p>
                    {quote.isLowest ? (
                      <div className="mt-2">
                        <ExecutiveBadge tone="success">Lowest bid</ExecutiveBadge>
                      </div>
                    ) : null}
                  </td>
                  <td className="min-w-0 px-3 py-4 align-top">
                    <p className="np-type-body min-w-0 text-pretty">
                      {quote.timeline || "Not specified"}
                    </p>
                    <p className="np-type-meta mt-1 min-w-0 text-pretty">
                      Validity {quote.validityDays} days
                    </p>
                  </td>
                  <td className="min-w-0 px-3 py-4 align-top">
                    <p className="np-type-kpi text-lg">
                      {quote.evaluationScore}/100
                    </p>
                    <p className="np-type-meta mt-1 min-w-0 text-pretty">
                      C {quote.commercialScore ?? quote.priceScore} · T{" "}
                      {quote.technicalScore ?? quote.timelineScore} · R{" "}
                      {quote.riskScore}
                    </p>
                    <p className="np-type-meta mt-1 min-w-0 text-pretty">
                      Award probability {quote.awardProbability}%
                    </p>
                  </td>
                  <td className="min-w-0 px-3 py-4 align-top">
                    <ExecutiveBadge tone={riskTone(quote.riskLevel)}>
                      {quote.riskLevel}
                    </ExecutiveBadge>
                    <p className="np-type-meta mt-2 min-w-0 text-pretty">
                      Budget {quote.budgetVarianceLabel}
                    </p>
                    <p className="np-type-meta mt-1 min-w-0 text-pretty">
                      Lowest {quote.lowestBidVarianceLabel}
                    </p>
                    <ExceptionBadges quote={quote} />
                  </td>
                  <td className="min-w-0 px-3 py-4 align-top">
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

      <div
        className="mt-6 grid min-w-0 gap-4 @min-[1500px]:hidden"
        data-rfq-quote-comparison-cards="true"
      >
        {quotes.map((quote) => (
          <article
            key={quote.id}
            className={`min-w-0 rounded-executive border p-5 ${
              quote.isRecommended
                ? "border-nexus-gold/30 bg-nexus-gold/[0.08]"
                : "border-white/10 bg-black/20"
            }`}
          >
            <header className="flex min-w-0 flex-col gap-3 @md:flex-row @md:items-start @md:justify-between">
              <div className="min-w-0">
                <p className="np-type-meta">Rank #{quote.rank}</p>
                <h3 className="np-type-h3 mt-2 min-w-0 whitespace-normal text-pretty">
                  {quote.supplierLabel}
                </h3>
                <p className="np-type-kpi mt-3 min-w-0 text-pretty text-2xl">
                  {quote.amountLabel}
                </p>
              </div>
              <div className="flex min-w-0 flex-wrap gap-2 @md:max-w-[42%] @md:justify-end">
                {quote.isRecommended ? (
                  <ExecutiveBadge tone="recommended">Recommended</ExecutiveBadge>
                ) : (
                  <ExecutiveBadge tone={decisionTone(quote.decision)}>
                    {decisionLabel(quote.decision)}
                  </ExecutiveBadge>
                )}
                {quote.isLowest ? (
                  <ExecutiveBadge tone="success">Lowest bid</ExecutiveBadge>
                ) : null}
              </div>
            </header>

            <section className="mt-5 border-t border-white/10 pt-4" aria-label="Commercial terms">
              <p className="np-type-meta text-nexus-cyan-bright">
                Commercial terms
              </p>
              <dl className="mt-3 grid grid-cols-1 gap-3 @sm:grid-cols-2">
                <ComparisonField
                  label="Timeline"
                  value={quote.timeline || "Not specified"}
                />
                <ComparisonField
                  label="Validity"
                  value={`${quote.validityDays} days`}
                />
              </dl>
            </section>

            <section
              className="mt-5 border-t border-white/10 pt-4"
              aria-label="Comparison intelligence"
            >
              <p className="np-type-meta text-nexus-gold-bright">
                Comparison intelligence
              </p>
              <dl className="mt-3 grid grid-cols-1 gap-3 @sm:grid-cols-2">
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
            </section>

            <div className="mt-4 flex flex-wrap gap-2">
              <ExceptionBadges quote={quote} />
            </div>

            <div className="mt-5 min-w-0 border-t border-white/10 pt-4">
              <p className="np-type-meta">Owner action</p>
              <div className="mt-3 min-w-0">
                <QuoteAction
                  quote={quote}
                  awarded={awarded}
                  rfqTitle={rfqTitle}
                />
              </div>
            </div>
          </article>
        ))}
      </div>
    </>
  );

  const containerClassName = "min-w-0 @container";

  if (embedded) {
    return (
      <section
        className={containerClassName}
        data-rfq-quote-comparison="true"
        aria-labelledby="rfq-comparison-heading"
      >
        {comparisonBody}
      </section>
    );
  }

  return (
    <ExecutivePanel
      variant="operational"
      padding="lg"
      className={`np-region-major ${containerClassName}`}
      aria-labelledby="rfq-comparison-heading"
      data-rfq-quote-comparison="true"
    >
      {comparisonBody}
    </ExecutivePanel>
  );
}

function ComparisonField({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className="np-type-meta">{label}</dt>
      <dd className="np-type-body mt-1 min-w-0 text-pretty text-white">{value}</dd>
    </div>
  );
}

function ExceptionBadges({ quote }: { quote: RfqQuoteComparisonItem }) {
  return (
    <div className="flex flex-wrap gap-2">
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
