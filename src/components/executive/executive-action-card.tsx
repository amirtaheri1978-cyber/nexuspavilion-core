import { ExecutivePanel } from "@/components/executive/executive-panel";

type ActionPriority = "low" | "medium" | "high" | "critical";

type ExecutiveActionCardProps = {
title: string;
description: string;
actionLabel: string;
priority?: ActionPriority;
impact?: string;
className?: string;
onClick?: () => void;
};

const priorityStyles: Record<ActionPriority, string> = {
low: "border-[#2CC4E8]/25 bg-[#2CC4E8]/10 text-[#9BE8F8]",
medium: "border-yellow-300/25 bg-yellow-400/10 text-yellow-300",
high: "border-orange-300/25 bg-orange-400/10 text-orange-300",
critical: "border-red-300/25 bg-red-400/10 text-red-300",
};

const buttonStyles: Record<ActionPriority, string> = {
low: "border-[#2CC4E8]/25 bg-[#2CC4E8]/10 text-[#9BE8F8] hover:bg-[#2CC4E8]/15",
medium:
"border-yellow-300/25 bg-yellow-400/10 text-yellow-300 hover:bg-yellow-400/15",
high: "border-[#C8A646]/25 bg-[#C8A646]/10 text-[#F5D77B] hover:bg-[#C8A646]/15",
critical:
"border-red-300/25 bg-red-400/10 text-red-300 hover:bg-red-400/15",
};

const priorityLabels: Record<ActionPriority, string> = {
low: "Low Priority",
medium: "Medium Priority",
high: "High Priority",
critical: "Critical",
};

const priorityGlyphs: Record<ActionPriority, string> = {
low: "●",
medium: "●",
high: "●",
critical: "●",
};

export function ExecutiveActionCard({
title,
description,
actionLabel,
priority = "medium",
impact,
className = "",
onClick,
}: ExecutiveActionCardProps) {
return (
<ExecutivePanel
className={className}
padding="md"
tone={priority === "critical" ? "risk" : "gold"}
>
<div className="flex items-start justify-between gap-4">
<div>
<p className="text-[10px] font-black uppercase tracking-[0.22em] text-nexus-muted">
Executive Action
</p>

<h3 className="mt-3 text-lg font-black leading-tight text-nexus-white">
{title}
</h3>
</div>

<span
className={`inline-flex shrink-0 items-center gap-2 rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] ${priorityStyles[priority]}`}
>
<span aria-hidden="true">{priorityGlyphs[priority]}</span>
{priorityLabels[priority]}
</span>
</div>

<p className="mt-4 text-sm font-semibold leading-7 text-nexus-muted">
{description}
</p>

{impact ? (
<div className="mt-5 rounded-2xl border border-white/10 bg-white/5 p-4">
<p className="text-[10px] font-black uppercase tracking-[0.2em] text-nexus-gold">
Expected Business Impact
</p>

<p className="mt-2 text-sm font-bold leading-6 text-nexus-white">
{impact}
</p>
</div>
) : null}

<button
type="button"
onClick={onClick}
disabled={!onClick}
className={`mt-5 inline-flex items-center justify-center rounded-full border px-5 py-3 text-sm font-black transition hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-50 ${buttonStyles[priority]}`}
>
{actionLabel} →
</button>
</ExecutivePanel>
);
}