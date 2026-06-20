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
low: "text-blue-300",
medium: "text-yellow-300",
high: "text-orange-300",
critical: "text-red-300",
};

const priorityLabels: Record<ActionPriority, string> = {
low: "Low Priority",
medium: "Medium Priority",
high: "High Priority",
critical: "Critical",
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

<h3 className="mt-3 text-lg font-black text-nexus-white">
{title}
</h3>
</div>

<span
className={`text-xs font-black uppercase tracking-wide ${priorityStyles[priority]}`}
>
{priorityLabels[priority]}
</span>
</div>

<p className="mt-4 text-sm font-semibold leading-7 text-nexus-muted">
{description}
</p>

{impact ? (
<div className="mt-5 rounded-2xl border border-white/10 bg-white/5 p-4">
<p className="text-[10px] font-black uppercase tracking-[0.2em] text-nexus-gold">
Business Impact
</p>

<p className="mt-2 text-sm font-bold text-nexus-white">
{impact}
</p>
</div>
) : null}

<button
type="button"
onClick={onClick}
className="mt-5 inline-flex items-center justify-center rounded-full bg-nexus-white px-5 py-3 text-sm font-black text-nexus-navy transition hover:scale-[1.02]"
>
{actionLabel}
</button>
</ExecutivePanel>
);
}