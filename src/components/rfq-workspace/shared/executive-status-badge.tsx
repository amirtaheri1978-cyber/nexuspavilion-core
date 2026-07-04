type ExecutiveStatusTone =
| "success"
| "info"
| "warning"
| "risk"
| "neutral";

type ExecutiveStatusBadgeProps = {
children: React.ReactNode;
tone?: ExecutiveStatusTone;
className?: string;
};

export function ExecutiveStatusBadge({
children,
tone = "neutral",
className = "",
}: ExecutiveStatusBadgeProps) {
const toneClass =
tone === "success"
? "border-emerald-300/25 bg-emerald-400/10 text-emerald-200"
: tone === "info"
? "border-cyan-300/25 bg-cyan-400/10 text-cyan-200"
: tone === "warning"
? "border-orange-300/25 bg-orange-400/10 text-orange-200"
: tone === "risk"
? "border-red-300/25 bg-red-400/10 text-red-200"
: "border-white/10 bg-white/10 text-white";

return (
<span
className={`rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] ${toneClass} ${className}`}
>
{children}
</span>
);
}