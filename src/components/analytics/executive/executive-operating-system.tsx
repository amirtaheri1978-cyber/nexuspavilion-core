type ExecutiveOperatingSystemProps = {
boardHealthIndex: number;
benchmarkReadinessScore: number;
enterpriseCommandStatus: string;
riskCommandStatus: string;
opportunityCommandStatus: string;
executiveCommandRecommendation: string;
};

export default function ExecutiveOperatingSystem({
boardHealthIndex,
benchmarkReadinessScore,
enterpriseCommandStatus,
riskCommandStatus,
opportunityCommandStatus,
executiveCommandRecommendation,
}: ExecutiveOperatingSystemProps) {
return (
<section className="mt-8 rounded-3xl border border-slate-950 bg-slate-950 p-8 text-white">
<p className="text-xs font-black uppercase tracking-[0.25em] text-orange-400">
Executive Operating System
</p>

<h2 className="mt-3 text-4xl font-black">
Enterprise Command Layer
</h2>

<p className="mt-4 max-w-4xl text-sm font-semibold leading-7 text-slate-300">
Unified executive operating view across procurement performance,
benchmark readiness, board health, enterprise risk, supplier engagement,
and opportunity intelligence.
</p>

<div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
<DarkMetric title="Board Health" value={`${boardHealthIndex}/100`} />
<DarkMetric title="Benchmark" value={`${benchmarkReadinessScore}/100`} />
<DarkMetric title="Enterprise" value={enterpriseCommandStatus} />
<DarkMetric title="Risk" value={riskCommandStatus} />
<DarkMetric title="Opportunity" value={opportunityCommandStatus} />
</div>

<div className="mt-6 rounded-3xl border border-white/10 bg-white/5 p-6">
<p className="text-xs font-black uppercase tracking-[0.25em] text-orange-400">
Executive Recommendation
</p>

<p className="mt-4 text-sm leading-7 text-slate-300">
{executiveCommandRecommendation}
</p>
</div>
</section>
);
}

function DarkMetric({ title, value }: { title: string; value: string }) {
return (
<div className="rounded-2xl border border-white/10 bg-white/5 p-5">
<p className="text-xs font-black uppercase tracking-[0.2em] text-orange-400">
{title}
</p>

<p className="mt-3 text-2xl font-black text-white">{value}</p>
</div>
);
}
