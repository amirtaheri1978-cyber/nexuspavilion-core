type ExecutiveBadgeTone =
| "neutral"
| "blue"
| "gold"
| "risk"
| "success"
| "warning"
| "board";

type ExecutiveBadgeSize = "sm" | "md";

type ExecutiveBadgeProps = {
children: React.ReactNode;
tone?: ExecutiveBadgeTone;
size?: ExecutiveBadgeSize;
className?: string;
};

const toneClasses: Record<ExecutiveBadgeTone, string> = {
neutral: "border-white/10 bg-white/10 text-nexus-muted",
blue: "border-blue-400/20 bg-blue-500/10 text-blue-300",
gold: "border-yellow-400/25 bg-yellow-500/10 text-yellow-300",
risk: "border-red-400/25 bg-red-500/10 text-red-300",
success: "border-emerald-400/25 bg-emerald-500/10 text-emerald-300",
warning: "border-orange-400/25 bg-orange-500/10 text-orange-300",
board: "border-yellow-300/30 bg-yellow-400/10 text-nexus-gold",
};

const sizeClasses: Record<ExecutiveBadgeSize, string> = {
sm: "px-2.5 py-1 text-[10px]",
md: "px-3 py-1.5 text-xs",
};

export function ExecutiveBadge({
children,
tone = "neutral",
size = "sm",
className = "",
}: ExecutiveBadgeProps) {
return (
<span
className={[
"inline-flex items-center rounded-full border font-black uppercase tracking-[0.16em]",
toneClasses[tone],
sizeClasses[size],
className,
]
.filter(Boolean)
.join(" ")}
>
{children}
</span>
);
}