import { ExecutiveActionCard } from "@/components/executive/executive-action-card";
import { ExecutiveInsightCard } from "@/components/executive/executive-insight-card";
import { ExecutiveMetricCard } from "@/components/executive/executive-metric-card";
import { ExecutivePanel } from "@/components/executive/executive-panel";

type CEOAction = {
  phase: string;
  title: string;
  summary: string;
};

type CEOActionCenterProps = {
  ceoOperatingStatus: string;
  ceoDecisionPosture: string;
  executiveBenchmarkStatus: string;
  executiveCommandRecommendation: string;
  ceoActionCenter: CEOAction[];
};

export function CEOActionCenter({
  ceoOperatingStatus,
  ceoDecisionPosture,
  executiveBenchmarkStatus,
  executiveCommandRecommendation,
  ceoActionCenter,
}: CEOActionCenterProps) {
  return (
    <ExecutivePanel
      variant="boardroom"
      padding="lg"
      tone="gold"
      aria-label="Chief Executive Action Dashboard"
    >
      <header className="grid min-w-0 gap-6 border-b border-white/10 pb-7 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-end">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-3">
            <p className="text-[10px] font-black uppercase tracking-[0.28em] text-nexus-gold sm:text-xs">
              CEO Action Center
            </p>

            <span
              aria-hidden="true"
              className="hidden h-1 w-1 rounded-full bg-white/20 sm:block"
            />

            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-nexus-muted">
              Executive decision authority
            </p>
          </div>

          <h2 className="mt-4 max-w-4xl text-3xl font-black leading-[1.08] tracking-tight text-nexus-white sm:text-4xl lg:text-5xl">
            Chief Executive Action Dashboard
          </h2>

          <p className="mt-4 max-w-4xl text-sm font-semibold leading-7 text-nexus-muted sm:text-base">
            A decision-control layer translating procurement intelligence,
            operating posture, risk exposure, and opportunity signals into an
            ordered CEO action agenda.
          </p>
        </div>

        <div className="flex items-center gap-3 rounded-2xl border border-emerald-300/15 bg-emerald-400/[0.045] px-4 py-3 xl:justify-end">
          <span className="relative flex h-2.5 w-2.5 shrink-0">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-300 opacity-30" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-300" />
          </span>

          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-nexus-muted">
              Decision layer
            </p>

            <p className="mt-1 text-xs font-black uppercase tracking-[0.15em] text-emerald-300">
              Active and decision-ready
            </p>
          </div>
        </div>
      </header>

      <section
        aria-labelledby="ceo-leadership-posture-heading"
        className="mt-7 min-w-0 rounded-3xl border border-white/10 bg-white/[0.025] p-5 sm:p-6"
      >
        <div className="flex flex-col gap-3 border-b border-white/10 pb-5 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-nexus-gold">
              Executive control position
            </p>

            <h3
              id="ceo-leadership-posture-heading"
              className="mt-2 text-lg font-black tracking-tight text-nexus-white sm:text-xl"
            >
              Current Leadership Posture
            </h3>
          </div>

          <p className="max-w-xl text-xs font-semibold leading-5 text-nexus-muted sm:text-right">
            Consolidated view of enterprise operating status, decision
            authority, and comparative procurement readiness.
          </p>
        </div>

        <div className="mt-5 grid min-w-0 gap-4 lg:grid-cols-3">
          <ExecutiveMetricCard
            label="Operating Status"
            value={ceoOperatingStatus}
            tone="blue"
          />

          <ExecutiveMetricCard
            label="Decision Posture"
            value={ceoDecisionPosture}
            tone="gold"
          />

          <ExecutiveMetricCard
            label="Benchmark Status"
            value={executiveBenchmarkStatus}
            tone="success"
          />
        </div>
      </section>

      <div className="mt-7 grid min-w-0 items-start gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(360px,0.8fr)]">
        <section
          aria-labelledby="ceo-priority-sequence-heading"
          className="min-w-0 rounded-3xl border border-white/10 bg-white/[0.025] p-5 sm:p-6"
        >
          <div className="flex flex-col gap-3 border-b border-white/10 pb-5 sm:flex-row sm:items-end sm:justify-between">
            <div className="min-w-0">
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-nexus-gold">
                Executive priority sequence
              </p>

              <h3
                id="ceo-priority-sequence-heading"
                className="mt-2 text-lg font-black tracking-tight text-nexus-white sm:text-xl"
              >
                Recommended CEO Action Portfolio
              </h3>
            </div>

            <span className="w-fit rounded-full border border-nexus-gold/20 bg-nexus-gold/[0.07] px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.16em] text-nexus-gold">
              {ceoActionCenter.length} priorities
            </span>
          </div>

          <div className="mt-5 grid min-w-0 gap-4 md:grid-cols-2">
            {ceoActionCenter.map((action, index) => (
              <article
                key={action.phase}
                className="relative min-w-0 rounded-3xl border border-white/10 bg-black/10 p-4 sm:p-5"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-nexus-gold/20 bg-nexus-gold/[0.07] text-[10px] font-black tabular-nums text-nexus-gold">
                    {String(index + 1).padStart(2, "0")}
                  </span>

                  <div className="min-w-0">
                    <p className="text-[10px] font-black uppercase tracking-[0.18em] text-nexus-muted">
                      Decision horizon
                    </p>

                    <p className="mt-1 break-words text-xs font-black uppercase tracking-[0.14em] text-nexus-white [overflow-wrap:anywhere]">
                      {action.phase}
                    </p>
                  </div>
                </div>

                <div
                  aria-hidden="true"
                  className="my-4 h-px bg-gradient-to-r from-nexus-gold/25 via-white/10 to-transparent"
                />

                <ExecutiveActionCard
                  title={action.title}
                  description={action.summary}
                  actionLabel={action.phase}
                  priority="high"
                  impact="Executive priority is ready for review."
                />
              </article>
            ))}
          </div>
        </section>

        <aside
          aria-labelledby="ceo-command-directive-heading"
          className="min-w-0 rounded-3xl border border-nexus-gold/20 bg-nexus-gold/[0.04] p-5 sm:p-6"
        >
          <div className="border-b border-white/10 pb-5">
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-nexus-gold">
              Executive command directive
            </p>

            <h3
              id="ceo-command-directive-heading"
              className="mt-2 text-lg font-black tracking-tight text-nexus-white sm:text-xl"
            >
              Recommended Leadership Response
            </h3>

            <p className="mt-3 text-xs font-semibold leading-5 text-nexus-muted">
              Final executive interpretation requiring leadership review,
              authorization, and accountable action ownership.
            </p>
          </div>

          <div className="mt-5">
            <ExecutiveInsightCard
              title={ceoDecisionPosture}
              insight={executiveCommandRecommendation}
              recommendation="Review top procurement priorities and approve the next executive action sequence."
              impact="CEO decision layer is active."
              tone="gold"
            />
          </div>

          <div className="mt-5 border-t border-white/10 pt-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-nexus-muted">
                Authorization sequence
              </p>

              <p className="text-[10px] font-black uppercase tracking-[0.14em] text-nexus-gold">
                Decision authority required
              </p>
            </div>

            <ol className="mt-4 grid min-w-0 gap-3">
              {ceoActionCenter.map((action, index) => (
                <li
                  key={`directive-${action.phase}`}
                  className="flex min-w-0 items-center gap-3 rounded-2xl border border-white/10 bg-black/10 px-4 py-3"
                >
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/5 text-[9px] font-black tabular-nums text-nexus-white">
                    {String(index + 1).padStart(2, "0")}
                  </span>

                  <div className="min-w-0">
                    <p className="break-words text-[10px] font-black uppercase tracking-[0.14em] text-nexus-gold [overflow-wrap:anywhere]">
                      {action.phase}
                    </p>

                    <p className="mt-1 break-words text-xs font-bold leading-5 text-nexus-white [overflow-wrap:anywhere]">
                      {action.title}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </aside>
      </div>
    </ExecutivePanel>
  );
}