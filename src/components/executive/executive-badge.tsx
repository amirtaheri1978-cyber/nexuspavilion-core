import type { ReactNode } from "react";

import {
  EXECUTIVE_BADGE_SEMANTIC_CLASSES,
  EXECUTIVE_BADGE_TONE_ALIASES,
  EXECUTIVE_BADGE_TONES,
} from "@/lib/design-system/executive-contract";

export type ExecutiveBadgeTone = (typeof EXECUTIVE_BADGE_TONES)[number];

type ExecutiveBadgeSize = "sm" | "md";

type ExecutiveBadgeProps = {
  children: ReactNode;
  tone?: ExecutiveBadgeTone;
  size?: ExecutiveBadgeSize;
  className?: string;
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
  const canonicalTone = EXECUTIVE_BADGE_TONE_ALIASES[tone];

  return (
    <span
      className={[
        "inline-flex shrink-0 items-center whitespace-nowrap rounded-full border",
        "font-semibold uppercase leading-none tracking-[0.12em]",
        "transition-colors duration-200",
        EXECUTIVE_BADGE_SEMANTIC_CLASSES[canonicalTone],
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
