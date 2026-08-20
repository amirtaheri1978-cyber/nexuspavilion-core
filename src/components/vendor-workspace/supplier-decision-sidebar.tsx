import Link from "next/link";

import { ExecutiveBadge } from "@/components/executive/executive-badge";
import { ExecutivePanel } from "@/components/executive/executive-panel";

type SupplierDecisionRFQ = {
  id: string;
  slug: string | null;
  title: string | null;
  location: string | null;
};

type SupplierDecisionQuote = {
  id: string;
  rfq_id: string;
  amount: number | string | null;
};

type SupplierDecisionSidebarProps = {
  pendingReviews: Array<{
    rfq: SupplierDecisionRFQ;
    quoteCount: number;
  }>;
  recentAwards: Array<{
    quote: SupplierDecisionQuote;
    rfq: SupplierDecisionRFQ | null;
  }>;
};

function formatMoney(value: number | string | null | undefined) {
  const amount = Number(value);

  if (!Number.isFinite(amount)) {
    return "$0";
  }

  return `$${amount.toLocaleString()}`;
}

export function SupplierDecisionSidebar({
  pendingReviews,
  recentAwards,
}: SupplierDecisionSidebarProps) {
  return (
    <aside className="space-y-8">
      <ExecutivePanel padding="lg" tone="gold">
        <p className="text-xs font-black uppercase tracking-[0.3em] text-nexus-gold">
          Decision Queue
        </p>

        <h2 className="mt-3 text-3xl font-black text-nexus-white">
          Pending Commercial Reviews
        </h2>

        <p className="mt-3 text-sm font-semibold leading-7 text-nexus-muted">
          Review procurement events with supplier quotations awaiting
          comparative evaluation or award determination.
        </p>

        <div className="mt-6 grid gap-4">
          {pendingReviews.length > 0 ? (
            pendingReviews.map(({ rfq, quoteCount }) => (
              <Link
                key={rfq.id}
                href={
                  rfq.slug
                    ? `/rfq/${rfq.slug}/compare`
                    : "/vendor-dashboard"
                }
                className="group min-w-0 rounded-3xl border border-white/10 bg-white/[0.045] p-5 transition duration-300 hover:border-nexus-gold/25 hover:bg-white/[0.065]"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="break-words text-lg font-black text-nexus-white">
                      {rfq.title || "Untitled RFQ"}
                    </p>

                    <p className="mt-2 text-sm font-semibold leading-6 text-nexus-muted">
                      {quoteCount} quotation
                      {quoteCount === 1 ? "" : "s"} ready for comparative
                      review.
                    </p>
                  </div>

                  <ExecutiveBadge tone="warning">
                    Review Required
                  </ExecutiveBadge>
                </div>

                <p className="mt-5 text-sm font-black text-nexus-gold">
                  Launch Comparative Evaluation
                </p>
              </Link>
            ))
          ) : (
            <SupplierSidebarEmptyState
              title="No Pending Commercial Reviews"
              message="No procurement events are currently awaiting comparative evaluation or award review."
            />
          )}
        </div>
      </ExecutivePanel>

      <ExecutivePanel padding="lg" tone="success">
        <p className="text-xs font-black uppercase tracking-[0.3em] text-emerald-300">
          Award Activity
        </p>

        <h2 className="mt-3 text-3xl font-black text-nexus-white">
          Recent Awards
        </h2>

        <p className="mt-3 text-sm font-semibold leading-7 text-nexus-muted">
          Monitor recently awarded procurement events and the commercial
          value secured across the current supplier portfolio.
        </p>

        <div className="mt-6 grid gap-4">
          {recentAwards.length > 0 ? (
            recentAwards.map(({ quote, rfq }) => (
              <article
                key={quote.id}
                className="min-w-0 rounded-3xl border border-white/10 bg-white/[0.045] p-5"
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="break-words text-lg font-black text-nexus-white">
                      {rfq?.title || "Awarded RFQ"}
                    </p>

                    <p className="mt-2 text-sm font-semibold text-nexus-muted">
                      {rfq?.location || "Location not specified"}
                    </p>
                  </div>

                  <ExecutiveBadge tone="success">
                    Awarded
                  </ExecutiveBadge>
                </div>

                <p className="mt-5 break-words text-2xl font-black text-emerald-300">
                  {formatMoney(quote.amount)}
                </p>
              </article>
            ))
          ) : (
            <SupplierSidebarEmptyState
              title="No Recorded Awards"
              message="Awarded procurement events will appear here once supplier award decisions are recorded."
            />
          )}
        </div>
      </ExecutivePanel>
    </aside>
  );
}

function SupplierSidebarEmptyState({
  title,
  message,
}: {
  title: string;
  message: string;
}) {
  return (
    <div className="rounded-3xl border border-dashed border-white/15 bg-white/[0.035] p-6 text-center">
      <p className="text-sm font-black text-nexus-white">
        {title}
      </p>

      <p className="mt-2 text-sm font-semibold leading-6 text-nexus-muted">
        {message}
      </p>
    </div>
  );
}