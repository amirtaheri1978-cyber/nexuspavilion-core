import { ExecutivePanel } from "@/components/executive/executive-panel";

type BenchmarkMatrixItem = {
  title: string;
  score: number;
};

type ExecutiveBenchmarkEngineProps = {
  benchmarkMatrix: BenchmarkMatrixItem[];
  benchmarkPeerPosition: string;
  benchmarkStatus: string;
  benchmarkConfidence: string;
  benchmarkNarrative: string;
  benchmarkBoardRecommendation: string;
};

export function ExecutiveBenchmarkEngine({
  benchmarkMatrix,
  benchmarkPeerPosition,
  benchmarkStatus,
  benchmarkConfidence,
  benchmarkNarrative,
  benchmarkBoardRecommendation,
}: ExecutiveBenchmarkEngineProps) {
  const hasBenchmarkData = benchmarkMatrix.length > 0;

  return (
    <ExecutivePanel
      aria-labelledby="executive-benchmark-engine-heading"
      padding="lg"
    >
      <header className="grid min-w-0 gap-6 border-b border-white/10 pb-7 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-end">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-3">
            <p className="text-[10px] font-black uppercase tracking-[0.28em] text-nexus-gold sm:text-xs">
              Executive Performance Engine
            </p>

            <span
              aria-hidden="true"
              className="hidden h-1 w-1 rounded-full bg-white/20 sm:block"
            />

            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-nexus-muted">
              Internal decision-support intelligence
            </p>
          </div>

          <h2
            id="executive-benchmark-engine-heading"
            className="mt-4 max-w-5xl text-3xl font-black leading-[1.08] tracking-tight text-nexus-white sm:text-4xl lg:text-5xl"
          >
            Internal Performance Intelligence
          </h2>

          <p className="mt-4 max-w-4xl text-sm font-semibold leading-7 text-nexus-muted sm:text-base">
            Nexus Pavilion converts validated internal procurement signals into
            an executive operating position using procurement health, supplier
            reliability, competition strength, classification maturity, and
            evidence readiness. This is not an external peer or industry
            benchmark.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 xl:flex-col xl:items-end">
          <BenchmarkAvailabilityBadge active={hasBenchmarkData} />

          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-nexus-muted">
            {benchmarkMatrix.length} internal dimensions
          </p>
        </div>
      </header>

      <section
        aria-labelledby="benchmark-position-heading"
        className="mt-7 overflow-hidden rounded-3xl border border-nexus-gold/20 bg-nexus-gold/[0.045]"
      >
        <div className="grid min-w-0 xl:grid-cols-[340px_minmax(0,1fr)]">
          <div className="border-b border-white/10 p-5 sm:p-6 xl:border-b-0 xl:border-r">
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-nexus-gold">
              Internal performance position
            </p>

            <h3
              id="benchmark-position-heading"
              className="mt-3 break-words text-2xl font-black leading-8 text-nexus-white [overflow-wrap:anywhere] sm:text-3xl sm:leading-9"
            >
              {benchmarkPeerPosition}
            </h3>

            <p className="mt-3 text-xs font-semibold leading-6 text-nexus-muted">
              Current operating position derived from the organization&apos;s
              validated procurement evidence and internal performance measures.
            </p>
          </div>

          <div className="min-w-0 p-5 sm:p-6">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-nexus-muted">
              Performance governance
            </p>

            <h3 className="mt-3 text-xl font-black tracking-tight text-nexus-white sm:text-2xl">
              Operating Position and Evidence Readiness
            </h3>

            <p className="mt-4 max-w-4xl text-sm font-semibold leading-7 text-nexus-muted">
              The operating position is derived only from current Nexus Pavilion
              workspace data. It should be interpreted with evidence readiness
              and the underlying internal performance matrix before board-level
              conclusions are finalized.
            </p>

            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <BenchmarkSignal
                label="Internal Status"
                value={benchmarkStatus}
              />

              <BenchmarkSignal
                label="Evidence Readiness"
                value={benchmarkConfidence}
              />
            </div>
          </div>
        </div>
      </section>

      <section
        aria-labelledby="benchmark-matrix-heading"
        className="mt-7 min-w-0"
      >
        <div className="flex flex-col gap-3 border-b border-white/10 pb-5 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-nexus-gold">
              Internal performance matrix
            </p>

            <h3
              id="benchmark-matrix-heading"
              className="mt-2 text-lg font-black tracking-tight text-nexus-white sm:text-xl"
            >
              Internal Performance Dimensions
            </h3>
          </div>

          <p className="max-w-xl text-xs font-semibold leading-5 text-nexus-muted sm:text-right">
            Each score is an internally derived 100-point indicator calculated
            from the current organization&apos;s validated procurement signals.
          </p>
        </div>

        {hasBenchmarkData ? (
          <div className="mt-5 grid min-w-0 gap-5 md:grid-cols-2 xl:grid-cols-4">
            {benchmarkMatrix.map((item, index) => (
              <BenchmarkDimensionCard
                key={item.title}
                item={item}
                position={index + 1}
              />
            ))}
          </div>
        ) : (
          <BenchmarkEmptyState />
        )}
      </section>

      <section
        aria-labelledby="benchmark-interpretation-heading"
        className="mt-7 overflow-hidden rounded-3xl border border-white/10 bg-white/[0.025]"
      >
        <div className="grid min-w-0 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
          <div className="border-b border-white/10 p-5 sm:p-6 lg:border-b-0 lg:border-r">
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-nexus-gold">
              Executive interpretation
            </p>

            <h3
              id="benchmark-interpretation-heading"
              className="mt-3 text-xl font-black tracking-tight text-nexus-white sm:text-2xl"
            >
              Internal Performance Narrative
            </h3>

            <p className="mt-4 break-words text-sm font-semibold leading-7 text-nexus-muted [overflow-wrap:anywhere]">
              {benchmarkNarrative}
            </p>

            <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
              <BenchmarkSignal
                label="Internal Position"
                value={benchmarkPeerPosition}
              />

              <BenchmarkSignal
                label="Evidence Readiness"
                value={benchmarkConfidence}
              />
            </div>
          </div>

          <div className="min-w-0 p-5 sm:p-6">
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-nexus-gold">
              Board recommendation
            </p>

            <h3 className="mt-3 text-xl font-black tracking-tight text-nexus-white sm:text-2xl">
              Recommended Executive Direction
            </h3>

            <div className="mt-5 rounded-2xl border border-nexus-gold/15 bg-nexus-gold/[0.04] p-5 sm:p-6">
              <p className="break-words text-sm font-semibold leading-7 text-nexus-muted [overflow-wrap:anywhere]">
                {benchmarkBoardRecommendation}
              </p>
            </div>

            <div className="mt-5 rounded-2xl border border-white/10 bg-black/10 p-4 sm:p-5">
              <p className="text-[10px] font-black uppercase tracking-[0.17em] text-nexus-muted">
                Decision context
              </p>

              <p className="mt-3 text-sm font-semibold leading-7 text-nexus-muted">
                Board action should remain aligned to the internal performance
                status, evidence readiness, and the underlying validated
                procurement evidence.
              </p>
            </div>
          </div>
        </div>
      </section>
    </ExecutivePanel>
  );
}

