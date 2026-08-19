import { ExecutiveMetricCard } from "@/components/executive/executive-metric-card";

type ExecutiveKpiTone = "neutral" | "blue" | "gold" | "risk" | "success";

export type ExecutiveKpiMetric = {
  label: string;
  value: string;
  tone: ExecutiveKpiTone;
  insight?: string;
};

type ExecutiveKpiRowProps = {
  metrics: ExecutiveKpiMetric[];
  insufficientData: boolean;
};

function isInsufficientValue(value: string) {
  return (
    value === "Insufficient Data" ||
    value === "Pending" ||
    value === "Setup Required"
  );
}

export function ExecutiveKpiRow({
  metrics,
  insufficientData,
}: ExecutiveKpiRowProps) {
  return (
    <section className="np-region" aria-labelledby="executive-kpi-heading">
      <div className="mb-4">
        <p className="np-type-eyebrow">Position</p>
        <h2 id="executive-kpi-heading" className="np-type-h2 mt-3">
          Current operating position
        </h2>
        <p className="np-type-body mt-3 max-w-4xl">
          {insufficientData
            ? "Procurement intelligence is available, but recorded RFQ, quote, and award data is not yet sufficient for a board-ready position."
            : "Recorded portfolio measures for the current company workspace. Values are not compared against prior periods."}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map((metric) => (
          <ExecutiveMetricCard
            key={metric.label}
            label={metric.label}
            value={metric.value}
            tone={metric.tone}
            insight={
              metric.insight ||
              (isInsufficientValue(metric.value)
                ? "Recorded activity is not yet sufficient for this measure."
                : undefined)
            }
          />
        ))}
      </div>
    </section>
  );
}
