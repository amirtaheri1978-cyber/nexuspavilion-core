"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { ExecutiveBadge } from "@/components/executive/executive-badge";
import { ExecutiveGuidanceCard } from "@/components/executive/executive-guidance-card";
import { ExecutivePanel } from "@/components/executive/executive-panel";
import { formatRfqDeadlineForDisplay } from "@/lib/datetime/format-rfq-deadline-display";
import {
  getRfqDeadlineRisk,
  type RfqDeadlineRiskStatus,
} from "@/lib/datetime/rfq-deadline-risk";
import { resolveQuotationReadinessGuidance } from "@/lib/guidance/quotation-readiness-guidance";
import { evaluateQuotationSubmissionCompleteness } from "@/lib/procurement/quotation-submission-completeness";
import {
  EXECUTIVE_CTA_PRIMARY,
  EXECUTIVE_CTA_SECONDARY,
  EXECUTIVE_FEEDBACK_ERROR,
  EXECUTIVE_FEEDBACK_INFO,
  EXECUTIVE_FEEDBACK_SUCCESS,
  EXECUTIVE_FEEDBACK_WARNING,
  EXECUTIVE_FOCUS_CYAN,
  EXECUTIVE_FOCUS_GOLD,
  EXECUTIVE_FORM_HELPER,
  EXECUTIVE_FORM_INPUT,
  EXECUTIVE_FORM_LABEL,
  EXECUTIVE_FORM_SELECT,
  EXECUTIVE_FORM_TEXTAREA,
  EXECUTIVE_PAGE_CLASS,
} from "@/lib/design-system/executive-contract";

type RfqStatus = {
  title: string | null;
  deadline: string | null;
  deadline_timezone: string | null;
  status: string | null;
  awarded_quote_id: string | null;
  awarded_at: string | null;
};

type ExistingQuoteState = {
  id: string;
  amount: number | string | null;
  timeline: string | null;
  message: string | null;
  validity_days: number | null;
  requiresMaterialRevalidation: boolean;
  hasOutstandingRequiredAcknowledgement: boolean;
};

type FieldKey = "amount" | "timeline" | "message" | "form";

const VALIDITY_DAY_OPTIONS = [30, 60, 90, 120] as const;

type QuoteMutationResponse = {
  error?: string;
  code?: string;
};

function detectCurrencyFromSlug(slug: string) {
  const value = slug.toLowerCase();

  const canadaSignals = [
    "toronto",
    "ottawa",
    "north-york",
    "mississauga",
    "vancouver",
    "calgary",
    "montreal",
    "canada",
    "ontario",
    "on",
  ];

  const usSignals = [
    "new-york",
    "chicago",
    "los-angeles",
    "miami",
    "dallas",
    "houston",
    "seattle",
    "boston",
    "usa",
    "united-states",
    "us",
  ];

  if (usSignals.some((signal) => value.includes(signal))) return "USD";
  if (canadaSignals.some((signal) => value.includes(signal))) return "CAD";

  return "CAD";
}

function normalizeAmount(value: string) {
  const sanitized = value.replace(/,/g, "").replace(/[^\d.]/g, "");
  const decimalIndex = sanitized.indexOf(".");

  if (decimalIndex === -1) {
    return sanitized;
  }

  const wholePart = sanitized.slice(0, decimalIndex);
  const decimalPart = sanitized.slice(decimalIndex + 1).replace(/\./g, "");

  return `${wholePart}.${decimalPart}`;
}

function formatAmount(value: string) {
  const normalized = normalizeAmount(value);
  if (!normalized) return "";

  const [wholePart, decimalPart] = normalized.split(".");
  const wholeNumber = Number(wholePart || "0");

  if (!Number.isFinite(wholeNumber)) {
    return "";
  }

  const formattedWhole = wholeNumber.toLocaleString("en-US", {
    maximumFractionDigits: 0,
  });

  return decimalPart === undefined
    ? formattedWhole
    : `${formattedWhole}.${decimalPart}`;
}

function getAmountNumber(value: string) {
  const normalized = normalizeAmount(value);
  const amount = Number(normalized);
  return Number.isFinite(amount) ? amount : 0;
}

function hasDeadlinePassed(deadline: string | null | undefined) {
  if (!deadline) return false;

  const deadlineDate = new Date(deadline);

  if (Number.isNaN(deadlineDate.getTime())) {
    return false;
  }

  return new Date().getTime() > deadlineDate.getTime();
}

