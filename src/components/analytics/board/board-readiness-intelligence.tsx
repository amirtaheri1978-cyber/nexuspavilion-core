import { ExecutiveMetricCard } from "@/components/executive/executive-metric-card";
import { ExecutivePanel } from "@/components/executive/executive-panel";

type BoardReadinessIntelligenceProps = {
boardReadinessScore: number;
governanceReadiness: string;
financialVisibility: string;
riskVisibility: string;
boardRecommendation: string;
};

export default function BoardReadinessIntelligence({
boardReadinessScore,
governanceReadiness,
financialVisibility,
riskVisibility,
boardRecommendation,
}: BoardReadinessIntelligenceProps) {
return (
<ExecutivePanel padding="lg">
<p className="text-xs font-black uppercase tracking-[0.25em] text-nexus-gold">
Board Readiness Intelligence
</p>

<h2 className="mt-3 text-3xl font-black text-nexus-white">
Executive Governance Center
</h2>

<p className="mt-4 max-w-4xl text-sm font-semibold leading-7 text-nexus-muted">
Evaluate executive governance readiness, board presentation confidence,
financial visibility, procurement maturity, and enterprise risk posture
using validated operating data.
</p>

<div className="mt-8 grid gap-6 md:grid-cols-2 xl:grid-cols-5">
<ExecutiveMetricCard
label="Board Readiness"
value={`${boardReadinessScore}/100`}
tone="blue"
/>

<ExecutiveMetricCard
label="Governance"
value={governanceReadiness}
tone="gold"
/>

<ExecutiveMetricCard
label="Financial Visibility"
value={financialVisibility}
tone="blue"
/>

<ExecutiveMetricCard
label="Risk Visibility"
value={riskVisibility}
tone="gold"
/>

<ExecutiveMetricCard
label="Recommendation"
value={boardRecommendation}
tone="blue"
/>
</div>
</ExecutivePanel>
);
}
