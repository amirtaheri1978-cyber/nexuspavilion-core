"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { ExecutiveBadge } from "@/components/executive/executive-badge";
import { ExecutiveCompletionMoment } from "@/components/executive/executive-completion-moment";
import { ExecutiveGuidanceCard } from "@/components/executive/executive-guidance-card";
import { formatRfqDeadlineForDisplay } from "@/lib/datetime/format-rfq-deadline-display";
import {
  getRfiDeadlineAwareness,
  type RfiDeadlineAwareness,
} from "@/lib/datetime/rfi-deadline-awareness";
import {
  EXECUTIVE_BUTTON_PRIMARY,
  EXECUTIVE_BUTTON_TERTIARY,
  EXECUTIVE_EMPTY_BODY,
  EXECUTIVE_EMPTY_COMPACT,
  EXECUTIVE_EMPTY_TITLE,
  EXECUTIVE_FEEDBACK_ERROR,
  EXECUTIVE_FEEDBACK_INFO,
  EXECUTIVE_FEEDBACK_SUCCESS,
  EXECUTIVE_FEEDBACK_WARNING,
  EXECUTIVE_FORM_HELPER,
  EXECUTIVE_FORM_LABEL,
  EXECUTIVE_FORM_TEXTAREA,
} from "@/lib/design-system/executive-contract";
import { resolveRfiContextualGuidance } from "@/lib/guidance/rfi-contextual-guidance";

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
  canParticipate?: boolean;
  rfiDeadline?: string | null;
  rfiDeadlineTimezone?: string | null;
};

function isSubmittedRfi(value: unknown): value is PrivateRfi {
  if (!value || typeof value !== "object") return false;
  return typeof (value as { id?: unknown }).id === "string";
}

function displayedRfiStatus(status: string) {
  return status === "answered" ? "Answered" : "Open";
}

function submissionStateSummary(rfi: PrivateRfi) {
  const parts: string[] = [];

  if (rfi.created_at) {
    parts.push(`Submitted ${formatTimestamp(rfi.created_at)}.`);
  }

  if (rfi.status) {
    parts.push(`Status: ${displayedRfiStatus(rfi.status)}.`);
  }

  return parts.join(" ");
}

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

function getDeadlineAwarenessPresentation(awareness: RfiDeadlineAwareness): {
  label: string;
  feedbackClassName: string;
} {
  switch (awareness.status) {
    case "approaching":
      return {
        label: "RFI window closes within 72 hours",
        feedbackClassName: EXECUTIVE_FEEDBACK_WARNING,
      };
    case "expired":
      return {
        label: "RFI window closed",
        feedbackClassName: EXECUTIVE_FEEDBACK_ERROR,
      };
    case "open":
      return {
        label: "RFI window open",
        feedbackClassName: EXECUTIVE_FEEDBACK_INFO,
      };
    default:
      return {
        label: "RFI deadline unavailable",
        feedbackClassName: EXECUTIVE_FEEDBACK_INFO,
      };
  }
}

