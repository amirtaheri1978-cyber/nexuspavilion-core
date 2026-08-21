"use client";

import { useCallback, useMemo, useState } from "react";

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
    [rfqId],
  );

  return (
    <section
      className="@container min-w-0"
      aria-labelledby="rfq-addenda-workspace-title"
      data-rfq-addenda-acknowledgement="true"
    >
      <div className="min-w-0" data-rfq-addenda-status="true">
        <p className="text-xs font-black uppercase tracking-[0.22em] text-nexus-cyan-bright">
          Acknowledgement status
        </p>
        <p className="mt-2 min-w-0 text-pretty text-sm font-semibold leading-6 text-nexus-muted">
          Review issued addenda and complete any required acknowledgements
          before submitting or revising your quote.
        </p>

        <dl
          className="mt-5 grid min-w-0 grid-cols-1 gap-3 @sm:grid-cols-3"
          data-rfq-addenda-compliance="true"
        >
          <div className="min-w-0">
            <dt className="text-xs font-black uppercase tracking-[0.2em] text-nexus-muted">
              Required
            </dt>
            <dd className="mt-2 text-pretty text-xl font-black text-nexus-white">
              {requiredAddenda.length}
            </dd>
          </div>
          <div className="min-w-0">
            <dt className="text-xs font-black uppercase tracking-[0.2em] text-nexus-muted">
              Acknowledged
            </dt>
            <dd className="mt-2 text-pretty text-xl font-black text-nexus-white">
              {requiredAcknowledgedCount}
            </dd>
          </div>
          <div className="min-w-0">
            <dt className="text-xs font-black uppercase tracking-[0.2em] text-nexus-muted">
              Quote Status
            </dt>
            <dd className="mt-2 text-pretty text-xl font-black text-nexus-white">
              {allRequiredAcknowledged ? "Clear" : "Blocked"}
            </dd>
          </div>
        </dl>
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

      <div className="mt-7 min-w-0 border-t border-white/10 pt-7" data-rfq-addenda-history="true">
        {initialAddenda.length === 0 ? (
          <div
            className="min-w-0 rounded-executive border border-dashed border-white/10 bg-white/[0.035] p-5"
            role="status"
          >
            <p className="text-pretty text-lg font-black text-nexus-white">
              No addenda issued yet.
            </p>
            <p className="mt-3 min-w-0 text-pretty text-sm font-semibold leading-6 text-nexus-muted">
              Addenda and clarification notices will appear here when issued by
              the buyer.
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
                      <span className="rounded-full border border-nexus-gold/25 bg-nexus-gold/10 px-3 py-1 text-xs font-black uppercase tracking-[0.14em] text-nexus-gold-bright">
                        Addendum #{addendum.addendum_number}
                      </span>
                      <span className="rounded-full border border-white/10 bg-white/[0.055] px-3 py-1 text-xs font-black uppercase tracking-[0.14em] text-nexus-muted">
                        {formatDate(addendum.created_at)}
                      </span>
                      <span
                        className={`rounded-full border px-3 py-1 text-xs font-black uppercase tracking-[0.14em] ${
                          acknowledged
                            ? "border-emerald-300/20 bg-emerald-400/10 text-emerald-300"
                            : requiresAcknowledgement
                              ? "border-orange-300/20 bg-orange-400/10 text-orange-300"
                              : "border-nexus-cyan/25 bg-nexus-cyan/10 text-nexus-cyan-bright"
                        }`}
                      >
                        {acknowledged
                          ? "Acknowledged"
                          : requiresAcknowledgement
                            ? "Acknowledgement Required"
                            : "Informational"}
                      </span>
                    </div>

                    <h4 className="mt-4 min-w-0 text-pretty text-xl font-black text-nexus-white sm:text-2xl">
                      {addendum.title}
                    </h4>

                    {addendum.description ? (
                      <p className="mt-3 max-w-4xl min-w-0 text-pretty text-sm font-semibold leading-7 text-nexus-muted">
                        {addendum.description}
                      </p>
                    ) : null}

                    {addendum.affected_documents ? (
                      <dl className="mt-5 min-w-0 border-t border-white/10 pt-4">
                        <dt className="text-xs font-black uppercase tracking-[0.18em] text-nexus-muted">
                          Affected Documents
                        </dt>
                        <dd className="mt-2 min-w-0 whitespace-pre-wrap text-pretty text-sm font-semibold leading-7 text-nexus-white">
                          {addendum.affected_documents}
                        </dd>
                      </dl>
                    ) : null}
                  </div>

                  {requiresAcknowledgement && !acknowledged ? (
                    <button
                      type="button"
                      onClick={() => void handleAcknowledge(addendum.id)}
                      disabled={loadingId === addendum.id}
                      className="mt-5 inline-flex min-h-11 w-full items-center justify-center rounded-full bg-nexus-gold px-6 py-3 text-sm font-black text-nexus-navy transition hover:bg-[#F5D77B] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nexus-gold/70 focus-visible:ring-offset-2 focus-visible:ring-offset-nexus-navy disabled:cursor-not-allowed disabled:opacity-50 @md:w-auto"
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
