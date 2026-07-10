import { ExecutivePanel } from "@/components/executive/executive-panel";
import { ExecutiveRiskCard } from "@/components/executive/executive-risk-card";

type RFQExecutiveRiskMatrixItem = {
  label: string;
  level: string;
  detail: string;
};

type RFQExecutiveRiskMatrixProps = {
  risks: RFQExecutiveRiskMatrixItem[];
};

export function RFQExecutiveRiskMatrix({
  risks,
}: RFQExecutiveRiskMatrixProps) {
  return (
    <ExecutivePanel padding="lg" tone="risk">
      <p className="text-xs font-black uppercase tracking-[0.3em] text-nexus-gold">
        Executive Risk Matrix
      </p>

      <h2 className="mt-3 text-3xl font-black text-nexus-white">
        Risk Control Board
      </h2>

      <div className="mt-6 grid gap-3">
        {risks.map((risk) => (
          <ExecutiveRiskCard
            key={risk.label}
            title={risk.label}
            description={risk.detail}
            severity={getRiskSeverity(risk.level)}
          />
        ))}
      </div>
    </ExecutivePanel>
  );
}

function getRiskSeverity(
  level: string
): "low" | "medium" | "high" | "critical" {
  const normalizedLevel = level.toLowerCase();

  if (normalizedLevel.includes("critical")) return "critical";
  if (normalizedLevel.includes("high")) return "high";
  if (normalizedLevel.includes("low")) return "low";

  return "medium";
}