type RfqDeadlineRiskPresentation = {
  label: string;
  detail: string;
  tone: "success" | "warning" | "risk" | "neutral";
};

function getDeadlineRiskPresentation(
  status: RfqDeadlineRiskStatus,
): RfqDeadlineRiskPresentation {
  if (status === "expired") {
    return {
      label: "Deadline expired",
      detail:
        "The RFQ submission deadline has passed. Late quotations are rejected.",
      tone: "risk",
    };
  }

  if (status === "urgent") {
    return {
      label: "Deadline urgent",
      detail:
        "72 hours or less remain before the RFQ submission deadline. Complete final commercial and governance checks now.",
      tone: "risk",
    };
  }

  if (status === "approaching") {
    return {
      label: "Deadline approaching",
      detail:
        "Seven days or less remain before the RFQ submission deadline. Confirm pricing, scope, addenda, and approval readiness.",
      tone: "warning",
    };
  }

  if (status === "open") {
    return {
      label: "Deadline risk low",
      detail:
        "More than seven days remain before the RFQ submission deadline.",
      tone: "success",
    };
  }

  return {
    label: "Deadline risk unavailable",
    detail:
      "The RFQ deadline could not be resolved. Submission eligibility is still governed by the existing RFQ controls.",
    tone: "neutral",
  };
}

function getDeadlineRiskFeedbackClass(
  tone: RfqDeadlineRiskPresentation["tone"],
) {
  switch (tone) {
    case "risk":
      return EXECUTIVE_FEEDBACK_ERROR;
    case "warning":
      return EXECUTIVE_FEEDBACK_WARNING;
    case "success":
      return EXECUTIVE_FEEDBACK_SUCCESS;
    case "neutral":
      return EXECUTIVE_FEEDBACK_INFO;
    default: {
      const _exhaustive: never = tone;
      return _exhaustive;
    }
  }
}

function isSubmissionClosed(rfq: RfqStatus | null) {
  if (!rfq) return false;

  const status = String(rfq.status || "open").toLowerCase();

  if (status !== "open") return true;
  if (rfq.awarded_quote_id) return true;
  if (rfq.awarded_at) return true;
  if (hasDeadlinePassed(rfq.deadline)) return true;

  return false;
}

function toWorkspaceError(message: string) {
  if (
    /postgres|supabase|permission denied|column |relation |stack|undefined/i.test(
      message,
    )
  ) {
    return "The quote could not be submitted. Please try again.";
  }

  return message;
}

const RFQ_DEADLINE_RISK_REFRESH_INTERVAL_MS = 60_000;

type RfqSubmitWorkspaceProps = {
  slug: string;
  initialRfq: RfqStatus;
  initialQuote?: ExistingQuoteState | null;
};

