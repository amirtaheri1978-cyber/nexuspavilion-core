import { ExecutiveInsightCard } from "@/components/executive/executive-insight-card";
import { ExecutiveMetricCard } from "@/components/executive/executive-metric-card";
import { ExecutivePanel } from "@/components/executive/executive-panel";
import { ExecutiveStatusBadge } from "@/components/rfq-workspace/shared/executive-status-badge";

export type BoardroomSnapshotProps = {
  executiveRecommendation: string;
  topOpportunity: string;
  topRisk: string;
  decisionConfidence: string;
  quotedPortfolioValue: number;
  estimatedSavingsOpportunity: number;
  enterpriseProcurementScore: number;
  constructionClassificationScore: number;
};

export function BoardroomSnapshot({
  executiveRecommendation,
  topOpportunity,
  topRisk,
  decisionConfidence,
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
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
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
            A concise view of the priority decision, commercial
            opportunity, portfolio exposure, and supporting data
            maturity.
          </p>
        </div>

        <div className="shrink-0">
          <ExecutiveStatusBadge tone="info">
            Decision confidence: {decisionConfidence}
          </ExecutiveStatusBadge>
        </div>
      </div>

      <div className="mt-8 grid gap-5 lg:grid-cols-3">
        <div className="lg:col-span-1">
          <ExecutiveInsightCard
            title="Immediate Leadership Action"
            insight={executiveRecommendation}
            recommendation="Review the supporting commercial, supplier, and governance evidence before authorizing major procurement action."
            impact="Decision-support guidance based on current portfolio signals."
            tone="gold"
          />
        </div>

        <div className="grid min-w-0 gap-5 sm:grid-cols-2 lg:col-span-2">
          <div className="min-w-0 rounded-3xl border border-emerald-300/20 bg-emerald-400/[0.06] p-6">
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-emerald-300">
              Top Opportunity
            </p>

            <p className="mt-4 break-words text-base font-bold leading-7 text-white [overflow-wrap:anywhere]">
              {topOpportunity}
            </p>

            <p className="mt-4 text-xs font-semibold leading-5 text-nexus-muted">
              Validate scope alignment and supporting commercial
              evidence before treating estimated value as realized
              savings.
            </p>
          </div>

          <div className="min-w-0 rounded-3xl border border-red-300/20 bg-red-400/[0.06] p-6">
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-red-300">
              Top Risk
            </p>

            <p className="mt-4 break-words text-base font-bold leading-7 text-white [overflow-wrap:anywhere]">
              {topRisk}
            </p>

            <p className="mt-4 text-xs font-semibold leading-5 text-nexus-muted">
              Review the underlying supplier, competition, and
              classification signals before escalation.
            </p>
          </div>
        </div>
      </div>

      <div className="mt-6 grid min-w-0 gap-4 sm:grid-cols-2 xl:grid-cols-4">
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
    </ExecutivePanel>
  );
}