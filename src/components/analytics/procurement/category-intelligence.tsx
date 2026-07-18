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
    <section className="mt-8 rounded-[34px] border border-white/10 bg-[#061426]/88 p-6 text-white shadow-executive sm:p-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.34em] text-[#C8A646]">
            Category Intelligence
          </p>

          <h2 className="mt-4 text-3xl font-black tracking-tight text-white sm:text-4xl">
            Top Procurement Categories
          </h2>

          <p className="mt-4 max-w-3xl text-sm font-semibold leading-7 text-slate-400">
            Compare procurement categories by sourcing activity, award
            performance, commercial value, and opportunity potential.
          </p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-4">
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">
            Categories
          </p>

          <p className="mt-2 text-3xl font-black text-white">
            {categoryIntelligence.length}
          </p>
        </div>
      </div>

      <div className="mt-8 overflow-x-auto rounded-3xl border border-white/10 bg-black/15">
        <table className="min-w-full">
          <thead>
            <tr className="border-b border-white/10">
              <th className="px-6 py-5 text-left text-[11px] font-black uppercase tracking-[0.2em] text-slate-500">
                Category
              </th>

              <th className="px-6 py-5 text-left text-[11px] font-black uppercase tracking-[0.2em] text-slate-500">
                RFQs
              </th>

              <th className="px-6 py-5 text-left text-[11px] font-black uppercase tracking-[0.2em] text-slate-500">
                Quotes
              </th>

              <th className="px-6 py-5 text-left text-[11px] font-black uppercase tracking-[0.2em] text-slate-500">
                Awards
              </th>

              <th className="px-6 py-5 text-left text-[11px] font-black uppercase tracking-[0.2em] text-slate-500">
                Win Rate
              </th>

              <th className="px-6 py-5 text-left text-[11px] font-black uppercase tracking-[0.2em] text-slate-500">
                Spend
              </th>

              <th className="px-6 py-5 text-left text-[11px] font-black uppercase tracking-[0.2em] text-slate-500">
                Opportunity
              </th>
            </tr>
          </thead>

          <tbody>
            {categoryIntelligence.map((item) => (
              <tr
                key={item.category}
                className="border-b border-white/5 transition-colors hover:bg-white/[0.035]"
              >
                <td className="px-6 py-5 font-bold text-white">
                  {item.category}
                </td>

                <td className="px-6 py-5 font-medium text-slate-300">
                  {item.rfqs}
                </td>

                <td className="px-6 py-5 font-medium text-slate-300">
                  {item.quotes}
                </td>

                <td className="px-6 py-5 font-medium text-slate-300">
                  {item.awards}
                </td>

                <td className="px-6 py-5 font-bold text-white">
                  {item.winRate}%
                </td>

                <td className="px-6 py-5 font-bold text-white">
                  ${item.spend.toLocaleString()}
                </td>

                <td className="px-6 py-5">
                  <span className="inline-flex items-center rounded-full border border-[#C8A646]/25 bg-[#C8A646]/12 px-3 py-1 text-xs font-black text-[#F5D76E]">
                    {item.opportunityScore}/100
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}