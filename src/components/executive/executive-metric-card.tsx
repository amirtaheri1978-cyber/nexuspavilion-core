import { ExecutivePanel } from "@/components/executive/executive-panel";

type MetricTone = "neutral" | "blue" | "gold" | "risk" | "success";

type ExecutiveMetricCardProps = {
label: string;
value: string;
trend?: string;
insight?: string;
impact?: string;
tone?: MetricTone;
className?: string;
};

const toneClasses: Record<MetricTone, string> = {
neutral: "text-nexus-white",
blue: "text-blue-300",
gold: "text-yellow-300",
risk: "text-red-300",
success: "text-emerald-300",
};

export function ExecutiveMetricCard({
label,
value,
trend,
insight,
impact,
tone = "neutral",
className = "",
}: ExecutiveMetricCardProps) {
return (
<ExecutivePanel className={className} padding="sm" tone={tone}>
<p className="text-[10px] font-black uppercase tracking-[0.22em] text-nexus-muted">
{label}
</p>

<p className={`mt-4 text-3xl font-black tracking-tight ${toneClasses[tone]}`}>
{value}
</p>

{trend ? (
<p className="mt-2 text-xs font-bold text-emerald-300">
{trend}
</p>
) : null}

{insight ? (
<p className="mt-4 text-sm font-semibold leading-6 text-nexus-muted">
{insight}
</p>
) : null}

{impact ? (
<p className="mt-4 rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-bold text-nexus-white">
{impact}
</p>
) : null}
</ExecutivePanel>
);
}