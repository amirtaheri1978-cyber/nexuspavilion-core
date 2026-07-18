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
      <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-end">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-3">
            <p className="text-[10px] font-black uppercase tracking-[0.25em] text-nexus-gold">
              CEO Action Center
            </p>

            <span
              aria-hidden="true"
              className="h-px w-10 bg-gradient-to-r from-nexus-gold/80 to-transparent"
            />

            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-nexus-muted">
              Executive Decision Authority
            </p>
          </div>

          <h2 className="mt-4 max-w-4xl text-3xl font-black tracking-tight text-nexus-white sm:text-4xl">
            Chief Executive Action Dashboard
          </h2>

          <p className="mt-4 max-w-4xl text-sm font-semibold leading-7 text-nexus-muted sm:text-base">
            Executive operating layer translating procurement intelligence,
            risk posture, confidence signals, and opportunity rankings into
            actionable CEO priorities.
          </p>
        </div>

        <div className="flex items-center gap-3 xl:justify-end">
          <span className="relative flex h-2.5 w-2.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-300 opacity-40" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-300" />
          </span>

          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-nexus-muted">
              Decision Layer
            </p>
            <p className="mt-1 text-xs font-black uppercase tracking-[0.16em] text-emerald-300">
              Active
            </p>
          </div>
        </div>
      </div>

      <section
        aria-labelledby="ceo-leadership-posture-heading"
        className="mt-10"
      >
        <div className="flex flex-col gap-3 border-b border-white/10 pb-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-nexus-muted">
              Leadership Posture
            </p>

            <h3
              id="ceo-leadership-posture-heading"
              className="mt-2 text-lg font-black tracking-tight text-nexus-white"
            >
              Current Executive Operating Position
            </h3>
          </div>

          <p className="max-w-xl text-xs font-semibold leading-5 text-nexus-muted sm:text-right">
            Consolidated view of organizational readiness, decision posture,
            and comparative procurement performance.
          </p>
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-3">
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

      <section
        aria-labelledby="ceo-priority-sequence-heading"
        className="mt-10"
      >
        <div className="flex flex-col gap-3 border-b border-white/10 pb-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-nexus-muted">
              Executive Priority Sequence
            </p>

            <h3
              id="ceo-priority-sequence-heading"
              className="mt-2 text-lg font-black tracking-tight text-nexus-white"
            >
              Recommended CEO Action Portfolio
            </h3>
          </div>

          <div className="flex items-center gap-3 sm:justify-end">
            <span className="rounded-full border border-nexus-gold/25 bg-nexus-gold/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.18em] text-nexus-gold">
              {ceoActionCenter.length} Executive Priorities
            </span>
          </div>
        </div>

        <div className="mt-6 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          {ceoActionCenter.map((action, index) => (
            <div key={action.phase} className="min-w-0">
              <div className="mb-3 flex items-center gap-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/5 text-[10px] font-black text-nexus-white">
                  {String(index + 1).padStart(2, "0")}
                </span>

                <span className="h-px flex-1 bg-gradient-to-r from-white/15 to-transparent" />
              </div>

              <ExecutiveActionCard
                title={action.title}
                description={action.summary}
                actionLabel={action.phase}
                priority="high"
                impact="Executive priority is ready for review."
              />
            </div>
          ))}
        </div>
      </section>

      <section
        aria-labelledby="ceo-command-directive-heading"
        className="mt-10 border-t border-white/10 pt-8"
      >
        <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-nexus-gold">
              Executive Command Directive
            </p>

            <h3
              id="ceo-command-directive-heading"
              className="mt-2 text-lg font-black tracking-tight text-nexus-white"
            >
              Recommended Leadership Response
            </h3>
          </div>

          <p className="text-xs font-bold uppercase tracking-[0.16em] text-nexus-muted">
            Decision authority required
          </p>
        </div>

        <ExecutiveInsightCard
          title={ceoDecisionPosture}
          insight={executiveCommandRecommendation}
          recommendation="Review top procurement priorities and approve the next executive action sequence."
          impact="CEO decision layer is active."
          tone="gold"
        />
      </section>
    </ExecutivePanel>
  );
}