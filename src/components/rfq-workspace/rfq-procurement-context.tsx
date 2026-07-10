import { ExecutiveMetricCard } from "@/components/executive/executive-metric-card";
import { ExecutivePanel } from "@/components/executive/executive-panel";

type RFQProcurementContextProps = {
  description: string;
  sourcingLabel: string;
  frameworkLabel: string;
  blindBiddingEnabled: boolean;
};

export function RFQProcurementContext({
  description,
  sourcingLabel,
  frameworkLabel,
  blindBiddingEnabled,
}: RFQProcurementContextProps) {
  return (
    <ExecutivePanel padding="lg" tone="blue">
      <p className="text-xs font-black uppercase tracking-[0.3em] text-[#9BE8F8]">
        Procurement Intelligence Context
      </p>

      <h2 className="mt-3 text-3xl font-black text-nexus-white">
        RFQ Operating Model
      </h2>

      <p className="mt-4 max-w-4xl text-sm font-semibold leading-7 text-nexus-muted">
        {description}
      </p>

      <div className="mt-6 grid gap-4 md:grid-cols-3">
        <ExecutiveMetricCard
          label="Sourcing"
          value={sourcingLabel}
          tone="blue"
        />

        <ExecutiveMetricCard
          label="Framework"
          value={frameworkLabel}
          tone="gold"
        />

        <ExecutiveMetricCard
          label="Commercial Control"
          value={blindBiddingEnabled ? "Blind Bidding" : "Open Evaluation"}
          tone={blindBiddingEnabled ? "gold" : "success"}
        />
      </div>
    </ExecutivePanel>
  );
}