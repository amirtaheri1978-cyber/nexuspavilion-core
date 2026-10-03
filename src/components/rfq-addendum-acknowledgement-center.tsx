"use client";

import { useCallback, useMemo, useState } from "react";

import { ExecutiveBadge } from "@/components/executive/executive-badge";
import { ExecutiveMetricCard } from "@/components/executive/executive-metric-card";
import {
  EXECUTIVE_BUTTON_PRIMARY,
  EXECUTIVE_EMPTY_BODY,
  EXECUTIVE_EMPTY_COMPACT,
  EXECUTIVE_EMPTY_TITLE,
  EXECUTIVE_FEEDBACK_ERROR,
  EXECUTIVE_FEEDBACK_SUCCESS,
  EXECUTIVE_FEEDBACK_WARNING,
  EXECUTIVE_FORM_LABEL,
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

type Acknowledgement = {
  id: string;
  addendum_id: string;
  rfq_id: string;
  company_id: string;
  acknowledged_at: string | null;
};

type Props = {
  rfqId: string;
  canAcknowledge?: boolean;
  initialAddenda?: Addendum[];
  initialAcknowledgements?: Acknowledgement[];
};

function formatDate(value: string | null) {
  if (!value) return "N/A";

  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

export default function RFQAddendumAcknowledgementCenter({
  rfqId,
  canAcknowledge = true,
  initialAddenda = [],
  initialAcknowledgements = [],
}: Props) {
  const [acknowledgements, setAcknowledgements] = useState<Acknowledgement[]>(
    initialAcknowledgements,
  );
  const [loadingId, setLoadingId] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const requiredAddenda = useMemo(
    () => initialAddenda.filter((item) => item.requires_acknowledgement),
    [initialAddenda],
  );

  const acknowledgedIds = useMemo(
    () => new Set(acknowledgements.map((item) => item.addendum_id)),
    [acknowledgements],
  );

  const requiredAcknowledgedCount = requiredAddenda.filter((item) =>
    acknowledgedIds.has(item.id),
  ).length;

  const allRequiredAcknowledged =
    requiredAddenda.length === 0 ||
    requiredAcknowledgedCount === requiredAddenda.length;

  const handleAcknowledge = useCallback(
    async (addendumId: string) => {
      if (!canAcknowledge) {
        return;
      }

      setLoadingId(addendumId);
      setMessage("");
      setError("");

      try {
        const response = await fetch("/api/rfq-addendum-acknowledgements", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            rfqId,
            addendumId,
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          setError(data.error || "Failed to acknowledge addendum.");
          return;
        }

        setAcknowledgements((current) => {
          const filtered = current.filter(
            (item) => item.addendum_id !== addendumId,
          );

          return [data.acknowledgement, ...filtered];
        });

        setMessage("Addendum acknowledged successfully.");
      } catch (acknowledgementError) {
        console.error(acknowledgementError);
        setError("Request failed. Please try again.");
      } finally {
        setLoadingId("");
      }
    },
    [canAcknowledge, rfqId],
  );

  return (
    <section
      className="@container min-w-0"
      aria-labelledby="rfq-addenda-workspace-title"
      data-rfq-addenda-acknowledgement="true"
    >
      <div className="min-w-0" data-rfq-addenda-status="true">
        <p className="np-type-eyebrow text-nexus-cyan-bright">
          Acknowledgement status
        </p>
        <p className="np-type-body mt-2 min-w-0 text-pretty text-nexus-text-secondary">
          Review issued addenda and complete any required acknowledgements
          before submitting or revising your quote.
        </p>

        <div
          className="mt-5 grid min-w-0 grid-cols-1 gap-3 @sm:grid-cols-3"
          data-rfq-addenda-compliance="true"
        >
          <ExecutiveMetricCard
            label="Required"
            value={String(requiredAddenda.length)}
            tone="neutral"
          />
          <ExecutiveMetricCard
            label="Acknowledged"
            value={String(requiredAcknowledgedCount)}
            tone="blue"
          />
          <ExecutiveMetricCard
            label="Quote Status"
            value={allRequiredAcknowledged ? "Clear" : "Blocked"}
            tone={allRequiredAcknowledged ? "success" : "risk"}
          />
        </div>
      </div>

      {!canAcknowledge ? (
        <div
          className={`mt-6 min-w-0 text-pretty text-sm font-bold ${EXECUTIVE_FEEDBACK_WARNING}`}
          role="status"
          aria-live="polite"
          data-rfq-addenda-acknowledgement-closed="true"
        >
          Acknowledgements are closed for this RFQ. Issued addenda remain
          available for reference.
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
        {initialAddenda.length === 0 ? (
          <div className={`min-w-0 ${EXECUTIVE_EMPTY_COMPACT}`} role="status">
            <p className={`${EXECUTIVE_EMPTY_TITLE} !mt-0`}>
              No addenda issued yet.
            </p>
            <p className={`${EXECUTIVE_EMPTY_BODY} !mx-0 max-w-none text-left`}>
              Addenda and clarification notices will appear here when issued by
              the issuing organization.
            </p>
          </div>
        ) : (
          <div className="grid min-w-0 gap-4">
            {initialAddenda.map((addendum) => {
              const acknowledged = acknowledgedIds.has(addendum.id);
              const requiresAcknowledgement =
                addendum.requires_acknowledgement !== false;

              return (
                <article
                  key={addendum.id}
                  className="min-w-0 rounded-executive border border-white/10 bg-white/[0.045] p-5"
                >
                  <div className="min-w-0">
                    <div className="flex min-w-0 flex-wrap items-center gap-2">
                      <ExecutiveBadge tone="gold">
                        Addendum #{addendum.addendum_number}
                      </ExecutiveBadge>
                      <ExecutiveBadge tone="neutral">
                        {formatDate(addendum.created_at)}
                      </ExecutiveBadge>
                      <ExecutiveBadge
                        tone={
                          acknowledged
                            ? "success"
                            : requiresAcknowledgement
                              ? "warning"
                              : "blue"
                        }
                      >
                        {acknowledged
                          ? "Acknowledged"
                          : requiresAcknowledgement
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
                        <dt className={EXECUTIVE_FORM_LABEL}>
                          Affected Documents
                        </dt>
                        <dd className="np-type-body mt-2 min-w-0 whitespace-pre-wrap text-pretty text-nexus-text-primary">
                          {addendum.affected_documents}
                        </dd>
                      </dl>
                    ) : null}
                  </div>

                  {canAcknowledge &&
                  requiresAcknowledgement &&
                  !acknowledged ? (
                    <button
                      type="button"
                      onClick={() => void handleAcknowledge(addendum.id)}
                      disabled={loadingId === addendum.id}
                      className={`${EXECUTIVE_BUTTON_PRIMARY} mt-5 min-h-11 w-full @md:w-auto`}
                    >
                      {loadingId === addendum.id
                        ? "Acknowledging..."
                        : "Acknowledge"}
                    </button>
                  ) : null}
                </article>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
