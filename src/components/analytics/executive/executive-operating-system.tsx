type ExecutiveOperatingSystemProps = {
  boardHealthIndex: number;
  benchmarkReadinessScore: number;
  enterpriseCommandStatus: string;
  riskCommandStatus: string;
  opportunityCommandStatus: string;
  executiveCommandRecommendation: string;
};

type CommandSignalTone = "gold" | "cyan" | "risk" | "opportunity" | "neutral";

export default function ExecutiveOperatingSystem({
  boardHealthIndex,
  benchmarkReadinessScore,
  enterpriseCommandStatus,
  riskCommandStatus,
  opportunityCommandStatus,
  executiveCommandRecommendation,
}: ExecutiveOperatingSystemProps) {
  return (
    <section
      aria-labelledby="enterprise-command-layer-title"
      className="relative mt-6 overflow-hidden rounded-[1.75rem] border border-white/10 bg-[#061426]/88 text-white shadow-executive"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#2CC4E8]/45 to-transparent"
      />

      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-24 -left-24 h-64 w-64 rounded-full bg-[#C8A646]/[0.035] blur-3xl"
      />

      <header className="relative border-b border-white/10 px-5 py-5 sm:px-6 sm:py-6 lg:px-7">
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-end">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-3">
              <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[#9BE8F8]">
                Executive Operating System
              </p>

              <span
                aria-hidden="true"
                className="hidden h-1 w-1 rounded-full bg-white/20 sm:block"
              />

              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                Enterprise command posture
              </p>
            </div>

            <h2
              id="enterprise-command-layer-title"
              className="mt-3 text-2xl font-semibold tracking-tight text-white sm:text-3xl"
            >
              Enterprise Command Layer
            </h2>

            <p className="mt-3 max-w-4xl text-sm font-medium leading-7 text-slate-300">
              Unified executive oversight across procurement performance,
              benchmark readiness, board health, enterprise risk, supplier
              engagement, and opportunity intelligence.
            </p>
          </div>

          <div className="flex items-center gap-3 rounded-2xl border border-[#2CC4E8]/20 bg-[#2CC4E8]/[0.055] px-4 py-3">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#9BE8F8]">
                Command posture
              </p>

              <p className="mt-1 max-w-48 text-sm font-semibold leading-5 text-white">
                {enterpriseCommandStatus}
              </p>
            </div>

            <span aria-hidden="true" className="h-10 w-px bg-white/10" />

            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                Board health
              </p>

              <p className="mt-1 text-xl font-semibold tabular-nums text-white">
                {boardHealthIndex}/100
              </p>
            </div>
          </div>
        </div>
      </header>

      <div className="relative px-5 py-5 sm:px-6 sm:py-6 lg:px-7">
        <section
          aria-label="Enterprise command signals"
          className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"
        >
          <CommandSignal
            title="Board Health"
            value={`${boardHealthIndex}/100`}
            description="Consolidated governance and executive operating health."
            tone="gold"
          />

          <CommandSignal
            title="Benchmark Readiness"
            value={`${benchmarkReadinessScore}/100`}
            description="Readiness for credible executive and peer-level comparison."
            tone="cyan"
          />

          <CommandSignal
            title="Risk Position"
            value={riskCommandStatus}
            description="Current enterprise procurement risk posture."
            tone="risk"
          />

          <CommandSignal
            title="Opportunity Position"
            value={opportunityCommandStatus}
            description="Current commercial and procurement opportunity posture."
            tone="opportunity"
          />
        </section>

        <section
          aria-labelledby="executive-command-recommendation-title"
          className="mt-5 grid gap-4 rounded-2xl border border-[#C8A646]/20 bg-[#C8A646]/[0.045] p-4 sm:p-5 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center"
        >
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#E4C768]">
              Executive Recommendation
            </p>

            <h3
              id="executive-command-recommendation-title"
              className="mt-2 text-lg font-semibold tracking-tight text-white"
            >
              Recommended enterprise response
            </h3>

            <p className="mt-3 max-w-4xl text-sm font-medium leading-7 text-slate-300">
              {executiveCommandRecommendation}
            </p>
          </div>

          <div className="min-w-0 rounded-xl border border-white/10 bg-[#07111F]/70 px-4 py-3 lg:max-w-60">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
              Decision context
            </p>

            <p className="mt-2 text-sm font-semibold leading-5 text-white">
              {enterpriseCommandStatus}
            </p>

            <p className="mt-1 text-xs font-medium leading-5 text-slate-500">
              Benchmark readiness is currently{" "}
              <span className="font-semibold text-slate-300">
                {benchmarkReadinessScore}/100
              </span>
              .
            </p>
          </div>
        </section>
      </div>
    </section>
  );
}

function CommandSignal({
  title,
  value,
  description,
  tone,
}: {
  title: string;
  value: string;
  description: string;
  tone: CommandSignalTone;
}) {
  const toneClasses: Record<
    CommandSignalTone,
    {
      border: string;
      background: string;
      label: string;
      indicator: string;
      value: string;
    }
  > = {
    gold: {
      border: "border-[#C8A646]/18",
      background: "bg-[#C8A646]/[0.04]",
      label: "text-[#E4C768]",
      indicator: "bg-[#C8A646]",
      value: "text-white",
    },
    cyan: {
      border: "border-[#2CC4E8]/18",
      background: "bg-[#2CC4E8]/[0.04]",
      label: "text-[#9BE8F8]",
      indicator: "bg-[#2CC4E8]",
      value: "text-white",
    },
    risk: {
      border: "border-rose-300/15",
      background: "bg-rose-400/[0.035]",
      label: "text-rose-200",
      indicator: "bg-rose-300",
      value: "text-white",
    },
    opportunity: {
      border: "border-emerald-300/15",
      background: "bg-emerald-400/[0.035]",
      label: "text-emerald-200",
      indicator: "bg-emerald-300",
      value: "text-white",
    },
    neutral: {
      border: "border-white/10",
      background: "bg-white/[0.035]",
      label: "text-slate-400",
      indicator: "bg-slate-500",
      value: "text-white",
    },
  };

  const classes = toneClasses[tone];

  return (
    <article
      className={`relative min-w-0 overflow-hidden rounded-2xl border ${classes.border} ${classes.background} px-4 py-4`}
    >
      <span
        aria-hidden="true"
        className={`absolute inset-y-0 left-0 w-0.5 ${classes.indicator}`}
      />

      <div className="pl-1">
        <p
          className={`text-[10px] font-semibold uppercase tracking-[0.16em] ${classes.label}`}
        >
          {title}
        </p>

        <p
          className={`mt-2 break-words text-lg font-semibold leading-6 tabular-nums [overflow-wrap:anywhere] ${classes.value}`}
        >
          {value}
        </p>

        <p className="mt-2 text-xs font-medium leading-5 text-slate-500">
          {description}
        </p>
      </div>
    </article>
  );
}