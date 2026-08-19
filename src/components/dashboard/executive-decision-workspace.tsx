import { ExecutiveBadge } from "@/components/executive/executive-badge";
import { ExecutivePanel } from "@/components/executive/executive-panel";

type ExecutiveDecisionWorkspaceProps = {
  title: string;
  summary: string;
  recommendedAction: string;
  status: {
    label: string;
    tone: "success" | "warning";
  };
  recommendations: {
    id: string;
    rank: number;
    title: string;
    value: string;
    detail: string;
  }[];
};

export function ExecutiveDecisionWorkspace({
  title,
  summary,
  recommendedAction,
  status,
  recommendations,
}: ExecutiveDecisionWorkspaceProps) {
  return (
    <ExecutivePanel
      variant="executive"
      padding="lg"
      tone="gold"
      className="np-region-major"
      aria-labelledby="executive-next-action-heading"
    >
      <div className="flex flex-col gap-4 border-b border-white/10 pb-6 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="np-type-eyebrow">Next Action</p>
          <h2 id="executive-next-action-heading" className="np-type-h2 mt-3">
            {title}
          </h2>
          <p className="np-type-body mt-4 max-w-5xl">{summary}</p>
        </div>

        <ExecutiveBadge tone={status.tone} size="md">
          {status.label}
        </ExecutiveBadge>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <section className="rounded-executive border border-nexus-gold/20 bg-nexus-gold/[0.08] p-5 sm:p-6">
          <p className="np-type-meta text-nexus-gold-bright">
            Recommended Executive Action
          </p>
          <p className="np-type-body mt-3 text-nexus-text-secondary">
            {recommendedAction}
          </p>
        </section>

        <section aria-labelledby="executive-priorities-heading">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="np-type-eyebrow">Priorities</p>
              <h3 id="executive-priorities-heading" className="mt-3 text-xl font-black text-white">
                Procurement response priorities
              </h3>
            </div>
            <ExecutiveBadge tone="neutral" size="sm">
              {recommendations.length} Signals
            </ExecutiveBadge>
          </div>

          <div className="mt-4 space-y-3">
            {recommendations.length > 0 ? (
              recommendations.map((item) => (
                <article
                  key={item.id}
                  className="rounded-executive border border-white/10 bg-black/20 p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="np-type-meta">Priority {item.rank}</p>
                      <h4 className="mt-2 text-base font-black leading-tight text-white">
                        {item.title}
                      </h4>
                    </div>
                    <ExecutiveBadge tone="blue" size="sm">
                      {item.value}
                    </ExecutiveBadge>
                  </div>
                  <p className="np-type-body mt-3 text-nexus-text-muted">
                    {item.detail}
                  </p>
                </article>
              ))
            ) : (
              <div className="rounded-executive border border-dashed border-white/15 bg-white/[0.035] px-5 py-8 text-center">
                <ExecutiveBadge tone="success" size="sm">
                  No Priority Queue
                </ExecutiveBadge>
                <p className="np-type-body mt-3">
                  No procurement response priority is queued.
                </p>
              </div>
            )}
          </div>
        </section>
      </div>
    </ExecutivePanel>
  );
}
