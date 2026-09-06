type ExecutiveOpportunity = {
  title: string;
  priority: string;
  impact: string;
  value: string;
  valueLabel?: string;
  summary: string;
};

type ExecutiveOpportunityIntelligence = ExecutiveOpportunity & {
  rank: number;
  businessImpact: string;
  executionHorizon: string;
  boardPriority: string;
  ceoRecommendation: string;
};

type ExecutiveOpportunityRankingProps = {
  opportunities: ExecutiveOpportunity[];
  intelligence: ExecutiveOpportunityIntelligence[];
};

export function ExecutiveOpportunityRanking({
  opportunities,
  intelligence,
}: ExecutiveOpportunityRankingProps) {
  const hasData = opportunities.length > 0 || intelligence.length > 0;
  const topOpportunity = opportunities[0];
  const topOpportunityIntelligence = intelligence[0];

  return (
    <section
      aria-labelledby="executive-opportunity-ranking-heading"
      className="mt-8 overflow-hidden rounded-[34px] border border-white/10 bg-[#061426]/88 text-white shadow-executive"
    >
      <header className="relative overflow-hidden border-b border-white/10">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 right-0 hidden w-[42%] bg-[radial-gradient(circle_at_center,rgba(200,166,70,0.1),transparent_68%)] xl:block"
        />

        <div className="relative grid min-w-0 gap-6 p-6 sm:p-8 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-end">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-3">
              <p className="text-[10px] font-black uppercase tracking-[0.28em] text-[#C8A646] sm:text-[11px]">
                Executive Opportunity Ranking
              </p>

              <span
                aria-hidden="true"
                className="hidden h-1 w-1 rounded-full bg-white/20 sm:block"
              />

              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">
                Enterprise value prioritization
              </p>
            </div>

            <h2
              id="executive-opportunity-ranking-heading"
              className="mt-4 max-w-5xl text-3xl font-black leading-[1.08] tracking-tight text-white sm:text-4xl lg:text-5xl"
            >
              Executive Opportunity Portfolio
            </h2>

            <p className="mt-4 max-w-4xl text-sm font-semibold leading-7 text-slate-400 sm:text-base">
              Decision-ranked procurement opportunities assessed across
              commercial value, enterprise impact, execution horizon, board
              relevance, and required leadership response.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 xl:flex-col xl:items-end">
            <StatusBadge tone={hasData ? "success" : "warning"}>
              {hasData ? "Decision Intelligence Available" : "Insufficient Data"}
            </StatusBadge>

            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">
              {opportunities.length} ranked opportunities
            </p>
          </div>
        </div>
      </header>

      <div className="p-6 sm:p-8">
        <section
          aria-labelledby="top-opportunity-position-heading"
          data-rfq-priority-decision="true"
          className="relative min-w-0 rounded-[30px] border border-[#C8A646]/25 bg-[#C8A646]/[0.04] p-5 sm:p-6"
        >
          <header className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#C8A646]">
                [01] Highest commercial priority
              </p>

              <h3
                id="top-opportunity-position-heading"
                className="mt-2 text-lg font-black tracking-tight text-white sm:text-xl"
              >
                Priority Decision Position
              </h3>

              <p className="mt-1 text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">
                Immediate leadership focus
              </p>
            </div>

            <div className="shrink-0">
              <StatusBadge tone={topOpportunity ? "success" : "warning"}>
                {topOpportunity ? "Priority Position Active" : "Pending Review"}
              </StatusBadge>
            </div>
          </header>

          <p
            data-rfq-priority-decision-title="true"
            className="mt-5 min-w-0 max-w-4xl text-pretty text-2xl font-black leading-[1.25] tracking-tight text-white sm:text-3xl"
          >
            {topOpportunity?.title || "No Data"}
          </p>

          <p className="mt-3 min-w-0 max-w-4xl text-pretty text-sm font-semibold leading-6 text-slate-300">
            {topOpportunity?.summary ||
              "The leading opportunity in the active intelligence sequence, presented for executive prioritization and action alignment."}
          </p>

          <dl
            data-rfq-priority-decision-signals="true"
            className="mt-5 grid min-w-0 grid-cols-1 gap-x-6 gap-y-4 border-y border-white/10 py-4 sm:grid-cols-2 lg:grid-cols-3"
          >
            <div className="min-w-0">
              <dt className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">
                Priority
              </dt>
              <dd className="mt-1.5 text-sm font-black leading-5 text-white">
                {topOpportunity?.priority || "Pending"}
              </dd>
            </div>

            <div className="min-w-0">
              <dt className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">
                Enterprise Impact
              </dt>
              <dd className="mt-1.5 text-sm font-black leading-5 text-white">
                {topOpportunity?.impact || "Pending"}
              </dd>
            </div>

            <div className="min-w-0">
              <dt className="text-[10px] font-black uppercase tracking-[0.16em] text-[#C8A646]">
                {topOpportunity?.valueLabel || "Value Potential"}
              </dt>
              <dd className="mt-1.5 text-sm font-black leading-5 text-white">
                {topOpportunity?.value || "Pending"}
              </dd>
            </div>

            <div className="min-w-0">
              <dt className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">
                Execution Horizon
              </dt>
              <dd className="mt-1.5 text-sm font-black leading-5 text-white">
                {topOpportunityIntelligence?.executionHorizon || "Pending"}
              </dd>
            </div>

            <div className="min-w-0">
              <dt className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">
                Board Priority
              </dt>
              <dd className="mt-1.5 text-sm font-black leading-5 text-white">
                {topOpportunityIntelligence?.boardPriority || "Pending"}
              </dd>
            </div>

            <div className="min-w-0">
              <dt className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">
                Intelligence Position
              </dt>
              <dd className="mt-1.5 text-sm font-black leading-5 text-white">
                {topOpportunityIntelligence
                  ? `Rank ${String(topOpportunityIntelligence.rank).padStart(2, "0")}`
                  : "Pending"}
              </dd>
            </div>
          </dl>

          <div className="mt-4 rounded-2xl border border-[#C8A646]/20 bg-[#C8A646]/[0.055] p-4">
            <p className="text-[10px] font-black uppercase tracking-[0.17em] text-[#C8A646]">
              CEO action directive
            </p>

            <p className="mt-2 text-sm font-bold leading-6 text-white">
              {topOpportunityIntelligence?.ceoRecommendation ||
                "Leadership recommendation pending sufficient opportunity intelligence."}
            </p>
          </div>
        </section>

        <section
          aria-labelledby="opportunity-queue-heading"
          className="mt-7 min-w-0"
        >
          <div className="flex flex-col gap-3 border-b border-white/10 pb-5 sm:flex-row sm:items-end sm:justify-between">
            <div className="min-w-0">
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-emerald-300">
                Ranked value deployment
              </p>

              <h3
                id="opportunity-queue-heading"
                className="mt-2 text-lg font-black tracking-tight text-white sm:text-xl"
              >
                Executive Opportunity Queue
              </h3>
            </div>

            <p className="max-w-xl text-xs font-semibold leading-5 text-slate-500 sm:text-right">
              Opportunities retain the exact priority sequence supplied by the
              active procurement intelligence model.
            </p>
          </div>

          <div
            data-rfq-opportunity-queue="true"
            className="mt-5 grid min-w-0 grid-cols-1 gap-5 md:grid-cols-2"
          >
            {opportunities.map((opportunity, index) => (
              <OpportunityCard
                key={opportunity.title}
                opportunity={opportunity}
                position={index + 1}
              />
            ))}

            {opportunities.length === 0 ? (
              <EmptyState message="No executive opportunity ranking data available." />
            ) : null}
          </div>
        </section>

        <section
          aria-labelledby="opportunity-intelligence-heading"
          className="mt-7 min-w-0 rounded-[30px] border border-[#2CC4E8]/15 bg-[#2CC4E8]/[0.03] p-5 sm:p-6"
        >
          <div className="flex flex-col gap-3 border-b border-white/10 pb-5 sm:flex-row sm:items-end sm:justify-between">
            <div className="min-w-0">
              <p className="text-[10px] font-black uppercase tracking-[0.24em] text-[#9BE8F8]">
                Leadership response intelligence
              </p>

              <h3
                id="opportunity-intelligence-heading"
                className="mt-2 text-lg font-black tracking-tight text-white sm:text-xl"
              >
                Business Impact and Executive Direction
              </h3>
            </div>

            <span className="w-fit rounded-full border border-[#2CC4E8]/20 bg-[#2CC4E8]/[0.07] px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.16em] text-[#9BE8F8]">
              {intelligence.length} intelligence profiles
            </span>
          </div>

          <div
            data-rfq-intelligence-profiles="true"
            className="mt-5 grid min-w-0 grid-cols-1 gap-5 md:grid-cols-2"
          >
            {intelligence.map((opportunity) => (
              <IntelligenceCard
                key={opportunity.title}
                opportunity={opportunity}
              />
            ))}

            {intelligence.length === 0 ? (
              <EmptyState message="No opportunity intelligence available." />
            ) : null}
          </div>
        </section>
      </div>
    </section>
  );
}
function OpportunityCard({
  opportunity,
  position,
}: {
  opportunity: ExecutiveOpportunity;
  position: number;
}) {
  const positionClass =
    position === 1
      ? "border-[#C8A646]/30 bg-[#C8A646]/[0.055]"
      : position === 2
        ? "border-[#2CC4E8]/22 bg-[#2CC4E8]/[0.035]"
        : position === 3
          ? "border-emerald-300/20 bg-emerald-300/[0.03]"
          : "border-white/10 bg-white/[0.035]";

  const priorityClass =
    position === 1
      ? "text-[#E5C663]"
      : position === 2
        ? "text-[#9BE8F8]"
        : position === 3
          ? "text-emerald-300"
          : "text-slate-300";

  const rankLabel = String(position).padStart(2, "0");

  return (
    <article
      className={`flex min-w-0 flex-col rounded-[26px] border p-5 sm:p-6 ${positionClass}`}
    >
      <header className="flex items-baseline justify-between gap-3">
        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">
          [{rankLabel}] Ranked Opportunity
        </p>

        <p
          className={`shrink-0 text-[10px] font-black uppercase tracking-[0.16em] ${priorityClass}`}
        >
          {opportunity.priority} Priority
        </p>
      </header>

      <h4 className="mt-4 text-xl font-black leading-[1.25] tracking-tight text-white">
        {opportunity.title}
      </h4>

      <p className="mt-3 text-sm font-semibold leading-6 text-slate-300">
        {opportunity.summary}
      </p>

      <dl className="mt-5 grid grid-cols-2 gap-4 border-t border-white/10 pt-4">
        <div className="min-w-0">
          <dt className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">
            Enterprise Impact
          </dt>
          <dd className="mt-1.5 text-sm font-black leading-5 text-white">
            {opportunity.impact}
          </dd>
        </div>

        <div className="min-w-0">
          <dt className="text-[10px] font-black uppercase tracking-[0.16em] text-[#C8A646]">
            {opportunity.valueLabel || "Opportunity Value"}
          </dt>
          <dd className="mt-1.5 text-sm font-black leading-5 text-white">
            {opportunity.value}
          </dd>
        </div>
      </dl>
    </article>
  );
}

