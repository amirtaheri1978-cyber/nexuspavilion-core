import { ExecutiveBadge } from "@/components/executive/executive-badge";
import { ExecutiveMetricCard } from "@/components/executive/executive-metric-card";
import { ExecutiveMiniTile } from "@/components/rfq-workspace/shared/executive-mini-tile";
import { ExecutivePanel } from "@/components/executive/executive-panel";

type ExecutiveMetricTone = "neutral" | "blue" | "gold" | "risk" | "success";

type DecisionSignalKind = "warning" | "opportunity" | "healthy";

type ExecutiveDecisionWorkspaceProps = {
  title: string;
  summary: string;
  recommendedAction: string;
  status: {
    label: string;
    tone: "success" | "warning";
  };
  metrics: {
    label: string;
    value: string;
    tone: ExecutiveMetricTone;
  }[];
  signals: {
    id: string;
    rank: number;
    kind: DecisionSignalKind;
    title: string;
    description: string;
    priorityLabel: string;
    recommendedResponse: string;
  }[];
  health: {
    score: number;
    status: string;
    riskIndex: string;
    decisionDataConfidence: string;
    awardRate: string;
    rfqMaturity: string;
  };
};

const signalDotClass: Record<DecisionSignalKind, string> = {
  healthy: "bg-emerald-400",
  opportunity: "bg-amber-400",
  warning: "bg-red-400",
};

const signalTone: Record<
  DecisionSignalKind,
  "success" | "warning"
> = {
  healthy: "success",
  opportunity: "warning",
  warning: "warning",
};

export function ExecutiveDecisionWorkspace({
  title,
  summary,
  recommendedAction,
  status,
  metrics,
  signals,
  health,
}: ExecutiveDecisionWorkspaceProps) {
  return (
    <ExecutivePanel
      variant="executive"
      padding="lg"
      tone="gold"
      className="mt-6 bg-gradient-to-br from-[#0B3D91]/25 via-[#07111F]/95 to-[#061426]"
    >
      <div className="flex flex-col gap-4 border-b border-white/10 pb-6 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.34em] text-[#C8A646]">
            Executive Decision Workspace
          </p>

          <h2 className="mt-4 text-3xl font-black leading-tight text-white sm:text-4xl">
            {title}
          </h2>

          <p className="mt-4 max-w-5xl text-sm font-semibold leading-7 text-slate-300 sm:text-base sm:leading-8">
            {summary}
          </p>
        </div>

        <ExecutiveBadge tone={status.tone} size="md">
          {status.label}
        </ExecutiveBadge>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <section className="min-w-0">
          <div className="rounded-[26px] border border-[#C8A646]/20 bg-[#C8A646]/[0.08] p-5 sm:p-6">
            <p className="text-[10px] font-black uppercase tracking-[0.24em] text-[#F5D77B]">
              Recommended Executive Action
            </p>

            <p className="mt-3 text-sm font-semibold leading-7 text-slate-200">
              {recommendedAction}
            </p>
          </div>

          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            {metrics.map((metric) => (
              <ExecutiveMetricCard
                key={metric.label}
                label={metric.label}
                value={metric.value}
                tone={metric.tone}
              />
            ))}
          </div>

          <div className="mt-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.28em] text-[#C8A646]">
                  CEO Action Center
                </p>

                <h3 className="mt-3 text-2xl font-black text-white">
                  Executive Decision Signals
                </h3>
              </div>

              <ExecutiveBadge tone="neutral" size="md">
                {signals.length} Signals
              </ExecutiveBadge>
            </div>

            <div className="mt-5 grid gap-4 lg:grid-cols-2">
              {signals.length > 0 ? (
                signals.map((signal) => (
                  <DecisionSignalCard key={signal.id} signal={signal} />
                ))
              ) : (
                <div className="lg:col-span-2 rounded-[24px] border border-dashed border-white/15 bg-white/[0.035] p-8 text-center">
                  <ExecutiveBadge tone="success" size="sm">
                    No Immediate Executive Action
                  </ExecutiveBadge>

                  <p className="mt-3 text-sm font-semibold text-slate-400">
                    No current decision signal requires executive intervention.
                  </p>
                </div>
              )}
            </div>
          </div>
        </section>

        <aside className="rounded-[30px] border border-white/10 bg-black/20 p-5 sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between xl:flex-col">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.28em] text-[#C8A646]">
                Portfolio Health Context
              </p>

              <h3 className="mt-3 text-2xl font-black text-white">
                Executive Operating Score
              </h3>
            </div>

            <ExecutiveBadge
              tone={health.score >= 55 ? "success" : "warning"}
              size="sm"
            >
              {health.status}
            </ExecutiveBadge>
          </div>

          <div className="mt-6 rounded-[28px] border border-[#C8A646]/20 bg-[#C8A646]/10 p-6">
            <p className="text-[11px] font-black uppercase tracking-[0.28em] text-[#F5D77B]">
              Overall Health
            </p>

            <p className="mt-3 text-5xl font-black tabular-nums text-white sm:text-6xl">
              {health.score}
              <span className="text-2xl text-slate-500">/100</span>
            </p>

            <p className="mt-4 text-sm font-semibold leading-7 text-slate-300">
              Portfolio health combines award progression, supplier activity,
              awarded outcomes, budget variance signals, and RFQ classification
              maturity.
            </p>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
            <ExecutiveMiniTile
              title="Risk Index"
              value={health.riskIndex}
            />
            <ExecutiveMiniTile
              title="Decision Data Confidence"
              value={health.decisionDataConfidence}
            />
            <ExecutiveMiniTile
              title="Award Rate"
              value={health.awardRate}
            />
            <ExecutiveMiniTile
              title="RFQ Maturity"
              value={health.rfqMaturity}
            />
          </div>
        </aside>
      </div>
    </ExecutivePanel>
  );
}

function DecisionSignalCard({
  signal,
}: {
  signal: ExecutiveDecisionWorkspaceProps["signals"][number];
}) {
  return (
    <article className="rounded-[24px] border border-white/10 bg-white/[0.045] p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <span
            aria-hidden="true"
            className={`h-3 w-3 rounded-full ${signalDotClass[signal.kind]}`}
          />

          <ExecutiveBadge tone={signalTone[signal.kind]} size="sm">
            {signal.priorityLabel}
          </ExecutiveBadge>
        </div>

        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">
          #{signal.rank}
        </span>
      </div>

      <h4 className="mt-5 text-lg font-black leading-tight text-white">
        {signal.title}
      </h4>

      <p className="mt-3 text-sm font-semibold leading-7 text-slate-400">
        {signal.description}
      </p>

      <div className="mt-5 rounded-2xl border border-white/10 bg-black/20 p-4">
        <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#C8A646]">
          Recommended Response
        </p>

        <p className="mt-2 text-sm font-bold leading-6 text-slate-300">
          {signal.recommendedResponse}
        </p>
      </div>
    </article>
  );
}