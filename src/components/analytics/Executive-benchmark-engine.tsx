import { ExecutiveMetricCard } from "@/components/executive/executive-metric-card";
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
              Executive Benchmark Engine
            </p>

            <span
              aria-hidden="true"
              className="hidden h-1 w-1 rounded-full bg-white/20 sm:block"
            />

            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-nexus-muted">
              Enterprise comparative intelligence
            </p>
          </div>

          <h2
            id="executive-benchmark-engine-heading"
            className="mt-4 max-w-5xl text-3xl font-black leading-[1.08] tracking-tight text-nexus-white sm:text-4xl lg:text-5xl"
          >
            Industry Benchmark Intelligence
          </h2>

          <p className="mt-4 max-w-4xl text-sm font-semibold leading-7 text-nexus-muted sm:text-base">
            Nexus Pavilion converts internal procurement signals into an
            executive benchmark position using procurement health, supplier
            reliability, competition strength, prediction confidence, and
            construction classification maturity.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 xl:flex-col xl:items-end">
          <BenchmarkAvailabilityBadge active={hasBenchmarkData} />

          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-nexus-muted">
            {benchmarkMatrix.length} benchmark dimensions
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
              Benchmark position
            </p>

            <h3
              id="benchmark-position-heading"
              className="mt-3 break-words text-2xl font-black leading-8 text-nexus-white [overflow-wrap:anywhere] sm:text-3xl sm:leading-9"
            >
              {benchmarkPeerPosition}
            </h3>

            <p className="mt-3 text-xs font-semibold leading-6 text-nexus-muted">
              Current comparative position across the defined procurement
              benchmark dimensions and peer reference group.
            </p>
          </div>

          <div className="min-w-0 p-5 sm:p-6">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-nexus-muted">
              Benchmark governance
            </p>

            <h3 className="mt-3 text-xl font-black tracking-tight text-nexus-white sm:text-2xl">
              Comparative Position and Decision Confidence
            </h3>

            <p className="mt-4 max-w-4xl text-sm font-semibold leading-7 text-nexus-muted">
              Peer position should be interpreted together with benchmark
              readiness, confidence, and the underlying performance matrix
              before board-level conclusions are finalized.
            </p>

            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <BenchmarkSignal
                label="Benchmark Status"
                value={benchmarkStatus}
              />

              <BenchmarkSignal
                label="Benchmark Confidence"
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
              Comparative performance matrix
            </p>

            <h3
              id="benchmark-matrix-heading"
              className="mt-2 text-lg font-black tracking-tight text-nexus-white sm:text-xl"
            >
              Enterprise Benchmark Dimensions
            </h3>
          </div>

          <p className="max-w-xl text-xs font-semibold leading-5 text-nexus-muted sm:text-right">
            Each benchmark score remains presented on the original 100-point
            scale and in the exact order supplied by the platform.
          </p>
        </div>

        {hasBenchmarkData ? (
          <div className="mt-5 grid min-w-0 gap-5 md:grid-cols-2 xl:grid-cols-4">
            {benchmarkMatrix.map((item) => (
              <ExecutiveMetricCard
                key={item.title}
                label={`${item.title} Benchmark`}
                value={`${item.score}/100`}
                tone="blue"
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
              Benchmark Narrative
            </h3>

            <p className="mt-4 break-words text-sm font-semibold leading-7 text-nexus-muted [overflow-wrap:anywhere]">
              {benchmarkNarrative}
            </p>

            <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
              <BenchmarkSignal
                label="Peer Group Position"
                value={benchmarkPeerPosition}
              />

              <BenchmarkSignal
                label="Confidence Position"
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
                Board action should remain aligned to the benchmark status,
                peer position, confidence level, and the underlying comparative
                performance evidence.
              </p>
            </div>
          </div>
        </div>
      </section>
    </ExecutivePanel>
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
        No benchmark dimensions are available
      </p>

      <p className="mx-auto mt-2 max-w-xl text-sm font-semibold leading-6 text-nexus-muted">
        Comparative procurement benchmarks will appear when validated
        enterprise performance signals and peer-position evidence are
        available.
      </p>
    </div>
  );
}