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

type SupplierDecisionTone =
  | "success"
  | "warning"
  | "neutral";

export function RFQSupplierQuotes({
  quotes,
  isOpen,
  rfqSlug,
  canSubmitQuote,
}: RFQSupplierQuotesProps) {
  return (
    <section
      className="mt-6"
      aria-labelledby="rfq-supplier-quotes-title"
    >
      <h3 id="rfq-supplier-quotes-title" className="sr-only">
        Supplier Commercial Submission
      </h3>

      <div className="overflow-x-auto rounded-[28px] border border-white/10 bg-white/[0.035]">
        <div
          className="min-w-[920px]"
          role="table"
          aria-label="Your organization’s RFQ commercial submission"
        >
          <div
            className="grid grid-cols-[1.15fr_1fr_0.85fr_1fr_1.8fr] border-b border-white/10 bg-white/[0.055] px-6 py-4 text-xs font-black uppercase tracking-[0.15em] text-nexus-muted"
            role="row"
          >
            <div role="columnheader">Submitted Amount</div>
            <div role="columnheader">Delivery Timeline</div>
            <div role="columnheader">Proposal Validity</div>
            <div role="columnheader">Submission Status</div>
            <div role="columnheader">Supplier Message</div>
          </div>

          {quotes.length > 0 ? (
            <div role="rowgroup">
              {quotes.map((quote) => {
                const decisionLabel =
                  quote.decision || "Submitted";

                return (
                  <article
                    key={quote.id}
                    className="grid grid-cols-[1.15fr_1fr_0.85fr_1fr_1.8fr] items-start border-t border-white/10 px-6 py-5 transition duration-200 hover:bg-white/[0.025]"
                    role="row"
                    aria-label={`Commercial submission amount ${formatMoney(
                      quote.amount,
                    )}, status ${decisionLabel}`}
                  >
                    <div
                      className="min-w-0 pr-4"
                      role="cell"
                    >
                      <p className="break-words text-xl font-black tracking-tight text-nexus-white">
                        {formatMoney(quote.amount)}
                      </p>

                      <p className="mt-1 text-xs font-semibold leading-5 text-nexus-muted">
                        Confidential commercial value
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
                      className="min-w-0"
                      role="cell"
                    >
                      <p className="break-words text-sm font-semibold leading-6 text-nexus-muted">
                        {quote.message ||
                          "No supplier message provided."}
                      </p>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <SupplierQuoteEmptyState
              isOpen={isOpen}
              rfqSlug={rfqSlug}
              canSubmitQuote={canSubmitQuote}
            />
          )}
        </div>
      </div>
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
      className="px-6 py-12 text-center"
      role="status"
    >
      <p className="text-lg font-black text-nexus-white">
        No Commercial Submission Recorded
      </p>

      <p className="mx-auto mt-2 max-w-xl text-sm font-semibold leading-6 text-nexus-muted">
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