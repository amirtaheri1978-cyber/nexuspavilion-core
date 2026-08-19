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

export type ExecutivePanelRadius = "panel" | "tile";

export type ExecutivePanelProps = ComponentPropsWithoutRef<"section"> & {
  variant?: ExecutivePanelVariant;
  padding?: ExecutivePanelPadding;
  tone?: ExecutivePanelTone;
  radius?: ExecutivePanelRadius;
};

const basePanelClass =
  "relative isolate overflow-hidden transition duration-300 before:pointer-events-none before:absolute before:inset-0 before:bg-gradient-to-b before:from-white/[0.04] before:to-transparent";

const variantClasses: Record<ExecutivePanelVariant, string> = {
  executive:
    "border border-white/10 bg-nexus-dark bg-nexus-radial text-nexus-white shadow-executive",
  boardroom:
    "border border-white/10 bg-nexus-navy text-nexus-white shadow-executive",
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
  blue: "ring-1 ring-nexus-cyan/20",
  gold: "ring-1 ring-nexus-gold/25",
  risk: "ring-1 ring-red-500/25",
  success: "ring-1 ring-emerald-500/25",
};

const radiusClasses: Record<ExecutivePanelRadius, string> = {
  panel: "rounded-panel",
  tile: "rounded-executive",
};

export function ExecutivePanel({
  children,
  className = "",
  variant = "executive",
  padding = "md",
  tone = "neutral",
  radius = "panel",
  ...sectionProps
}: ExecutivePanelProps) {
  const resolvedClassName = [
    basePanelClass,
    radiusClasses[radius],
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
