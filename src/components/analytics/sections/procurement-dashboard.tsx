import { ProcurementCommandCenter } from "@/components/analytics/procurement-command-center";
import { ProcurementPipelineIntelligence } from "@/components/analytics/procurement-pipeline-intelligence";
import { RfqDecisionReadiness } from "@/components/analytics/award-probability-forecast";
import { CompanyRFQPipeline } from "@/components/analytics/company-rfq-pipeline";
import CategoryIntelligence from "@/components/analytics/procurement/category-intelligence";
import { CommercialInsightsPanel } from "@/components/analytics/commercial/commercial-insights-panel";
import { ProcurementInsightMetrics } from "@/components/analytics/procurement/procurement-insight-metrics";
import { SupplierPortfolioIntelligence } from "@/components/analytics/supplier-portfolio-intelligence";
import type { CommercialInsights } from "@/lib/analytics/commercial/commercial-insights";
import type { ProcurementInsightMetrics as ProcurementInsightMetricsModel } from "@/lib/analytics/portfolio/portfolio-intelligence";

type CommandRoomItem = {
  title: string;
  value: string;
};

type CommandCenterItem = {
  title: string;
  value: string;
  status: string;
};

type ChartDataPoint = {
  name: string;
  value: number;
};

type RfqDecisionReadinessItem = {
  title: string;
  scope: string;
  sourcing: string;
  quotes: number;
  evaluationState: string;
  status: string;
  sourceHref?: string | null;
};

type RFQ = {
  id: string;
  title: string | null;
  category: string | null;
  procurement_scope: string | null;
  sourcing_method: string | null;
  contract_framework: string | null;
  status: string | null;
};

type CategoryIntelligenceItem = {
  category: string;
  rfqs: number;
  quotes: number;
  awards: number;
  winRate: number;
  spend: number;
  opportunityScore: number;
};

type ProcurementDashboardProps = {
  procurementCommandRoom: CommandRoomItem[];
  procurementCommandRoomStatus: string;
  procurementCommandCenter: CommandCenterItem[];
  commandCenterStatus: string;
  executiveCommandRecommendation: string;

  activityChartData: ChartDataPoint[];
  valueChartData: ChartDataPoint[];

  commercialInsights: CommercialInsights;
  procurementInsights: ProcurementInsightMetricsModel;
  rfqDecisionReadiness: RfqDecisionReadinessItem[];

  rfqList: RFQ[];
  procurementScopeLabels: Record<string, string>;
  sourcingMethodLabels: Record<string, string>;
  contractFrameworkLabels: Record<string, string>;

  categoryIntelligence: CategoryIntelligenceItem[];

  portfolioHealthIndex: number;
  supplierParticipationCount: number;
  awardHistoryCoverage: number;
  suppliersWithAwardHistory: number;
  suppliersWithMultipleAwards: number;
  suppliersWithLimitedQuoteHistory: number;
  supplierDiversificationScore: number;
  portfolioStatus: string;
  portfolioRecommendations: string[];
};

export function ProcurementDashboard({
  procurementCommandRoom,
  procurementCommandRoomStatus,
  procurementCommandCenter,
  commandCenterStatus,
  executiveCommandRecommendation,
  activityChartData,
  valueChartData,
  commercialInsights,
  procurementInsights,
  rfqDecisionReadiness,
  rfqList,
  procurementScopeLabels,
  sourcingMethodLabels,
  contractFrameworkLabels,
  categoryIntelligence,
  portfolioHealthIndex,
  supplierParticipationCount,
  awardHistoryCoverage,
  suppliersWithAwardHistory,
  suppliersWithMultipleAwards,
  suppliersWithLimitedQuoteHistory,
  supplierDiversificationScore,
  portfolioStatus,
  portfolioRecommendations,
}: ProcurementDashboardProps) {
  return (
    <>
      <ProcurementCommandCenter
        procurementCommandRoom={procurementCommandRoom}
        procurementCommandRoomStatus={procurementCommandRoomStatus}
        procurementCommandCenter={procurementCommandCenter}
        commandCenterStatus={commandCenterStatus}
        executiveCommandRecommendation={executiveCommandRecommendation}
      />

      <ProcurementInsightMetrics metrics={procurementInsights} />

      <CommercialInsightsPanel insights={commercialInsights} />

      <ProcurementPipelineIntelligence
        activityChartData={activityChartData}
        valueChartData={valueChartData}
      />

      <RfqDecisionReadiness items={rfqDecisionReadiness} />

      <CompanyRFQPipeline
        rfqList={rfqList}
        procurementScopeLabels={procurementScopeLabels}
        sourcingMethodLabels={sourcingMethodLabels}
        contractFrameworkLabels={contractFrameworkLabels}
      />

      <CategoryIntelligence categoryIntelligence={categoryIntelligence} />

      <SupplierPortfolioIntelligence
        portfolioHealthIndex={portfolioHealthIndex}
        supplierParticipationCount={supplierParticipationCount}
        awardHistoryCoverage={awardHistoryCoverage}
        suppliersWithAwardHistory={suppliersWithAwardHistory}
        suppliersWithMultipleAwards={suppliersWithMultipleAwards}
        suppliersWithLimitedQuoteHistory={suppliersWithLimitedQuoteHistory}
        supplierDiversificationScore={supplierDiversificationScore}
        portfolioStatus={portfolioStatus}
        portfolioRecommendations={portfolioRecommendations}
      />
    </>
  );
}
