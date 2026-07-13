import type { ComponentPropsWithoutRef } from "react";

export type ExecutivePanelVariant =
  | "executive"
  | "boardroom"
  | "operational";

export type ExecutivePanelPadding = "none" | "sm" | "md" | "lg";

export type ExecutivePanelTone =
  | "neutral"
  | "blue"
  | "gold"
  | "risk"
  | "success";

export type ExecutivePanelProps = ComponentPropsWithoutRef<"section"> & {
  variant?: ExecutivePanelVariant;
  padding?: ExecutivePanelPadding;
  tone?: ExecutivePanelTone;
};

const basePanelClass =
  "relative isolate overflow-hidden rounded-executive transition duration-300 before:pointer-events-none before:absolute before:inset-0 before:bg-gradient-to-b before:from-white/[0.04] before:to-transparent";

const variantClasses: Record<ExecutivePanelVariant, string> = {
  executive:
    "border border-nexus-border bg-nexus-dark bg-nexus-radial text-nexus-white shadow-executive",
  boardroom:
    "border border-white/10 bg-[#07111F] text-nexus-white shadow-executive",
  operational:
    "border border-white/10 bg-white/[0.045] text-nexus-white shadow-inner-executive backdrop-blur-xl",
};

const paddingClasses: Record<ExecutivePanelPadding, string> = {
  none: "p-0",
  sm: "p-4",
  md: "p-5 sm:p-6",
  lg: "p-5 sm:p-6 lg:p-8",
};

const toneClasses: Record<ExecutivePanelTone, string> = {
  neutral: "",
  blue: "ring-1 ring-[#2CC4E8]/20",
  gold: "ring-1 ring-[#C8A646]/25",
  risk: "ring-1 ring-red-500/25",
  success: "ring-1 ring-emerald-500/25",
};

export function ExecutivePanel({
  children,
  className = "",
  variant = "executive",
  padding = "md",
  tone = "neutral",
  ...sectionProps
}: ExecutivePanelProps) {
  const resolvedClassName = [
    basePanelClass,
    variantClasses[variant],
    paddingClasses[padding],
    toneClasses[tone],
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <section
      {...sectionProps}
      className={resolvedClassName}
    >
      <div className="relative z-10">{children}</div>
    </section>
  );
}