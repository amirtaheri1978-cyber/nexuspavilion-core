import { ExecutiveBadge } from "@/components/executive/executive-badge";
import { ExecutiveMetricCard } from "@/components/executive/executive-metric-card";
import { ExecutivePanel } from "@/components/executive/executive-panel";
import { ExecutiveCommandMetric } from "@/components/executive/workspace/executive-command-metric";
import { ExecutiveCommandStripCard } from "@/components/executive/workspace/executive-command-strip-card";

type ExecutiveMetricTone = "neutral" | "blue" | "gold" | "risk" | "success";

type StrategicIntelligenceWorkspaceProps = {
  narrative: string;
  availability: {
    label: string;
    tone: "board" | "warning";
  };
  portfolioSignals: {
    title: string;
    value: string;
  }[];
  recommendations: {
    id: string;
    rank: number;
    title: string;
    value: string;
    detail: string;
  }[];
  primaryMetrics: {
    label: string;
    value: string;
    insight: string;
    tone: ExecutiveMetricTone;
  }[];
  operatingMetrics: {
    title: string;
    value: string;
    detail: string;
    accentClassName: string;
  }[];
  supportingSignals: {
    title: string;
    value: string;
  }[];
};

export function StrategicIntelligenceWorkspace({
  narrative,
  availability,
  portfolioSignals,
  recommendations,
  primaryMetrics,
  operatingMetrics,
  supportingSignals,
}: StrategicIntelligenceWorkspaceProps) {
  return (
    <ExecutivePanel
      variant="boardroom"
      padding="lg"
      tone="gold"
      className="mt-8"
    >
      <div className="flex flex-col gap-4 border-b border-white/10 pb-6 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.28em] text-[#C8A646]">
            Strategic Intelligence
          </p>

          <h2 className="mt-3 text-3xl font-black leading-tight text-white sm:text-4xl">
            Boardroom Procurement Position
          </h2>

          <p className="mt-4 max-w-4xl text-sm font-semibold leading-7 text-slate-400">
            Leadership interpretation of procurement performance, commercial
            exposure, decision confidence, and recommended executive response.
          </p>
        </div>

        <ExecutiveBadge tone={availability.tone} size="md">
          {availability.label}
        </ExecutiveBadge>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <section className="min-w-0">
          <div className="rounded-[30px] border border-[#C8A646]/20 bg-[#C8A646]/[0.07] p-6 sm:p-7">
            <p className="text-[10px] font-black uppercase tracking-[0.28em] text-[#F5D77B]">
              Board Summary Narrative
            </p>

            <p className="mt-4 text-base font-semibold leading-8 text-slate-200">
              {narrative}
            </p>
          </div>

          <div className="mt-5 overflow-hidden rounded-[24px] border border-white/10 bg-white/[0.035]">
            <div className="grid sm:grid-cols-2 xl:grid-cols-4">
              {portfolioSignals.map((signal) => (
                <ExecutiveCommandStripCard
                  key={signal.title}
                  title={signal.title}
                  value={signal.value}
                />
              ))}
            </div>
          </div>
        </section>

        <aside className="rounded-[30px] border border-[#2CC4E8]/15 bg-[#2CC4E8]/[0.045] p-5 sm:p-6">
          <p className="text-[10px] font-black uppercase tracking-[0.28em] text-[#9BE8F8]">
            Executive Recommendation Signals
          </p>

          <h3 className="mt-3 text-2xl font-black text-white">
            Procurement Response Priorities
          </h3>

          <p className="mt-3 text-sm font-semibold leading-7 text-slate-400">
            Analytical recommendations supporting leadership review. These
            signals require executive validation before procurement action is
            approved.
          </p>

          <div className="mt-5 space-y-3">
            {recommendations.map((item) => (
              <article
                key={item.id}
                className="rounded-[22px] border border-white/10 bg-black/20 p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">
                      Priority {item.rank}
                    </p>

                    <h4 className="mt-2 text-base font-black leading-tight text-white">
                      {item.title}
                    </h4>
                  </div>

                  <ExecutiveBadge tone="blue" size="sm">
                    {item.value}
                  </ExecutiveBadge>
                </div>

                <p className="mt-3 text-sm font-semibold leading-6 text-slate-400">
                  {item.detail}
                </p>
              </article>
            ))}
          </div>
        </aside>
      </div>

      <section className="mt-8 border-t border-white/10 pt-7">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.28em] text-[#9BE8F8]">
            Supporting Executive Metrics
          </p>

          <h3 className="mt-3 text-2xl font-black text-white">
            Procurement Performance Evidence
          </h3>

          <p className="mt-3 max-w-4xl text-sm font-semibold leading-7 text-slate-400">
            Verified portfolio measures supporting the board narrative and
            executive recommendation signals above.
          </p>
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          {primaryMetrics.map((metric) => (
            <ExecutiveMetricCard
              key={metric.label}
              label={metric.label}
              value={metric.value}
              insight={metric.insight}
              tone={metric.tone}
            />
          ))}
        </div>

        <div className="mt-4 grid gap-4 md:grid-cols-3">
          {operatingMetrics.map((metric) => (
            <ExecutiveCommandMetric
              key={metric.title}
              title={metric.title}
              value={metric.value}
              detail={metric.detail}
              accentClassName={metric.accentClassName}
            />
          ))}
        </div>

        <div className="mt-4 overflow-hidden rounded-[24px] border border-white/10 bg-white/[0.035]">
          <div className="grid sm:grid-cols-2">
            {supportingSignals.map((signal) => (
              <ExecutiveCommandStripCard
                key={signal.title}
                title={signal.title}
                value={signal.value}
              />
            ))}
          </div>
        </div>
      </section>
    </ExecutivePanel>
  );
}