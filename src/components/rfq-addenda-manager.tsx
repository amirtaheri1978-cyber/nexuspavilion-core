"use client";

import { useCallback, useMemo, useRef, useState } from "react";

import { ExecutiveBadge } from "@/components/executive/executive-badge";
import { ExecutiveCompletionMoment } from "@/components/executive/executive-completion-moment";
import { RFQ_GOVERNED_REQUIREMENT_HANDOFF_EVENT } from "@/components/rfq-workspace/rfq-document-requirements";
import {
  EXECUTIVE_BUTTON_PRIMARY,
  EXECUTIVE_BUTTON_SECONDARY,
  EXECUTIVE_BUTTON_TERTIARY,
  EXECUTIVE_EMPTY_BODY,
  EXECUTIVE_EMPTY_COMPACT,
  EXECUTIVE_EMPTY_TITLE,
  EXECUTIVE_FEEDBACK_ERROR,
  EXECUTIVE_FEEDBACK_INFO,
  EXECUTIVE_FEEDBACK_SUCCESS,
  EXECUTIVE_FEEDBACK_WARNING,
  EXECUTIVE_FORM_CHECKBOX,
  EXECUTIVE_FORM_HELPER,
  EXECUTIVE_FORM_INPUT,
  EXECUTIVE_FORM_LABEL,
  EXECUTIVE_FORM_TEXTAREA,
} from "@/lib/design-system/executive-contract";

type Addendum = {
  id: string;
  title: string;
  description: string | null;
  addendum_number: number;
  affected_documents: string | null;
  requires_acknowledgement: boolean | null;
  created_at: string | null;
};

type AddendumEmailSummary = {
  recipients: number;
  sent: number;
  skipped: number;
  failed: number;
  error: string | null;
};

type AddendumPublicationNotice = {
  addendumNumber: number | null;
  requiresAcknowledgement: boolean | null;
  email: AddendumEmailSummary | null;
};

type RFQAddendaManagerProps = {
  rfqId: string;
  initialAddenda?: Addendum[];
  canManage?: boolean;
};

