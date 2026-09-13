"use client";

import type { RfqRequirementsCompleteness } from "@/lib/procurement/rfq-requirements-completeness";

export type RfqPublicationReviewStep = 0 | 1 | 2 | 3 | 4;

export type RfqPublicationReviewItem = {
  label: string;
  value: string;
};

export type RfqPublicationReviewSection = {
  id: string;
  title: string;
  description: string;
  step: RfqPublicationReviewStep;
  items: RfqPublicationReviewItem[];
};

type RfqPublicationReadinessReviewProps = {
  readiness: RfqRequirementsCompleteness;
  sections: RfqPublicationReviewSection[];
  readyToPublishAcknowledged: boolean;
  onReadyToPublishAcknowledgedChange: (checked: boolean) => void;
  onEditStep: (step: RfqPublicationReviewStep) => void;
};

export function RfqPublicationReadinessReview({
  readiness,
  sections,
  readyToPublishAcknowledged,
  onReadyToPublishAcknowledgedChange,
  onEditStep,
}: RfqPublicationReadinessReviewProps) {
  const blockers = [
    ...readiness.missingSignals.map((signal) => ({
      key: `signal-${signal.key}`,
      label: signal.label,
      source: signal.source,
      context: signal.context,
      step: signal.step,
    })),
    ...readiness.blockingIssues.map((issue) => ({
      key: `issue-${issue.key}`,
      label: issue.label,
      source: issue.source,
      context: issue.context,
      step: issue.step,
    })),
  ];

  const canAcknowledge = readiness.status === "ready";

  return (
    <div className="mt-8 space-y-6">
      <section
        className={`rounded-[28px] border p-6 ${
          canAcknowledge
            ? "border-emerald-300/20 bg-emerald-400/[0.07]"
            : "border-orange-300/20 bg-orange-400/[0.07]"
        }`}
      >
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">
              Publication Readiness
            </p>
            <h3 className="mt-2 text-xl font-black text-white">
              {canAcknowledge
                ? "Procurement package is ready for sign-off"
                : `${blockers.length} publication blocker${blockers.length === 1 ? "" : "s"} require attention`}
            </h3>
            <p className="mt-2 max-w-3xl text-sm font-semibold leading-6 text-slate-400">
              Publication is allowed only after the package is internally consistent and the issuer explicitly confirms the final review.
            </p>
          </div>

          <span
            className={`inline-flex w-fit rounded-full border px-3 py-1 text-xs font-black uppercase tracking-[0.14em] ${
              canAcknowledge
                ? "border-emerald-300/20 bg-emerald-400/10 text-emerald-300"
                : "border-orange-300/20 bg-orange-400/10 text-orange-300"
            }`}
          >
            {canAcknowledge ? "Ready for Sign-Off" : "Blocked"}
          </span>
        </div>

        {blockers.length > 0 ? (
          <div className="mt-5 space-y-3">
            {blockers.map((blocker) => (
              <div
                key={blocker.key}
                className="rounded-[22px] border border-orange-300/15 bg-[#061426]/70 p-4"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="text-sm font-black text-orange-200">
                      {blocker.label}
                    </p>
                    <p className="mt-1 text-[10px] font-black uppercase tracking-[0.14em] text-[#9BE8F8]">
                      Source: {blocker.source}
                    </p>
                    <p className="mt-2 text-xs font-semibold leading-5 text-slate-400">
                      {blocker.context}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => onEditStep(blocker.step)}
                    className="shrink-0 rounded-full border border-white/10 bg-white/[0.055] px-4 py-2 text-xs font-black text-white transition hover:bg-white/[0.09] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2CC4E8]/70"
                  >
                    Edit
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : null}
      </section>

      <div className="grid gap-5 xl:grid-cols-2">
        {sections.map((section) => (
          <section
            key={section.id}
            className="rounded-[28px] border border-white/10 bg-[#061426]/65 p-5"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.18em] text-[#9BE8F8]">
                  Final Review
                </p>
                <h3 className="mt-2 text-lg font-black text-white">
                  {section.title}
                </h3>
                <p className="mt-2 text-xs font-semibold leading-5 text-slate-400">
                  {section.description}
                </p>
              </div>

              <button
                type="button"
                onClick={() => onEditStep(section.step)}
                className="shrink-0 rounded-full border border-white/10 bg-white/[0.055] px-4 py-2 text-xs font-black text-white transition hover:bg-white/[0.09] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2CC4E8]/70"
              >
                Edit
              </button>
            </div>

            <dl className="mt-5 space-y-3">
              {section.items.map((item) => (
                <div
                  key={`${section.id}-${item.label}`}
                  className="rounded-[20px] border border-white/10 bg-white/[0.035] px-4 py-3"
                >
                  <dt className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">
                    {item.label}
                  </dt>
                  <dd className="mt-1 break-words text-sm font-bold leading-6 text-slate-200">
                    {item.value}
                  </dd>
                </div>
              ))}
            </dl>
          </section>
        ))}
      </div>

      <section className="rounded-[28px] border border-[#2CC4E8]/20 bg-[#2CC4E8]/[0.07] p-6">
        <p className="text-xs font-black uppercase tracking-[0.18em] text-[#9BE8F8]">
          Supporting Documents
        </p>
        <h3 className="mt-2 text-lg font-black text-white">
          Configured from the RFQ workspace after publication
        </h3>
        <p className="mt-2 text-sm font-semibold leading-6 text-slate-400">
          Drawings, specifications, BOQs, photos, addenda, and supporting files are non-blocking at creation time and become available immediately after the RFQ is published.
        </p>
        <button
          type="button"
          onClick={() => onEditStep(3)}
          className="mt-4 rounded-full border border-white/10 bg-white/[0.055] px-4 py-2 text-xs font-black text-white transition hover:bg-white/[0.09] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2CC4E8]/70"
        >
          Review Documents Step
        </button>
      </section>

      <section className="rounded-[28px] border border-[#C8A646]/20 bg-[#C8A646]/[0.08] p-6">
        <p className="text-xs font-black uppercase tracking-[0.18em] text-[#F5D77B]">
          Commercial Opening Governance
        </p>
        <p className="mt-3 text-sm font-bold leading-6 text-slate-200">
          Commercial submissions remain confidential until the submission deadline has passed. Open sourcing controls market access; it does not enable rolling commercial evaluation.
        </p>
      </section>

      <label
        className={`block rounded-[28px] border p-6 transition ${
          canAcknowledge
            ? "cursor-pointer border-emerald-300/20 bg-emerald-400/[0.06]"
            : "cursor-not-allowed border-white/10 bg-white/[0.035] opacity-70"
        }`}
      >
        <div className="flex items-start gap-4">
          <input
            type="checkbox"
            checked={readyToPublishAcknowledged}
            disabled={!canAcknowledge}
            onChange={(event) =>
              onReadyToPublishAcknowledgedChange(event.target.checked)
            }
            className="mt-1 h-5 w-5 rounded border-white/20 bg-[#061426] accent-[#C8A646]"
          />
          <div>
            <p className="text-sm font-black text-white">Ready to Publish</p>
            <p className="mt-2 text-xs font-semibold leading-5 text-slate-400">
              I confirm that I reviewed the RFQ identity, scope, strategy, evaluation model, deadlines, project controls, enterprise requirements, document state, and commercial-opening policy shown above.
            </p>
            {!canAcknowledge ? (
              <p className="mt-2 text-xs font-black text-orange-200">
                Resolve all publication blockers before this acknowledgement becomes available.
              </p>
            ) : null}
          </div>
        </div>
      </label>
    </div>
  );
}
