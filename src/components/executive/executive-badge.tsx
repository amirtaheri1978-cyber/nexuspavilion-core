import type { ReactNode } from "react";

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
  children: ReactNode;
  tone?: ExecutiveBadgeTone;
  size?: ExecutiveBadgeSize;
  className?: string;
};

const toneClasses: Record<ExecutiveBadgeTone, string> = {
  neutral:
    "border-nexus-border-subtle bg-white/[0.06] text-nexus-text-secondary",
  blue: "border-blue-400/20 bg-blue-500/10 text-blue-300",
  gold: "border-yellow-400/25 bg-yellow-500/10 text-yellow-300",
  risk: "border-red-400/25 bg-red-500/10 text-red-300",
  success: "border-emerald-400/25 bg-emerald-500/10 text-emerald-300",
  warning: "border-orange-400/25 bg-orange-500/10 text-orange-300",
  board: "border-yellow-300/30 bg-yellow-400/10 text-nexus-gold",
};

const sizeClasses: Record<ExecutiveBadgeSize, string> = {
  sm: "px-2.5 py-1 text-[11px]",
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
        "inline-flex shrink-0 items-center whitespace-nowrap rounded-full border",
        "font-semibold uppercase leading-none tracking-[0.12em]",
        "transition-colors duration-200",
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