function countOrNull(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function readEmailSummary(value: unknown): AddendumEmailSummary | null {
  if (!value || typeof value !== "object") return null;

  const email = value as {
    recipients?: unknown;
    sent?: unknown;
    skipped?: unknown;
    failed?: unknown;
    error?: unknown;
  };
  const recipients = countOrNull(email.recipients);
  const sent = countOrNull(email.sent);
  const skipped = countOrNull(email.skipped);
  const failed = countOrNull(email.failed);

  if (
    recipients === null ||
    sent === null ||
    skipped === null ||
    failed === null
  ) {
    return null;
  }

  return {
    recipients,
    sent,
    skipped,
    failed,
    error: typeof email.error === "string" ? email.error : null,
  };
}

function readPublicationNotice(data: {
  addendum?: {
    addendum_number?: unknown;
    requires_acknowledgement?: unknown;
  };
  email?: unknown;
}): AddendumPublicationNotice | null {
  if (!data.addendum || typeof data.addendum !== "object") return null;

  const addendumNumber = data.addendum.addendum_number;
  const requiresAcknowledgement = data.addendum.requires_acknowledgement;

  return {
    addendumNumber:
      typeof addendumNumber === "number" && Number.isFinite(addendumNumber)
        ? addendumNumber
        : null,
    requiresAcknowledgement:
      typeof requiresAcknowledgement === "boolean"
        ? requiresAcknowledgement
        : null,
    email: readEmailSummary(data.email),
  };
}

function acknowledgementImplication(required: boolean | null) {
  if (required === true) {
    return "Acknowledgement is required. This publication does not record that acknowledgement has occurred.";
  }

  if (required === false) {
    return "Acknowledgement is not required for this Addendum.";
  }

  return "";
}

function notificationOutcome(email: AddendumEmailSummary | null) {
  if (!email) return "";

  const outcome = `Notification outcome: ${email.sent} sent, ${email.skipped} skipped, and ${email.failed} failed out of ${email.recipients} returned recipients.`;

  return email.error ? `${outcome} ${email.error}` : outcome;
}

function formatDate(value: string | null) {
  if (!value) return "N/A";

  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

export default function RFQAddendaManager({
  rfqId,
  initialAddenda = [],
  canManage = false,
}: RFQAddendaManagerProps) {
  const [addenda, setAddenda] = useState<Addendum[]>(initialAddenda);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [affectedDocuments, setAffectedDocuments] = useState("");
  const [amendmentReason, setAmendmentReason] = useState("");
  const [requiresAcknowledgement, setRequiresAcknowledgement] = useState(true);
  const [loading, setLoading] = useState(false);
  const createLock = useRef(false);
  const [refreshing, setRefreshing] = useState(false);
  const [message, setMessage] = useState("");
  const [publishedNotice, setPublishedNotice] =
    useState<AddendumPublicationNotice | null>(null);
  const [error, setError] = useState("");
  const [titleValidationError, setTitleValidationError] = useState(false);
  const [governedGuidance, setGovernedGuidance] = useState(false);
  const errorId = "rfq-addenda-error";

  const nextAddendumNumber = useMemo(
    () =>
      addenda.length > 0
        ? Math.max(...addenda.map((item) => item.addendum_number || 0)) + 1
        : 1,
    [addenda],
  );

  const loadAddenda = useCallback(async () => {
    setRefreshing(true);
    setError("");

    const response = await fetch(`/api/rfq-addenda?rfqId=${rfqId}`);
    const data = await response.json();

    if (!response.ok) {
      setError(data.error || "Failed to load addenda.");
      setRefreshing(false);
      return;
    }

    setAddenda(data.addenda || []);
    setRefreshing(false);
  }, [rfqId]);

  async function handleCreateAddendum(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!canManage) return;

    if (createLock.current || loading) return;

    if (!title.trim()) {
      setTitleValidationError(true);
      setError("Addendum title is required.");
      return;
    }

    const requestsGovernedPackageChange = Boolean(
      affectedDocuments.trim() || amendmentReason.trim(),
    );

    if (requestsGovernedPackageChange && !amendmentReason.trim()) {
      setGovernedGuidance(false);
      setError("Amendment reason is required for a governed package change.");
      return;
    }

    if (requestsGovernedPackageChange) {
      setError("");
      setMessage("");
      setPublishedNotice(null);
      setGovernedGuidance(true);
      window.dispatchEvent(
        new CustomEvent(RFQ_GOVERNED_REQUIREMENT_HANDOFF_EVENT, {
          detail: {
            rfqId,
            title: title.trim(),
            reason: amendmentReason.trim(),
            affectedDocuments: affectedDocuments.trim(),
          },
        }),
      );
      window.requestAnimationFrame(() => {
        const destination = document.querySelector<HTMLElement>(
          '[data-rfq-document-requirements="true"]',
        );
        destination?.scrollIntoView({ behavior: "smooth", block: "start" });
        destination?.focus({ preventScroll: true });
      });
      return;
    }

    createLock.current = true;
    setLoading(true);
    setMessage("");
    setPublishedNotice(null);
    setError("");
    setGovernedGuidance(false);
    setTitleValidationError(false);

    try {
      const response = await fetch("/api/rfq-addenda", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          rfqId,
          title: title.trim(),
          description: description.trim(),
          affectedDocuments: "",
          requiresAcknowledgement,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Failed to issue addendum.");
        return;
      }

      setAddenda((current) => [data.addendum, ...current]);
      setTitle("");
      setDescription("");
      setAffectedDocuments("");
      setAmendmentReason("");
      setRequiresAcknowledgement(true);
      setPublishedNotice(readPublicationNotice(data));
      setMessage("");
    } catch (createError) {
      console.error(createError);
      setError("Request failed. Please try again.");
    } finally {
      createLock.current = false;
      setLoading(false);
    }
  }

  return (
    <section
      className="@container min-w-0"
      aria-labelledby="rfq-addenda-workspace-title"
      data-rfq-addenda-manager="true"
    >
      <div
        className="flex min-w-0 flex-col gap-3 @sm:flex-row @sm:items-end @sm:justify-between"
        data-rfq-addenda-status="true"
      >
        <div className="min-w-0">
          <p className="np-type-eyebrow text-nexus-cyan-bright">
            Issued addenda
          </p>
          <p className="np-type-body mt-2 min-w-0 text-pretty text-nexus-text-secondary">
            Formal RFQ-wide clarifications, revisions, and supplier notices.
            Private respondent inquiries remain in Private RFI.
          </p>
        </div>

        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <ExecutiveBadge tone="neutral">{addenda.length} issued</ExecutiveBadge>
          <button
            type="button"
            onClick={() => void loadAddenda()}
            disabled={refreshing}
            className={`${EXECUTIVE_BUTTON_TERTIARY} min-h-11 px-5 py-3`}
          >
            {refreshing ? "Refreshing..." : "Refresh"}
          </button>
        </div>
      </div>

      {message && !canManage ? (
        <div
          className={`mt-6 min-w-0 text-pretty text-sm font-bold ${EXECUTIVE_FEEDBACK_SUCCESS}`}
          role="status"
          aria-live="polite"
        >
          {message}
        </div>
      ) : null}

      {error && !canManage ? (
        <div
          id={errorId}
          className={`mt-6 min-w-0 text-pretty text-sm font-bold ${EXECUTIVE_FEEDBACK_ERROR}`}
          role="alert"
          aria-live="assertive"
        >
          {error}
        </div>
      ) : null}

      <div
        className="mt-7 min-w-0 border-t border-white/10 pt-7"
        data-rfq-addenda-history="true"
      >
        {addenda.length === 0 ? (
          <div className={`min-w-0 ${EXECUTIVE_EMPTY_COMPACT}`} role="status">
            <p className={`${EXECUTIVE_EMPTY_TITLE} !mt-0`}>
              No addenda issued yet.
            </p>
            <p className={`${EXECUTIVE_EMPTY_BODY} !mx-0 max-w-none text-left`}>
              Formal drawing changes, scope clarifications, and supplier notices
              will appear here.
            </p>
          </div>
        ) : (
          <div className="grid min-w-0 gap-4">
            {addenda.map((addendum) => (
              <article
                key={addendum.id}
                className="min-w-0 rounded-executive border border-white/10 bg-white/[0.045] p-5"
              >
                <div className="flex min-w-0 flex-wrap items-center gap-2">
                  <ExecutiveBadge tone="gold">
                    Addendum #{addendum.addendum_number}
                  </ExecutiveBadge>
                  <ExecutiveBadge tone="neutral">
                    {formatDate(addendum.created_at)}
                  </ExecutiveBadge>
                  <ExecutiveBadge
                    tone={
                      addendum.requires_acknowledgement ? "warning" : "blue"
                    }
                  >
                    {addendum.requires_acknowledgement
                      ? "Acknowledgement Required"
                      : "Informational"}
                  </ExecutiveBadge>
                </div>

                <h4 className="np-type-h2 mt-4 min-w-0 text-pretty">
                  {addendum.title}
                </h4>

                {addendum.description ? (
                  <p className="np-type-body mt-3 max-w-4xl min-w-0 text-pretty text-nexus-text-secondary">
                    {addendum.description}
                  </p>
                ) : null}

                {addendum.affected_documents ? (
                  <dl className="mt-5 min-w-0 border-t border-white/10 pt-4">
                    <dt className={EXECUTIVE_FORM_LABEL}>Affected Documents</dt>
                    <dd className="np-type-body mt-2 min-w-0 whitespace-pre-wrap text-pretty text-nexus-text-primary">
                      {addendum.affected_documents}
                    </dd>
                  </dl>
                ) : null}
              </article>
            ))}
          </div>
        )}
      </div>

      {canManage ? (
        <form
          onSubmit={handleCreateAddendum}
          className="mt-7 min-w-0 border-t border-white/10 pt-7"
          data-rfq-addenda-create="true"
        >
          <div className="flex min-w-0 flex-col gap-3 @md:flex-row @md:items-end @md:justify-between">
            <div className="min-w-0">
              <p className="np-type-eyebrow text-nexus-cyan-bright">
                Issue New Addendum
              </p>
              <h4 className="np-type-h2 mt-2 min-w-0 text-pretty">
                Preview Addendum #{nextAddendumNumber}
              </h4>
              <p className={`${EXECUTIVE_FORM_HELPER} mt-2 min-w-0 text-pretty`}>
                The issued addendum number is assigned by the database and may
                differ under concurrent issuance.
              </p>
            </div>

            <label className="flex min-h-11 min-w-0 items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.055] px-4 py-3">
              <input
                type="checkbox"
                checked={requiresAcknowledgement}
                onChange={(event) =>
                  setRequiresAcknowledgement(event.target.checked)
                }
                disabled={loading}
                className={EXECUTIVE_FORM_CHECKBOX}
              />
              <span className={`min-w-0 text-pretty ${EXECUTIVE_FORM_LABEL}`}>
                Requires acknowledgement
              </span>
            </label>
          </div>

          <div
            className={`mt-6 min-w-0 ${EXECUTIVE_FEEDBACK_INFO}`}
            role="note"
          >
            <p className="np-type-meta text-nexus-cyan-bright">
              Ordinary Addendum
            </p>
            <p className="np-type-body mt-1 text-pretty text-nexus-text-primary">
              Use title and description alone for a formal clarification that
              does not change governed package requirements.
            </p>
          </div>

          <div className="mt-6 grid min-w-0 gap-5">
            <label className={`grid min-w-0 gap-2 ${EXECUTIVE_FORM_LABEL}`}>
              Title *
              <input
                required
                value={title}
                onChange={(event) => {
                  setTitle(event.target.value);
                  if (titleValidationError) {
                    setTitleValidationError(false);
                  }
                }}
                disabled={loading}
                aria-invalid={titleValidationError}
                aria-describedby={titleValidationError ? errorId : undefined}
                placeholder="Updated ceiling layout"
                className={`${EXECUTIVE_FORM_INPUT} min-h-14 min-w-0 normal-case tracking-normal`}
              />
            </label>

            <label className={`grid min-w-0 gap-2 ${EXECUTIVE_FORM_LABEL}`}>
              Description
              <textarea
                rows={4}
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                disabled={loading}
                placeholder="Describe the clarification, revision, scope update, or instruction issued to suppliers."
                className={`${EXECUTIVE_FORM_TEXTAREA} min-w-0 resize-none normal-case tracking-normal`}
              />
            </label>

            <div
              className={`min-w-0 ${EXECUTIVE_FEEDBACK_WARNING}`}
              role="note"
            >
              <p className="np-type-meta text-status-warning">
                Governed package change
              </p>
              <p className="np-type-body mt-1 text-pretty text-nexus-text-primary">
                Entering Affected Documents or Amendment Reason routes this
                change to Required Document Coverage. Do not use these fields
                for ordinary clarification.
              </p>
            </div>

            <label className={`grid min-w-0 gap-2 ${EXECUTIVE_FORM_LABEL}`}>
              Affected Documents
              <textarea
                rows={3}
                value={affectedDocuments}
                onChange={(event) => setAffectedDocuments(event.target.value)}
                disabled={loading}
                placeholder="e.g. Drawing A401 Rev 2, Specification 09 51 13, BOQ Rev 1"
                className={`${EXECUTIVE_FORM_TEXTAREA} min-w-0 resize-none normal-case tracking-normal`}
              />
            </label>

            <label className={`grid min-w-0 gap-2 ${EXECUTIVE_FORM_LABEL}`}>
              Amendment Reason
              <textarea
                rows={3}
                value={amendmentReason}
                onChange={(event) => setAmendmentReason(event.target.value)}
                disabled={loading}
                placeholder="Explain why this material Addendum is required."
                className={`${EXECUTIVE_FORM_TEXTAREA} min-w-0 resize-none normal-case tracking-normal`}
              />
              <span className={`${EXECUTIVE_FORM_HELPER} normal-case tracking-normal`}>
                Required when the Addendum changes governed RFQ package evidence.
              </span>
            </label>
          </div>

          {governedGuidance ? (
            <div
              className={`mt-6 ${EXECUTIVE_FEEDBACK_WARNING}`}
              role="status"
              aria-live="polite"
            >
              <p className="text-sm font-black">
                This Addendum changes a governed RFQ requirement. Complete the
                required change below before issuing the Addendum.
              </p>
              <p className="mt-2 text-sm font-semibold leading-6 text-nexus-text-primary">
                Your Addendum title and amendment reason have been carried to
                Required Document Coverage. Select the document category and
                declare or remove its requirement to create the governed record.
              </p>
              <button
                type="button"
                onClick={() => {
                  const destination = document.querySelector<HTMLElement>(
                    '[data-rfq-document-requirements="true"]',
                  );
                  destination?.scrollIntoView({
                    behavior: "smooth",
                    block: "start",
                  });
                  destination?.focus({ preventScroll: true });
                }}
                className={`${EXECUTIVE_BUTTON_SECONDARY} mt-4 min-h-11`}
              >
                Go to Required Document Coverage
              </button>
            </div>
          ) : null}

          {error ? (
            <div
              id={errorId}
              className={`mt-6 text-sm font-bold ${EXECUTIVE_FEEDBACK_ERROR}`}
              role="alert"
              aria-live="assertive"
            >
              {error}
            </div>
          ) : null}

          {publishedNotice ? (
            <div className="mt-6 min-w-0">
              <ExecutiveCompletionMoment
                state="confirmed"
                title={
                  publishedNotice.addendumNumber === null
                    ? "Addendum issued."
                    : `Addendum #${publishedNotice.addendumNumber} issued.`
                }
                summary={
                  acknowledgementImplication(
                    publishedNotice.requiresAcknowledgement,
                  ) || "The Addendum is published."
                }
                detail={notificationOutcome(publishedNotice.email)}
              />
            </div>
          ) : null}

          {message ? (
            <div
              className={`mt-6 text-sm font-bold ${EXECUTIVE_FEEDBACK_SUCCESS}`}
              role="status"
              aria-live="polite"
            >
              {message}
            </div>
          ) : null}

          <button
            type="submit"
            disabled={loading}
            className={`${EXECUTIVE_BUTTON_PRIMARY} mt-6 w-full @md:w-auto`}
          >
            {loading ? "Issuing Addendum..." : "Issue Addendum"}
          </button>
        </form>
      ) : null}
    </section>
  );
}
