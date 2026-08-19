import { ExecutiveBadge } from "@/components/executive/executive-badge";
import { ExecutiveMetricCard } from "@/components/executive/executive-metric-card";
import { ExecutivePanel } from "@/components/executive/executive-panel";
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
  primaryMetrics: {
    label: string;
    value: string;
    insight: string;
    tone: ExecutiveMetricTone;
  }[];
  operatingMetrics: {
    title: string;
    value: string;
    insight: string;
    tone: ExecutiveMetricTone;
  }[];
};

export function StrategicIntelligenceWorkspace({
  narrative,
  availability,
  portfolioSignals,
  primaryMetrics,
  operatingMetrics,
}: StrategicIntelligenceWorkspaceProps) {
  return (
    <ExecutivePanel
      variant="boardroom"
      padding="lg"
      tone="gold"
      className="np-region-major"
      aria-labelledby="executive-position-heading"
    >
      <div className="flex flex-col gap-4 border-b border-white/10 pb-6 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="np-type-eyebrow">Portfolio</p>
          <h2 id="executive-position-heading" className="np-type-h2 mt-3">
            Boardroom procurement position
          </h2>
          <p className="np-type-body mt-4 max-w-4xl">
            Leadership interpretation of recorded procurement activity. No
            synthetic market benchmarks are introduced on this page.
          </p>
        </div>

        <ExecutiveBadge tone={availability.tone} size="md">
          {availability.label}
        </ExecutiveBadge>
      </div>

      <section className="mt-6 rounded-executive border border-nexus-gold/20 bg-nexus-gold/[0.07] p-6 sm:p-7">
        <p className="np-type-meta text-nexus-gold-bright">Board Summary</p>
        <p className="mt-4 text-base font-semibold leading-8 text-nexus-text-secondary">
          {narrative}
        </p>
      </section>

      <div className="mt-5 overflow-hidden rounded-executive border border-white/10 bg-white/[0.035]">
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

      <section className="mt-8 border-t border-white/10 pt-7" aria-labelledby="executive-evidence-heading">
        <p className="np-type-eyebrow">Evidence</p>
        <h3 id="executive-evidence-heading" className="mt-3 text-xl font-black text-white sm:text-2xl">
          Recorded commercial evidence
        </h3>
        <p className="np-type-body mt-3 max-w-4xl">
          Verified workspace totals supporting the board summary. Period-over-period
          deltas are not shown because they are not calculated.
        </p>

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
            <ExecutiveMetricCard
              key={metric.title}
              label={metric.title}
              value={metric.value}
              insight={metric.insight}
              tone={metric.tone}
            />
          ))}
        </div>
      </section>
    </ExecutivePanel>
  );
}
