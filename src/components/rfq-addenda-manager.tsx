"use client";

import { useCallback, useMemo, useRef, useState } from "react";

type Addendum = {
  id: string;
  title: string;
  description: string | null;
  addendum_number: number;
  affected_documents: string | null;
  requires_acknowledgement: boolean | null;
  created_at: string | null;
};

type RFQAddendaManagerProps = {
  rfqId: string;
  initialAddenda?: Addendum[];
  canManage?: boolean;
};

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
  const [requiresAcknowledgement, setRequiresAcknowledgement] = useState(true);
  const [loading, setLoading] = useState(false);
  const createLock = useRef(false);
  const [refreshing, setRefreshing] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

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
      setError("Addendum title is required.");
      return;
    }

    createLock.current = true;
    setLoading(true);
    setMessage("");
    setError("");

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
          affectedDocuments: affectedDocuments.trim(),
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
      setRequiresAcknowledgement(true);
      setMessage(`Addendum #${data.addendum.addendum_number} issued.`);
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
          <p className="text-xs font-black uppercase tracking-[0.22em] text-nexus-cyan-bright">
            Issued addenda
          </p>
          <p className="mt-2 min-w-0 text-pretty text-sm font-semibold leading-6 text-nexus-muted">
            Current clarifications, revisions, and vendor notices for this RFQ.
          </p>
        </div>

        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <p className="w-fit rounded-full border border-white/10 bg-white/[0.055] px-4 py-2 text-xs font-black text-nexus-muted">
            {addenda.length} issued
          </p>
          <button
            type="button"
            onClick={() => void loadAddenda()}
            disabled={refreshing}
            className="inline-flex min-h-11 items-center rounded-full border border-white/10 bg-white/[0.055] px-5 py-3 text-sm font-black text-nexus-white transition hover:bg-white/[0.08] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nexus-gold/70 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {refreshing ? "Refreshing..." : "Refresh"}
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

      <div className="mt-7 min-w-0 border-t border-white/10 pt-7" data-rfq-addenda-history="true">
        {addenda.length === 0 ? (
          <div
            className="min-w-0 rounded-executive border border-dashed border-white/10 bg-white/[0.035] p-5"
            role="status"
          >
            <p className="text-pretty text-lg font-black text-nexus-white">
              No addenda issued yet.
            </p>
            <p className="mt-3 min-w-0 text-pretty text-sm font-semibold leading-6 text-nexus-muted">
              Formal drawing changes, scope clarifications, and vendor notices
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
                  <span className="rounded-full border border-nexus-gold/25 bg-nexus-gold/10 px-3 py-1 text-xs font-black uppercase tracking-[0.14em] text-nexus-gold-bright">
                    Addendum #{addendum.addendum_number}
                  </span>
                  <span className="rounded-full border border-white/10 bg-white/[0.055] px-3 py-1 text-xs font-black uppercase tracking-[0.14em] text-nexus-muted">
                    {formatDate(addendum.created_at)}
                  </span>
                  <span className="rounded-full border border-nexus-cyan/25 bg-nexus-cyan/10 px-3 py-1 text-xs font-black uppercase tracking-[0.14em] text-nexus-cyan-bright">
                    {addendum.requires_acknowledgement
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
              <p className="text-xs font-black uppercase tracking-[0.22em] text-nexus-cyan-bright">
                Issue New Addendum
              </p>
              <h4 className="mt-2 min-w-0 text-pretty text-xl font-black text-nexus-white sm:text-2xl">
                Preview Addendum #{nextAddendumNumber}
              </h4>
              <p className="mt-2 min-w-0 text-pretty text-xs font-semibold leading-5 text-nexus-muted">
                The issued addendum number is assigned by the database and may
                differ under concurrent issuance.
              </p>
            </div>

            <label className="flex min-h-11 min-w-0 items-center gap-3 rounded-full border border-white/10 bg-white/[0.055] px-4 py-3">
              <input
                type="checkbox"
                checked={requiresAcknowledgement}
                onChange={(event) =>
                  setRequiresAcknowledgement(event.target.checked)
                }
                disabled={loading}
                className="h-4 w-4 shrink-0"
              />
              <span className="min-w-0 text-pretty text-xs font-black uppercase tracking-[0.14em] text-nexus-muted">
                Requires acknowledgement
              </span>
            </label>
          </div>

          <div className="mt-6 grid min-w-0 gap-5">
            <label className="grid min-w-0 gap-2 text-xs font-black uppercase tracking-[0.18em] text-nexus-muted">
              Title *
              <input
                required
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                disabled={loading}
                placeholder="Updated ceiling layout"
                className="min-h-14 min-w-0 w-full rounded-executive border border-white/10 bg-black/25 px-4 py-4 text-sm font-bold normal-case tracking-normal text-nexus-white outline-none transition placeholder:text-nexus-muted/70 focus:border-nexus-cyan/40 focus-visible:ring-2 focus-visible:ring-nexus-gold/40 disabled:cursor-not-allowed disabled:opacity-60"
              />
            </label>

            <label className="grid min-w-0 gap-2 text-xs font-black uppercase tracking-[0.18em] text-nexus-muted">
              Description
              <textarea
                rows={4}
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                disabled={loading}
                placeholder="Describe the clarification, revision, scope update, or instruction issued to vendors."
                className="min-w-0 w-full resize-none rounded-executive border border-white/10 bg-black/25 px-4 py-4 text-sm font-bold normal-case tracking-normal text-nexus-white outline-none transition placeholder:text-nexus-muted/70 focus:border-nexus-cyan/40 focus-visible:ring-2 focus-visible:ring-nexus-gold/40 disabled:cursor-not-allowed disabled:opacity-60"
              />
            </label>

            <label className="grid min-w-0 gap-2 text-xs font-black uppercase tracking-[0.18em] text-nexus-muted">
              Affected Documents
              <textarea
                rows={3}
                value={affectedDocuments}
                onChange={(event) => setAffectedDocuments(event.target.value)}
                disabled={loading}
                placeholder="e.g. Drawing A401 Rev 2, Specification 09 51 13, BOQ Rev 1"
                className="min-w-0 w-full resize-none rounded-executive border border-white/10 bg-black/25 px-4 py-4 text-sm font-bold normal-case tracking-normal text-nexus-white outline-none transition placeholder:text-nexus-muted/70 focus:border-nexus-cyan/40 focus-visible:ring-2 focus-visible:ring-nexus-gold/40 disabled:cursor-not-allowed disabled:opacity-60"
              />
            </label>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="mt-6 inline-flex min-h-14 w-full items-center justify-center rounded-full bg-nexus-gold px-7 py-4 text-sm font-black text-nexus-navy transition hover:bg-[#F5D77B] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nexus-gold/70 focus-visible:ring-offset-2 focus-visible:ring-offset-nexus-navy disabled:cursor-not-allowed disabled:opacity-50 @md:w-auto"
          >
            {loading ? "Issuing Addendum..." : "Issue Addendum"}
          </button>
        </form>
      ) : null}
    </section>
  );
}
