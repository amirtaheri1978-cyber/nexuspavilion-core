import { ExecutiveInsightCard } from "@/components/executive/executive-insight-card";
import { ExecutiveMetricCard } from "@/components/executive/executive-metric-card";
import { ExecutivePanel } from "@/components/executive/executive-panel";

export type BoardroomSnapshotProps = {
  executiveRecommendation: string;
  quotedPortfolioValue: number;
  estimatedSavingsOpportunity: number;
  enterpriseProcurementScore: number;
  constructionClassificationScore: number;
};

export function BoardroomSnapshot({
  executiveRecommendation,
  quotedPortfolioValue,
  estimatedSavingsOpportunity,
  enterpriseProcurementScore,
  constructionClassificationScore,
}: BoardroomSnapshotProps) {
  return (
    <ExecutivePanel
      aria-labelledby="analytics-command-center-title"
      variant="boardroom"
      padding="lg"
      tone="gold"
    >
      <div>
        <p className="text-xs font-black uppercase tracking-[0.3em] text-yellow-300">
          Executive Procurement Command Center
        </p>

        <h1
          id="analytics-command-center-title"
          className="mt-4 max-w-4xl text-3xl font-black leading-tight text-white sm:text-4xl lg:text-5xl"
        >
          What requires leadership attention today?
        </h1>

        <p className="mt-4 max-w-3xl text-sm font-semibold leading-7 text-nexus-muted">
          A concise portfolio view of commercial activity, estimated
          opportunity, procurement readiness, and RFQ data maturity.
        </p>
      </div>

      <div className="mt-8 grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <ExecutiveInsightCard
          title="Executive Priority"
          insight={executiveRecommendation}
          recommendation="Review the supporting commercial, supplier, and governance evidence before authorizing major procurement action."
          impact="Decision-support guidance based on current portfolio signals."
          tone="gold"
        />

        <div className="grid min-w-0 gap-4 sm:grid-cols-2">
          <ExecutiveMetricCard
            label="Quoted Portfolio Value"
            value={`$${quotedPortfolioValue.toLocaleString()}`}
            insight="Total value represented by recorded supplier quotations."
            impact="Observed quotation data"
            tone="gold"
          />

          <ExecutiveMetricCard
            label="Estimated Savings Opportunity"
            value={`$${estimatedSavingsOpportunity.toLocaleString()}`}
            insight="Estimated difference between current average and lowest recorded quotation."
            impact="Estimated — not realized"
            tone="success"
          />

          <ExecutiveMetricCard
            label="Portfolio Intelligence Score"
            value={`${enterpriseProcurementScore}/100`}
            insight="Derived internal decision-support score based on current procurement signals."
            impact="Internal score — not a peer benchmark"
            tone="blue"
          />

          <ExecutiveMetricCard
            label="RFQ Classification Maturity"
            value={`${constructionClassificationScore}/100`}
            insight="Current depth of procurement scope, sourcing, and framework classification."
            impact="Classification quality signal"
            tone="neutral"
          />
        </div>
      </div>
    </ExecutivePanel>
  );
}