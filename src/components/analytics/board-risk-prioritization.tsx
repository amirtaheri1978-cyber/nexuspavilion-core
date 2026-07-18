import { ExecutivePanel } from "@/components/executive/executive-panel";

type BoardRisk = {
  title: string;
  priority: string;
  attention: string;
  summary: string;
  impact: string;
};

type BoardRiskPrioritizationProps = {
  boardRiskPriorities: BoardRisk[];
};

export function BoardRiskPrioritization({
  boardRiskPriorities,
}: BoardRiskPrioritizationProps) {
  const topRisk = boardRiskPriorities[0];
  const hasData = boardRiskPriorities.length > 0;

  return (
    <ExecutivePanel
      aria-labelledby="board-risk-prioritization-heading"
      padding="lg"
    >
      <header className="grid min-w-0 gap-6 border-b border-white/10 pb-7 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-end">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-3">
            <p className="text-[10px] font-black uppercase tracking-[0.28em] text-nexus-gold sm:text-xs">
              Board Risk Prioritization
            </p>

            <span
              aria-hidden="true"
              className="hidden h-1 w-1 rounded-full bg-white/20 sm:block"
            />

            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-nexus-muted">
              Executive risk governance
            </p>
          </div>

          <h2
            id="board-risk-prioritization-heading"
            className="mt-4 max-w-5xl text-3xl font-black leading-[1.08] tracking-tight text-nexus-white sm:text-4xl lg:text-5xl"
          >
            Executive Risk Priority Queue
          </h2>

          <p className="mt-4 max-w-4xl text-sm font-semibold leading-7 text-nexus-muted sm:text-base">
            Procurement risks prioritized according to executive attention,
            business impact, supplier exposure, and board-level urgency.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 xl:flex-col xl:items-end">
          <StatusBadge active={hasData} />

          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-nexus-muted">
            {boardRiskPriorities.length} prioritized risks
          </p>
        </div>
      </header>

      <section
        aria-labelledby="top-risk-heading"
        className="mt-7 overflow-hidden rounded-3xl border border-red-500/20 bg-red-500/[0.045]"
      >
        <div className="grid min-w-0 xl:grid-cols-[300px_minmax(0,1fr)]">
          <div className="border-b border-white/10 p-5 sm:p-6 xl:border-b-0 xl:border-r">
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-red-400">
              Highest priority
            </p>

            <h3
              id="top-risk-heading"
              className="mt-3 text-xl font-black tracking-tight text-nexus-white sm:text-2xl"
            >
              Executive Risk Position
            </h3>

            <p className="mt-3 text-xs font-semibold leading-6 text-nexus-muted">
              First-ranked risk requiring immediate executive visibility.
            </p>

            <div className="mt-6 flex items-center gap-4">
              <span className="flex h-12 w-12 items-center justify-center rounded-full border border-red-500/25 bg-red-500/10 text-sm font-black text-red-400">
                01
              </span>

              <div className="min-w-0">
                <p className="text-[10px] font-black uppercase tracking-[0.16em] text-nexus-muted">
                  Priority
                </p>

                <p className="mt-1 break-words text-sm font-black text-nexus-white">
                  {topRisk?.priority || "Pending"}
                </p>
              </div>
            </div>
          </div>

          <div className="min-w-0 p-5 sm:p-6">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-nexus-muted">
              Top-ranked risk
            </p>

            <p className="mt-3 break-words text-2xl font-black leading-8 text-nexus-white sm:text-3xl">
              {topRisk?.title || "No Data"}
            </p>

            <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              <TopRiskSignal
                label="Priority"
                value={topRisk?.priority || "Pending"}
              />

              <TopRiskSignal
                label="Executive Attention"
                value={topRisk?.attention || "Pending"}
              />

              <TopRiskSignal
                label="Business Impact"
                value={topRisk?.impact || "Pending"}
              />
            </div>
          </div>
        </div>
      </section>

      <section
        aria-labelledby="risk-queue-heading"
        className="mt-7 min-w-0"
      >
        <div className="flex flex-col gap-3 border-b border-white/10 pb-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-nexus-gold">
              Risk sequencing
            </p>

            <h3
              id="risk-queue-heading"
              className="mt-2 text-lg font-black tracking-tight text-nexus-white sm:text-xl"
            >
              Board Risk Queue
            </h3>
          </div>

          <p className="max-w-xl text-xs font-semibold leading-5 text-nexus-muted sm:text-right">
            Risks are displayed in the exact prioritization order provided by
            procurement intelligence.
          </p>
        </div>

        {boardRiskPriorities.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="mt-5 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
            {boardRiskPriorities.map((risk, index) => (
              <RiskCard
                key={risk.title}
                risk={risk}
                position={index + 1}
              />
            ))}
          </div>
        )}
      </section>
    </ExecutivePanel>
  );
}

