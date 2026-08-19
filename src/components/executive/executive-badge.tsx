import type { ReactNode } from "react";

import { EXECUTIVE_BADGE_TONES } from "@/lib/design-system/executive-contract";

export type ExecutiveBadgeTone = (typeof EXECUTIVE_BADGE_TONES)[number];

type ExecutiveBadgeSize = "sm" | "md";

type ExecutiveBadgeProps = {
  children: ReactNode;
  tone?: ExecutiveBadgeTone;
  size?: ExecutiveBadgeSize;
  className?: string;
};

type CanonicalBadgeTone =
  | "neutral"
  | "blue"
  | "gold"
  | "risk"
  | "success"
  | "warning"
  | "board";

const toneAliases: Record<ExecutiveBadgeTone, CanonicalBadgeTone> = {
  neutral: "neutral",
  locked: "neutral",
  blue: "blue",
  gold: "gold",
  recommended: "gold",
  risk: "risk",
  success: "success",
  awarded: "success",
  warning: "warning",
  pending: "warning",
  board: "board",
  live: "board",
};

const toneClasses: Record<CanonicalBadgeTone, string> = {
  neutral:
    "border-nexus-border-subtle bg-white/[0.06] text-nexus-text-secondary",
  blue: "border-nexus-cyan/25 bg-nexus-cyan/10 text-nexus-cyan-bright",
  gold: "border-nexus-gold/25 bg-nexus-gold/10 text-nexus-gold-bright",
  risk: "border-red-400/25 bg-red-500/10 text-red-300",
  success: "border-emerald-400/25 bg-emerald-500/10 text-emerald-300",
  warning: "border-orange-400/25 bg-orange-500/10 text-orange-300",
  board: "border-nexus-gold/30 bg-nexus-gold/10 text-nexus-gold",
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
  const canonicalTone = toneAliases[tone];

  return (
    <span
      className={[
        "inline-flex shrink-0 items-center whitespace-nowrap rounded-full border",
        "font-semibold uppercase leading-none tracking-[0.12em]",
        "transition-colors duration-200",
        toneClasses[canonicalTone],
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
