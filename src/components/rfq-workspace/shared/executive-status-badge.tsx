import type { ReactNode } from "react";

import { EXECUTIVE_BADGE_SEMANTIC_CLASSES } from "@/lib/design-system/executive-contract";

export type ExecutiveStatusTone =
  | "success"
  | "info"
  | "warning"
  | "risk"
  | "neutral";

export type ExecutiveStatusBadgeProps = {
  children: ReactNode;
  tone?: ExecutiveStatusTone;
  className?: string;
};

const toneClasses: Record<ExecutiveStatusTone, string> = {
  success: EXECUTIVE_BADGE_SEMANTIC_CLASSES.success,
  info: EXECUTIVE_BADGE_SEMANTIC_CLASSES.info,
  warning: EXECUTIVE_BADGE_SEMANTIC_CLASSES.warning,
  risk: EXECUTIVE_BADGE_SEMANTIC_CLASSES.risk,
  neutral: EXECUTIVE_BADGE_SEMANTIC_CLASSES.neutral,
};

export function ExecutiveStatusBadge({
  children,
  tone = "neutral",
  className = "",
}: ExecutiveStatusBadgeProps) {
  const resolvedClassName = [
    "inline-flex items-center justify-center",
    "rounded-full",
    "border",
    "px-3",
    "py-1",
    "text-[10px]",
    "font-black",
    "uppercase",
    "tracking-[0.16em]",
    "leading-none",
    "text-center",
    "break-words",
    "[overflow-wrap:anywhere]",
    toneClasses[tone],
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <span
      className={resolvedClassName}
    >
      {children}
    </span>
  );
}