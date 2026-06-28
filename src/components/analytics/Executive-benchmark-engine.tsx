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
return (
<ExecutivePanel padding="lg">
<p className="text-xs font-black uppercase tracking-[0.25em] text-nexus-gold">
Executive Benchmark Engine
</p>

<h2 className="mt-3 text-3xl font-black text-nexus-white">
Industry Benchmark Intelligence
</h2>

<p className="mt-4 max-w-4xl text-sm font-semibold leading-7 text-nexus-muted">
Nexus Pavilion converts internal procurement signals into an executive
benchmark position using procurement health, supplier reliability,
competition strength, prediction confidence, and construction
classification maturity.
</p>

<div className="mt-8 grid gap-6 md:grid-cols-2 xl:grid-cols-4">
{benchmarkMatrix.map((item) => (
<ExecutiveMetricCard
key={item.title}
label={`${item.title} Benchmark`}
value={`${item.score}/100`}
tone="blue"
/>
))}
</div>

<div className="mt-8 grid gap-6 lg:grid-cols-[0.85fr_1.15fr]">
<div className="rounded-3xl border border-nexus-gold/20 bg-nexus-gold/10 p-6">
<p className="text-xs font-black uppercase tracking-[0.2em] text-nexus-gold">
Peer Group Position
</p>

<h3 className="mt-3 text-3xl font-black text-nexus-white">
{benchmarkPeerPosition}
</h3>

<p className="mt-4 text-sm font-semibold leading-7 text-nexus-muted">
Benchmark Status: {benchmarkStatus}
</p>

<p className="mt-3 text-sm font-semibold leading-7 text-nexus-muted">
Benchmark Confidence: {benchmarkConfidence}
</p>
</div>

<div className="rounded-3xl border border-white/10 bg-white/5 p-6">
<p className="text-xs font-black uppercase tracking-[0.2em] text-nexus-muted">
Benchmark Narrative
</p>

<p className="mt-4 text-sm font-semibold leading-7 text-nexus-muted">
{benchmarkNarrative}
</p>

<div className="mt-5 rounded-2xl border border-white/10 bg-black/20 p-5">
<p className="text-xs font-black uppercase tracking-[0.2em] text-nexus-gold">
Board Recommendation
</p>

<p className="mt-3 text-sm font-semibold leading-7 text-nexus-muted">
{benchmarkBoardRecommendation}
</p>
</div>
</div>
</div>
</ExecutivePanel>
);
}
