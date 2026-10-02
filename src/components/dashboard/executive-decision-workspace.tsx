import { ExecutiveBadge } from "@/components/executive/executive-badge";
import { ExecutivePanel } from "@/components/executive/executive-panel";
import {
  EXECUTIVE_CARD_INTELLIGENCE_CLASS,
  EXECUTIVE_CARD_ROLE_ELEVATION,
  EXECUTIVE_CARD_ROLE_RADIUS,
  EXECUTIVE_INTELLIGENCE_ACCENT_CLASS,
} from "@/lib/design-system/executive-contract";

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
      aria-labelledby="executive-decision-context-heading"
    >
      <div className="flex flex-col gap-3 border-b border-white/10 pb-5 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
        <div className="min-w-0">
          <p className="np-type-eyebrow">Decision Context</p>
          <h2
            id="executive-decision-context-heading"
            className="np-type-h2 mt-2 min-w-0 text-pretty break-words"
          >
            {title}
          </h2>
          <p className="np-type-body mt-3 max-w-5xl text-pretty text-nexus-text-secondary">
            {summary}
          </p>
        </div>

        <div className="shrink-0">
          <ExecutiveBadge tone={status.tone} size="md">
            {status.label}
          </ExecutiveBadge>
        </div>
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-[1.2fr_0.8fr] xl:items-start">
        <section
          aria-labelledby="executive-recommended-action-heading"
          className="rounded-executive border border-nexus-gold/30 bg-nexus-gold/[0.1] p-5 sm:p-6"
        >
          <p
            id="executive-recommended-action-heading"
            className={`np-type-meta ${EXECUTIVE_INTELLIGENCE_ACCENT_CLASS}`}
          >
            Recommended Action
          </p>
          <p className="np-type-body mt-3 text-pretty text-nexus-text-primary">
            {recommendedAction}
          </p>
          <p className="np-type-meta mt-4 text-nexus-text-muted">
            Guidance for review. Confirmation and authorization remain with the
            workspace operator.
          </p>
        </section>

        <section aria-labelledby="executive-signals-heading" className="min-w-0">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="np-type-eyebrow">Supporting Signals</p>
              <h3
                id="executive-signals-heading"
                className="np-type-h3 mt-2 text-pretty"
              >
                Decision signals
              </h3>
            </div>
            <ExecutiveBadge tone="neutral" size="sm">
              {recommendations.length} Signals
            </ExecutiveBadge>
          </div>

          <div className="mt-3 space-y-3">
            {recommendations.length > 0 ? (
              recommendations.map((item) => (
                <article
                  key={item.id}
                  className={[
                    "min-w-0 p-4 sm:p-5",
                    EXECUTIVE_CARD_INTELLIGENCE_CLASS,
                    EXECUTIVE_CARD_ROLE_RADIUS.intelligence,
                    EXECUTIVE_CARD_ROLE_ELEVATION.intelligence,
                  ].join(" ")}
                >
                  <div className="flex min-w-0 items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p
                        className={`np-type-meta ${EXECUTIVE_INTELLIGENCE_ACCENT_CLASS}`}
                      >
                        Signal {item.rank}
                      </p>
                      <h4 className="np-type-h3 mt-2 min-w-0 text-pretty break-words">
                        {item.title}
                      </h4>
                    </div>
                    <div className="shrink-0">
                      <ExecutiveBadge tone="blue" size="sm">
                        {item.value}
                      </ExecutiveBadge>
                    </div>
                  </div>
                  <p className="np-type-body mt-3 text-pretty text-nexus-text-muted">
                    {item.detail}
                  </p>
                </article>
              ))
            ) : (
              <div className="rounded-executive border border-dashed border-white/15 bg-white/[0.035] px-5 py-8 text-center">
                <ExecutiveBadge tone="success" size="sm">
                  No Decision Signals
                </ExecutiveBadge>
                <p className="np-type-body mt-3">
                  No supporting decision signals are available from recorded
                  data.
                </p>
              </div>
            )}
          </div>
        </section>
      </div>
    </ExecutivePanel>
  );
}
