import { ExecutiveMetricCard } from "@/components/executive/executive-metric-card";
import { ExecutivePanel } from "@/components/executive/executive-panel";

type ExecutiveForecastEngineProps = {
procurementOutlook: string;
riskTrajectory: string;
opportunityTrajectory: string;
executiveForecastStatus: string;
forecast30Days: string;
forecast60Days: string;
forecast90Days: string;
boardForecastNarrative: string;
};

export function ExecutiveForecastEngine({
procurementOutlook,
riskTrajectory,
opportunityTrajectory,
executiveForecastStatus,
forecast30Days,
forecast60Days,
forecast90Days,
boardForecastNarrative,
}: ExecutiveForecastEngineProps) {
return (
<ExecutivePanel padding="lg">
<p className="text-xs font-black uppercase tracking-[0.25em] text-nexus-gold">
Executive Forecast Engine
</p>

<h2 className="mt-3 text-3xl font-black text-nexus-white">
30 / 60 / 90 Day Procurement Forecast
</h2>

<p className="mt-4 max-w-4xl text-sm font-semibold leading-7 text-nexus-muted">
Forward-looking executive intelligence projecting procurement outlook,
supplier participation, risk trajectory, opportunity momentum, and board
readiness over the next operating cycle.
</p>

<div className="mt-8 grid gap-6 md:grid-cols-2 xl:grid-cols-4">
<ExecutiveMetricCard label="Procurement Outlook" value={procurementOutlook} tone="blue" />
<ExecutiveMetricCard label="Risk Trajectory" value={riskTrajectory} tone="gold" />
<ExecutiveMetricCard label="Opportunity Trajectory" value={opportunityTrajectory} tone="blue" />
<ExecutiveMetricCard label="Forecast Status" value={executiveForecastStatus} tone="gold" />
</div>

<div className="mt-8 grid gap-5 md:grid-cols-3">
<ForecastWindow title="30 Days" value={forecast30Days} />
<ForecastWindow title="60 Days" value={forecast60Days} />
<ForecastWindow title="90 Days" value={forecast90Days} />
</div>

<div className="mt-8 rounded-3xl border border-white/10 bg-white/5 p-6">
<p className="text-xs font-black uppercase tracking-[0.25em] text-nexus-gold">
Board Forecast Narrative
</p>

<h3 className="mt-4 text-2xl font-black text-nexus-white">
{executiveForecastStatus}
</h3>

<p className="mt-4 text-sm font-semibold leading-7 text-nexus-muted">
{boardForecastNarrative}
</p>
</div>
</ExecutivePanel>
);
}

function ForecastWindow({ title, value }: { title: string; value: string }) {
return (
<div className="rounded-3xl border border-white/10 bg-white/5 p-6">
<p className="text-xs font-black uppercase tracking-[0.2em] text-nexus-gold">
{title}
</p>

<p className="mt-4 text-sm font-semibold leading-7 text-nexus-muted">
{value}
</p>
</div>
);
}
