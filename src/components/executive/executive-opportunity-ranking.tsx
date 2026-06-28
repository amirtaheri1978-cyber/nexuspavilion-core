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

return (
<section className="mt-8 rounded-[34px] border border-white/10 bg-[#061426]/88 p-6 text-white shadow-executive sm:p-8">
<div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
<div>
<p className="text-[11px] font-black uppercase tracking-[0.34em] text-[#C8A646]">
Executive Opportunity Ranking
</p>

<h2 className="mt-4 text-3xl font-black leading-tight text-white sm:text-4xl">
Board Opportunity Queue
</h2>

<p className="mt-4 max-w-4xl text-sm font-semibold leading-7 text-slate-400">
Nexus Pavilion ranks procurement opportunities by savings potential,
supplier growth, sourcing expansion, execution horizon, board
priority, and CEO-level recommendation.
</p>
</div>

<StatusBadge tone={hasData ? "success" : "warning"}>
{hasData ? "Available" : "Insufficient Data"}
</StatusBadge>
</div>

<div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
<SummaryTile title="Top Opportunity" value={topOpportunity?.title || "No Data"} />
<SummaryTile title="Priority" value={topOpportunity?.priority || "Pending"} />
<SummaryTile title="Impact" value={topOpportunity?.impact || "Pending"} />
<SummaryTile title="Value Signal" value={topOpportunity?.value || "Pending"} />
</div>

<div className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
{opportunities.map((opportunity) => (
<OpportunityCard key={opportunity.title} opportunity={opportunity} />
))}

{opportunities.length === 0 ? (
<EmptyState message="No executive opportunity ranking data available." />
) : null}
</div>

<div className="mt-8 rounded-[30px] border border-[#2CC4E8]/15 bg-[#2CC4E8]/[0.045] p-6">
<p className="text-[10px] font-black uppercase tracking-[0.28em] text-[#9BE8F8]">
Opportunity Impact Intelligence
</p>

<h3 className="mt-3 text-2xl font-black text-white">
Executive Opportunity Interpretation
</h3>

<div className="mt-6 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
{intelligence.map((opportunity) => (
<IntelligenceCard key={opportunity.title} opportunity={opportunity} />
))}

{intelligence.length === 0 ? (
<EmptyState message="No opportunity intelligence available." />
) : null}
</div>
</div>
</section>
);
}

function OpportunityCard({ opportunity }: { opportunity: ExecutiveOpportunity }) {
return (
<div className="rounded-[28px] border border-white/10 bg-white/[0.045] p-6">
<div className="flex items-start justify-between gap-3">
<p className="text-[10px] font-black uppercase tracking-[0.22em] text-emerald-300">
{opportunity.priority}
</p>

<span className="rounded-full border border-white/10 bg-white/[0.055] px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-slate-300">
{opportunity.impact}
</span>
</div>

<h3 className="mt-4 text-xl font-black text-white">
{opportunity.title}
</h3>

<p className="mt-4 text-sm font-semibold leading-7 text-slate-400">
{opportunity.summary}
</p>

<div className="mt-5 rounded-2xl border border-white/10 bg-[#061426]/80 p-4">
<p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#C8A646]">
Opportunity Value
</p>

<p className="mt-2 text-lg font-black text-white">
{opportunity.value}
</p>
</div>
</div>
);
}

function IntelligenceCard({
opportunity,
}: {
opportunity: ExecutiveOpportunityIntelligence;
}) {
return (
<div className="rounded-[28px] border border-white/10 bg-[#061426]/80 p-6">
<p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#9BE8F8]">
Opportunity #{opportunity.rank}
</p>

<h3 className="mt-4 text-xl font-black text-white">
{opportunity.title}
</h3>

<p className="mt-4 text-sm font-semibold leading-7 text-slate-400">
{opportunity.businessImpact}
</p>

<div className="mt-5 space-y-3">
<InfoBlock title="Execution Horizon" value={opportunity.executionHorizon} />
<InfoBlock title="Board Priority" value={opportunity.boardPriority} />
<InfoBlock title="CEO Recommendation" value={opportunity.ceoRecommendation} />
</div>
</div>
);
}

function SummaryTile({ title, value }: { title: string; value: string }) {
return (
<div className="rounded-[22px] border border-white/10 bg-white/[0.055] p-5">
<p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">
{title}
</p>

<p className="mt-3 text-xl font-black text-white">{value}</p>
</div>
);
}

function InfoBlock({ title, value }: { title: string; value: string }) {
return (
<div className="rounded-2xl border border-white/10 bg-white/[0.045] p-4">
<p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">
{title}
</p>

<p className="mt-2 text-sm font-semibold leading-6 text-slate-300">
{value}
</p>
</div>
);
}

function EmptyState({ message }: { message: string }) {
return (
<div className="rounded-[24px] border border-dashed border-white/15 bg-white/[0.035] p-8 text-center md:col-span-2 xl:col-span-4">
<p className="text-sm font-bold text-slate-500">{message}</p>
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
className={`inline-flex rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] ${toneClass}`}
>
{children}
</span>
);
}
