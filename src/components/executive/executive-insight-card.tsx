import { ExecutivePanel } from "@/components/executive/executive-panel";

type InsightTone = "neutral" | "blue" | "gold" | "risk" | "success";

type ExecutiveInsightCardProps = {
title: string;
insight: string;
recommendation?: string;
impact?: string;
tone?: InsightTone;
className?: string;
};

const toneClasses: Record<InsightTone, string> = {
neutral: "text-nexus-white",
blue: "text-blue-300",
gold: "text-yellow-300",
risk: "text-red-300",
success: "text-emerald-300",
};

const recommendationToneClasses: Record<InsightTone, string> = {
neutral: "text-nexus-gold",
blue: "text-[#9BE8F8]",
gold: "text-yellow-300",
risk: "text-red-300",
success: "text-emerald-300",
};

export function ExecutiveInsightCard({
title,
insight,
recommendation,
impact,
tone = "blue",
className = "",
}: ExecutiveInsightCardProps) {
return (
<ExecutivePanel className={className} padding="md" tone={tone}>
<p className="text-[10px] font-black uppercase tracking-[0.22em] text-nexus-muted">
Executive Insight
</p>

<h3 className={`mt-3 text-lg font-black leading-tight ${toneClasses[tone]}`}>
{title}
</h3>

<p className="mt-4 text-sm font-semibold leading-7 text-nexus-muted">
{insight}
</p>

{recommendation ? (
<div className="mt-5 rounded-2xl border border-white/10 bg-white/5 p-4">
<p
className={`text-[10px] font-black uppercase tracking-[0.2em] ${recommendationToneClasses[tone]}`}
>
Recommendation
</p>

<p className="mt-2 text-sm font-bold leading-6 text-nexus-white">
{recommendation}
</p>
</div>
) : null}

{impact ? (
<div className="mt-4 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-4">
<p className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-300">
Potential Impact
</p>

<p className="mt-2 text-sm font-bold leading-6 text-emerald-200">
{impact}
</p>
</div>
) : null}
</ExecutivePanel>
);
}