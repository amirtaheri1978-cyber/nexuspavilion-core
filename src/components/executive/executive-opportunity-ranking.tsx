type ExecutiveOpportunity = {
  title: string;
  priority: string;
  impact: string;
  value: string;
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
          className="relative min-w-0 overflow-hidden rounded-[30px] border border-[#C8A646]/25 bg-[linear-gradient(135deg,rgba(200,166,70,0.09),rgba(6,20,38,0.16)_48%,rgba(44,196,232,0.035))]"
        >
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full border border-[#C8A646]/10"
          />

          <div className="relative grid min-w-0 xl:grid-cols-[minmax(270px,0.72fr)_minmax(0,1.28fr)]">
            <div className="flex min-w-0 flex-col justify-between border-b border-white/10 p-5 sm:p-6 xl:border-b-0 xl:border-r">
              <div>
                <div className="flex flex-wrap items-center gap-3">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-[#C8A646]/30 bg-[#C8A646]/10 text-xs font-black tabular-nums text-[#E5C663]">
                    01
                  </span>

                  <div className="min-w-0">
                    <p className="text-[10px] font-black uppercase tracking-[0.24em] text-[#C8A646]">
                      Highest commercial priority
                    </p>

                    <p className="mt-1 text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">
                      Immediate leadership focus
                    </p>
                  </div>
                </div>

                <h3
                  id="top-opportunity-position-heading"
                  className="mt-5 text-xl font-black tracking-tight text-white sm:text-2xl"
                >
                  Priority Decision Position
                </h3>

                <p className="mt-3 max-w-md text-xs font-semibold leading-6 text-slate-400">
                  The leading opportunity in the active intelligence sequence,
                  presented for executive prioritization and action alignment.
                </p>
              </div>

              <div className="mt-6 rounded-2xl border border-white/10 bg-black/10 p-4">
                <p className="text-[10px] font-black uppercase tracking-[0.17em] text-slate-500">
                  Executive priority
                </p>

                <p className="mt-2 break-words text-base font-black leading-6 text-white [overflow-wrap:anywhere]">
                  {topOpportunity?.priority || "Pending"}
                </p>
              </div>
            </div>

            <div className="min-w-0 p-5 sm:p-6">
              <div className="flex flex-col gap-4 border-b border-white/10 pb-5 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">
                    Immediate executive opportunity
                  </p>

                  <p className="mt-3 break-words text-2xl font-black leading-8 text-white [overflow-wrap:anywhere] sm:text-3xl">
                    {topOpportunity?.title || "No Data"}
                  </p>
                </div>

                <StatusBadge tone={topOpportunity ? "success" : "warning"}>
                  {topOpportunity ? "Priority Position Active" : "Pending Review"}
                </StatusBadge>
              </div>

              <div className="mt-5 grid min-w-0 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                <TopOpportunitySignal
                  label="Priority"
                  value={topOpportunity?.priority || "Pending"}
                />

                <TopOpportunitySignal
                  label="Enterprise Impact"
                  value={topOpportunity?.impact || "Pending"}
                />

                <TopOpportunitySignal
                  label="Value Potential"
                  value={topOpportunity?.value || "Pending"}
                  emphasis
                />

                <TopOpportunitySignal
                  label="Execution Horizon"
                  value={
                    topOpportunityIntelligence?.executionHorizon || "Pending"
                  }
                />

                <TopOpportunitySignal
                  label="Board Priority"
                  value={topOpportunityIntelligence?.boardPriority || "Pending"}
                />

                <TopOpportunitySignal
                  label="Intelligence Position"
                  value={
                    topOpportunityIntelligence
                      ? `Rank ${String(
                          topOpportunityIntelligence.rank,
                        ).padStart(2, "0")}`
                      : "Pending"
                  }
                />
              </div>

              <div className="mt-4 rounded-[22px] border border-[#C8A646]/25 bg-[#C8A646]/[0.055] p-4 sm:p-5">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#C8A646]">
                      CEO action directive
                    </p>

                    <p className="mt-2 break-words text-sm font-bold leading-6 text-slate-200 [overflow-wrap:anywhere]">
                      {topOpportunityIntelligence?.ceoRecommendation ||
                        "Leadership recommendation pending sufficient opportunity intelligence."}
                    </p>
                  </div>

                  <span className="w-fit shrink-0 rounded-full border border-[#C8A646]/20 bg-[#C8A646]/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.14em] text-[#E5C663]">
                    Executive Action
                  </span>
                </div>
              </div>
            </div>
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

          <div className="mt-5 grid min-w-0 gap-4 md:grid-cols-2 xl:grid-cols-4">
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

          <div className="mt-5 grid min-w-0 gap-4 md:grid-cols-2 xl:grid-cols-4">
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

  const rankClass =
    position === 1
      ? "border-[#C8A646]/30 bg-[#C8A646]/10 text-[#E5C663]"
      : position === 2
        ? "border-[#2CC4E8]/25 bg-[#2CC4E8]/[0.08] text-[#9BE8F8]"
        : position === 3
          ? "border-emerald-300/20 bg-emerald-300/[0.07] text-emerald-300"
          : "border-white/10 bg-white/[0.05] text-slate-300";

  const priorityClass =
    position === 1
      ? "text-[#E5C663]"
      : position === 2
        ? "text-[#9BE8F8]"
        : position === 3
          ? "text-emerald-300"
          : "text-slate-300";

  return (
    <article
      className={`group relative flex min-w-0 flex-col overflow-hidden rounded-[26px] border p-5 transition-colors hover:border-white/20 sm:p-5 ${positionClass}`}
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent opacity-70"
      />

      <div className="flex min-w-0 items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <span
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full border text-[10px] font-black tabular-nums ${rankClass}`}
          >
            {String(position).padStart(2, "0")}
          </span>

          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">
              Ranked opportunity
            </p>

            <p
              className={`mt-1 break-words text-[10px] font-black uppercase tracking-[0.14em] [overflow-wrap:anywhere] ${priorityClass}`}
            >
              {opportunity.priority}
            </p>
          </div>
        </div>

        <span className="max-w-[46%] shrink-0 break-words rounded-full border border-white/10 bg-black/10 px-3 py-1 text-right text-[10px] font-black uppercase leading-4 tracking-[0.12em] text-slate-300 [overflow-wrap:anywhere]">
          {opportunity.impact}
        </span>
      </div>

      <div className="mt-5 min-w-0">
        <h4 className="break-words text-lg font-black leading-7 text-white [overflow-wrap:anywhere]">
          {opportunity.title}
        </h4>

        <p className="mt-2 break-words text-sm font-semibold leading-6 text-slate-400 [overflow-wrap:anywhere]">
          {opportunity.summary}
        </p>
      </div>

      <div className="mt-4 grid min-w-0 gap-3">
        <div className="rounded-2xl border border-white/10 bg-black/10 p-4">
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">
            Enterprise impact
          </p>

          <p className="mt-2 break-words text-sm font-black leading-6 text-white [overflow-wrap:anywhere]">
            {opportunity.impact}
          </p>
        </div>

        <div className="rounded-2xl border border-[#C8A646]/18 bg-[#061426]/70 p-4">
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#C8A646]">
            Opportunity value
          </p>

          <p className="mt-2 break-words text-lg font-black leading-6 text-white [overflow-wrap:anywhere]">
            {opportunity.value}
          </p>
        </div>
      </div>

      <div className="mt-auto pt-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-4">
          <p className="text-[10px] font-black uppercase tracking-[0.13em] text-slate-500">
            Executive review
          </p>

          <p className={`text-[10px] font-black uppercase tracking-[0.13em] ${priorityClass}`}>
            Priority assessment
          </p>
        </div>
      </div>
    </article>
  );
}

function IntelligenceCard({
  opportunity,
}: {
  opportunity: ExecutiveOpportunityIntelligence;
}) {
  return (
    <article className="relative flex min-w-0 flex-col overflow-hidden rounded-[26px] border border-white/10 bg-[#061426]/72 p-5 transition-colors hover:border-[#2CC4E8]/20 sm:p-5">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#2CC4E8]/35 to-transparent"
      />

      <div className="flex min-w-0 items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[#2CC4E8]/20 bg-[#2CC4E8]/[0.07] text-[10px] font-black tabular-nums text-[#9BE8F8]">
            {String(opportunity.rank).padStart(2, "0")}
          </span>

          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#9BE8F8]">
              Intelligence position
            </p>

            <h4 className="mt-2 break-words text-lg font-black leading-7 text-white [overflow-wrap:anywhere]">
              {opportunity.title}
            </h4>
          </div>
        </div>

        <span className="shrink-0 rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.13em] text-slate-400">
          Rank {String(opportunity.rank).padStart(2, "0")}
        </span>
      </div>

      <div className="mt-4 rounded-2xl border border-white/10 bg-black/10 p-4">
        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">
          Business impact
        </p>

        <p className="mt-2 break-words text-sm font-semibold leading-6 text-slate-300 [overflow-wrap:anywhere]">
          {opportunity.businessImpact}
        </p>
      </div>

      <div className="mt-4 grid flex-1 gap-3">
        <InfoBlock
          title="Execution Horizon"
          value={opportunity.executionHorizon}
        />

        <InfoBlock title="Board Priority" value={opportunity.boardPriority} />

        <InfoBlock
          title="CEO Recommendation"
          value={opportunity.ceoRecommendation}
          emphasis
        />
      </div>
    </article>
  );
}
function TopOpportunitySignal({
  label,
  value,
  emphasis = false,
}: {
  label: string;
  value: string;
  emphasis?: boolean;
}) {
  return (
    <div
      className={
        emphasis
          ? "min-w-0 rounded-2xl border border-[#C8A646]/20 bg-[#C8A646]/[0.055] p-4"
          : "min-w-0 rounded-2xl border border-white/10 bg-black/10 p-4"
      }
    >
      <p
        className={
          emphasis
            ? "text-[10px] font-black uppercase tracking-[0.17em] text-[#C8A646]"
            : "text-[10px] font-black uppercase tracking-[0.17em] text-slate-500"
        }
      >
        {label}
      </p>

      <p className="mt-2 break-words text-sm font-black leading-6 text-white [overflow-wrap:anywhere]">
        {value}
      </p>
    </div>
  );
}

function InfoBlock({
  title,
  value,
  emphasis = false,
}: {
  title: string;
  value: string;
  emphasis?: boolean;
}) {
  return (
    <div
      className={
        emphasis
          ? "rounded-2xl border border-[#C8A646]/20 bg-[#C8A646]/[0.055] p-4"
          : "rounded-2xl border border-white/10 bg-white/[0.035] p-4"
      }
    >
      <p
        className={
          emphasis
            ? "text-[10px] font-black uppercase tracking-[0.17em] text-[#C8A646]"
            : "text-[10px] font-black uppercase tracking-[0.17em] text-slate-500"
        }
      >
        {title}
      </p>

      <p
        className={
          emphasis
            ? "mt-2 break-words text-sm font-bold leading-6 text-white [overflow-wrap:anywhere]"
            : "mt-2 break-words text-sm font-semibold leading-6 text-slate-300 [overflow-wrap:anywhere]"
        }
      >
        {value}
      </p>
    </div>
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