import { ExecutivePanel } from "@/components/executive/executive-panel";
import type {
  RfqScopeReview,
  RfqScopeReviewSignal,
} from "@/lib/procurement/rfq-scope-review";

type RFQScopeReviewProps = {
  review: RfqScopeReview;
};

export function RFQScopeReview({ review }: RFQScopeReviewProps) {
  const title = !review.reviewable
    ? "Insufficient Scope Evidence"
    : review.reviewCount === 0
      ? "No Scope Review Signals"
      : `${review.reviewCount} Scope Review ${
          review.reviewCount === 1 ? "Signal" : "Signals"
        }`;

  return (
    <ExecutivePanel
      data-rfq-scope-review="true"
      padding="lg"
      tone={review.reviewCount > 0 ? "gold" : "blue"}
    >
      <p className="text-xs font-black uppercase tracking-[0.3em] text-[#9BE8F8]">
        Scope Review
      </p>

      <h2 className="mt-3 text-3xl font-black text-nexus-white">{title}</h2>

      <p className="mt-3 max-w-3xl text-sm font-semibold leading-7 text-nexus-muted">
        Potential scope gaps are based only on explicit RFQ evidence currently
        captured. These signals are advisory review prompts and do not establish
        that a requirement is missing.
      </p>

      {!review.reviewable ? (
        <ExecutivePanel
          className="mt-6"
          variant="operational"
          padding="sm"
          tone="neutral"
        >
          <p className="text-sm font-black text-nexus-white">
            Add a reviewable scope summary
          </p>

          <p className="mt-2 text-sm font-semibold leading-6 text-nexus-muted">
            Enter at least 9 characters in the Scope of Work Summary before
            scope-review signals are evaluated.
          </p>
        </ExecutivePanel>
      ) : (
        <>
          <div className="mt-6 flex flex-wrap gap-2">
            <StatusPill
              label={`${review.coveredCount}/${review.totalCount} Covered`}
              tone="success"
            />
            <StatusPill
              label={`${review.reviewCount} Review`}
              tone={review.reviewCount > 0 ? "warning" : "neutral"}
            />
          </div>

          <div className="mt-6 grid gap-3">
            {review.signals.map((signal) => (
              <ScopeSignalCard key={signal.key} signal={signal} />
            ))}
          </div>
        </>
      )}
    </ExecutivePanel>
  );
}

function ScopeSignalCard({ signal }: { signal: RfqScopeReviewSignal }) {
  const covered = signal.status === "covered";

  return (
    <ExecutivePanel
      variant="operational"
      padding="sm"
      tone={covered ? "success" : "gold"}
    >
      <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="text-sm font-black text-nexus-white">{signal.label}</p>

          <p className="mt-1 break-words text-[10px] font-black uppercase tracking-[0.14em] text-[#9BE8F8]">
            Source: {signal.source}
          </p>

          <p className="mt-2 text-sm font-semibold leading-6 text-nexus-muted">
            {signal.evidence}
          </p>

          {!covered ? (
            <p className="mt-2 text-sm font-semibold leading-6 text-slate-300">
              {signal.context}
            </p>
          ) : null}
        </div>

        <StatusPill
          label={covered ? "Covered" : "Review"}
          tone={covered ? "success" : "warning"}
        />
      </div>
    </ExecutivePanel>
  );
}

function StatusPill({
  label,
  tone,
}: {
  label: string;
  tone: "success" | "warning" | "neutral";
}) {
  const toneClass =
    tone === "success"
      ? "bg-emerald-400/10 text-emerald-300 ring-1 ring-emerald-300/20"
      : tone === "warning"
        ? "bg-orange-400/10 text-orange-300 ring-1 ring-orange-300/20"
        : "bg-white/[0.06] text-white ring-1 ring-white/10";

  return (
    <span
      className={`w-fit shrink-0 rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-wide ${toneClass}`}
    >
      {label}
    </span>
  );
}