function RiskCard({
  risk,
  position,
}: {
  risk: BoardRisk;
  position: number;
}) {
  const critical = risk.priority === "Critical";
  const moderate = risk.priority === "Moderate";

  const tone = critical
    ? "border-red-500/25 bg-red-500/[0.045]"
    : moderate
      ? "border-amber-500/25 bg-amber-500/[0.045]"
      : "border-white/10 bg-white/[0.035]";

  const accent = critical
    ? "text-red-400"
    : moderate
      ? "text-amber-300"
      : "text-nexus-muted";

  return (
    <article className={`flex min-w-0 flex-col rounded-3xl border p-5 sm:p-6 ${tone}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-black/10 text-[10px] font-black">
            {String(position).padStart(2, "0")}
          </span>

          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-nexus-muted">
              Priority
            </p>

            <p className={`mt-1 text-[10px] font-black uppercase tracking-[0.14em] ${accent}`}>
              {risk.priority}
            </p>
          </div>
        </div>

        <span className="rounded-full border border-white/10 bg-white/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-white">
          {risk.attention}
        </span>
      </div>

      <h4 className="mt-5 break-words text-xl font-black text-nexus-white">
        {risk.title}
      </h4>

      <p className="mt-3 flex-1 break-words text-sm font-semibold leading-7 text-nexus-muted">
        {risk.summary}
      </p>

      <div className="mt-5 rounded-2xl border border-white/10 bg-black/10 p-4">
        <p className="text-[10px] font-black uppercase tracking-[0.17em] text-nexus-gold">
          Business Impact
        </p>

        <p className="mt-2 break-words text-sm font-bold leading-6 text-nexus-white">
          {risk.impact}
        </p>
      </div>

      <div className="mt-4 flex items-center justify-between border-t border-white/10 pt-4">
        <p className="text-[10px] font-black uppercase tracking-[0.14em] text-nexus-muted">
          Board Review
        </p>

        <p className={`text-[10px] font-black uppercase tracking-[0.14em] ${accent}`}>
          Executive Attention
        </p>
      </div>
    </article>
  );
}

function TopRiskSignal({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/10 p-4">
      <p className="text-[10px] font-black uppercase tracking-[0.17em] text-nexus-muted">
        {label}
      </p>

      <p className="mt-2 break-words text-sm font-black text-nexus-white">
        {value}
      </p>
    </div>
  );
}

function StatusBadge({ active }: { active: boolean }) {
  return (
    <span
      className={`inline-flex rounded-full border px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.18em] ${
        active
          ? "border-emerald-300/20 bg-emerald-400/10 text-emerald-300"
          : "border-orange-300/20 bg-orange-400/10 text-orange-300"
      }`}
    >
      {active ? "Available" : "Insufficient Data"}
    </span>
  );
}

function EmptyState() {
  return (
    <div className="mt-5 rounded-3xl border border-dashed border-white/15 bg-white/[0.025] p-10 text-center">
      <p className="text-[10px] font-black uppercase tracking-[0.18em] text-nexus-muted">
        Insufficient data
      </p>

      <p className="mt-3 text-sm font-bold text-nexus-muted">
        No prioritized board risks are currently available.
      </p>
    </div>
  );
}