import { ExecutivePanel } from "@/components/executive/executive-panel";

export type ExecutiveMetricCardTone =
  | "neutral"
  | "blue"
  | "gold"
  | "risk"
  | "success";

export type ExecutiveMetricCardProps = {
  label: string;
  value: string;
  trend?: string;
  insight?: string;
  impact?: string;
  tone?: ExecutiveMetricCardTone;
  className?: string;
  valueClassName?: string;
};

const toneClasses: Record<ExecutiveMetricCardTone, string> = {
  neutral: "text-nexus-text-primary",
  blue: "text-nexus-cyan-bright",
  gold: "text-nexus-gold-bright",
  risk: "text-red-300",
  success: "text-emerald-300",
};

export function ExecutiveMetricCard({
  label,
  value,
  trend,
  insight,
  impact,
  tone = "neutral",
  className = "",
  valueClassName = "",
}: ExecutiveMetricCardProps) {
  const panelClassName = ["h-full min-w-0", className]
    .filter(Boolean)
    .join(" ");

  const normalizedValue = value.trim();

  const isCompactValue =
    normalizedValue.length <= 16 && !/\s/.test(normalizedValue);

  const resolvedValueClassName = [
    "np-type-kpi mt-3 min-w-0 tabular-nums",
    isCompactValue
      ? "whitespace-nowrap text-[clamp(1.35rem,1.6vw,1.875rem)]"
      : "text-pretty text-2xl leading-tight sm:text-3xl",
    toneClasses[tone],
    valueClassName,
  ]
    .filter(Boolean)
    .join(" ");

  const impactSpacingClassName = insight ? "mt-4" : "mt-3";

  return (
    <ExecutivePanel
      aria-label={`${label}: ${value}`}
      className={panelClassName}
      padding="sm"
      radius="tile"
      tone={tone}
    >
      <p className="flex min-h-8 min-w-0 items-end text-pretty text-xs font-semibold uppercase leading-4 tracking-[0.14em] text-nexus-text-muted">
        {label}
      </p>

      <p className={resolvedValueClassName}>{value}</p>

      {trend ? (
        <p className="mt-2 min-w-0 text-pretty text-xs font-medium leading-5 text-nexus-text-secondary">
          {trend}
        </p>
      ) : null}

      {insight ? (
        <p className="mt-4 min-w-0 text-pretty text-sm font-medium leading-6 text-nexus-text-muted">
          {insight}
        </p>
      ) : null}

      {impact ? (
        <p
          className={`${impactSpacingClassName} min-w-0 rounded-executive border border-nexus-border-subtle bg-white/[0.045] px-3 py-2 text-pretty text-xs font-medium leading-5 text-nexus-text-primary`}
        >
          {impact}
        </p>
      ) : null}
    </ExecutivePanel>
  );
}
