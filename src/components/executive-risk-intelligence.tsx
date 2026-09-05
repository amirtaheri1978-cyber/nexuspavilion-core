type SupplierPerformanceEvidence = {
  name: string | null;
  quotes: number;
  awards: number;
  revenue: number;
  winRate: number;
};

type ExecutiveRiskIntelligenceProps = {
  supplierRanking: SupplierPerformanceEvidence[];
};

export default function ExecutiveRiskIntelligence({
  supplierRanking,
}: ExecutiveRiskIntelligenceProps) {
  const topSupplier = supplierRanking[0] || null;

  const suppliersWithAwardHistory = supplierRanking.filter(
    (supplier) => supplier.awards > 0,
  ).length;

  const suppliersWithLimitedHistory = supplierRanking.filter(
    (supplier) => supplier.quotes < 3,
  ).length;

  const averageWinRate =
    supplierRanking.length > 0
      ? Math.round(
          supplierRanking.reduce(
            (sum, supplier) => sum + supplier.winRate,
            0,
          ) / supplierRanking.length,
        )
      : 0;

  const awardHistoryCoverage =
    supplierRanking.length > 0
      ? Math.round(
          (suppliersWithAwardHistory / supplierRanking.length) * 100,
        )
      : 0;

  const supplierNetworkMaturity =
    supplierRanking.length >= 10
      ? "Scaled"
      : supplierRanking.length >= 5
        ? "Developing"
        : supplierRanking.length > 0
          ? "Early"
          : "Insufficient Data";

  const hasSupplierData = supplierRanking.length > 0;

  return (
    <div className="mt-8 space-y-8">
      <section
        aria-labelledby="supplier-network-benchmark-heading"
        className="overflow-hidden rounded-[34px] border border-white/10 bg-[#061426]/88 text-white shadow-executive"
      >
        <header className="grid min-w-0 gap-6 border-b border-white/10 p-6 sm:p-8 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-end">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-3">
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[#C8A646] sm:text-[11px]">
                Supplier Performance Evidence
              </p>

              <span
                aria-hidden="true"
                className="hidden h-1 w-1 rounded-full bg-white/20 sm:block"
              />

              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">
                Commercial history coverage
              </p>
            </div>

            <h2
              id="supplier-network-benchmark-heading"
              className="mt-4 max-w-5xl text-3xl font-black leading-[1.08] tracking-tight text-white sm:text-4xl lg:text-5xl"
            >
              Supplier Network Evidence
            </h2>

            <p className="mt-4 max-w-4xl text-sm font-semibold leading-7 text-slate-400 sm:text-base">
              Comparative supplier history based on award conversion, quote
              participation, awarded revenue, and recorded commercial evidence.
              This view does not calculate a universal supplier trust score.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 xl:flex-col xl:items-end">
            <StatusBadge tone={hasSupplierData ? "success" : "warning"}>
              {hasSupplierData ? "Available" : "Insufficient Data"}
            </StatusBadge>

            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">
              Supplier history position
            </p>
          </div>
        </header>

        <div className="grid min-w-0 xl:grid-cols-[minmax(0,1.25fr)_minmax(320px,0.75fr)]">
          <div className="min-w-0 border-b border-white/10 p-6 sm:p-8 xl:border-b-0 xl:border-r">
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#C8A646]">
              Network commercial evidence
            </p>

            <h3 className="mt-3 text-xl font-black tracking-tight text-white sm:text-2xl">
              Participation and Award History
            </h3>

            <p className="mt-4 max-w-3xl text-sm font-semibold leading-7 text-slate-400">
              Evidence consolidates supplier participation depth, award-history
              coverage, and commercial concentration without inventing risk
              levels from revenue or quote volume alone.
            </p>

            <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              <SupplierBenchmarkMetric
                title="Highest Awarded Revenue"
                value={topSupplier?.name || "No Data"}
                emphasis
              />

              <SupplierBenchmarkMetric
                title="Network Maturity"
                value={supplierNetworkMaturity}
              />

              <SupplierBenchmarkMetric
                title="Award History Coverage"
                value={`${awardHistoryCoverage}%`}
              />
            </div>
          </div>

          <div className="min-w-0 p-6 sm:p-8">
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-500">
              Evidence control signals
            </p>

            <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
              <SupplierBenchmarkMetric
                title="Limited History Suppliers"
                value={String(suppliersWithLimitedHistory)}
                tone={suppliersWithLimitedHistory > 0 ? "risk" : "success"}
              />

              <SupplierBenchmarkMetric
                title="Average Win Rate"
                value={`${averageWinRate}%`}
              />
            </div>
          </div>
        </div>
      </section>

      <section
        aria-labelledby="supplier-history-evidence-heading"
        className="overflow-hidden rounded-[34px] border border-white/10 bg-white/[0.045] text-white shadow-inner-executive"
      >
        <header className="grid min-w-0 gap-5 border-b border-white/10 p-6 sm:p-8 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-end">
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-[0.28em] text-[#C8A646]">
              Supplier History
            </p>

            <h2
              id="supplier-history-evidence-heading"
              className="mt-3 text-2xl font-black tracking-tight text-white sm:text-3xl"
            >
              Supplier Performance Evidence
            </h2>

            <p className="mt-3 max-w-3xl text-sm font-semibold leading-7 text-slate-400">
              Ordered by awarded revenue, then award count, then quote volume.
              Values reflect recorded commercial history only.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 xl:flex-col xl:items-end">
            <StatusBadge
              tone={supplierRanking.length > 0 ? "success" : "warning"}
            >
              {supplierRanking.length > 0 ? "Available" : "Insufficient Data"}
            </StatusBadge>

            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">
              {supplierRanking.length} supplier records
            </p>
          </div>
        </header>

        <div className="p-4 sm:p-6 lg:p-8">
          <div className="overflow-x-auto rounded-[24px] border border-white/10 bg-[#061426]/55">
            <table className="w-full min-w-[820px] text-left">
              <thead className="bg-[#07111F] text-white">
                <tr>
                  <TableHeading>Supplier</TableHeading>
                  <TableHeading>Quotes</TableHeading>
                  <TableHeading>Awards</TableHeading>
                  <TableHeading>Win Rate</TableHeading>
                  <TableHeading>Awarded Revenue</TableHeading>
                  <TableHeading>History Status</TableHeading>
                </tr>
              </thead>

              <tbody>
                {supplierRanking.map((vendor) => (
                  <tr
                    key={vendor.name || "unknown-supplier-history"}
                    className="border-t border-white/10 transition-colors hover:bg-white/[0.025]"
                  >
                    <td className="px-5 py-4">
                      <p className="max-w-[240px] break-words font-bold text-white [overflow-wrap:anywhere]">
                        {vendor.name || "Unknown Supplier"}
                      </p>
                    </td>

                    <td className="px-5 py-4 font-semibold text-slate-300">
                      {vendor.quotes}
                    </td>

                    <td className="px-5 py-4 font-semibold text-slate-300">
                      {vendor.awards}
                    </td>

                    <td className="px-5 py-4 font-semibold text-slate-300">
                      {vendor.winRate}%
                    </td>

                    <td className="px-5 py-4 font-semibold text-slate-300">
                      ${vendor.revenue.toLocaleString()}
                    </td>

                    <td className="px-5 py-4">
                      <p className="max-w-[280px] break-words text-sm font-semibold leading-6 text-slate-300 [overflow-wrap:anywhere]">
                        {vendor.quotes === 0
                          ? "Insufficient Data"
                          : vendor.awards === 0
                            ? "No Award History"
                            : vendor.quotes < 3
                              ? "Limited History"
                              : "Recorded Activity"}
                      </p>
                    </td>
                  </tr>
                ))}

                {supplierRanking.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-5 py-12">
                      <TableEmptyState
                        title="No supplier history available"
                        description="Quote participation, award conversion, and awarded revenue cannot currently be evaluated."
                      />
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>

          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <RankingSignal
              label="Highest Awarded Revenue"
              value={topSupplier?.name || "No Data"}
            />

            <RankingSignal
              label="Suppliers With Award History"
              value={String(suppliersWithAwardHistory)}
            />
          </div>
        </div>
      </section>
    </div>
  );
}

function SupplierBenchmarkMetric({
  title,
  value,
  tone = "neutral",
  emphasis = false,
}: {
  title: string;
  value: string;
  tone?: "success" | "risk" | "neutral";
  emphasis?: boolean;
}) {
  const valueClass =
    tone === "success"
      ? "text-emerald-300"
      : tone === "risk"
        ? "text-red-300"
        : "text-white";

  return (
    <article
      className={`min-w-0 rounded-[22px] border p-5 ${
        emphasis
          ? "border-[#C8A646]/20 bg-[#C8A646]/[0.055]"
          : "border-white/10 bg-white/[0.045]"
      }`}
    >
      <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">
        {title}
      </p>

      <p
        className={`mt-3 break-words text-xl font-black leading-7 [overflow-wrap:anywhere] ${valueClass}`}
      >
        {value}
      </p>
    </article>
  );
}

function TableHeading({ children }: { children: React.ReactNode }) {
  return (
    <th
      scope="col"
      className="whitespace-nowrap px-4 py-4 text-[10px] font-black uppercase tracking-[0.15em] text-slate-300 first:px-5"
    >
      {children}
    </th>
  );
}

function RankingSignal({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="min-w-0 rounded-2xl border border-white/10 bg-black/10 p-4">
      <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">
        {label}
      </p>

      <p className="mt-2 break-words text-sm font-black leading-6 text-white [overflow-wrap:anywhere]">
        {value}
      </p>
    </div>
  );
}

function TableEmptyState({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="mx-auto max-w-2xl text-center">
      <p className="text-[10px] font-black uppercase tracking-[0.18em] text-orange-300">
        Insufficient Data
      </p>

      <p className="mt-3 text-base font-black text-white">{title}</p>

      <p className="mt-2 text-sm font-semibold leading-6 text-slate-500">
        {description}
      </p>
    </div>
  );
}

function StatusBadge({
  children,
  tone = "neutral",
}: {
  children: React.ReactNode;
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
      className={`inline-flex rounded-full border px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.18em] ${toneClass}`}
    >
      {children}
    </span>
  );
}
