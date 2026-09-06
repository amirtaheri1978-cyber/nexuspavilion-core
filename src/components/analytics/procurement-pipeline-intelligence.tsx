import AnalyticsChart from "@/components/analytics-chart";
import { ExecutivePanel } from "@/components/executive/executive-panel";

type ChartDataPoint = {
name: string;
value: number;
};

type ProcurementPipelineIntelligenceProps = {
activityChartData: ChartDataPoint[];
valueChartData: ChartDataPoint[];
};

export function ProcurementPipelineIntelligence({
activityChartData,
valueChartData,
}: ProcurementPipelineIntelligenceProps) {
return (
<section className="mt-8 grid gap-6 lg:grid-cols-2">
<ExecutivePanel padding="lg">
<p className="text-xs font-black uppercase tracking-[0.25em] text-nexus-gold">
Pipeline Intelligence
</p>

<h2 className="mt-3 text-3xl font-black text-nexus-white">
Procurement Activity
</h2>

<div className="mt-6">
<AnalyticsChart data={activityChartData} />
</div>
</ExecutivePanel>

<ExecutivePanel padding="lg">
<p className="text-xs font-black uppercase tracking-[0.25em] text-nexus-gold">
Value Intelligence
</p>

<h2 className="mt-3 text-3xl font-black text-nexus-white">
Procurement Value
</h2>

<div className="mt-6">
<AnalyticsChart data={valueChartData} valueFormat="currency" />
</div>
</ExecutivePanel>
</section>
);
}
