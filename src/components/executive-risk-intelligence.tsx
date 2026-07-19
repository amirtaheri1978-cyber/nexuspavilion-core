type SupplierRisk = {
  name: string | null;
  overallRisk: number;
  financialRisk: number;
  performanceRisk: number;
  capacityRisk: number;
  dependencyRisk: number;
};

type SupplierRanking = {
  name: string | null;
  quotes: number;
  awards: number;
  revenue: number;
  winRate: number;
  aiScore: number;
  tier: string;
  recommendation: string;
};

type ExecutiveRiskIntelligenceProps = {
  supplierRiskRadar: SupplierRisk[];
  supplierRanking: SupplierRanking[];
};

export default function ExecutiveRiskIntelligence({
  supplierRiskRadar,
  supplierRanking,
}: ExecutiveRiskIntelligenceProps) {
  const topSupplier = supplierRanking[0] || null;

  const highRiskSupplierCount = supplierRiskRadar.filter(
    (supplier) => supplier.overallRisk >= 70
  ).length;

  const strategicSupplierCount = supplierRanking.filter(
    (supplier) => supplier.tier === "Strategic"
  ).length;

  const averageWinRate =
    supplierRanking.length > 0
      ? Math.round(
          supplierRanking.reduce(
            (sum, supplier) => sum + supplier.winRate,
            0
          ) / supplierRanking.length
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

  const hasSupplierData =
    supplierRiskRadar.length > 0 || supplierRanking.length > 0;

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
                Supplier Benchmarking Engine
              </p>

              <span
                aria-hidden="true"
                className="hidden h-1 w-1 rounded-full bg-white/20 sm:block"
              />

              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">
                Supplier network intelligence
              </p>
            </div>

            <h2
              id="supplier-network-benchmark-heading"
              className="mt-4 max-w-5xl text-3xl font-black leading-[1.08] tracking-tight text-white sm:text-4xl lg:text-5xl"
            >
              Supplier Network Benchmark
            </h2>

            <p className="mt-4 max-w-4xl text-sm font-semibold leading-7 text-slate-400 sm:text-base">
              Comparative supplier intelligence based on award history, quote
              participation, revenue concentration, win rate, intelligence
              score, and supplier risk exposure.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 xl:flex-col xl:items-end">
            <StatusBadge tone={hasSupplierData ? "success" : "warning"}>
              {hasSupplierData ? "Available" : "Insufficient Data"}
            </StatusBadge>

            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">
              Executive supplier position
            </p>
          </div>
        </header>

        <div className="grid min-w-0 xl:grid-cols-[minmax(0,1.25fr)_minmax(320px,0.75fr)]">
          <div className="min-w-0 border-b border-white/10 p-6 sm:p-8 xl:border-b-0 xl:border-r">
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#C8A646]">
              Executive supplier position
            </p>

            <h3 className="mt-3 text-xl font-black tracking-tight text-white sm:text-2xl">
              Network Performance and Exposure
            </h3>

            <p className="mt-4 max-w-3xl text-sm font-semibold leading-7 text-slate-400">
              The benchmark consolidates supplier maturity, strategic coverage,
              risk concentration, and commercial performance into one
              executive-level supplier network view.
            </p>

            <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              <SupplierBenchmarkMetric
                title="Top Supplier"
                value={topSupplier?.name || "No Data"}
                emphasis
              />

              <SupplierBenchmarkMetric
                title="Network Maturity"
                value={supplierNetworkMaturity}
              />

              <SupplierBenchmarkMetric
                title="Strategic Suppliers"
                value={String(strategicSupplierCount)}
              />
            </div>
          </div>

          <div className="min-w-0 p-6 sm:p-8">
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-500">
              Executive control signals
            </p>

            <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
              <SupplierBenchmarkMetric
                title="High Risk Suppliers"
                value={String(highRiskSupplierCount)}
                tone={highRiskSupplierCount > 0 ? "risk" : "success"}
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
        aria-labelledby="supplier-risk-intelligence-heading"
        className="overflow-hidden rounded-[34px] border border-white/10 bg-white/[0.045] text-white shadow-inner-executive"
      >
        <header className="grid min-w-0 gap-5 border-b border-white/10 p-6 sm:p-8 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-end">
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-[0.28em] text-[#C8A646]">
              Supplier Risk Radar
            </p>

            <h2
              id="supplier-risk-intelligence-heading"
              className="mt-3 text-2xl font-black tracking-tight text-white sm:text-3xl"
            >
              Supplier Risk Intelligence
            </h2>

            <p className="mt-3 max-w-3xl text-sm font-semibold leading-7 text-slate-400">
              Supplier-level exposure across financial stability, performance,
              delivery capacity, and organizational dependency.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 xl:flex-col xl:items-end">
            <StatusBadge
              tone={supplierRiskRadar.length > 0 ? "success" : "warning"}
            >
              {supplierRiskRadar.length > 0
                ? "Available"
                : "Insufficient Data"}
            </StatusBadge>

            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">
              {supplierRiskRadar.length} supplier risk records
            </p>
          </div>
        </header>

        <div className="p-4 sm:p-6 lg:p-8">
          <div className="overflow-x-auto rounded-[24px] border border-white/10 bg-[#061426]/55">
            <table className="w-full min-w-[820px] text-left">
              <thead className="bg-[#07111F] text-white">
                <tr>
                  <TableHeading>Supplier</TableHeading>
                  <TableHeading>Overall</TableHeading>
                  <TableHeading>Financial</TableHeading>
                  <TableHeading>Performance</TableHeading>
                  <TableHeading>Capacity</TableHeading>
                  <TableHeading>Dependency</TableHeading>
                </tr>
              </thead>

              <tbody>
                {supplierRiskRadar.map((supplier) => (
                  <tr
                    key={supplier.name || "unknown-supplier-risk"}
                    className="border-t border-white/10 transition-colors hover:bg-white/[0.025]"
                  >
                    <td className="px-4 py-4">
                      <p className="max-w-[240px] break-words font-bold text-white [overflow-wrap:anywhere]">
                        {supplier.name || "Unknown Supplier"}
                      </p>
                    </td>

                    <td className="px-4 py-4 font-black">
                      <RiskValue value={supplier.overallRisk} />
                    </td>

                    <RiskDimensionCell value={supplier.financialRisk} />
                    <RiskDimensionCell value={supplier.performanceRisk} />
                    <RiskDimensionCell value={supplier.capacityRisk} />
                    <RiskDimensionCell value={supplier.dependencyRisk} />
                  </tr>
                ))}

                {supplierRiskRadar.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-5 py-12">
                      <TableEmptyState
                        title="No supplier risk data available"
                        description="Supplier-level financial, performance, capacity, and dependency exposure cannot currently be evaluated."
                      />
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>

          <div className="mt-5 rounded-2xl border border-white/10 bg-black/10 p-4 sm:p-5">
            <p className="text-[10px] font-black uppercase tracking-[0.17em] text-[#C8A646]">
              Executive risk interpretation
            </p>

            <p className="mt-3 text-sm font-semibold leading-7 text-slate-400">
              Overall supplier risk should be reviewed together with the
              underlying financial, performance, capacity, and dependency
              dimensions before supplier escalation or sourcing decisions are
              finalized.
            </p>
          </div>
        </div>
      </section>

      <section
        aria-labelledby="supplier-intelligence-ranking-heading"
        className="overflow-hidden rounded-[34px] border border-white/10 bg-white/[0.045] text-white shadow-inner-executive"
      >
        <header className="grid min-w-0 gap-5 border-b border-white/10 p-6 sm:p-8 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-end">
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-[0.28em] text-[#C8A646]">
              AI Supplier Ranking Engine
            </p>

            <h2
              id="supplier-intelligence-ranking-heading"
              className="mt-3 text-2xl font-black tracking-tight text-white sm:text-3xl"
            >
              Supplier Intelligence Ranking
            </h2>

            <p className="mt-3 max-w-3xl text-sm font-semibold leading-7 text-slate-400">
              Comparative supplier ranking based on intelligence score,
              strategic tier, commercial performance, revenue contribution,
              and procurement recommendation.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 xl:flex-col xl:items-end">
            <StatusBadge
              tone={supplierRanking.length > 0 ? "success" : "warning"}
            >
              {supplierRanking.length > 0
                ? "Available"
                : "Insufficient Data"}
            </StatusBadge>

            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">
              {supplierRanking.length} ranked suppliers
            </p>
          </div>
        </header>

        <div className="p-4 sm:p-6 lg:p-8">
          <div className="overflow-x-auto rounded-[24px] border border-white/10 bg-[#061426]/55">
            <table className="w-full min-w-[920px] text-left">
              <thead className="bg-[#07111F] text-white">
                <tr>
                  <TableHeading>Supplier</TableHeading>
                  <TableHeading>AI Score</TableHeading>
                  <TableHeading>Tier</TableHeading>
                  <TableHeading>Win Rate</TableHeading>
                  <TableHeading>Revenue</TableHeading>
                  <TableHeading>Recommendation</TableHeading>
                </tr>
              </thead>

              <tbody>
                {supplierRanking.map((vendor) => (
                  <tr
                    key={vendor.name || "unknown-supplier-ranking"}
                    className="border-t border-white/10 transition-colors hover:bg-white/[0.025]"
                  >
                    <td className="px-5 py-4">
                      <p className="max-w-[240px] break-words font-bold text-white [overflow-wrap:anywhere]">
                        {vendor.name || "Unknown Supplier"}
                      </p>
                    </td>

                    <td className="px-5 py-4">
                      <span className="inline-flex min-w-12 items-center justify-center rounded-full border border-emerald-300/20 bg-emerald-400/10 px-3 py-1 text-sm font-black text-emerald-300">
                        {vendor.aiScore}
                      </span>
                    </td>

                    <td className="px-5 py-4">
                      <span className="inline-flex rounded-full border border-[#2CC4E8]/20 bg-[#2CC4E8]/10 px-3 py-1 text-xs font-black text-[#9BE8F8]">
                        {vendor.tier}
                      </span>
                    </td>

                    <td className="px-5 py-4 font-semibold text-slate-300">
                      {vendor.winRate}%
                    </td>

                    <td className="px-5 py-4 font-semibold text-slate-300">
                      ${vendor.revenue.toLocaleString()}
                    </td>

                    <td className="px-5 py-4">
                      <p className="max-w-[360px] break-words text-sm font-semibold leading-6 text-slate-300 [overflow-wrap:anywhere]">
                        {vendor.recommendation}
                      </p>
                    </td>
                  </tr>
                ))}

                {supplierRanking.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-5 py-12">
                      <TableEmptyState
                        title="No supplier intelligence available"
                        description="Supplier ranking, tier classification, commercial performance, and procurement recommendations cannot currently be evaluated."
                      />
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>

          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <RankingSignal
              label="Leading Supplier"
              value={topSupplier?.name || "No Data"}
            />

            <RankingSignal
              label="Strategic Supplier Coverage"
              value={String(strategicSupplierCount)}
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

function RiskValue({ value }: { value: number }) {
  const tone =
    value >= 70
      ? "border-red-300/20 bg-red-400/10 text-red-300"
      : value >= 45
        ? "border-yellow-300/20 bg-yellow-400/10 text-yellow-300"
        : "border-emerald-300/20 bg-emerald-400/10 text-emerald-300";

  return (
    <span
      className={`inline-flex min-w-12 items-center justify-center rounded-full border px-3 py-1 text-sm font-black ${tone}`}
    >
      {value}
    </span>
  );
}

function RiskDimensionCell({ value }: { value: number }) {
  return (
    <td className="px-4 py-4">
      <span className="font-semibold text-slate-300">{value}</span>
    </td>
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