function IntelligenceCard({
  opportunity,
}: {
  opportunity: ExecutiveOpportunityIntelligence;
}) {
  const rankLabel = String(opportunity.rank).padStart(2, "0");

  return (
    <article className="flex min-w-0 flex-col rounded-[26px] border border-white/10 bg-[#061426]/72 p-5 sm:p-6">
      <header className="flex items-baseline justify-between gap-3">
        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#9BE8F8]">
          [{rankLabel}] Intelligence Position
        </p>

        <p className="shrink-0 text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">
          Rank {rankLabel}
        </p>
      </header>

      <h4 className="mt-4 text-xl font-black leading-[1.25] tracking-tight text-white">
        {opportunity.title}
      </h4>

      <div className="mt-5 min-w-0">
        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">
          Business Impact
        </p>

        <p className="mt-2 text-sm font-semibold leading-6 text-slate-300">
          {opportunity.businessImpact}
        </p>
      </div>

      <dl className="mt-5 grid grid-cols-2 gap-4 border-y border-white/10 py-4">
        <div className="min-w-0">
          <dt className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">
            Execution Horizon
          </dt>
          <dd className="mt-1.5 text-sm font-black leading-5 text-white">
            {opportunity.executionHorizon}
          </dd>
        </div>

        <div className="min-w-0">
          <dt className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">
            Board Priority
          </dt>
          <dd className="mt-1.5 text-sm font-black leading-5 text-white">
            {opportunity.boardPriority}
          </dd>
        </div>
      </dl>

      <div className="mt-auto rounded-2xl border border-[#C8A646]/20 bg-[#C8A646]/[0.055] p-4">
        <p className="text-[10px] font-black uppercase tracking-[0.17em] text-[#C8A646]">
          CEO Recommendation
        </p>

        <p className="mt-2 text-sm font-bold leading-6 text-white">
          {opportunity.ceoRecommendation}
        </p>
      </div>
    </article>
  );
}
function EmptyState({
  message,
}: {
  message: string;
}) {
  return (
    <div className="rounded-[24px] border border-dashed border-white/15 bg-white/[0.025] p-8 text-center md:col-span-2 xl:col-span-4">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border border-white/10 bg-white/[0.03]">
        <span className="text-sm font-black text-slate-500">—</span>
      </div>

      <p className="mt-5 text-[10px] font-black uppercase tracking-[0.18em] text-slate-600">
        Insufficient data
      </p>

      <p className="mt-3 text-sm font-bold leading-6 text-slate-500">
        {message}
      </p>
    </div>
  );
}

function StatusBadge({
  children,
  tone = "neutral",
}: {
  children: string;
  tone?: "success" | "warning" | "neutral";
}) {
  const toneClass =
    tone === "success"
      ? "border-emerald-300/20 bg-emerald-400/10 text-emerald-300"
      : tone === "warning"
        ? "border-orange-300/20 bg-orange-400/10 text-orange-300"
        : "border-white/10 bg-white/[0.055] text-slate-300";

  return (
    <span
      className={`inline-flex w-fit items-center rounded-full border px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.18em] ${toneClass}`}
    >
      {children}
    </span>
  );
}