type CEOMorningBriefingProps = {
ceoMorningBrief: string;
ceoReadinessScore: number;
ceoPriorityLevel: string;
ceoRiskLevel: string;
ceoOpportunityLevel: string;
ceoPriorityQueue: string[];
ceoCriticalRisks: string[];
ceoStrategicOpportunities: string[];
};

export default function CEOMorningBriefing({
ceoMorningBrief,
ceoReadinessScore,
ceoPriorityLevel,
ceoRiskLevel,
ceoOpportunityLevel,
ceoPriorityQueue,
ceoCriticalRisks,
ceoStrategicOpportunities,
}: CEOMorningBriefingProps) {
return (
<section className="mt-8 rounded-3xl border border-slate-950 bg-slate-950 p-8 text-white">
<p className="text-xs font-black uppercase tracking-[0.25em] text-orange-400">
CEO Briefing Intelligence
</p>

<h2 className="mt-3 text-4xl font-black">
Executive Morning Brief
</h2>

<p className="mt-4 max-w-4xl text-sm leading-7 text-slate-300">
{ceoMorningBrief}
</p>

<div className="mt-8 grid gap-4 md:grid-cols-4">
<DarkMetric title="CEO Readiness" value={`${ceoReadinessScore}/100`} />
<DarkMetric title="Priority" value={ceoPriorityLevel} />
<DarkMetric title="Risk Level" value={ceoRiskLevel} />
<DarkMetric title="Opportunity" value={ceoOpportunityLevel} />
</div>

<div className="mt-8 grid gap-6 md:grid-cols-3">
<DarkList title="Priority Queue" items={ceoPriorityQueue} />
<DarkList title="Critical Risks" items={ceoCriticalRisks} />
<DarkList
title="Strategic Opportunities"
items={ceoStrategicOpportunities}
/>
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

function DarkList({ title, items }: { title: string; items: string[] }) {
return (
<div className="rounded-2xl border border-white/10 bg-white/5 p-5">
<p className="text-xs font-black uppercase tracking-[0.2em] text-orange-400">
{title}
</p>

<div className="mt-4 space-y-3">
{items.map((item) => (
<div
key={item}
className="rounded-xl bg-white/5 p-3 text-sm text-slate-300"
>
{item}
</div>
))}
</div>
</div>
);
}
