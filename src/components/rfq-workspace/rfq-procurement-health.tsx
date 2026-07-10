import { ExecutiveMetricCard } from "@/components/executive/executive-metric-card";
import { ExecutivePanel } from "@/components/executive/executive-panel";

type RFQProcurementHealthBreakdownItem = {
  label: string;
  score: number;
  detail: string;
};

type RFQProcurementHealthProps = {
  healthScore: number;
  healthLabel: string;
  healthBreakdown: RFQProcurementHealthBreakdownItem[];
};

export function RFQProcurementHealth({
  healthScore,
  healthLabel,
  healthBreakdown,
}: RFQProcurementHealthProps) {
  return (
    <ExecutivePanel padding="lg" tone="gold">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.3em] text-nexus-gold">
            Procurement Health Engine
          </p>

          <h2 className="mt-3 text-3xl font-black text-nexus-white">
            Health Breakdown
          </h2>

          <p className="mt-3 max-w-3xl text-sm font-semibold leading-7 text-nexus-muted">
            Nexus Pavilion evaluates RFQ readiness across competition,
            documentation, governance, and award decision readiness.
          </p>
        </div>

        <ExecutiveMetricCard
          label="Overall"
          value={`${healthScore}`}
          insight={healthLabel}
          tone={
            healthScore >= 80
              ? "success"
              : healthScore >= 60
                ? "gold"
                : "risk"
          }
          className="min-w-[180px]"
        />
      </div>

      <div className="mt-8 grid gap-4">
        {healthBreakdown.map((item) => (
          <ExecutivePanel
            key={item.label}
            variant="operational"
            padding="sm"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-black text-nexus-white">
                  {item.label}
                </p>

                <p className="mt-1 text-xs font-bold leading-5 text-nexus-muted">
                  {item.detail}
                </p>
              </div>

              <div className="text-right">
                <p className="text-2xl font-black text-nexus-white">
                  {item.score}
                </p>

                <p className="text-xs font-black uppercase tracking-[0.18em] text-nexus-muted">
                  {getScoreTone(item.score)}
                </p>
              </div>
            </div>

            <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full bg-nexus-gold"
                style={{ width: `${item.score}%` }}
              />
            </div>
          </ExecutivePanel>
        ))}
      </div>
    </ExecutivePanel>
  );
}

function getScoreTone(score: number) {
  if (score >= 85) return "Strong";
  if (score >= 70) return "Healthy";
  if (score >= 55) return "Watch";

  return "Critical";
}