export function RFQRfiWorkspace({
  rfqId,
  isOwner,
  canParticipate = true,
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
  const [submittedRfi, setSubmittedRfi] = useState<PrivateRfi | null>(null);
  const [error, setError] = useState("");
  const [validationTarget, setValidationTarget] = useState<
    "question" | `response:${string}` | null
  >(null);
  const errorId = "rfq-rfi-error";
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

  const openRfiCount = useMemo(
    () => rfis.filter((rfi) => rfi.status === "open").length,
    [rfis],
  );

  const rfiGuidance = useMemo(
    () =>
      resolveRfiContextualGuidance({
        isOwner,
        deadlineStatus: deadlineAwareness.status,
        openRfiCount,
      }),
    [deadlineAwareness.status, isOwner, openRfiCount],
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

    if (isOwner || submitting || deadlineClosed || !canParticipate) return;

    if (!question.trim()) {
      setValidationTarget("question");
      setError("Enter a private RFI question before submitting.");
      return;
    }

    setSubmitting(true);
    setMessage("");
    setSubmittedRfi(null);
    setError("");
    setValidationTarget(null);

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
      if (isSubmittedRfi(data.rfi)) {
        setSubmittedRfi(data.rfi);
        setMessage("");
      } else {
        setMessage("Private RFI submitted.");
      }
    } catch (submitError) {
      console.error(submitError);
      setError("Request failed. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleAnswerRfi(rfiId: string) {
    if (!isOwner || answeringId || !canParticipate) return;

    const responseText = (responseDrafts[rfiId] || "").trim();

    if (!responseText) {
      setValidationTarget(`response:${rfiId}`);
      setError("Enter a response before answering this private RFI.");
      return;
    }

    setAnsweringId(rfiId);
    setMessage("");
    setSubmittedRfi(null);
    setError("");
    setValidationTarget(null);

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
      <div className="flex min-w-0 flex-col gap-4 @sm:flex-row @sm:items-end @sm:justify-between">
        <div className="min-w-0">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <p className="np-type-eyebrow text-nexus-cyan-bright">Private RFI</p>
            <ExecutiveBadge tone="blue">Confidential</ExecutiveBadge>
          </div>
          <h4
            id="rfq-rfi-workspace-title"
            className="np-type-h2 mt-2 min-w-0 text-pretty"
          >
            Private respondent inquiries
          </h4>
          <p className="np-type-body mt-3 max-w-3xl min-w-0 text-pretty text-nexus-text-secondary">
            Private RFIs are visible only to the issuing procurement team and
            the originating respondent company. Material clarifications
            affecting all respondents must be issued through the formal
            Addendum workflow.
          </p>
        </div>

        <div className="flex min-w-0 flex-col items-stretch gap-2 @sm:items-end">
          <div className="flex min-w-0 flex-wrap items-center gap-2 @sm:justify-end">
            <ExecutiveBadge tone="neutral">
              Deadline: {deadlineLabel}
            </ExecutiveBadge>
            <span
              className={`inline-flex max-w-full min-w-0 ${deadlinePresentation.feedbackClassName}`}
              data-rfq-rfi-deadline-status={deadlineAwareness.status}
              role="status"
              aria-live="polite"
            >
              <span className="min-w-0 text-pretty text-xs font-black">
                {deadlinePresentation.label}
              </span>
            </span>
          </div>
          <button
            type="button"
            onClick={() => void loadRfis({ showLoading: true })}
            disabled={loading}
            className={`${EXECUTIVE_BUTTON_TERTIARY} min-h-11 px-5 py-3`}
          >
            {loading ? "Refreshing..." : "Refresh"}
          </button>
        </div>
      </div>

      {rfiGuidance ? (
        <div className="mt-6 min-w-0" data-rfq-rfi-guidance="true">
          <ExecutiveGuidanceCard
            title={rfiGuidance.title}
            description={rfiGuidance.description}
          />
        </div>
      ) : null}

      {submittedRfi ? (
        <div className="mt-6 min-w-0">
          <ExecutiveCompletionMoment
            state="confirmed"
            title="Private RFI submitted."
            summary={submissionStateSummary(submittedRfi)}
          />
        </div>
      ) : null}

      {message ? (
        <div
          className={`mt-6 min-w-0 text-pretty text-sm font-bold ${EXECUTIVE_FEEDBACK_SUCCESS}`}
          role="status"
          aria-live="polite"
        >
          {message}
        </div>
      ) : null}

      {error ? (
        <div
          id={errorId}
          className={`mt-6 min-w-0 text-pretty text-sm font-bold ${EXECUTIVE_FEEDBACK_ERROR}`}
          role="alert"
          aria-live="assertive"
        >
          {error}
        </div>
      ) : null}

      {!isOwner && canParticipate ? (
        <form
          onSubmit={handleSubmitQuestion}
          className="mt-7 min-w-0 border-t border-white/10 pt-7"
          data-rfq-rfi-submit="true"
        >
          <p className="np-type-eyebrow text-nexus-text-muted">
            Submit private RFI
          </p>
          <p className={`${EXECUTIVE_FORM_HELPER} mt-2 min-w-0 text-pretty`}>
            Your question remains confidential to your company and the issuing
            procurement team. It is not shared with competing respondents.
          </p>

          {deadlineClosed ? (
            <p
              className={`mt-4 text-sm font-bold ${EXECUTIVE_FEEDBACK_WARNING}`}
              role="status"
            >
              {deadlineAwareness.status === "expired"
                ? "The RFI deadline has passed. New private inquiries cannot be submitted."
                : "The RFI deadline cannot be resolved. New private inquiries cannot be submitted."}
            </p>
          ) : (
            <>
              <label className={`mt-5 grid min-w-0 gap-2 ${EXECUTIVE_FORM_LABEL}`}>
                Question *
                <textarea
                  rows={4}
                  value={question}
                  onChange={(event) => {
                    setQuestion(event.target.value);
                    if (validationTarget === "question") {
                      setValidationTarget(null);
                    }
                  }}
                  disabled={submitting}
                  aria-invalid={validationTarget === "question"}
                  aria-describedby={
                    validationTarget === "question" ? errorId : undefined
                  }
                  placeholder="Ask a private clarification that applies only to your company response."
                  className={`${EXECUTIVE_FORM_TEXTAREA} min-w-0 resize-none normal-case tracking-normal`}
                />
              </label>

              <button
                type="submit"
                disabled={submitting}
                className={`${EXECUTIVE_BUTTON_PRIMARY} mt-5 w-full @md:w-auto`}
              >
                {submitting ? "Submitting..." : "Submit Private RFI"}
              </button>
            </>
          )}
        </form>
      ) : null}

      <div
        className="mt-7 min-w-0 border-t border-white/10 pt-7"
        data-rfq-rfi-history="true"
      >
        <p className="np-type-eyebrow text-nexus-text-muted">RFI history</p>
        {loading ? (
          <p className="np-type-body mt-4 text-nexus-text-secondary" role="status">
            Loading private RFIs...
          </p>
        ) : rfis.length === 0 ? (
          <div className={`mt-4 min-w-0 ${EXECUTIVE_EMPTY_COMPACT}`} role="status">
            <p className={`${EXECUTIVE_EMPTY_TITLE} !mt-0`}>
              No private RFIs yet.
            </p>
            <p className={`${EXECUTIVE_EMPTY_BODY} !mx-0 max-w-none text-left`}>
              {isOwner
                ? "Private respondent inquiries will appear here when submitted."
                : "Submitted private inquiries and issuer responses will appear here."}
            </p>
          </div>
        ) : (
          <div className="mt-4 grid min-w-0 gap-4">
            {rfis.map((rfi) => (
              <article
                key={rfi.id}
                className="min-w-0 rounded-executive border border-white/10 bg-white/[0.045] p-5"
              >
                <div className="flex min-w-0 flex-wrap items-center gap-2">
                  <ExecutiveBadge tone="neutral">
                    {formatTimestamp(rfi.created_at)}
                  </ExecutiveBadge>
                  <ExecutiveBadge
                    tone={rfi.status === "answered" ? "success" : "gold"}
                  >
                    {rfi.status === "answered" ? "Answered" : "Open"}
                  </ExecutiveBadge>
                  {isOwner ? (
                    <ExecutiveBadge tone="blue">
                      Private respondent inquiry
                    </ExecutiveBadge>
                  ) : null}
                </div>

                <p className="np-type-body mt-4 min-w-0 whitespace-pre-wrap text-pretty text-nexus-text-primary">
                  {rfi.question}
                </p>

                {rfi.status === "answered" ? (
                  <div className="mt-5 min-w-0 border-t border-white/10 pt-4">
                    <p className={EXECUTIVE_FORM_LABEL}>
                      Issuer response · {formatTimestamp(rfi.responded_at)}
                    </p>
                    <p className="np-type-body mt-2 min-w-0 whitespace-pre-wrap text-pretty text-nexus-text-primary">
                      {rfi.response_text}
                    </p>
                  </div>
                ) : null}

                {isOwner && canParticipate && rfi.status === "open" ? (
                  <div className="mt-5 min-w-0 border-t border-white/10 pt-4">
                    <p className="np-type-meta text-nexus-gold-bright">
                      Private issuer response
                    </p>
                    <p className={`${EXECUTIVE_FORM_HELPER} mt-1 text-pretty`}>
                      This answer stays private to the originating respondent
                      company. Shared clarifications must use an Addendum.
                    </p>
                    <label
                      className={`mt-4 grid min-w-0 gap-2 ${EXECUTIVE_FORM_LABEL}`}
                    >
                      Response
                      <textarea
                        rows={3}
                        value={responseDrafts[rfi.id] || ""}
                        onChange={(event) => {
                          setResponseDrafts((current) => ({
                            ...current,
                            [rfi.id]: event.target.value,
                          }));
                          if (validationTarget === `response:${rfi.id}`) {
                            setValidationTarget(null);
                          }
                        }}
                        disabled={answeringId === rfi.id}
                        aria-invalid={validationTarget === `response:${rfi.id}`}
                        aria-describedby={
                          validationTarget === `response:${rfi.id}`
                            ? errorId
                            : undefined
                        }
                        placeholder="Provide a private response to this respondent company."
                        className={`${EXECUTIVE_FORM_TEXTAREA} min-w-0 resize-none normal-case tracking-normal`}
                      />
                    </label>
                    <button
                      type="button"
                      onClick={() => void handleAnswerRfi(rfi.id)}
                      disabled={answeringId === rfi.id}
                      className={`${EXECUTIVE_BUTTON_PRIMARY} mt-4`}
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
