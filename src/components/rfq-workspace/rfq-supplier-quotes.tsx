import Link from "next/link";

import { ExecutiveBadge } from "@/components/executive/executive-badge";
import {
  EXECUTIVE_CTA_PRIMARY,
  EXECUTIVE_CTA_SECONDARY,
  EXECUTIVE_EMPTY_BODY,
  EXECUTIVE_EMPTY_COMPACT,
  EXECUTIVE_EMPTY_LIVE,
  EXECUTIVE_EMPTY_ROLE,
  EXECUTIVE_EMPTY_TITLE,
  EXECUTIVE_FEEDBACK_INFO,
  EXECUTIVE_FEEDBACK_WARNING,
} from "@/lib/design-system/executive-contract";

type RFQSupplierQuote = {
  id: string;
  amount: number | string | null;
  timeline: string | null;
  validity_days?: number | null;
  decision: string | null;
  message: string | null;
  requiresMaterialRevalidation?: boolean;
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
  const requiresMaterialReview = quotes.some(
    (quote) => quote.requiresMaterialRevalidation,
  );
  const primaryQuote = quotes[0] ?? null;
  const primaryDecisionLabel = primaryQuote
    ? formatSupplierDecisionLabel(primaryQuote.decision)
    : null;

  return (
    <section
      className="mt-6 min-w-0 @container"
      aria-labelledby="rfq-supplier-quotes-title"
      data-rfq-supplier-quotes="true"
    >
      <div className="min-w-0">
        <p className="np-type-eyebrow text-nexus-gold">Submission tracking</p>
        <h3
          id="rfq-supplier-quotes-title"
          className="np-type-h3 mt-2 min-w-0 text-pretty text-nexus-white"
        >
          Your quote submission &amp; outcome
        </h3>
      </div>

      {primaryQuote && primaryDecisionLabel ? (
        <div
          className="mt-5 flex min-w-0 flex-col gap-3 @sm:flex-row @sm:items-center @sm:justify-between"
          aria-label="Own submission state"
        >
          <div className="min-w-0">
            <p className="np-type-meta">Own submission state</p>
            <p className="np-type-body mt-1 min-w-0 text-pretty text-nexus-text-primary">
              {getSubmissionStateSummary(primaryQuote.decision)}
            </p>
          </div>
          <div className="flex min-w-0 flex-wrap gap-2">
            <ExecutiveBadge tone={getDecisionTone(primaryQuote.decision)}>
              {primaryDecisionLabel}
            </ExecutiveBadge>
            {requiresMaterialReview ? (
              <ExecutiveBadge tone="warning">Requires Review</ExecutiveBadge>
            ) : null}
          </div>
        </div>
      ) : null}

      <div
        className={`mt-5 min-w-0 ${EXECUTIVE_FEEDBACK_INFO}`}
        role="status"
        aria-label="Quote confidentiality"
      >
        <ExecutiveBadge tone="blue">Confidential</ExecutiveBadge>
        <p className="np-type-body mt-3 min-w-0 text-pretty text-nexus-text-primary">
          Quote pricing remains confidential to your organization. Competitor
          quotations, ranking, evaluation scores, and award controls are not
          available on this respondent tracking surface.
        </p>
      </div>

      {requiresMaterialReview ? (
        <div
          className={`mt-5 min-w-0 ${EXECUTIVE_FEEDBACK_WARNING}`}
          data-rfq-quote-revalidation="requires_review"
          role="status"
        >
          <ExecutiveBadge tone="warning">Requires Review</ExecutiveBadge>
          <p className="np-type-body mt-3 min-w-0 text-pretty text-nexus-text-primary">
            A governed material RFQ amendment changed the basis of your submitted
            quotation. Review the current commercial terms and reconfirm them
            unchanged or resubmit revised terms before the deadline.
          </p>
          {isOpen ? (
            <Link
              href={`/rfq/${rfqSlug}/submit`}
              className={`mt-5 ${EXECUTIVE_CTA_PRIMARY}`}
            >
              Review and reconfirm quote
            </Link>
          ) : null}
        </div>
      ) : null}

      {quotes.length === 0 ? (
        <div className="mt-5">
          <SupplierQuoteEmptyState
            isOpen={isOpen}
            rfqSlug={rfqSlug}
            canSubmitQuote={canSubmitQuote}
          />
        </div>
      ) : (
        <>
          <div className="mt-6 min-w-0">
            <p className="np-type-meta text-nexus-cyan-bright">
              Commercial terms snapshot
            </p>
            <p className="np-type-body mt-2 max-w-3xl min-w-0 text-pretty text-nexus-muted">
              Your recorded commercial values only. No competitor comparison is
              shown here.
            </p>
          </div>

          <div
            className="mt-4 hidden min-w-0 @min-[1500px]:block"
            data-rfq-supplier-quotes-table="true"
          >
            <div className="rounded-executive border border-white/10">
              <table className="w-full table-fixed border-collapse text-left">
                <caption className="sr-only">
                  Your organization’s RFQ quote submission
                </caption>
                <colgroup>
                  <col className="w-[18%]" />
                  <col className="w-[18%]" />
                  <col className="w-[12%]" />
                  <col className="w-[20%]" />
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
                      Quote validity
                    </th>
                    <th scope="col" className="np-type-meta px-3 py-3">
                      Submission status
                    </th>
                    <th scope="col" className="np-type-meta px-3 py-3">
                      Commercial note
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {quotes.map((quote) => {
                    const decisionLabel = formatSupplierDecisionLabel(quote.decision);

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
                          {quote.requiresMaterialRevalidation ? (
                            <div className="mt-2">
                              <ExecutiveBadge tone="warning">
                                Requires Review
                              </ExecutiveBadge>
                            </div>
                          ) : null}
                          <p className="np-type-meta mt-3 min-w-0 text-pretty text-nexus-muted">
                            {getOutcomeGuidance(quote.decision)}
                          </p>
                        </td>
                        <td className="min-w-0 px-3 py-4 align-top">
                          <p className="np-type-body min-w-0 text-pretty">
                            {quote.message || "No commercial note provided."}
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
            className="mt-4 grid min-w-0 gap-4 @min-[1500px]:hidden"
            data-rfq-supplier-quotes-cards="true"
          >
            {quotes.map((quote) => {
              const decisionLabel = formatSupplierDecisionLabel(quote.decision);

              return (
                <article
                  key={quote.id}
                  className="min-w-0 rounded-executive border border-white/10 bg-black/20 p-5"
                  aria-label={`Quote submission amount ${formatMoney(
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
                    <div className="flex min-w-0 flex-wrap gap-2">
                      <ExecutiveBadge tone={getDecisionTone(quote.decision)}>
                        {decisionLabel}
                      </ExecutiveBadge>
                      {quote.requiresMaterialRevalidation ? (
                        <ExecutiveBadge tone="warning">Requires Review</ExecutiveBadge>
                      ) : null}
                    </div>
                  </header>

                  <section
                    className="mt-5 border-t border-white/10 pt-4"
                    aria-label="Current decision outcome"
                  >
                    <p className="np-type-meta">Current outcome</p>
                    <p className="np-type-body mt-2 min-w-0 text-pretty text-nexus-text-primary">
                      {getOutcomeGuidance(quote.decision)}
                    </p>
                  </section>

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
                        <dt className="np-type-meta">Quote validity</dt>
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
                    aria-label="Commercial note"
                  >
                    <p className="np-type-meta">Commercial note</p>
                    <p className="np-type-body mt-2 min-w-0 text-pretty">
                      {quote.message || "No commercial note provided."}
                    </p>
                  </section>
                </article>
              );
            })}
          </div>

          <div
            className="mt-6 min-w-0"
            aria-label="Next available action"
          >
            <p className="np-type-meta">Next available action</p>
            <p className="np-type-body mt-2 min-w-0 text-pretty text-nexus-muted">
              {getNextActionCopy({
                isOpen,
                canSubmitQuote,
                requiresMaterialReview,
              })}
            </p>
            {!requiresMaterialReview && canSubmitQuote ? (
              <Link
                href={`/rfq/${rfqSlug}/submit`}
                className={`mt-4 ${EXECUTIVE_CTA_SECONDARY}`}
              >
                Submit quote
              </Link>
            ) : null}
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
      className={`min-w-0 ${EXECUTIVE_EMPTY_COMPACT}`}
      role={EXECUTIVE_EMPTY_ROLE}
      aria-live={EXECUTIVE_EMPTY_LIVE}
      data-rfq-supplier-quotes-empty="true"
    >
      <p className={`${EXECUTIVE_EMPTY_TITLE} min-w-0 text-pretty`}>
        No Quote Submission Recorded
      </p>

      <p className={`${EXECUTIVE_EMPTY_BODY} min-w-0 text-pretty text-nexus-muted`}>
        {isOpen
          ? "This RFQ is currently open for an authorized company quote submission."
          : "This RFQ is closed and is no longer accepting submissions."}
      </p>

      {canSubmitQuote ? (
        <Link
          href={`/rfq/${rfqSlug}/submit`}
          className={`mt-7 ${EXECUTIVE_CTA_PRIMARY}`}
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

function formatSupplierDecisionLabel(decision: string | null) {
  const normalizedDecision = decision?.trim().toLowerCase() ?? "";

  switch (normalizedDecision) {
    case "":
    case "pending":
      return "Submitted";
    case "approved":
      return "Approved";
    case "rejected":
      return "Rejected";
    case "awarded":
      return "Awarded";
    default: {
      const humanizedDecision = normalizedDecision
        .split(/[_\s]+/)
        .filter(Boolean)
        .map((word) => `${word.charAt(0).toUpperCase()}${word.slice(1)}`)
        .join(" ");

      return humanizedDecision || "Submitted";
    }
  }
}

function getSubmissionStateSummary(decision: string | null) {
  const label = formatSupplierDecisionLabel(decision);

  switch (label) {
    case "Approved":
      return "Your quotation is approved for continued evaluation.";
    case "Rejected":
      return "Your quotation was not selected for award.";
    case "Awarded":
      return "Your quotation is the recorded RFQ award outcome.";
    default:
      return "Your quotation is recorded and awaiting issuer evaluation.";
  }
}

function getOutcomeGuidance(decision: string | null) {
  const label = formatSupplierDecisionLabel(decision);

  switch (label) {
    case "Approved":
      return "Approved means continued evaluation only. It is not a contract award, purchase order, or legal contract.";
    case "Rejected":
      return "Rejected is the recorded issuer outcome for this quotation.";
    case "Awarded":
      return "Awarded means the RFQ award outcome is recorded. It does not claim purchase-order issuance or contract execution.";
    default:
      return "Submitted means your commercial response is on record pending issuer decision.";
  }
}

function getNextActionCopy({
  isOpen,
  canSubmitQuote,
  requiresMaterialReview,
}: {
  isOpen: boolean;
  canSubmitQuote: boolean;
  requiresMaterialReview: boolean;
}) {
  if (requiresMaterialReview && isOpen) {
    return "Review the material amendment and reconfirm or revise your quotation before the deadline.";
  }

  if (requiresMaterialReview && !isOpen) {
    return "This RFQ is closed. Material-review reconfirmation is no longer available.";
  }

  if (canSubmitQuote) {
    return "An authorized company quote submission remains available for this open RFQ.";
  }

  if (!isOpen) {
    return "This RFQ is closed. No further submission or reconfirmation action is available here.";
  }

  return "No additional respondent action is available on this tracking surface.";
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
