"use client";

import { useDeferredValue, useMemo, useState } from "react";

import AwardContractButton from "@/components/award-contract-button";
import { ExecutiveBadge } from "@/components/executive/executive-badge";
import { ExecutivePanel } from "@/components/executive/executive-panel";
import { EXECUTIVE_FOCUS_CYAN } from "@/lib/design-system/executive-contract";

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

const RESPONDENT_PAGE_SIZE = 12;

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
  if (riskLevel === "Low" || riskLevel === "Low Risk") {
    return "success" as const;
  }

  if (riskLevel === "High" || riskLevel === "High Risk") {
    return "risk" as const;
  }

  return "warning" as const;
}

export function RfqQuoteComparison({
  rfqTitle,
  quotes,
  awarded,
  embedded = false,
}: RfqQuoteComparisonProps) {
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);
  const [currentPage, setCurrentPage] = useState(1);

  const filteredQuotes = useMemo(() => {
    const query = deferredSearch.trim().toLowerCase();

    if (!query) {
      return quotes;
    }

    return quotes.filter((quote) =>
      quote.supplierLabel.toLowerCase().includes(query),
    );
  }, [deferredSearch, quotes]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredQuotes.length / RESPONDENT_PAGE_SIZE),
  );

  const safeCurrentPage = Math.min(Math.max(currentPage, 1), totalPages);
  const pageStartIndex = (safeCurrentPage - 1) * RESPONDENT_PAGE_SIZE;

  const pageEndIndex = Math.min(
    pageStartIndex + RESPONDENT_PAGE_SIZE,
    filteredQuotes.length,
  );

  const paginatedQuotes = useMemo(
    () =>
      filteredQuotes.slice(
        pageStartIndex,
        pageStartIndex + RESPONDENT_PAGE_SIZE,
      ),
    [filteredQuotes, pageStartIndex],
  );

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

      <h2
        id="rfq-comparison-heading"
        className="np-type-h2 mt-3 min-w-0 text-pretty"
      >
        Quote comparison
      </h2>

      <p className="np-type-body mt-3 max-w-4xl min-w-0 text-pretty">
        Ranked commercial evidence for this RFQ. The recommended quote is the
        highest current evaluation score, not a guaranteed award.
      </p>

      <div className="mt-6 grid min-w-0 gap-3">
        <label
          htmlFor="rfq-respondent-search"
          className="np-type-meta text-nexus-cyan-bright"
        >
          Respondent search
        </label>

        <input
          id="rfq-respondent-search"
          type="search"
          value={search}
          onChange={(event) => {
            setSearch(event.target.value);
            setCurrentPage(1);
          }}
          placeholder="Search respondents by supplier name"
          aria-label="Search RFQ respondents"
          className={`min-h-12 w-full rounded-executive border border-white/10 bg-black/20 px-4 text-sm font-semibold text-white outline-none transition placeholder:text-slate-400 hover:border-white/20 focus:border-nexus-cyan-bright ${EXECUTIVE_FOCUS_CYAN}`}
        />

        <p className="np-type-meta" aria-live="polite">
          {deferredSearch.trim()
            ? `${filteredQuotes.length} of ${quotes.length} respondents match the current search.`
            : `${quotes.length} respondent quotation${
                quotes.length === 1 ? "" : "s"
              } available for comparison.`}
        </p>
      </div>

      {filteredQuotes.length === 0 ? (
        <section
          className="mt-6 rounded-executive border border-white/10 bg-black/20 px-5 py-8"
          role="status"
          aria-live="polite"
        >
          <p className="np-type-eyebrow">Respondent search</p>
          <h3 className="np-type-h3 mt-3">No matching respondents</h3>
          <p className="np-type-body mt-3">
            No supplier name matches the current search. Clear or revise the
            search to restore the available respondent quotations.
          </p>
        </section>
      ) : (
        <>
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
                      Timeline / quote validity
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
                  {paginatedQuotes.map((quote) => (
                    <tr
                      key={quote.id}
                      className={`border-t border-white/10 ${
                        quote.isRecommended ? "bg-nexus-gold/[0.07]" : ""
                      }`}
                    >
                      <th
                        scope="row"
                        className="min-w-0 px-3 py-4 align-top"
                      >
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
                            <ExecutiveBadge tone="success">
                              Lowest quote
                            </ExecutiveBadge>
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
                          Price {quote.priceScore} · Timeline{" "}
                          {quote.timelineScore} · Performance{" "}
                          {quote.performanceScore} · Risk readiness{" "}
                          {quote.riskScore}
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
                          Vs lowest quote {quote.lowestBidVarianceLabel}
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
            {paginatedQuotes.map((quote) => (
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
                      <ExecutiveBadge tone="recommended">
                        Recommended
                      </ExecutiveBadge>
                    ) : (
                      <ExecutiveBadge tone={decisionTone(quote.decision)}>
                        {decisionLabel(quote.decision)}
                      </ExecutiveBadge>
                    )}

                    {quote.isLowest ? (
                      <ExecutiveBadge tone="success">
                        Lowest quote
                      </ExecutiveBadge>
                    ) : null}
                  </div>
                </header>

                <section
                  className="mt-5 border-t border-white/10 pt-4"
                  aria-label="Commercial terms"
                >
                  <p className="np-type-meta text-nexus-cyan-bright">
                    Commercial terms
                  </p>

                  <dl className="mt-3 grid grid-cols-1 gap-3 @sm:grid-cols-2">
                    <ComparisonField
                      label="Timeline"
                      value={quote.timeline || "Not specified"}
                    />

                    <ComparisonField
                      label="Quote validity"
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
                      label="Price / timeline / performance / risk readiness"
                      value={`P ${quote.priceScore} · T ${quote.timelineScore} · E ${quote.performanceScore} · R ${quote.riskScore}`}
                    />

                    <ComparisonField
                      label="Risk"
                      value={quote.riskLevel}
                    />

                    <ComparisonField
                      label="Budget variance"
                      value={quote.budgetVarianceLabel}
                    />

                    <ComparisonField
                      label="Variance vs lowest quote"
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

          <nav
            className="mt-6 flex min-w-0 flex-col gap-4 border-t border-white/10 pt-5 @md:flex-row @md:items-center @md:justify-between"
            aria-label="Respondent quote comparison pagination"
          >
            <p
              className="np-type-meta min-w-0 text-pretty"
              aria-live="polite"
            >
              Showing {pageStartIndex + 1} to {pageEndIndex} of{" "}
              {filteredQuotes.length} respondents
            </p>

            <div className="flex min-w-0 flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() =>
                  setCurrentPage(Math.max(1, safeCurrentPage - 1))
                }
                disabled={safeCurrentPage === 1}
                aria-label="Previous respondent page"
                className={`inline-flex min-h-11 items-center justify-center rounded-executive border border-white/10 bg-white/[0.055] px-4 text-sm font-black text-white transition hover:bg-white/[0.08] disabled:cursor-not-allowed disabled:opacity-40 ${EXECUTIVE_FOCUS_CYAN}`}
              >
                Previous
              </button>

              <span className="np-type-meta whitespace-nowrap">
                Page {safeCurrentPage} of {totalPages}
              </span>

              <button
                type="button"
                onClick={() =>
                  setCurrentPage(
                    Math.min(totalPages, safeCurrentPage + 1),
                  )
                }
                disabled={safeCurrentPage === totalPages}
                aria-label="Next respondent page"
                className={`inline-flex min-h-11 items-center justify-center rounded-executive border border-white/10 bg-white/[0.055] px-4 text-sm font-black text-white transition hover:bg-white/[0.08] disabled:cursor-not-allowed disabled:opacity-40 ${EXECUTIVE_FOCUS_CYAN}`}
              >
                Next
              </button>
            </div>
          </nav>
        </>
      )}
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

function ComparisonField({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="min-w-0">
      <dt className="np-type-meta">{label}</dt>

      <dd className="np-type-body mt-1 min-w-0 text-pretty text-white">
        {value}
      </dd>
    </div>
  );
}

function ExceptionBadges({
  quote,
}: {
  quote: RfqQuoteComparisonItem;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {quote.isBelowAverage ? (
        <ExecutiveBadge tone="blue">Below average</ExecutiveBadge>
      ) : null}

      {quote.timelineScore >= 84 ? (
        <ExecutiveBadge tone="success">
          Strong timeline
        </ExecutiveBadge>
      ) : null}

      {quote.isHighest ? (
        <ExecutiveBadge tone="warning">
          Highest quote
        </ExecutiveBadge>
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
    return (
      <ExecutiveBadge tone="awarded">
        Contract awarded
      </ExecutiveBadge>
    );
  }

  if (awarded || !quote.canAward) {
    return (
      <ExecutiveBadge tone="locked">
        Award closed
      </ExecutiveBadge>
    );
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