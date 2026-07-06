import type { ReactNode } from "react";

type ExecutivePanelVariant = "executive" | "boardroom" | "operational";
type ExecutivePanelPadding = "sm" | "md" | "lg";
type ExecutivePanelTone = "neutral" | "blue" | "gold" | "risk" | "success";

type ExecutivePanelProps = {
id?: string;
children: ReactNode;
className?: string;
variant?: ExecutivePanelVariant;
padding?: ExecutivePanelPadding;
tone?: ExecutivePanelTone;
};

const basePanelClass =
"relative overflow-hidden rounded-executive transition duration-300 before:pointer-events-none before:absolute before:inset-0 before:bg-gradient-to-b before:from-white/[0.04] before:to-transparent";

const variantClasses: Record<ExecutivePanelVariant, string> = {
executive:
"border border-nexus-border bg-nexus-dark bg-nexus-radial text-nexus-white shadow-executive",
boardroom:
"border border-white/10 bg-[#07111F] text-nexus-white shadow-executive",
operational:
"border border-white/10 bg-white/[0.045] text-nexus-white shadow-inner-executive backdrop-blur-xl",
};

const paddingClasses: Record<ExecutivePanelPadding, string> = {
sm: "p-4",
md: "p-6",
lg: "p-8",
};

const toneClasses: Record<ExecutivePanelTone, string> = {
neutral: "",
blue: "ring-1 ring-[#2CC4E8]/20",
gold: "ring-1 ring-[#C8A646]/25",
risk: "ring-1 ring-red-500/25",
success: "ring-1 ring-emerald-500/25",
};

export function ExecutivePanel({
id,
children,
className = "",
variant = "executive",
padding = "md",
tone = "neutral",
}: ExecutivePanelProps) {
return (
<section
id={id}
className={[
basePanelClass,
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