import type { ReactNode } from "react";

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
  success:
    "border-emerald-300/25 bg-emerald-400/10 text-emerald-200",

  info:
    "border-cyan-300/25 bg-cyan-400/10 text-cyan-200",

  warning:
    "border-orange-300/25 bg-orange-400/10 text-orange-200",

  risk:
    "border-red-300/25 bg-red-400/10 text-red-200",

  neutral:
    "border-white/10 bg-white/10 text-white",
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