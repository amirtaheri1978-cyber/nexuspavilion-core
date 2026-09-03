"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { formatRfqDeadlineForDisplay } from "@/lib/datetime/format-rfq-deadline-display";
import {
  getRfiDeadlineAwareness,
  type RfiDeadlineAwareness,
} from "@/lib/datetime/rfi-deadline-awareness";

type PrivateRfi = {
  id: string;
  question: string;
  status: "open" | "answered" | string;
  response_text: string | null;
  responded_at: string | null;
  created_at: string | null;
};

type RFQRfiWorkspaceProps = {
  rfqId: string;
  isOwner: boolean;
  rfiDeadline?: string | null;
  rfiDeadlineTimezone?: string | null;
};

function formatTimestamp(value: string | null) {
  if (!value) return "N/A";

  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

const RFI_DEADLINE_AWARENESS_REFRESH_INTERVAL_MS = 60_000;

function getCurrentRfiDeadlineAwareness(
  deadline: string | null | undefined,
  now: number,
) {
  return getRfiDeadlineAwareness(deadline, now);
}

function getDeadlineAwarenessPresentation(
  awareness: RfiDeadlineAwareness,
) {
  switch (awareness.status) {
    case "approaching":
      return {
        label: "RFI window closes within 72 hours",
        className:
          "border-amber-300/25 bg-amber-400/10 text-amber-100",
      };
    case "expired":
      return {
        label: "RFI window closed",
        className: "border-red-300/20 bg-red-400/10 text-red-200",
      };
    case "open":
      return {
        label: "RFI window open",
        className:
          "border-nexus-cyan/25 bg-nexus-cyan/10 text-nexus-cyan-bright",
      };
    default:
      return {
        label: "RFI deadline unavailable",
        className: "border-white/10 bg-white/[0.055] text-nexus-muted",
      };
  }
}

export function RFQRfiWorkspace({
  rfqId,
  isOwner,
  rfiDeadline = null,
  rfiDeadlineTimezone = null,
}: RFQRfiWorkspaceProps) {
  const [rfis, setRfis] = useState<PrivateRfi[]>([]);
  const [question, setQuestion] = useState("");
  const [responseDrafts, setResponseDrafts] = useState<Record<string, string>>(
    {},
  );
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [answeringId, setAnsweringId] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [deadlineNow, setDeadlineNow] = useState(() => Date.now());

  const deadlineAwareness = useMemo(
    () => getCurrentRfiDeadlineAwareness(rfiDeadline, deadlineNow),
    [rfiDeadline, deadlineNow],
  );
  const deadlineClosed = deadlineAwareness.isClosed;
  const deadlinePresentation =
    getDeadlineAwarenessPresentation(deadlineAwareness);

  const deadlineLabel = useMemo(
    () => formatRfqDeadlineForDisplay(rfiDeadline, rfiDeadlineTimezone),
    [rfiDeadline, rfiDeadlineTimezone],
  );

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setDeadlineNow(Date.now());
    }, RFI_DEADLINE_AWARENESS_REFRESH_INTERVAL_MS);

    return () => {
      window.clearInterval(intervalId);
    };
  }, []);

  const loadRfis = useCallback(async (options?: { showLoading?: boolean }) => {
    if (options?.showLoading) {
      setLoading(true);
    }
    setError("");

    try {
      const response = await fetch(`/api/rfq-rfis?rfqId=${rfqId}`);
      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Failed to load private RFIs.");
        return;
      }

      setRfis(data.rfis || []);
    } catch (loadError) {
      console.error(loadError);
      setError("Failed to load private RFIs.");
    } finally {
      setLoading(false);
    }
  }, [rfqId]);

  useEffect(() => {
    let cancelled = false;

    async function loadInitialRfis() {
      try {
        const response = await fetch(`/api/rfq-rfis?rfqId=${rfqId}`);
        const data = await response.json();

        if (cancelled) return;

        if (!response.ok) {
          setError(data.error || "Failed to load private RFIs.");
          setLoading(false);
          return;
        }

        setRfis(data.rfis || []);
        setLoading(false);
      } catch (loadError) {
        console.error(loadError);
        if (!cancelled) {
          setError("Failed to load private RFIs.");
          setLoading(false);
        }
      }
    }

    void loadInitialRfis();

    return () => {
      cancelled = true;
    };
  }, [rfqId]);

  async function handleSubmitQuestion(
    event: React.FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (isOwner || submitting || deadlineClosed) return;

    if (!question.trim()) {
      setError("Enter a private RFI question before submitting.");
      return;
    }

    setSubmitting(true);
    setMessage("");
    setError("");

    try {
      const response = await fetch("/api/rfq-rfis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rfqId,
          question: question.trim(),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Failed to submit private RFI.");
        return;
      }

      setRfis((current) => [data.rfi, ...current]);
      setQuestion("");
      setMessage("Private RFI submitted.");
    } catch (submitError) {
      console.error(submitError);
      setError("Request failed. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleAnswerRfi(rfiId: string) {
    if (!isOwner || answeringId) return;

    const responseText = (responseDrafts[rfiId] || "").trim();

    if (!responseText) {
      setError("Enter a response before answering this private RFI.");
      return;
    }

    setAnsweringId(rfiId);
    setMessage("");
    setError("");

    try {
      const response = await fetch("/api/rfq-rfis", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rfiId,
          responseText,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Failed to answer private RFI.");
        return;
      }

      setRfis((current) =>
        current.map((item) => (item.id === rfiId ? data.rfi : item)),
      );
      setResponseDrafts((current) => {
        const next = { ...current };
        delete next[rfiId];
        return next;
      });
      setMessage("Private RFI answered.");
    } catch (answerError) {
      console.error(answerError);
      setError("Request failed. Please try again.");
    } finally {
      setAnsweringId("");
    }
  }

  return (
    <section
      className="@container min-w-0"
      aria-labelledby="rfq-rfi-workspace-title"
      data-rfq-rfi-workspace="true"
    >
      <div className="flex min-w-0 flex-col gap-3 @sm:flex-row @sm:items-end @sm:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-black uppercase tracking-[0.22em] text-nexus-cyan-bright">
            Private RFI
          </p>
          <h4
            id="rfq-rfi-workspace-title"
            className="mt-2 min-w-0 text-pretty text-xl font-black text-nexus-white sm:text-2xl"
          >
            Private respondent inquiries
          </h4>
          <p className="mt-3 max-w-3xl min-w-0 text-pretty text-sm font-semibold leading-7 text-nexus-muted">
            Private RFIs are visible only to the issuing procurement team and
            the originating respondent company. Material clarifications
            affecting all respondents must be issued through the formal
            Addendum workflow.
          </p>
        </div>

        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <p className="w-fit rounded-full border border-white/10 bg-white/[0.055] px-4 py-2 text-xs font-black text-nexus-muted">
            Deadline: {deadlineLabel}
          </p>
          <p
            className={`w-fit rounded-full border px-4 py-2 text-xs font-black ${deadlinePresentation.className}`}
            data-rfq-rfi-deadline-status={deadlineAwareness.status}
            role="status"
            aria-live="polite"
          >
            {deadlinePresentation.label}
          </p>
          <button
            type="button"
            onClick={() => void loadRfis({ showLoading: true })}
            disabled={loading}
            className="inline-flex min-h-11 items-center rounded-full border border-white/10 bg-white/[0.055] px-5 py-3 text-sm font-black text-nexus-white transition hover:bg-white/[0.08] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nexus-gold/70 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? "Refreshing..." : "Refresh"}
          </button>
        </div>
      </div>

      {message ? (
        <div
          className="mt-6 min-w-0 rounded-executive border border-emerald-300/20 bg-emerald-400/10 px-4 py-3 text-pretty text-sm font-bold text-emerald-300"
          role="status"
          aria-live="polite"
        >
          {message}
        </div>
      ) : null}

      {error ? (
        <div
          className="mt-6 min-w-0 rounded-executive border border-red-300/20 bg-red-400/10 px-4 py-3 text-pretty text-sm font-bold text-red-200"
          role="alert"
          aria-live="assertive"
        >
          {error}
        </div>
      ) : null}

      {!isOwner ? (
        <form
          onSubmit={handleSubmitQuestion}
          className="mt-7 min-w-0 border-t border-white/10 pt-7"
          data-rfq-rfi-submit="true"
        >
          <p className="text-xs font-black uppercase tracking-[0.18em] text-nexus-muted">
            Submit private RFI
          </p>
          <p className="mt-2 min-w-0 text-pretty text-sm font-semibold leading-6 text-nexus-muted">
            Your question remains confidential to your company and the issuing
            procurement team. It is not shared with competing respondents.
          </p>

          {deadlineClosed ? (
            <p className="mt-4 rounded-executive border border-amber-300/20 bg-amber-400/10 px-4 py-3 text-sm font-bold text-amber-100">
              {deadlineAwareness.status === "expired"
                ? "The RFI deadline has passed. New private inquiries cannot be submitted."
                : "The RFI deadline cannot be resolved. New private inquiries cannot be submitted."}
            </p>
          ) : (
            <>
              <label className="mt-5 grid min-w-0 gap-2 text-xs font-black uppercase tracking-[0.18em] text-nexus-muted">
                Question *
                <textarea
                  rows={4}
                  value={question}
                  onChange={(event) => setQuestion(event.target.value)}
                  disabled={submitting}
                  placeholder="Ask a private clarification that applies only to your company response."
                  className="min-w-0 w-full resize-none rounded-executive border border-white/10 bg-black/25 px-4 py-4 text-sm font-bold normal-case tracking-normal text-nexus-white outline-none transition placeholder:text-nexus-muted/70 focus:border-nexus-cyan/40 focus-visible:ring-2 focus-visible:ring-nexus-gold/40 disabled:cursor-not-allowed disabled:opacity-60"
                />
              </label>

              <button
                type="submit"
                disabled={submitting}
                className="mt-5 inline-flex min-h-14 w-full items-center justify-center rounded-full bg-nexus-gold px-7 py-4 text-sm font-black text-nexus-navy transition hover:bg-[#F5D77B] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nexus-gold/70 focus-visible:ring-offset-2 focus-visible:ring-offset-nexus-navy disabled:cursor-not-allowed disabled:opacity-50 @md:w-auto"
              >
                {submitting ? "Submitting..." : "Submit Private RFI"}
              </button>
            </>
          )}
        </form>
      ) : null}

      <div className="mt-7 min-w-0 border-t border-white/10 pt-7" data-rfq-rfi-history="true">
        {loading ? (
          <p className="text-sm font-semibold text-nexus-muted" role="status">
            Loading private RFIs...
          </p>
        ) : rfis.length === 0 ? (
          <div
            className="min-w-0 rounded-executive border border-dashed border-white/10 bg-white/[0.035] p-5"
            role="status"
          >
            <p className="text-pretty text-lg font-black text-nexus-white">
              No private RFIs yet.
            </p>
            <p className="mt-3 min-w-0 text-pretty text-sm font-semibold leading-6 text-nexus-muted">
              {isOwner
                ? "Private respondent inquiries will appear here when submitted."
                : "Submitted private inquiries and issuer responses will appear here."}
            </p>
          </div>
        ) : (
          <div className="grid min-w-0 gap-4">
            {rfis.map((rfi) => (
              <article
                key={rfi.id}
                className="min-w-0 rounded-executive border border-white/10 bg-white/[0.045] p-5"
              >
                <div className="flex min-w-0 flex-wrap items-center gap-2">
                  <span className="rounded-full border border-white/10 bg-white/[0.055] px-3 py-1 text-xs font-black uppercase tracking-[0.14em] text-nexus-muted">
                    {formatTimestamp(rfi.created_at)}
                  </span>
                  <span
                    className={`rounded-full border px-3 py-1 text-xs font-black uppercase tracking-[0.14em] ${
                      rfi.status === "answered"
                        ? "border-emerald-300/25 bg-emerald-400/10 text-emerald-300"
                        : "border-nexus-gold/25 bg-nexus-gold/10 text-nexus-gold-bright"
                    }`}
                  >
                    {rfi.status === "answered" ? "Answered" : "Open"}
                  </span>
                  {isOwner ? (
                    <span className="rounded-full border border-nexus-cyan/25 bg-nexus-cyan/10 px-3 py-1 text-xs font-black uppercase tracking-[0.14em] text-nexus-cyan-bright">
                      Private respondent inquiry
                    </span>
                  ) : null}
                </div>

                <p className="mt-4 min-w-0 whitespace-pre-wrap text-pretty text-sm font-semibold leading-7 text-nexus-white">
                  {rfi.question}
                </p>

                {rfi.status === "answered" ? (
                  <div className="mt-5 min-w-0 border-t border-white/10 pt-4">
                    <p className="text-xs font-black uppercase tracking-[0.18em] text-nexus-muted">
                      Issuer response · {formatTimestamp(rfi.responded_at)}
                    </p>
                    <p className="mt-2 min-w-0 whitespace-pre-wrap text-pretty text-sm font-semibold leading-7 text-nexus-white">
                      {rfi.response_text}
                    </p>
                  </div>
                ) : null}

                {isOwner && rfi.status === "open" ? (
                  <div className="mt-5 min-w-0 border-t border-white/10 pt-4">
                    <label className="grid min-w-0 gap-2 text-xs font-black uppercase tracking-[0.18em] text-nexus-muted">
                      Response
                      <textarea
                        rows={3}
                        value={responseDrafts[rfi.id] || ""}
                        onChange={(event) =>
                          setResponseDrafts((current) => ({
                            ...current,
                            [rfi.id]: event.target.value,
                          }))
                        }
                        disabled={answeringId === rfi.id}
                        placeholder="Provide a private response to this respondent company."
                        className="min-w-0 w-full resize-none rounded-executive border border-white/10 bg-black/25 px-4 py-4 text-sm font-bold normal-case tracking-normal text-nexus-white outline-none transition placeholder:text-nexus-muted/70 focus:border-nexus-cyan/40 focus-visible:ring-2 focus-visible:ring-nexus-gold/40 disabled:cursor-not-allowed disabled:opacity-60"
                      />
                    </label>
                    <button
                      type="button"
                      onClick={() => void handleAnswerRfi(rfi.id)}
                      disabled={answeringId === rfi.id}
                      className="mt-4 inline-flex min-h-11 items-center justify-center rounded-full bg-nexus-gold px-5 py-3 text-sm font-black text-nexus-navy transition hover:bg-[#F5D77B] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nexus-gold/70 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {answeringId === rfi.id
                        ? "Answering..."
                        : "Answer Private RFI"}
                    </button>
                  </div>
                ) : null}
              </article>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
