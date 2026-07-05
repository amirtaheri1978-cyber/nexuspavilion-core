import { ExecutiveBadge } from "@/components/executive/executive-badge";
import { ExecutivePanel } from "@/components/executive/executive-panel";

type RiskSeverity = "low" | "medium" | "high" | "critical";

type ExecutiveRiskCardProps = {
title: string;
description: string;
severity?: RiskSeverity;
recommendation?: string;
exposure?: string;
className?: string;
};

const severityTone: Record<RiskSeverity, "success" | "warning" | "risk"> = {
low: "success",
medium: "warning",
high: "risk",
critical: "risk",
};

const severityLabel: Record<RiskSeverity, string> = {
low: "Low Risk",
medium: "Medium Risk",
high: "High Risk",
critical: "Critical Risk",
};

export function ExecutiveRiskCard({
title,
description,
severity = "medium",
recommendation,
exposure,
className = "",
}: ExecutiveRiskCardProps) {
return (
<ExecutivePanel className={className} padding="md" tone="risk">
<div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
<p className="text-[10px] font-black uppercase tracking-[0.22em] text-nexus-muted">
Risk Intelligence
</p>

<ExecutiveBadge tone={severityTone[severity]}>
{severityLabel[severity]}
</ExecutiveBadge>
</div>

<h3 className="mt-4 text-lg font-black leading-tight text-nexus-white">
{title}
</h3>

<p className="mt-4 text-sm font-semibold leading-7 text-nexus-muted">
{description}
</p>

{recommendation ? (
<div className="mt-5 rounded-2xl border border-white/10 bg-white/5 p-4">
<p className="text-[10px] font-black uppercase tracking-[0.2em] text-orange-300">
Recommendation
</p>

<p className="mt-2 text-sm font-bold leading-6 text-nexus-white">
{recommendation}
</p>
</div>
) : null}

{exposure ? (
<div className="mt-4 rounded-2xl border border-red-500/20 bg-red-500/5 p-4">
<p className="text-[10px] font-black uppercase tracking-[0.2em] text-red-300">
Exposure
</p>

<p className="mt-2 text-sm font-bold leading-6 text-red-200">
{exposure}
</p>
</div>
) : null}
</ExecutivePanel>
);
}