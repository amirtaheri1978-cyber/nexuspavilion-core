import { ExecutiveMetricCard } from "@/components/executive/executive-metric-card";
import { ExecutivePanel } from "@/components/executive/executive-panel";

type ExecutiveRiskCenterProps = {
procurementRiskIndex: number;
supplierDependencyRisk: string;
concentrationLevel: string;
procurementMaturityScore: number;
aiConfidenceScore: string;
};

export default function ExecutiveRiskCenter({
procurementRiskIndex,
supplierDependencyRisk,
concentrationLevel,
procurementMaturityScore,
aiConfidenceScore,
}: ExecutiveRiskCenterProps) {
return (
<ExecutivePanel padding="lg">
<p className="text-xs font-black uppercase tracking-[0.25em] text-nexus-gold">
Executive Risk Intelligence
</p>

<h2 className="mt-3 text-3xl font-black text-nexus-white">
Enterprise Risk Center
</h2>

<div className="mt-8 grid gap-6 md:grid-cols-2 xl:grid-cols-5">
<ExecutiveMetricCard
label="Risk Index"
value={`${procurementRiskIndex}/100`}
tone="gold"
/>

<ExecutiveMetricCard
label="Supplier Dependency"
value={supplierDependencyRisk}
tone="blue"
/>

<ExecutiveMetricCard
label="Vendor Concentration"
value={concentrationLevel}
tone="gold"
/>

<ExecutiveMetricCard
label="Maturity Score"
value={`${procurementMaturityScore}/100`}
tone="blue"
/>

<ExecutiveMetricCard
label="AI Confidence"
value={aiConfidenceScore}
tone="gold"
/>
</div>
</ExecutivePanel>
);
}