export function RfqSubmitWorkspace({
  slug,
  initialRfq,
  initialQuote = null,
}: RfqSubmitWorkspaceProps) {
  const router = useRouter();

  const currency = useMemo(() => detectCurrencyFromSlug(slug), [slug]);
  const rfq = initialRfq;
  const quoteRequiresReview = Boolean(initialQuote?.requiresMaterialRevalidation);
  const quoteCurrent = Boolean(initialQuote) && !quoteRequiresReview;

  const [amount, setAmount] = useState(
    initialQuote?.amount === null || initialQuote?.amount === undefined
      ? ""
      : String(initialQuote.amount),
  );
  const [timeline, setTimeline] = useState(initialQuote?.timeline ?? "");
  const [message, setMessage] = useState(initialQuote?.message ?? "");
  const [validityDays, setValidityDays] = useState(
    Number(initialQuote?.validity_days || 30),
  );

  const [loading, setLoading] = useState(false);
  const submitLock = useRef(false);
  const [error, setError] = useState("");
  const [errorField, setErrorField] = useState<FieldKey | null>(null);
  const [deadlineNow, setDeadlineNow] = useState(() => Date.now());

  const amountNumber = getAmountNumber(amount);
  const formattedAmount = formatAmount(amount);
  const hasRevisedCommercialTerms =
    quoteRequiresReview && initialQuote
      ? amountNumber !== Number(initialQuote.amount || 0) ||
        timeline.trim() !== String(initialQuote.timeline || "").trim() ||
        message.trim() !== String(initialQuote.message || "").trim() ||
        validityDays !== Number(initialQuote.validity_days || 30)
      : false;
  const submissionCompleteness = useMemo(
    () =>
      evaluateQuotationSubmissionCompleteness({
        amountNumber,
        timeline,
        message,
      }),
    [amountNumber, timeline, message],
  );
  const missingRequirementKeys = useMemo(
    () => submissionCompleteness.missingSignals.map((signal) => signal.key),
    [submissionCompleteness.missingSignals],
  );
  const readinessGuidance = useMemo(
    () =>
      resolveQuotationReadinessGuidance({
        missingRequirementKeys,
        hasOutstandingRequiredAcknowledgement: Boolean(
          initialQuote?.hasOutstandingRequiredAcknowledgement,
        ),
      }),
    [
      initialQuote?.hasOutstandingRequiredAcknowledgement,
      missingRequirementKeys,
    ],
  );

  const submissionClosed = isSubmissionClosed(rfq);
  const deadlinePassed = hasDeadlinePassed(rfq?.deadline);
  const deadlineRisk = useMemo(
    () => getRfqDeadlineRisk(rfq?.deadline, deadlineNow),
    [rfq?.deadline, deadlineNow],
  );
  const deadlineRiskPresentation = getDeadlineRiskPresentation(
    deadlineRisk.status,
  );

  const amountPreview =
    amountNumber > 0
      ? new Intl.NumberFormat("en-US", {
          style: "currency",
          currency,
          maximumFractionDigits: 0,
        }).format(amountNumber)
      : `${currency} 0`;

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setDeadlineNow(Date.now());
    }, RFQ_DEADLINE_RISK_REFRESH_INTERVAL_MS);

    return () => {
      window.clearInterval(intervalId);
    };
  }, []);

  async function parseMutationResponse(response: Response) {
    try {
      const text = await response.text();
      return text ? (JSON.parse(text) as QuoteMutationResponse) : null;
    } catch {
      return null;
    }
  }

  async function handleReconfirm() {
    if (
      submitLock.current ||
      loading ||
      !initialQuote ||
      !quoteRequiresReview
    ) {
      return;
    }

    if (submissionClosed) {
      setErrorField("form");
      setError(
        deadlinePassed
          ? "Reconfirmation closed. The RFQ deadline has passed."
          : "Reconfirmation closed. This RFQ is no longer accepting respondent actions.",
      );
      return;
    }

    if (hasRevisedCommercialTerms) {
      setErrorField("form");
      setError(
        "Commercial terms have been edited. Restore the submitted values to reconfirm unchanged terms, or use Resubmit revised quote.",
      );
      return;
    }

    if (initialQuote.hasOutstandingRequiredAcknowledgement) {
      setErrorField("form");
      setError(
        "Required RFQ Addenda must be acknowledged before the quotation can be reconfirmed or resubmitted. Return to the RFQ workspace and complete the required acknowledgement first.",
      );
      return;
    }

    submitLock.current = true;
    setLoading(true);
    setError("");
    setErrorField(null);

    try {
      const response = await fetch("/api/quotes", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          quoteId: initialQuote.id,
          action: "reconfirmed",
        }),
      });

      const data = await parseMutationResponse(response);

      if (!response.ok) {
        submitLock.current = false;
        setLoading(false);
        setErrorField("form");
        setError(
          toWorkspaceError(
            data?.error || "The quotation could not be reconfirmed.",
          ),
        );
        return;
      }

      router.push(`/rfq/${slug}`);
      router.refresh();
    } catch {
      submitLock.current = false;
      setLoading(false);
      setErrorField("form");
      setError("The quotation could not be reconfirmed. Please try again.");
    }
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (submitLock.current || loading) {
      return;
    }

    if (quoteCurrent) {
      setErrorField("form");
      setError(
        "This quotation is already current against the latest material RFQ amendment basis.",
      );
      return;
    }

    if (submissionClosed) {
      setErrorField("form");
      setError(
        deadlinePassed
          ? "Submission closed. The RFQ deadline has passed and late quote submissions are not accepted."
          : "Submission closed. This RFQ is no longer accepting quotes.",
      );
      return;
    }

    if (
      quoteRequiresReview &&
      initialQuote?.hasOutstandingRequiredAcknowledgement
    ) {
      setErrorField("form");
      setError(
        "Required RFQ Addenda must be acknowledged before the quotation can be reconfirmed or resubmitted. Return to the RFQ workspace and complete the required acknowledgement first.",
      );
      return;
    }

    submitLock.current = true;
    setLoading(true);
    setError("");
    setErrorField(null);

    if (amountNumber < 1000) {
      submitLock.current = false;
      setLoading(false);
      setErrorField("amount");
      setError(
        "Quote amount appears too low. Please enter the full contract value.",
      );
      return;
    }

    if (!timeline.trim()) {
      submitLock.current = false;
      setLoading(false);
      setErrorField("timeline");
      setError("Please enter a delivery timeline.");
      return;
    }

    if (!message.trim()) {
      submitLock.current = false;
      setLoading(false);
      setErrorField("message");
      setError("Please include a commercial note.");
      return;
    }

    try {
      const isResubmission = Boolean(initialQuote && quoteRequiresReview);
      const response = await fetch("/api/quotes", {
        method: isResubmission ? "PATCH" : "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(
          isResubmission
            ? {
                quoteId: initialQuote?.id,
                action: "resubmitted",
                amount: amountNumber,
                timeline: timeline.trim(),
                message: message.trim(),
                validity_days: validityDays,
              }
            : {
                slug,
                amount: amountNumber,
                currency,
                timeline: timeline.trim(),
                message: message.trim(),
              },
        ),
      });

      const data = await parseMutationResponse(response);

      if (!response.ok) {
        submitLock.current = false;
        setLoading(false);
        setErrorField("form");
        setError(
          toWorkspaceError(
            data?.error ||
              (isResubmission
                ? "Failed to resubmit revised quotation."
                : "Failed to submit quote."),
          ),
        );
        return;
      }

      router.push(`/rfq/${slug}`);
      router.refresh();
    } catch {
      submitLock.current = false;
      setLoading(false);
      setErrorField("form");
      setError(
        quoteRequiresReview
          ? "The revised quotation could not be resubmitted. Please try again."
          : "The quote could not be submitted. Please try again.",
      );
    }
  }

  const errorId = error ? "quote-submit-error" : undefined;

  const rfqStatusLabel = quoteRequiresReview
    ? "Requires Review"
    : quoteCurrent
      ? "Quote current"
      : submissionClosed
        ? "Submission closed"
        : "Open for quotes";
  const governanceLabel = quoteRequiresReview
    ? "Reconfirmation required"
    : deadlinePassed
      ? "Hard lock active"
      : "Deadline enforced";

  const pageTitle = quoteRequiresReview
    ? "Review and reconfirm quote"
    : quoteCurrent
      ? "Quote submission current"
      : "Submit quote";

  const deadlineRiskFeedbackClass = getDeadlineRiskFeedbackClass(
    deadlineRiskPresentation.tone,
  );
  const amountHintId =
    errorField === "amount"
      ? errorId
      : "quote-amount-hint quote-amount-preview";
  const hasOutstandingRequiredAcknowledgement = Boolean(
    initialQuote?.hasOutstandingRequiredAcknowledgement,
  );

  return (
    <div className="min-h-full bg-nexus-navy text-white">
      <div className={`${EXECUTIVE_PAGE_CLASS} min-w-0`}>
        <button
          type="button"
          onClick={() => router.back()}
          className={`inline-flex min-h-11 items-center text-sm font-black text-nexus-cyan-bright ${EXECUTIVE_FOCUS_CYAN}`}
        >
          Back
        </button>

        <ExecutivePanel
          variant="executive"
          padding="lg"
          tone="gold"
          className="np-region min-w-0 @container"
          data-rfq-submit-workspace="true"
          data-rfq-quote-revalidation={
            quoteRequiresReview
              ? "requires_review"
              : quoteCurrent
                ? "current"
                : "new"
          }
        >
          <p className="np-type-eyebrow">Respondent submission</p>
          <h1 className="np-type-h1 mt-4 min-w-0 text-pretty">{pageTitle}</h1>
          <p className="np-type-body mt-4 max-w-3xl min-w-0 text-pretty">
            {quoteRequiresReview
              ? `A material RFQ amendment changed the governing basis for your submitted quotation${rfq?.title ? ` for ${rfq.title}` : ""}. Review the current terms, then reconfirm them unchanged or resubmit revised commercial terms before the deadline.`
              : quoteCurrent
                ? `Your organization’s quotation${rfq?.title ? ` for ${rfq.title}` : ""} is current against the latest material RFQ amendment basis.`
                : rfq?.title
                  ? `Quote submission for ${rfq.title}.`
                  : "Submit your quote with a validated contract amount, delivery timeline, and commercial note."}
          </p>

          <section
            className="mt-8 min-w-0 border-t border-white/10 pt-6"
            aria-labelledby="rfq-submit-status-heading"
          >
            <h2 id="rfq-submit-status-heading" className="np-type-h3">
              Current quotation state
            </h2>
            <dl
              className="mt-5 grid min-w-0 grid-cols-1 gap-4 @lg:grid-cols-3"
              data-rfq-submit-status="true"
            >
              <div className="min-w-0">
                <dt className="np-type-meta">RFQ status</dt>
                <dd className="mt-2 min-w-0 text-pretty text-lg font-black text-nexus-white">
                  {rfqStatusLabel}
                </dd>
              </div>
              <div className="min-w-0">
                <dt className="np-type-meta">Deadline</dt>
                <dd className="mt-2 min-w-0 text-pretty text-lg font-black text-nexus-white">
                  {formatRfqDeadlineForDisplay(
                    rfq?.deadline,
                    rfq?.deadline_timezone,
                  )}
                </dd>
              </div>
              <div className="min-w-0">
                <dt className="np-type-meta">Governance</dt>
                <dd className="mt-2 min-w-0 text-pretty text-lg font-black text-nexus-white">
                  {governanceLabel}
                </dd>
              </div>
            </dl>
          </section>

          <div
            className={`mt-5 min-w-0 ${deadlineRiskFeedbackClass}`}
            data-rfq-submit-deadline-risk={deadlineRisk.status}
            role="status"
            aria-live="polite"
          >
            <ExecutiveBadge tone={deadlineRiskPresentation.tone}>
              {deadlineRiskPresentation.label}
            </ExecutiveBadge>
            <p className="np-type-body mt-3 min-w-0 max-w-3xl text-pretty text-nexus-text-primary">
              {deadlineRiskPresentation.detail}
            </p>
          </div>

          {quoteRequiresReview ? (
            <div className={`mt-8 min-w-0 ${EXECUTIVE_FEEDBACK_WARNING}`}>
              <ExecutiveBadge tone="warning">
                Material amendment review required
              </ExecutiveBadge>
              <p className="np-type-body mt-3 min-w-0 text-pretty text-nexus-text-primary">
                The existing quotation remains confidential, but it is not eligible
                for Contract Award until required Addenda are acknowledged and the
                quotation is reconfirmed or resubmitted against the current RFQ basis.
              </p>
              {hasOutstandingRequiredAcknowledgement ? (
                <p className="np-type-meta mt-3 min-w-0 text-pretty text-status-warning">
                  Required RFQ Addenda acknowledgement is still outstanding. Complete
                  that acknowledgement in the RFQ workspace before reconfirming or
                  resubmitting this quotation.
                </p>
              ) : null}
            </div>
          ) : quoteCurrent ? (
            <div className={`mt-8 min-w-0 ${EXECUTIVE_FEEDBACK_SUCCESS}`}>
              <ExecutiveBadge tone="success">Quote current</ExecutiveBadge>
              <p className="np-type-body mt-3 min-w-0 text-pretty text-nexus-text-primary">
                This quotation is current against the latest governed material RFQ
                amendment basis. No reconfirmation or resubmission action is required.
              </p>
            </div>
          ) : submissionClosed ? (
            <div className={`mt-8 min-w-0 ${EXECUTIVE_FEEDBACK_ERROR}`}>
              <ExecutiveBadge tone="risk">Submission closed</ExecutiveBadge>
              <p className="np-type-body mt-3 min-w-0 text-pretty text-nexus-text-primary">
                This RFQ is no longer accepting submissions. Late quote submissions
                are rejected automatically.
              </p>
            </div>
          ) : (
            <div className={`mt-8 min-w-0 ${EXECUTIVE_FEEDBACK_INFO}`}>
              <ExecutiveBadge tone="warning">Confidential submission</ExecutiveBadge>
              <p className="np-type-body mt-3 min-w-0 text-pretty text-nexus-text-primary">
                Your submission is confidential. Competing suppliers cannot view
                your commercial response. Submissions after the RFQ deadline are
                rejected automatically.
              </p>
            </div>
          )}

          <form
            onSubmit={handleSubmit}
            className="mt-8 min-w-0 space-y-8 pb-28"
            noValidate
          >
            <section aria-labelledby="rfq-submit-commercial-heading">
              <h2 id="rfq-submit-commercial-heading" className="np-type-h3">
                Commercial offer
              </h2>

              <div className="mt-5 grid min-w-0 grid-cols-1 gap-4 @lg:grid-cols-[minmax(0,1fr)_minmax(14rem,18rem)]">
                <div className="min-w-0">
                  <div className="flex min-w-0 flex-wrap items-center justify-between gap-3">
                    <label htmlFor="quote-amount" className={EXECUTIVE_FORM_LABEL}>
                      Quote amount
                    </label>
                    <ExecutiveBadge tone="neutral">{currency}</ExecutiveBadge>
                  </div>
                  <div className="mt-3 flex min-w-0 overflow-hidden rounded-2xl border border-white/10 bg-white/[0.045]">
                    <div
                      className="flex shrink-0 items-center border-r border-white/10 px-4 np-type-meta text-nexus-text-secondary sm:px-5"
                      aria-hidden="true"
                    >
                      {currency}
                    </div>
                    <input
                      id="quote-amount"
                      required
                      inputMode="numeric"
                      placeholder="7,250,000"
                      value={formattedAmount}
                      onChange={(event) => setAmount(event.target.value)}
                      disabled={submissionClosed || loading || quoteCurrent}
                      aria-invalid={errorField === "amount"}
                      aria-describedby={amountHintId}
                      className={`min-h-14 min-w-0 w-full bg-transparent px-4 py-4 text-lg font-black text-white outline-none placeholder:text-slate-400 disabled:cursor-not-allowed disabled:opacity-60 sm:px-5 ${EXECUTIVE_FOCUS_GOLD}`}
                    />
                  </div>
                  <p
                    id="quote-amount-hint"
                    className={`${EXECUTIVE_FORM_HELPER} mt-3 min-w-0 text-pretty`}
                  >
                    Enter the full contract value. Commas are added automatically.
                  </p>
                </div>

                <aside
                  id="quote-amount-preview"
                  className="min-w-0 rounded-executive border border-white/10 bg-white/[0.025] p-4"
                  aria-label="Formatted commercial preview"
                >
                  <p className="np-type-meta">Commercial preview</p>
                  <p className="mt-3 min-w-0 text-pretty text-2xl font-black text-nexus-white">
                    {amountPreview}
                  </p>
                  <p className={`${EXECUTIVE_FORM_HELPER} mt-2 min-w-0 text-pretty`}>
                    Currency {currency}. Preview reflects the entered full-contract
                    value only.
                  </p>
                </aside>
              </div>

              <div className="mt-6 min-w-0">
                <label htmlFor="quote-timeline" className={EXECUTIVE_FORM_LABEL}>
                  Delivery timeline
                </label>
                <input
                  id="quote-timeline"
                  required
                  type="text"
                  placeholder="e.g. 16 months or Q3 2027"
                  value={timeline}
                  onChange={(event) => setTimeline(event.target.value)}
                  disabled={submissionClosed || loading || quoteCurrent}
                  aria-invalid={errorField === "timeline"}
                  aria-describedby={
                    errorField === "timeline" ? errorId : undefined
                  }
                  className={`${EXECUTIVE_FORM_INPUT} mt-3 min-h-14 min-w-0`}
                />
              </div>

              {quoteRequiresReview ? (
                <div className="mt-6 min-w-0">
                  <label htmlFor="quote-validity" className={EXECUTIVE_FORM_LABEL}>
                    Quote validity
                  </label>
                  <select
                    id="quote-validity"
                    value={validityDays}
                    onChange={(event) =>
                      setValidityDays(Number(event.target.value))
                    }
                    disabled={submissionClosed || loading || quoteCurrent}
                    className={`${EXECUTIVE_FORM_SELECT} mt-3 min-h-14 min-w-0`}
                  >
                    {VALIDITY_DAY_OPTIONS.map((days) => (
                      <option key={days} value={days}>
                        {days} days
                      </option>
                    ))}
                  </select>
                  <p
                    className={`${EXECUTIVE_FORM_HELPER} mt-3 min-w-0 text-pretty`}
                  >
                    Revised resubmissions may update the quotation validity period.
                  </p>
                </div>
              ) : null}

              <div className="mt-6 min-w-0">
                <label htmlFor="quote-message" className={EXECUTIVE_FORM_LABEL}>
                  Commercial note
                </label>
                <textarea
                  id="quote-message"
                  required
                  placeholder="Summarize scope, assumptions, delivery approach, experience, exclusions, and quote validity."
                  value={message}
                  onChange={(event) => setMessage(event.target.value)}
                  rows={7}
                  disabled={submissionClosed || loading || quoteCurrent}
                  aria-invalid={errorField === "message"}
                  aria-describedby={
                    errorField === "message" ? errorId : undefined
                  }
                  className={`${EXECUTIVE_FORM_TEXTAREA} mt-3 min-h-14 min-w-0`}
                />
              </div>
            </section>

            {error ? (
              <p
                id="quote-submit-error"
                role="alert"
                className={`min-w-0 text-pretty text-sm font-bold ${EXECUTIVE_FEEDBACK_ERROR}`}
              >
                {error}
              </p>
            ) : null}

            <section
              className="min-w-0 border-t border-white/10 pt-6"
              data-rfq-submit-completeness="true"
              aria-labelledby="rfq-submit-completeness-heading"
            >
              <div className="flex min-w-0 flex-col gap-3 @sm:flex-row @sm:items-start @sm:justify-between">
                <div className="min-w-0">
                  <h2
                    id="rfq-submit-completeness-heading"
                    className="np-type-h3"
                  >
                    Submission completeness
                  </h2>
                  <p
                    className="np-type-body mt-2 min-w-0 text-pretty"
                    aria-live="polite"
                    aria-atomic="true"
                  >
                    {submissionCompleteness.completedCount}/
                    {submissionCompleteness.totalCount} required inputs complete.
                  </p>
                </div>
                <ExecutiveBadge
                  tone={
                    submissionCompleteness.status === "complete"
                      ? "success"
                      : "warning"
                  }
                >
                  {submissionCompleteness.status === "complete"
                    ? "Inputs complete"
                    : `${submissionCompleteness.missingSignals.length} required`}
                </ExecutiveBadge>
              </div>

              <p className="np-type-meta mt-3 max-w-3xl min-w-0 text-pretty">
                This check covers quotation inputs only. Access, deadline,
                addenda acknowledgement, and duplicate-submission controls are
                evaluated separately.
              </p>

              <ul className="mt-4 grid min-w-0 grid-cols-1 gap-3 @sm:grid-cols-3">
                {submissionCompleteness.signals.map((signal) => (
                  <li
                    key={signal.key}
                    className="min-w-0 rounded-executive border border-white/10 bg-white/[0.025] p-4"
                  >
                    <div className="flex min-w-0 flex-wrap items-start justify-between gap-3">
                      <span className="min-w-0 text-pretty text-sm font-black text-nexus-white">
                        {signal.label}
                      </span>
                      <ExecutiveBadge
                        tone={signal.complete ? "success" : "warning"}
                      >
                        {signal.complete ? "Complete" : "Required"}
                      </ExecutiveBadge>
                    </div>
                    <p className="np-type-meta mt-3 min-w-0 text-pretty">
                      {signal.complete
                        ? "Captured for this quotation."
                        : signal.context}
                    </p>
                  </li>
                ))}
              </ul>
            </section>

            {readinessGuidance ? (
              <section
                className="min-w-0 border-t border-white/10 pt-6"
                aria-labelledby="rfq-submit-readiness-heading"
                data-rfq-submit-readiness="true"
              >
                <h2 id="rfq-submit-readiness-heading" className="np-type-h3">
                  Preparation readiness
                </h2>
                <p className="np-type-meta mt-2 max-w-3xl min-w-0 text-pretty">
                  Readiness highlights missing preparation items. It does not prove
                  submission authorization, deadline eligibility, or award
                  eligibility.
                </p>
                <div className="mt-4 min-w-0">
                  <ExecutiveGuidanceCard
                    title={readinessGuidance.title}
                    description={readinessGuidance.description}
                  />
                </div>
                {hasOutstandingRequiredAcknowledgement ||
                submissionCompleteness.missingSignals.length > 0 ? (
                  <ul className="mt-4 grid min-w-0 grid-cols-1 gap-3 @sm:grid-cols-2">
                    {hasOutstandingRequiredAcknowledgement ? (
                      <li
                        className={`min-w-0 ${EXECUTIVE_FEEDBACK_WARNING}`}
                      >
                        <p className="np-type-meta text-status-warning">
                          Required Addenda acknowledgement
                        </p>
                        <p className="np-type-body mt-2 min-w-0 text-pretty text-nexus-text-primary">
                          Return to the RFQ workspace and complete required
                          acknowledgements before reconfirming or resubmitting.
                        </p>
                      </li>
                    ) : null}
                    {submissionCompleteness.missingSignals.map((signal) => (
                      <li
                        key={`readiness-${signal.key}`}
                        className={`min-w-0 ${EXECUTIVE_FEEDBACK_WARNING}`}
                      >
                        <p className="np-type-meta text-status-warning">
                          {signal.label}
                        </p>
                        <p className="np-type-body mt-2 min-w-0 text-pretty text-nexus-text-primary">
                          {signal.context}
                        </p>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </section>
            ) : null}

            <section
              className="min-w-0 border-t border-white/10 pt-6"
              data-rfq-submit-summary="true"
              aria-labelledby="rfq-submit-summary-heading"
            >
              <h2 id="rfq-submit-summary-heading" className="np-type-h3">
                Submission summary
              </h2>
              <dl
                className={`mt-4 grid min-w-0 grid-cols-1 gap-4 @sm:grid-cols-2 ${
                  quoteRequiresReview ? "@4xl:grid-cols-4" : "@4xl:grid-cols-3"
                }`}
              >
                <div className="min-w-0">
                  <dt className="np-type-meta">Amount</dt>
                  <dd className="mt-2 min-w-0 text-pretty text-lg font-black text-nexus-white">
                    {amountPreview}
                  </dd>
                </div>
                <div className="min-w-0">
                  <dt className="np-type-meta">Currency</dt>
                  <dd className="mt-2 min-w-0 text-pretty text-lg font-black text-nexus-white">
                    {currency}
                  </dd>
                </div>
                <div className="min-w-0">
                  <dt className="np-type-meta">Timeline</dt>
                  <dd className="mt-2 min-w-0 text-pretty text-lg font-black text-nexus-white">
                    {timeline.trim() || "Pending"}
                  </dd>
                </div>
                {quoteRequiresReview ? (
                  <div className="min-w-0">
                    <dt className="np-type-meta">Quote validity</dt>
                    <dd className="mt-2 min-w-0 text-pretty text-lg font-black text-nexus-white">
                      {validityDays} days
                    </dd>
                  </div>
                ) : null}
              </dl>
            </section>

            <div className="sticky bottom-4 z-10 flex min-w-0 flex-col gap-3 rounded-executive border border-white/10 bg-nexus-navy/95 p-3 shadow-inner-executive backdrop-blur-md @sm:flex-row @sm:flex-wrap">
              {quoteRequiresReview ? (
                <button
                  type="button"
                  onClick={handleReconfirm}
                  disabled={
                    loading ||
                    submissionClosed ||
                    hasOutstandingRequiredAcknowledgement ||
                    hasRevisedCommercialTerms
                  }
                  title={
                    hasRevisedCommercialTerms
                      ? "Restore the submitted commercial terms to reconfirm unchanged terms, or use Resubmit revised quote."
                      : undefined
                  }
                  className={`${EXECUTIVE_CTA_SECONDARY} w-full @sm:w-auto`}
                >
                  {loading ? "Processing..." : "Reconfirm existing quote"}
                </button>
              ) : null}

              <button
                type="submit"
                disabled={loading || submissionClosed || quoteCurrent}
                className={`${EXECUTIVE_CTA_PRIMARY} w-full @sm:w-auto`}
              >
                {quoteCurrent
                  ? "Quote current"
                  : submissionClosed
                    ? "Submission closed"
                    : loading
                      ? quoteRequiresReview
                        ? "Resubmitting revised quote..."
                        : "Submitting quote..."
                      : quoteRequiresReview
                        ? "Resubmit revised quote"
                        : "Submit quote"}
              </button>
              <button
                type="button"
                onClick={() => router.back()}
                className={`${EXECUTIVE_CTA_SECONDARY} w-full @sm:w-auto`}
              >
                Cancel
              </button>
            </div>
          </form>
        </ExecutivePanel>
      </div>
    </div>
  );
}
