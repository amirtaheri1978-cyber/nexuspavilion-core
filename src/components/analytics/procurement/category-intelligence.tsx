type CategoryIntelligenceItem = {
  category: string;
  rfqs: number;
  quotes: number;
  awards: number;
  winRate: number;
  spend: number;
  opportunityScore: number;
};

type CategoryIntelligenceProps = {
  categoryIntelligence: CategoryIntelligenceItem[];
};

export default function CategoryIntelligence({
  categoryIntelligence,
}: CategoryIntelligenceProps) {
  return (
    <section
      aria-labelledby="category-intelligence-heading"
      className="mt-8 min-w-0 overflow-hidden rounded-[34px] border border-white/10 bg-[#061426]/88 text-white shadow-executive"
    >
      <header className="grid min-w-0 gap-6 border-b border-white/10 px-5 py-6 sm:px-8 sm:py-8 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-end">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-3">
            <p className="text-[10px] font-black uppercase tracking-[0.28em] text-nexus-gold sm:text-xs">
              Category Intelligence
            </p>

            <span
              aria-hidden="true"
              className="hidden h-1 w-1 rounded-full bg-white/20 sm:block"
            />

            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-nexus-muted">
              Procurement portfolio analysis
            </p>
          </div>

          <h2
            id="category-intelligence-heading"
            className="mt-4 max-w-4xl text-3xl font-black leading-[1.08] tracking-tight text-white sm:text-4xl"
          >
            Procurement Category Performance
          </h2>

          <p className="mt-4 max-w-3xl text-sm font-semibold leading-7 text-nexus-muted">
            Compare category-level sourcing activity, quotation participation,
            award conversion, commercial exposure, and opportunity potential
            across the procurement portfolio.
          </p>
        </div>

        <div className="flex min-w-[160px] items-center justify-between gap-5 rounded-2xl border border-nexus-gold/15 bg-nexus-gold/[0.045] px-5 py-4 xl:flex-col xl:items-end xl:gap-1">
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-nexus-muted xl:text-right">
              Categories assessed
            </p>

            <p className="mt-1 text-xs font-semibold text-nexus-muted xl:text-right">
              Current portfolio coverage
            </p>
          </div>

          <p className="shrink-0 text-3xl font-black tabular-nums text-white">
            {categoryIntelligence.length}
          </p>
        </div>
      </header>

      <div className="px-5 py-6 sm:px-8 sm:py-8">
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-nexus-gold">
              Category performance register
            </p>

            <h3 className="mt-2 text-lg font-black tracking-tight text-white">
              Sourcing, Conversion, and Commercial Opportunity
            </h3>
          </div>

          <p className="max-w-xl text-xs font-semibold leading-5 text-nexus-muted sm:text-right">
            Opportunity scores are presented alongside observed sourcing and
            award activity to support category-level executive review.
          </p>
        </div>

        <div className="min-w-0 overflow-hidden rounded-3xl border border-white/10 bg-black/15">
          <div className="overflow-x-auto">
            <table className="min-w-[1040px] w-full border-collapse">
              <caption className="sr-only">
                Procurement category intelligence showing RFQs, quotations,
                awards, win rate, spend, and opportunity score.
              </caption>

              <thead>
                <tr className="border-b border-white/10 bg-white/[0.025]">
                  <th
                    scope="col"
                    className="w-14 px-5 py-4 text-left text-[10px] font-black uppercase tracking-[0.18em] text-nexus-muted"
                  >
                    Rank
                  </th>

                  <th
                    scope="col"
                    className="min-w-[230px] px-5 py-4 text-left text-[10px] font-black uppercase tracking-[0.18em] text-nexus-muted"
                  >
                    Procurement Category
                  </th>

                  <th
                    scope="col"
                    className="px-5 py-4 text-right text-[10px] font-black uppercase tracking-[0.18em] text-nexus-muted"
                  >
                    RFQs
                  </th>

                  <th
                    scope="col"
                    className="px-5 py-4 text-right text-[10px] font-black uppercase tracking-[0.18em] text-nexus-muted"
                  >
                    Quotes
                  </th>

                  <th
                    scope="col"
                    className="px-5 py-4 text-right text-[10px] font-black uppercase tracking-[0.18em] text-nexus-muted"
                  >
                    Awards
                  </th>

                  <th
                    scope="col"
                    className="min-w-[140px] px-5 py-4 text-left text-[10px] font-black uppercase tracking-[0.18em] text-nexus-muted"
                  >
                    Award Conversion
                  </th>

                  <th
                    scope="col"
                    className="min-w-[150px] px-5 py-4 text-right text-[10px] font-black uppercase tracking-[0.18em] text-nexus-muted"
                  >
                    Recorded Spend
                  </th>

                  <th
                    scope="col"
                    className="min-w-[155px] px-5 py-4 text-left text-[10px] font-black uppercase tracking-[0.18em] text-nexus-muted"
                  >
                    Opportunity Score
                  </th>
                </tr>
              </thead>

              <tbody>
                {categoryIntelligence.map((item, index) => (
                  <tr
                    key={item.category}
                    className="group border-b border-white/5 transition-colors last:border-b-0 hover:bg-white/[0.035]"
                  >
                    <td className="px-5 py-5 align-middle">
                      <span className="flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-white/[0.035] text-[10px] font-black tabular-nums text-nexus-muted transition-colors group-hover:border-nexus-gold/20 group-hover:bg-nexus-gold/[0.05] group-hover:text-nexus-gold">
                        {String(index + 1).padStart(2, "0")}
                      </span>
                    </td>

                    <th
                      scope="row"
                      className="px-5 py-5 text-left align-middle"
                    >
                      <div className="min-w-0">
                        <p className="break-words text-sm font-black leading-6 text-white [overflow-wrap:anywhere]">
                          {item.category}
                        </p>

                        <p className="mt-1 text-[10px] font-black uppercase tracking-[0.14em] text-nexus-muted">
                          Category performance profile
                        </p>
                      </div>
                    </th>

                    <td className="px-5 py-5 text-right align-middle">
                      <p className="text-sm font-black tabular-nums text-white">
                        {item.rfqs.toLocaleString()}
                      </p>

                      <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-nexus-muted">
                        Sourcing events
                      </p>
                    </td>

                    <td className="px-5 py-5 text-right align-middle">
                      <p className="text-sm font-black tabular-nums text-white">
                        {item.quotes.toLocaleString()}
                      </p>

                      <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-nexus-muted">
                        Responses
                      </p>
                    </td>

                    <td className="px-5 py-5 text-right align-middle">
                      <p className="text-sm font-black tabular-nums text-white">
                        {item.awards.toLocaleString()}
                      </p>

                      <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-nexus-muted">
                        Decisions
                      </p>
                    </td>

                    <td className="px-5 py-5 align-middle">
                      <div className="min-w-0">
                        <div className="flex items-center justify-between gap-3">
                          <p className="text-sm font-black tabular-nums text-white">
                            {item.winRate}%
                          </p>

                          <span className="text-[9px] font-black uppercase tracking-[0.12em] text-nexus-muted">
                            Win rate
                          </span>
                        </div>

                        <div
                          aria-label={`${item.category} award conversion rate ${item.winRate}%`}
                          className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/[0.07]"
                        >
                          <div
                            className="h-full rounded-full bg-emerald-300/75"
                            style={{
                              width: `${Math.min(
                                Math.max(item.winRate, 0),
                                100,
                              )}%`,
                            }}
                          />
                        </div>
                      </div>
                    </td>

                    <td className="px-5 py-5 text-right align-middle">
                      <p className="text-sm font-black tabular-nums text-white">
                        ${item.spend.toLocaleString()}
                      </p>

                      <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-nexus-muted">
                        Portfolio value
                      </p>
                    </td>

                    <td className="px-5 py-5 align-middle">
                      <div className="min-w-0">
                        <div className="flex items-center justify-between gap-3">
                          <span className="inline-flex items-center rounded-full border border-nexus-gold/25 bg-nexus-gold/[0.08] px-3 py-1.5 text-xs font-black tabular-nums text-nexus-gold">
                            {item.opportunityScore}/100
                          </span>

                          <span className="text-[9px] font-black uppercase tracking-[0.12em] text-nexus-muted">
                            Potential
                          </span>
                        </div>

                        <div
                          aria-label={`${item.category} opportunity score ${item.opportunityScore} out of 100`}
                          className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/[0.07]"
                        >
                          <div
                            className="h-full rounded-full bg-nexus-gold/80"
                            style={{
                              width: `${Math.min(
                                Math.max(item.opportunityScore, 0),
                                100,
                              )}%`,
                            }}
                          />
                        </div>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex flex-col gap-2 border-t border-white/10 bg-white/[0.018] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-nexus-muted">
              Portfolio category register
            </p>

            <p className="text-xs font-semibold text-nexus-muted">
              Scroll horizontally to review the complete category performance
              profile on smaller displays.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}