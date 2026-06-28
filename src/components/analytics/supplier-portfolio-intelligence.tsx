import { ExecutiveMetricCard } from "@/components/executive/executive-metric-card";
import { ExecutivePanel } from "@/components/executive/executive-panel";

type SupplierPortfolioIntelligenceProps = {
portfolioHealthIndex: number;
strategicSuppliers: number;
preferredSuppliers: number;
highRiskSuppliers: number;
supplierDiversificationScore: number;
portfolioStatus: string;
portfolioRecommendations: string[];
};

export function SupplierPortfolioIntelligence({
portfolioHealthIndex,
strategicSuppliers,
preferredSuppliers,
highRiskSuppliers,
supplierDiversificationScore,
portfolioStatus,
portfolioRecommendations,
}: SupplierPortfolioIntelligenceProps) {
return (
<ExecutivePanel padding="lg">
<p className="text-xs font-black uppercase tracking-[0.25em] text-nexus-gold">
Supplier Portfolio Intelligence
</p>

<h2 className="mt-3 text-3xl font-black text-nexus-white">
Supplier Portfolio Health
</h2>

<p className="mt-4 max-w-4xl text-sm font-semibold leading-7 text-nexus-muted">
Nexus Pavilion evaluates supplier portfolio strength using strategic
supplier coverage, preferred supplier depth, risk exposure, and
diversification quality.
</p>

<div className="mt-8 grid gap-6 md:grid-cols-2 xl:grid-cols-5">
<ExecutiveMetricCard
label="Portfolio Health"
value={`${portfolioHealthIndex}/100`}
tone="blue"
/>
<ExecutiveMetricCard
label="Strategic Suppliers"
value={strategicSuppliers.toString()}
tone="gold"
/>
<ExecutiveMetricCard
label="Preferred Suppliers"
value={preferredSuppliers.toString()}
tone="blue"
/>
<ExecutiveMetricCard
label="High Risk Suppliers"
value={highRiskSuppliers.toString()}
tone="gold"
/>
<ExecutiveMetricCard
label="Diversification"
value={`${supplierDiversificationScore}/100`}
tone="blue"
/>
</div>

<div className="mt-8 rounded-3xl border border-nexus-gold/20 bg-nexus-gold/10 p-6">
<p className="text-xs font-black uppercase tracking-[0.2em] text-nexus-gold">
Portfolio Status
</p>

<h3 className="mt-3 text-3xl font-black text-nexus-white">
{portfolioStatus}
</h3>
</div>

<div className="mt-8 space-y-4">
{portfolioRecommendations.map((recommendation) => (
<div
key={recommendation}
className="rounded-2xl border border-white/10 bg-white/5 p-4"
>
<p className="text-sm font-semibold leading-7 text-nexus-muted">
{recommendation}
</p>
</div>
))}
</div>
</ExecutivePanel>
);
}
