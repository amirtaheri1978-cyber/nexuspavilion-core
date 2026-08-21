import Link from "next/link";

import { ExecutiveBadge } from "@/components/executive/executive-badge";

type RFQSupplierQuote = {
  id: string;
  amount: number | string | null;
  timeline: string | null;
  validity_days?: number | null;
  decision: string | null;
  message: string | null;
};

type RFQSupplierQuotesProps = {
  quotes: RFQSupplierQuote[];
  isOpen: boolean;
  rfqSlug: string;
  canSubmitQuote: boolean;
};

type SupplierDecisionTone = "success" | "warning" | "neutral";

export function RFQSupplierQuotes({
  quotes,
  isOpen,
  rfqSlug,
  canSubmitQuote,
}: RFQSupplierQuotesProps) {
  return (
    <section
      className="mt-6 min-w-0 @container"
      aria-labelledby="rfq-supplier-quotes-title"
      data-rfq-supplier-quotes="true"
    >
      <h3 id="rfq-supplier-quotes-title" className="sr-only">
        Supplier Commercial Submission
      </h3>

      {quotes.length === 0 ? (
        <SupplierQuoteEmptyState
          isOpen={isOpen}
          rfqSlug={rfqSlug}
          canSubmitQuote={canSubmitQuote}
        />
      ) : (
        <>
          <div
            className="hidden min-w-0 @min-[1500px]:block"
            data-rfq-supplier-quotes-table="true"
          >
            <div className="rounded-executive border border-white/10">
              <table className="w-full table-fixed border-collapse text-left">
                <caption className="sr-only">
                  Your organization’s RFQ commercial submission
                </caption>
                <colgroup>
                  <col className="w-[18%]" />
                  <col className="w-[20%]" />
                  <col className="w-[14%]" />
                  <col className="w-[16%]" />
                  <col className="w-[32%]" />
                </colgroup>
                <thead className="bg-white/[0.04]">
                  <tr>
                    <th scope="col" className="np-type-meta px-3 py-3">
                      Submitted amount
                    </th>
                    <th scope="col" className="np-type-meta px-3 py-3">
                      Delivery timeline
                    </th>
                    <th scope="col" className="np-type-meta px-3 py-3">
                      Proposal validity
                    </th>
                    <th scope="col" className="np-type-meta px-3 py-3">
                      Submission status
                    </th>
                    <th scope="col" className="np-type-meta px-3 py-3">
                      Supplier message
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {quotes.map((quote) => {
                    const decisionLabel = quote.decision || "Submitted";

                    return (
                      <tr key={quote.id} className="border-t border-white/10">
                        <th
                          scope="row"
                          className="min-w-0 px-3 py-4 align-top"
                        >
                          <p className="np-type-kpi min-w-0 text-pretty text-lg">
                            {formatMoney(quote.amount)}
                          </p>
                          <p className="np-type-meta mt-1 min-w-0 text-pretty">
                            Confidential commercial value
                          </p>
                        </th>
                        <td className="min-w-0 px-3 py-4 align-top">
                          <p className="np-type-body min-w-0 text-pretty">
                            {quote.timeline || "Not specified"}
                          </p>
                        </td>
                        <td className="min-w-0 px-3 py-4 align-top">
                          <p className="np-type-body min-w-0 text-pretty">
                            {quote.validity_days
                              ? `${quote.validity_days} days`
                              : "30 days"}
                          </p>
                        </td>
                        <td className="min-w-0 px-3 py-4 align-top">
                          <ExecutiveBadge tone={getDecisionTone(quote.decision)}>
                            {decisionLabel}
                          </ExecutiveBadge>
                        </td>
                        <td className="min-w-0 px-3 py-4 align-top">
                          <p className="np-type-body min-w-0 text-pretty">
                            {quote.message || "No supplier message provided."}
                          </p>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <div
            className="grid min-w-0 gap-4 @min-[1500px]:hidden"
            data-rfq-supplier-quotes-cards="true"
          >
            {quotes.map((quote) => {
              const decisionLabel = quote.decision || "Submitted";

              return (
                <article
                  key={quote.id}
                  className="min-w-0 rounded-executive border border-white/10 bg-black/20 p-5"
                  aria-label={`Commercial submission amount ${formatMoney(
                    quote.amount,
                  )}, status ${decisionLabel}`}
                >
                  <header className="flex min-w-0 flex-col gap-3 @md:flex-row @md:items-start @md:justify-between">
                    <div className="min-w-0">
                      <p className="np-type-meta">Confidential commercial value</p>
                      <p className="np-type-kpi mt-2 min-w-0 text-pretty text-2xl">
                        {formatMoney(quote.amount)}
                      </p>
                    </div>
                    <div className="min-w-0">
                      <ExecutiveBadge tone={getDecisionTone(quote.decision)}>
                        {decisionLabel}
                      </ExecutiveBadge>
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
                      <div className="min-w-0">
                        <dt className="np-type-meta">Delivery timeline</dt>
                        <dd className="np-type-body mt-1 min-w-0 text-pretty text-white">
                          {quote.timeline || "Not specified"}
                        </dd>
                      </div>
                      <div className="min-w-0">
                        <dt className="np-type-meta">Proposal validity</dt>
                        <dd className="np-type-body mt-1 min-w-0 text-pretty text-white">
                          {quote.validity_days
                            ? `${quote.validity_days} days`
                            : "30 days"}
                        </dd>
                      </div>
                    </dl>
                  </section>

                  <section
                    className="mt-5 border-t border-white/10 pt-4"
                    aria-label="Supplier message"
                  >
                    <p className="np-type-meta">Supplier message</p>
                    <p className="np-type-body mt-2 min-w-0 text-pretty">
                      {quote.message || "No supplier message provided."}
                    </p>
                  </section>
                </article>
              );
            })}
          </div>
        </>
      )}
    </section>
  );
}

function SupplierQuoteEmptyState({
  isOpen,
  rfqSlug,
  canSubmitQuote,
}: {
  isOpen: boolean;
  rfqSlug: string;
  canSubmitQuote: boolean;
}) {
  return (
    <div
      className="min-w-0 rounded-executive border border-white/10 px-5 py-10 text-center sm:px-6"
      role="status"
      data-rfq-supplier-quotes-empty="true"
    >
      <p className="np-type-h3 min-w-0 text-pretty">
        No Commercial Submission Recorded
      </p>

      <p className="mx-auto mt-3 max-w-xl min-w-0 text-pretty text-sm font-semibold leading-6 text-nexus-muted">
        {isOpen
          ? "This RFQ is currently open for an authorized supplier submission."
          : "This RFQ is closed and is no longer accepting supplier submissions."}
      </p>

      {canSubmitQuote ? (
        <Link
          href={`/rfq/${rfqSlug}/submit`}
          className="mt-6 inline-flex min-h-12 items-center justify-center rounded-full border border-nexus-gold/30 bg-nexus-gold/10 px-6 py-3 text-center text-sm font-black text-nexus-gold transition duration-200 hover:border-nexus-gold/40 hover:bg-nexus-gold/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nexus-gold/70 focus-visible:ring-offset-2 focus-visible:ring-offset-nexus-navy"
        >
          Submit Quote
        </Link>
      ) : null}
    </div>
  );
}

function formatMoney(value: number | string | null) {
  const amount = Number(value);

  if (!Number.isFinite(amount)) {
    return "$0";
  }

  return `$${Math.round(amount).toLocaleString()}`;
}

function getDecisionTone(
  decision: string | null,
): SupplierDecisionTone {
  const normalizedDecision =
    decision?.trim().toLowerCase() ?? "";

  if (
    normalizedDecision === "awarded" ||
    normalizedDecision === "accepted"
  ) {
    return "success";
  }

  if (
    normalizedDecision === "under review" ||
    normalizedDecision === "shortlisted" ||
    normalizedDecision === "revision requested"
  ) {
    return "warning";
  }

  return "neutral";
}
