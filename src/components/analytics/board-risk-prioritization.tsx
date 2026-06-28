import { ExecutivePanel } from "@/components/executive/executive-panel";

type BoardRisk = {
title: string;
priority: string;
attention: string;
summary: string;
impact: string;
};

type BoardRiskPrioritizationProps = {
boardRiskPriorities: BoardRisk[];
};

export function BoardRiskPrioritization({
boardRiskPriorities,
}: BoardRiskPrioritizationProps) {
return (
<ExecutivePanel padding="lg">
<p className="text-xs font-black uppercase tracking-[0.25em] text-nexus-gold">
Board Risk Prioritization
</p>

<h2 className="mt-3 text-3xl font-black text-nexus-white">
Executive Risk Priority Queue
</h2>

<p className="mt-4 max-w-4xl text-sm font-semibold leading-7 text-nexus-muted">
Nexus Pavilion ranks procurement risks by executive attention,
operating impact, and board-level urgency using validated
procurement, supplier classification, and award intelligence.
</p>

<div className="mt-8 grid gap-6 md:grid-cols-2 xl:grid-cols-4">
{boardRiskPriorities.map((risk) => {
const tone =
risk.priority === "Critical"
? "border-red-500/30 bg-red-500/10"
: risk.priority === "Moderate"
? "border-amber-500/30 bg-amber-500/10"
: "border-white/10 bg-white/5";

const priorityColor =
risk.priority === "Critical"
? "text-red-400"
: risk.priority === "Moderate"
? "text-amber-300"
: "text-nexus-muted";

return (
<div
key={risk.title}
className={`rounded-3xl border p-6 ${tone}`}
>
<div className="flex items-start justify-between gap-3">
<p
className={`text-xs font-black uppercase tracking-[0.2em] ${priorityColor}`}
>
{risk.priority}
</p>

<span className="rounded-full border border-white/10 bg-white/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-nexus-white">
{risk.attention}
</span>
</div>

<h3 className="mt-5 text-xl font-black text-nexus-white">
{risk.title}
</h3>

<p className="mt-4 text-sm font-semibold leading-7 text-nexus-muted">
{risk.summary}
</p>

<div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-4">
<p className="text-xs font-black uppercase tracking-[0.2em] text-nexus-gold">
Business Impact
</p>

<p className="mt-2 text-sm font-black text-nexus-white">
{risk.impact}
</p>
</div>
</div>
);
})}
</div>
</ExecutivePanel>
);
}