function BenchmarkDimensionCard({
  item,
  position,
}: {
  item: BenchmarkMatrixItem;
  position: number;
}) {
  return (
    <article className="flex min-w-0 flex-col rounded-3xl border border-blue-500/20 bg-blue-500/[0.04] p-5 sm:p-6">
      <div className="flex min-w-0 items-start justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-blue-400/20 bg-blue-400/[0.08] text-[10px] font-black text-blue-300">
            {String(position).padStart(2, "0")}
          </span>

          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-nexus-muted">
              Internal performance dimension
            </p>

            <p className="mt-1 break-words text-[10px] font-black uppercase tracking-[0.17em] text-blue-300 [overflow-wrap:anywhere]">
              Workspace-derived indicator
            </p>
          </div>
        </div>

        <span className="shrink-0 rounded-full border border-white/10 bg-white/[0.05] px-3 py-1 text-[9px] font-black uppercase tracking-[0.14em] text-nexus-muted">
          100-point scale
        </span>
      </div>

      <h4 className="mt-5 break-words text-xl font-black leading-7 text-nexus-white [overflow-wrap:anywhere]">
        {item.title}
      </h4>

      <div className="mt-5 rounded-2xl border border-white/10 bg-black/10 p-4">
        <p className="text-[10px] font-black uppercase tracking-[0.16em] text-nexus-muted">
          Internal score
        </p>

        <div className="mt-2 flex min-w-0 items-end gap-2">
          <p className="break-words text-3xl font-black leading-none text-nexus-white [overflow-wrap:anywhere]">
            {item.score}
          </p>

          <p className="pb-0.5 text-xs font-black uppercase tracking-[0.15em] text-nexus-muted">
            / 100
          </p>
        </div>
      </div>

      <p className="mt-4 text-xs font-semibold leading-6 text-nexus-muted">
        Derived from validated internal procurement signals for the current
        organization workspace.
      </p>

      <div className="mt-5 flex items-center justify-between gap-3 border-t border-white/10 pt-4">
        <p className="text-[10px] font-black uppercase tracking-[0.14em] text-nexus-muted">
          Internal intelligence
        </p>

        <p className="text-[10px] font-black uppercase tracking-[0.14em] text-blue-300">
          Executive review
        </p>
      </div>
    </article>
  );
}

function BenchmarkSignal({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="min-w-0 rounded-2xl border border-white/10 bg-black/10 p-4">
      <p className="text-[10px] font-black uppercase tracking-[0.16em] text-nexus-muted">
        {label}
      </p>

      <p className="mt-2 break-words text-sm font-black leading-6 text-nexus-white [overflow-wrap:anywhere]">
        {value}
      </p>
    </div>
  );
}

function BenchmarkAvailabilityBadge({ active }: { active: boolean }) {
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

function BenchmarkEmptyState() {
  return (
    <div className="mt-5 rounded-3xl border border-dashed border-white/15 bg-white/[0.025] p-8 text-center sm:p-10">
      <p className="text-[10px] font-black uppercase tracking-[0.18em] text-orange-300">
        Insufficient Data
      </p>

      <p className="mt-3 text-base font-black text-nexus-white">
        No internal performance dimensions are available
      </p>

      <p className="mx-auto mt-2 max-w-xl text-sm font-semibold leading-6 text-nexus-muted">
        Internal performance indicators will appear when validated enterprise
        operating signals are available for the current organization.
      </p>
    </div>
  );
}
