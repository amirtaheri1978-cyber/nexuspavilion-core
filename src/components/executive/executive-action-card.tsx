import { ExecutiveBadge } from "@/components/executive/executive-badge";
import { ExecutivePanel } from "@/components/executive/executive-panel";

type ActionPriority = "low" | "medium" | "high" | "critical";

type ExecutiveActionCardProps = {
title: string;
description: string;
actionLabel?: string;
priority?: ActionPriority;
impact?: string;
className?: string;
onClick?: () => void;
};

const priorityTone: Record<
ActionPriority,
"blue" | "gold" | "warning" | "risk"
> = {
low: "blue",
medium: "gold",
high: "warning",
critical: "risk",
};

const priorityLabels: Record<ActionPriority, string> = {
low: "Low Priority",
medium: "Medium Priority",
high: "High Priority",
critical: "Critical",
};

const buttonStyles: Record<ActionPriority, string> = {
low: "border-[#2CC4E8]/25 bg-[#2CC4E8]/10 text-[#9BE8F8] hover:bg-[#2CC4E8]/15",
medium:
"border-yellow-300/25 bg-yellow-400/10 text-yellow-300 hover:bg-yellow-400/15",
high: "border-orange-300/25 bg-orange-400/10 text-orange-300 hover:bg-orange-400/15",
critical:
"border-red-300/25 bg-red-400/10 text-red-300 hover:bg-red-400/15",
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
const hasAction = Boolean(actionLabel && onClick);

return (
<ExecutivePanel
className={className}
padding="md"
tone={priority === "critical" ? "risk" : "gold"}
>
<div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
<div>
<p className="text-[10px] font-black uppercase tracking-[0.22em] text-nexus-muted">
Executive Action
</p>

<h3 className="mt-3 text-lg font-black leading-tight text-nexus-white">
{title}
</h3>
</div>

<ExecutiveBadge tone={priorityTone[priority]} size="sm">
{priorityLabels[priority]}
</ExecutiveBadge>
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

{hasAction ? (
<button
type="button"
onClick={onClick}
className={[
"mt-5 inline-flex items-center justify-center rounded-full border px-5 py-3 text-sm font-black",
"transition-all duration-200 hover:scale-[1.02]",
"focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2CC4E8]/40",
buttonStyles[priority],
].join(" ")}
>
{actionLabel} →
</button>
) : null}
</ExecutivePanel>
);
}