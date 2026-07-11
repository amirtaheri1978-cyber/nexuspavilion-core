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

export function RFQSupplierQuotes({
  quotes,
  isOpen,
  rfqSlug,
  canSubmitQuote,
}: RFQSupplierQuotesProps) {
  return (
    <div className="mt-6 overflow-x-auto rounded-[28px] border border-white/10 bg-white/[0.035]">
      <div className="min-w-[860px]">
        <div className="grid grid-cols-5 border-b border-white/10 bg-white/[0.055] px-6 py-4 text-sm font-black text-nexus-muted">
          <div>Your Amount</div>
          <div>Timeline</div>
          <div>Validity</div>
          <div>Status</div>
          <div>Message</div>
        </div>

        {quotes.length > 0 ? (
          quotes.map((quote) => (
            <div
              key={quote.id}
              className="grid grid-cols-5 items-center border-t border-white/10 px-6 py-5"
            >
              <div className="text-xl font-black text-nexus-white">
                {formatMoney(quote.amount)}
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
                  {quote.decision || "Submitted"}
                </ExecutiveBadge>
              </div>

              <div className="text-sm text-nexus-muted">
                {quote.message || "No message"}
              </div>
            </div>
          ))
        ) : (
          <SupplierQuoteEmptyState
            isOpen={isOpen}
            rfqSlug={rfqSlug}
            canSubmitQuote={canSubmitQuote}
          />
        )}
      </div>
    </div>
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
    <div className="px-6 py-12 text-center">
      <p className="text-lg font-black text-nexus-white">
        No quote submitted yet.
      </p>

      <p className="mx-auto mt-2 max-w-xl text-sm font-semibold leading-6 text-nexus-muted">
        {isOpen
          ? "This RFQ is open and ready for supplier pricing."
          : "This RFQ is no longer accepting quotes."}
      </p>

      {canSubmitQuote ? (
        <Link
          href={`/rfq/${rfqSlug}/submit`}
          className="mt-6 inline-flex rounded-full border border-[#2CC4E8]/25 bg-[#2CC4E8]/10 px-6 py-3 text-sm font-black text-[#9BE8F8] transition hover:bg-[#2CC4E8]/15"
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

  return `$${amount.toLocaleString()}`;
}