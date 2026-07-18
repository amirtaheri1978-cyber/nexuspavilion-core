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
  neutral: "text-nexus-white",
  blue: "text-blue-300",
  gold: "text-yellow-300",
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
    "mt-3 min-w-0 font-black leading-none tracking-tight tabular-nums",
    isCompactValue
      ? "whitespace-nowrap text-[clamp(1.35rem,1.6vw,1.875rem)]"
      : "break-words text-2xl leading-tight [overflow-wrap:anywhere] sm:text-3xl",
    toneClasses[tone],
    valueClassName,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <ExecutivePanel
      aria-label={`${label}: ${value}`}
      className={panelClassName}
      padding="sm"
      tone={tone}
    >
      <p className="flex min-h-8 items-end break-words text-[10px] font-black uppercase leading-4 tracking-[0.22em] text-nexus-muted [overflow-wrap:anywhere]">
        {label}
      </p>

      <p className={resolvedValueClassName}>{value}</p>

      {trend ? (
        <p className="mt-2 break-words text-xs font-bold leading-5 text-emerald-300 [overflow-wrap:anywhere]">
          {trend}
        </p>
      ) : null}

      {insight ? (
        <p className="mt-4 break-words text-sm font-semibold leading-6 text-nexus-muted [overflow-wrap:anywhere]">
          {insight}
        </p>
      ) : null}

      {impact ? (
        <p className="mt-4 break-words rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-bold leading-5 text-nexus-white [overflow-wrap:anywhere]">
          {impact}
        </p>
      ) : null}
    </ExecutivePanel>
  );
}