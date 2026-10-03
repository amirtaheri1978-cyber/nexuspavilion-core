import { ExecutiveMetricCard } from "@/components/executive/executive-metric-card";
import { ExecutivePanel } from "@/components/executive/executive-panel";
import { EXECUTIVE_FEEDBACK_INFO } from "@/lib/design-system/executive-contract";

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
  const commercialControl = blindBiddingEnabled
    ? "Blind Bidding"
    : "Open Evaluation";

  return (
    <ExecutivePanel className="min-w-0" padding="lg" tone="blue">
      <p className="np-type-eyebrow text-nexus-cyan-bright">
        Procurement Intelligence Context
      </p>

      <h2 className="np-type-h2 mt-3 min-w-0 text-pretty">
        RFQ Operating Model
      </h2>

      <p className="np-type-body mt-4 max-w-4xl min-w-0 text-pretty text-nexus-text-secondary">
        {description}
      </p>

      <div
        className={`mt-5 min-w-0 ${EXECUTIVE_FEEDBACK_INFO}`}
        role="note"
      >
        <p className="np-type-meta text-nexus-cyan-bright">
          Review inputs for respondent scoping
        </p>
        <p className="np-type-body mt-1 text-pretty text-nexus-text-primary">
          Use the operating-model signals below to understand procurement model,
          market access, contract framework, and commercial visibility before
          preparing a quotation. This surface does not recommend whether to bid.
        </p>
      </div>

      <div className="mt-6 grid min-w-0 gap-4 md:grid-cols-3">
        <ExecutiveMetricCard
          label="Sourcing"
          value={sourcingLabel}
          insight="How market access is structured for this RFQ."
          tone="blue"
        />

        <ExecutiveMetricCard
          label="Framework"
          value={frameworkLabel}
          insight="Contract framework that applies to this engagement."
          tone="gold"
        />

        <ExecutiveMetricCard
          label="Commercial Control"
          value={commercialControl}
          insight="Commercial visibility model for competing submissions."
          tone={blindBiddingEnabled ? "gold" : "success"}
        />
      </div>
    </ExecutivePanel>
  );
}
