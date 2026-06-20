import { ExecutiveInsightCard } from "@/components/executive/executive-insight-card";
import { ExecutiveMetricCard } from "@/components/executive/executive-metric-card";
import { ExecutivePanel } from "@/components/executive/executive-panel";

type CommandRoomItem = {
title: string;
value: string;
};

type CommandCenterItem = {
title: string;
value: string;
status: string;
};

type ProcurementCommandCenterProps = {
procurementCommandRoom: CommandRoomItem[];
procurementCommandRoomStatus: string;
procurementCommandCenter: CommandCenterItem[];
commandCenterStatus: string;
executiveCommandRecommendation: string;
};

export function ProcurementCommandCenter({
procurementCommandRoom,
procurementCommandRoomStatus,
procurementCommandCenter,
commandCenterStatus,
executiveCommandRecommendation,
}: ProcurementCommandCenterProps) {
return (
<ExecutivePanel variant="boardroom" padding="lg" tone="blue">
<div>
<p className="text-[10px] font-black uppercase tracking-[0.25em] text-blue-300">
Procurement Intelligence Command
</p>

<h2 className="mt-3 text-4xl font-black text-nexus-white">
Executive Procurement War Room
</h2>

<p className="mt-4 max-w-4xl text-sm font-semibold leading-7 text-nexus-muted">
Unified executive command environment combining board readiness,
procurement performance, risk exposure, supplier strength,
benchmark intelligence, command status, and decision confidence.
</p>
</div>

<div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
{procurementCommandRoom.map((item) => (
<ExecutiveMetricCard
key={item.title}
label={item.title}
value={item.value}
tone="blue"
/>
))}
</div>

<div className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
{procurementCommandCenter.map((item) => (
<ExecutiveMetricCard
key={item.title}
label={item.title}
value={item.value}
insight={item.status}
tone="gold"
/>
))}
</div>

<div className="mt-8 grid gap-5 lg:grid-cols-2">
<ExecutiveInsightCard
title={procurementCommandRoomStatus}
insight={executiveCommandRecommendation}
recommendation="Use command room signals to align procurement performance, supplier strength, and board confidence."
impact="Command room readiness is active."
tone="blue"
/>

<ExecutiveInsightCard
title={commandCenterStatus}
insight={executiveCommandRecommendation}
recommendation="Prioritize procurement actions with the strongest decision confidence and business impact."
impact="Command center alignment is active."
tone="gold"
/>
</div>
</ExecutivePanel>
);
}