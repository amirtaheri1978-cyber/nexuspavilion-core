import { ExecutiveInsightCard } from "@/components/executive/executive-insight-card";
import { ExecutiveMetricCard } from "@/components/executive/executive-metric-card";
import { ExecutivePanel } from "@/components/executive/executive-panel";

type BoardroomSnapshotProps = {
boardReadinessRecommendation: string;
procurementVolume: number;
forecastSavings: number;
enterpriseProcurementScore: number;
constructionClassificationScore: number;
};

export function BoardroomSnapshot({
boardReadinessRecommendation,
procurementVolume,
forecastSavings,
enterpriseProcurementScore,
constructionClassificationScore,
}: BoardroomSnapshotProps) {
return (
<ExecutivePanel variant="boardroom" padding="lg" tone="gold">
<div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr]">
<ExecutiveInsightCard
title="CEO Procurement Brief"
insight={boardReadinessRecommendation}
recommendation="Review board readiness, procurement maturity, and executive confidence before scaling procurement volume."
impact="Board-level procurement visibility is active."
tone="gold"
/>

<div className="grid gap-4 sm:grid-cols-2">
<ExecutiveMetricCard
label="Revenue Under Management"
value={`$${procurementVolume.toLocaleString()}`}
insight="Validated procurement volume under executive review."
impact="Revenue visibility active"
tone="gold"
/>

<ExecutiveMetricCard
label="Savings Forecast"
value={`$${forecastSavings.toLocaleString()}`}
insight="Projected savings opportunity based on procurement intelligence."
impact="Forecast active"
tone="success"
/>

<ExecutiveMetricCard
label="Enterprise Score"
value={`${enterpriseProcurementScore}/100`}
insight="Composite procurement maturity and executive readiness."
impact="Enterprise benchmark"
tone="blue"
/>

<ExecutiveMetricCard
label="RFQ Maturity"
value={`${constructionClassificationScore}/100`}
insight="Construction RFQ classification and data maturity."
impact="Classification confidence"
tone="neutral"
/>
</div>
</div>
</ExecutivePanel>
);
}