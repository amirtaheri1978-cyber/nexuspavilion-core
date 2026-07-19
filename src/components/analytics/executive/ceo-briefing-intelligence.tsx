type CEOMorningBriefingProps = {
  ceoMorningBrief: string;
  ceoReadinessScore: number;
  ceoPriorityLevel: string;
  ceoRiskLevel: string;
  ceoOpportunityLevel: string;
  ceoPriorityQueue: string[];
  ceoCriticalRisks: string[];
  ceoStrategicOpportunities: string[];
};

type BriefingMetricTone = "gold" | "cyan" | "risk" | "opportunity";

type BriefingListTone = "priority" | "risk" | "opportunity";

export default function CEOMorningBriefing({
  ceoMorningBrief,
  ceoReadinessScore,
  ceoPriorityLevel,
  ceoRiskLevel,
  ceoOpportunityLevel,
  ceoPriorityQueue,
  ceoCriticalRisks,
  ceoStrategicOpportunities,
}: CEOMorningBriefingProps) {
  return (
    <section
      aria-labelledby="ceo-morning-brief-title"
      className="relative mt-6 overflow-hidden rounded-[1.75rem] border border-white/10 bg-[#061426]/88 text-white shadow-executive"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#C8A646]/60 to-transparent"
      />

      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full bg-[#2CC4E8]/[0.045] blur-3xl"
      />

      <header className="relative border-b border-white/10 px-5 py-5 sm:px-6 sm:py-6 lg:px-7">
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-end">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-3">
              <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[#C8A646]">
                CEO Briefing Intelligence
              </p>

              <span
                aria-hidden="true"
                className="hidden h-1 w-1 rounded-full bg-white/20 sm:block"
              />

              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                Current leadership posture
              </p>
            </div>

            <h2
              id="ceo-morning-brief-title"
              className="mt-3 text-2xl font-semibold tracking-tight text-white sm:text-3xl"
            >
              Executive Morning Brief
            </h2>

            <p className="mt-3 max-w-4xl text-sm font-medium leading-7 text-slate-300">
              {ceoMorningBrief}
            </p>
          </div>

          <div className="flex items-center gap-3 rounded-2xl border border-[#C8A646]/20 bg-[#C8A646]/[0.07] px-4 py-3">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#E4C768]">
                CEO Readiness
              </p>

              <p className="mt-1 text-2xl font-semibold tabular-nums text-white">
                {ceoReadinessScore}/100
              </p>
            </div>

            <span
              aria-hidden="true"
              className="h-10 w-px bg-white/10"
            />

            <div className="max-w-44">
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                Operating priority
              </p>

              <p className="mt-1 text-sm font-semibold leading-5 text-slate-200">
                {ceoPriorityLevel}
              </p>
            </div>
          </div>
        </div>
      </header>

      <div className="relative px-5 py-5 sm:px-6 sm:py-6 lg:px-7">
        <section
          aria-label="Executive posture indicators"
          className="grid gap-3 sm:grid-cols-3"
        >
          <BriefingMetric
            title="Leadership Priority"
            value={ceoPriorityLevel}
            tone="gold"
          />

          <BriefingMetric
            title="Risk Position"
            value={ceoRiskLevel}
            tone="risk"
          />

          <BriefingMetric
            title="Opportunity Position"
            value={ceoOpportunityLevel}
            tone="opportunity"
          />
        </section>

        <section
          aria-label="Executive briefing actions"
          className="mt-5 grid gap-4 xl:grid-cols-3"
        >
          <BriefingList
            title="Priority Queue"
            description="Items requiring leadership sequencing and executive ownership."
            items={ceoPriorityQueue}
            tone="priority"
          />

          <BriefingList
            title="Critical Risks"
            description="Material exposure requiring monitoring, validation, or mitigation."
            items={ceoCriticalRisks}
            tone="risk"
          />

          <BriefingList
            title="Strategic Opportunities"
            description="Commercial and operational opportunities with executive relevance."
            items={ceoStrategicOpportunities}
            tone="opportunity"
          />
        </section>
      </div>
    </section>
  );
}

function BriefingMetric({
  title,
  value,
  tone,
}: {
  title: string;
  value: string;
  tone: BriefingMetricTone;
}) {
  const toneClasses: Record<
    BriefingMetricTone,
    {
      border: string;
      background: string;
      label: string;
      indicator: string;
    }
  > = {
    gold: {
      border: "border-[#C8A646]/20",
      background: "bg-[#C8A646]/[0.055]",
      label: "text-[#E4C768]",
      indicator: "bg-[#C8A646]",
    },
    cyan: {
      border: "border-[#2CC4E8]/20",
      background: "bg-[#2CC4E8]/[0.055]",
      label: "text-[#9BE8F8]",
      indicator: "bg-[#2CC4E8]",
    },
    risk: {
      border: "border-rose-300/15",
      background: "bg-rose-400/[0.045]",
      label: "text-rose-200",
      indicator: "bg-rose-300",
    },
    opportunity: {
      border: "border-emerald-300/15",
      background: "bg-emerald-400/[0.045]",
      label: "text-emerald-200",
      indicator: "bg-emerald-300",
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

        <p className="mt-2 break-words text-lg font-semibold leading-6 text-white [overflow-wrap:anywhere]">
          {value}
        </p>
      </div>
    </article>
  );
}

function BriefingList({
  title,
  description,
  items,
  tone,
}: {
  title: string;
  description: string;
  items: string[];
  tone: BriefingListTone;
}) {
  const toneClasses: Record<
    BriefingListTone,
    {
      border: string;
      background: string;
      label: string;
      number: string;
      rowBorder: string;
      rowBackground: string;
    }
  > = {
    priority: {
      border: "border-[#C8A646]/15",
      background: "bg-[#C8A646]/[0.035]",
      label: "text-[#E4C768]",
      number:
        "border-[#C8A646]/20 bg-[#C8A646]/10 text-[#E4C768]",
      rowBorder: "border-white/10",
      rowBackground: "bg-[#07111F]/70",
    },
    risk: {
      border: "border-rose-300/15",
      background: "bg-rose-400/[0.03]",
      label: "text-rose-200",
      number: "border-rose-300/20 bg-rose-400/10 text-rose-200",
      rowBorder: "border-white/10",
      rowBackground: "bg-[#07111F]/70",
    },
    opportunity: {
      border: "border-emerald-300/15",
      background: "bg-emerald-400/[0.03]",
      label: "text-emerald-200",
      number:
        "border-emerald-300/20 bg-emerald-400/10 text-emerald-200",
      rowBorder: "border-white/10",
      rowBackground: "bg-[#07111F]/70",
    },
  };

  const classes = toneClasses[tone];

  return (
    <article
      className={`min-w-0 rounded-2xl border ${classes.border} ${classes.background} p-4 sm:p-5`}
    >
      <div className="border-b border-white/10 pb-4">
        <p
          className={`text-[10px] font-semibold uppercase tracking-[0.18em] ${classes.label}`}
        >
          {title}
        </p>

        <p className="mt-2 text-xs font-medium leading-5 text-slate-500">
          {description}
        </p>
      </div>

      <ol className="mt-4 space-y-2.5">
        {items.map((item, index) => (
          <li
            key={`${title}-${item}`}
            className={`flex min-w-0 items-start gap-3 rounded-xl border ${classes.rowBorder} ${classes.rowBackground} px-3.5 py-3`}
          >
            <span
              aria-hidden="true"
              className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-[9px] font-semibold tabular-nums ${classes.number}`}
            >
              {String(index + 1).padStart(2, "0")}
            </span>

            <p className="min-w-0 break-words pt-0.5 text-sm font-medium leading-5 text-slate-300 [overflow-wrap:anywhere]">
              {item}
            </p>
          </li>
        ))}
      </ol>
    </article>
  );
}