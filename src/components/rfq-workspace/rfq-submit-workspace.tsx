"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { ExecutiveBadge } from "@/components/executive/executive-badge";
import { ExecutivePanel } from "@/components/executive/executive-panel";
import {
  EXECUTIVE_CTA_PRIMARY,
  EXECUTIVE_CTA_SECONDARY,
  EXECUTIVE_FOCUS_CYAN,
  EXECUTIVE_PAGE_CLASS,
} from "@/lib/design-system/executive-contract";
import { createClient } from "@/lib/supabase/client";

type RfqStatus = {
  title: string | null;
  deadline: string | null;
  status: string | null;
  awarded_quote_id: string | null;
  awarded_at: string | null;
};

type FieldKey = "amount" | "timeline" | "message" | "form";

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
  return value.replace(/[^\d]/g, "");
}

function formatAmount(value: string) {
  const normalized = normalizeAmount(value);
  if (!normalized) return "";
  return Number(normalized).toLocaleString("en-US");
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

function formatDeadline(deadline: string | null | undefined) {
  if (!deadline) return "Not specified";

  const deadlineDate = new Date(deadline);

  if (Number.isNaN(deadlineDate.getTime())) {
    return deadline;
  }

  return deadlineDate.toLocaleString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
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

const fieldClassName =
  "mt-3 min-h-14 min-w-0 w-full rounded-executive border border-white/10 bg-black/20 px-5 py-4 text-sm font-semibold text-white outline-none transition placeholder:text-nexus-text-muted focus-visible:ring-2 focus-visible:ring-[#2CC4E8]/40 focus-visible:ring-offset-2 focus-visible:ring-offset-[#07111F] disabled:cursor-not-allowed disabled:opacity-60";

type RfqSubmitWorkspaceProps = {
  slug: string;
};

export function RfqSubmitWorkspace({ slug }: RfqSubmitWorkspaceProps) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const currency = useMemo(() => detectCurrencyFromSlug(slug), [slug]);

  const [rfq, setRfq] = useState<RfqStatus | null>(null);
  const [rfqLoading, setRfqLoading] = useState(true);

  const [amount, setAmount] = useState("");
  const [timeline, setTimeline] = useState("");
  const [message, setMessage] = useState("");

  const [loading, setLoading] = useState(false);
  const submitLock = useRef(false);
  const [error, setError] = useState("");
  const [errorField, setErrorField] = useState<FieldKey | null>(null);

  const amountNumber = getAmountNumber(amount);
  const formattedAmount = formatAmount(amount);

  const submissionClosed = isSubmissionClosed(rfq);
  const deadlinePassed = hasDeadlinePassed(rfq?.deadline);

  const amountPreview =
    amountNumber > 0
      ? new Intl.NumberFormat("en-US", {
          style: "currency",
          currency,
          maximumFractionDigits: 0,
        }).format(amountNumber)
      : `${currency} 0`;

  useEffect(() => {
    async function loadRfqStatus() {
      setRfqLoading(true);

      const { data } = await supabase
        .from("rfqs")
        .select("title, deadline, status, awarded_quote_id, awarded_at")
        .eq("slug", slug)
        .maybeSingle();

      setRfq((data || null) as RfqStatus | null);
      setRfqLoading(false);
    }

    if (slug) {
      loadRfqStatus();
    }
  }, [slug, supabase]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (submitLock.current || loading || rfqLoading) {
      return;
    }

    if (submissionClosed) {
      setErrorField("form");
      setError(
        deadlinePassed
          ? "Submission closed. The RFQ deadline has passed and late bids are not accepted."
          : "Submission closed. This RFQ is no longer accepting quotes.",
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
      setError("Please include a proposal note.");
      return;
    }

    try {
      const response = await fetch("/api/quotes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          slug,
          amount: amountNumber,
          currency,
          timeline: timeline.trim(),
          message: message.trim(),
        }),
      });

      let data: { error?: string } | null = null;

      try {
        const text = await response.text();
        data = text ? (JSON.parse(text) as { error?: string }) : null;
      } catch {
        submitLock.current = false;
        setLoading(false);
        setErrorField("form");
        setError("The quote could not be submitted. Please try again.");
        return;
      }

      if (!response.ok) {
        submitLock.current = false;
        setLoading(false);
        setErrorField("form");
        setError(toWorkspaceError(data?.error || "Failed to submit quote."));
        return;
      }

      router.push(`/rfq/${slug}`);
      router.refresh();
    } catch {
      submitLock.current = false;
      setLoading(false);
      setErrorField("form");
      setError("The quote could not be submitted. Please try again.");
    }
  }

  const errorId = error ? "quote-submit-error" : undefined;

  const rfqStatusLabel = rfqLoading
    ? "Checking..."
    : submissionClosed
      ? "Submission closed"
      : "Open for quotes";
  const governanceLabel = deadlinePassed
    ? "Hard lock active"
    : "Deadline enforced";

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
        >
          <p className="np-type-eyebrow">Respondent submission</p>
          <h1 className="np-type-h1 mt-4 min-w-0 text-pretty">Submit quote</h1>
          <p className="np-type-body mt-4 max-w-3xl min-w-0 text-pretty">
            {rfq?.title
              ? `Quote and proposal submission for ${rfq.title}.`
              : "Submit your quote with a validated contract amount, delivery timeline, and proposal note."}
          </p>

          <dl
            className="mt-8 grid min-w-0 grid-cols-1 gap-4 border-t border-white/10 pt-6 @lg:grid-cols-3"
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
                {formatDeadline(rfq?.deadline)}
              </dd>
            </div>
            <div className="min-w-0">
              <dt className="np-type-meta">Governance</dt>
              <dd className="mt-2 min-w-0 text-pretty text-lg font-black text-nexus-white">
                {governanceLabel}
              </dd>
            </div>
          </dl>

          {submissionClosed ? (
            <div className="mt-8 min-w-0 rounded-executive border border-red-400/20 bg-red-500/10 p-5">
              <ExecutiveBadge tone="risk">Submission closed</ExecutiveBadge>
              <p className="np-type-body mt-3 min-w-0 text-pretty">
                This RFQ is no longer accepting submissions. Late bids
                are rejected automatically.
              </p>
            </div>
          ) : (
            <div className="mt-8 min-w-0 rounded-executive border border-nexus-gold/20 bg-nexus-gold/[0.08] p-5">
              <ExecutiveBadge tone="warning">Confidential submission</ExecutiveBadge>
              <p className="np-type-body mt-3 min-w-0 text-pretty">
                Your submission is confidential. Competing suppliers cannot view
                your commercial response. Submissions after the RFQ deadline are
                rejected automatically.
              </p>
            </div>
          )}

          <form
            onSubmit={handleSubmit}
            className="mt-8 min-w-0 space-y-8"
            noValidate
          >
            <section aria-labelledby="rfq-submit-commercial-heading">
              <h2 id="rfq-submit-commercial-heading" className="np-type-h3">
                Commercial offer
              </h2>

              <div className="mt-5 min-w-0">
                <div className="flex min-w-0 flex-wrap items-center justify-between gap-3">
                  <label htmlFor="quote-amount" className="np-type-meta">
                    Quote amount
                  </label>
                  <ExecutiveBadge tone="neutral">{currency}</ExecutiveBadge>
                </div>
                <div className="mt-3 flex min-w-0 overflow-hidden rounded-executive border border-white/10 bg-black/20">
                  <div className="flex shrink-0 items-center border-r border-white/10 px-4 np-type-meta sm:px-5">
                    {currency}
                  </div>
                  <input
                    id="quote-amount"
                    required
                    inputMode="numeric"
                    placeholder="7,250,000"
                    value={formattedAmount}
                    onChange={(event) => setAmount(event.target.value)}
                    disabled={submissionClosed || loading}
                    aria-invalid={errorField === "amount"}
                    aria-describedby={
                      errorField === "amount" ? errorId : "quote-amount-hint"
                    }
                    className="min-h-14 min-w-0 w-full bg-transparent px-4 py-4 text-lg font-black text-white outline-none placeholder:text-nexus-text-muted focus-visible:ring-2 focus-visible:ring-[#2CC4E8]/40 disabled:cursor-not-allowed sm:px-5"
                  />
                </div>
                <p
                  id="quote-amount-hint"
                  className="np-type-meta mt-3 min-w-0 text-pretty"
                >
                  Enter the full contract value. Commas are added automatically.
                  Preview: {amountPreview}
                </p>
              </div>

              <div className="mt-6 min-w-0">
                <label htmlFor="quote-timeline" className="np-type-meta">
                  Delivery timeline
                </label>
                <input
                  id="quote-timeline"
                  required
                  type="text"
                  placeholder="e.g. 16 months or Q3 2027"
                  value={timeline}
                  onChange={(event) => setTimeline(event.target.value)}
                  disabled={submissionClosed || loading}
                  aria-invalid={errorField === "timeline"}
                  aria-describedby={
                    errorField === "timeline" ? errorId : undefined
                  }
                  className={fieldClassName}
                />
              </div>

              <div className="mt-6 min-w-0">
                <label htmlFor="quote-message" className="np-type-meta">
                  Proposal note
                </label>
                <textarea
                  id="quote-message"
                  required
                  placeholder="Summarize scope, assumptions, delivery approach, experience, exclusions, and quote validity."
                  value={message}
                  onChange={(event) => setMessage(event.target.value)}
                  rows={7}
                  disabled={submissionClosed || loading}
                  aria-invalid={errorField === "message"}
                  aria-describedby={
                    errorField === "message" ? errorId : undefined
                  }
                  className={fieldClassName}
                />
              </div>
            </section>

            {error ? (
              <p
                id="quote-submit-error"
                role="alert"
                className="min-w-0 rounded-executive border border-red-400/20 bg-red-500/10 px-5 py-4 text-pretty text-sm font-bold text-red-300"
              >
                {error}
              </p>
            ) : null}

            <div
              className="min-w-0 border-t border-white/10 pt-6"
              data-rfq-submit-summary="true"
            >
              <h3 className="np-type-meta">Submission summary</h3>
              <dl className="mt-4 grid min-w-0 grid-cols-1 gap-4 @sm:grid-cols-3">
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
              </dl>
            </div>

            <div className="sticky bottom-4 z-10 flex min-w-0 flex-col gap-3 rounded-executive bg-nexus-navy/90 p-3 @sm:flex-row">
              <button
                type="submit"
                disabled={loading || submissionClosed || rfqLoading}
                className={`${EXECUTIVE_CTA_PRIMARY} w-full @sm:w-auto`}
              >
                {submissionClosed
                  ? "Submission closed"
                  : loading
                    ? "Submitting quote..."
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
