import type { ReactNode } from "react";

type ExecutivePanelVariant = "executive" | "boardroom" | "operational";
type ExecutivePanelPadding = "sm" | "md" | "lg";
type ExecutivePanelTone = "neutral" | "blue" | "gold" | "risk" | "success";

type ExecutivePanelProps = {
children: ReactNode;
className?: string;
variant?: ExecutivePanelVariant;
padding?: ExecutivePanelPadding;
tone?: ExecutivePanelTone;
};

const variantClasses: Record<ExecutivePanelVariant, string> = {
executive:
"border border-nexus-border bg-nexus-dark bg-nexus-radial text-nexus-white shadow-executive",
boardroom:
"border border-white/10 bg-slate-950 text-nexus-white shadow-executive",
operational:
"border border-slate-200 bg-white text-slate-950 shadow-sm",
};

const paddingClasses: Record<ExecutivePanelPadding, string> = {
sm: "p-4",
md: "p-6",
lg: "p-8",
};

const toneClasses: Record<ExecutivePanelTone, string> = {
neutral: "",
blue: "ring-1 ring-blue-500/20",
gold: "ring-1 ring-yellow-400/25",
risk: "ring-1 ring-red-500/25",
success: "ring-1 ring-emerald-500/25",
};

export function ExecutivePanel({
children,
className = "",
variant = "executive",
padding = "md",
tone = "neutral",
}: ExecutivePanelProps) {
return (
<section
className={[
"relative overflow-hidden rounded-executive",
"transition duration-300",
"before:pointer-events-none before:absolute before:inset-0 before:bg-gradient-to-b before:from-white/[0.04] before:to-transparent",
variantClasses[variant],
paddingClasses[padding],
toneClasses[tone],
className,
]
.filter(Boolean)
.join(" ")}
>
<div className="relative z-10">{children}</div>
</section>
);
}