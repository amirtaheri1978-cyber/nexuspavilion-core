import { ExecutiveActionCard } from "@/components/executive/executive-action-card";
import { ExecutiveInsightCard } from "@/components/executive/executive-insight-card";
import { ExecutiveMetricCard } from "@/components/executive/executive-metric-card";
import { ExecutivePanel } from "@/components/executive/executive-panel";

type CEOAction = {
phase: string;
title: string;
summary: string;
};

type CEOActionCenterProps = {
ceoOperatingStatus: string;
ceoDecisionPosture: string;
executiveBenchmarkStatus: string;
executiveCommandRecommendation: string;
ceoActionCenter: CEOAction[];
};

export function CEOActionCenter({
ceoOperatingStatus,
ceoDecisionPosture,
executiveBenchmarkStatus,
executiveCommandRecommendation,
ceoActionCenter,
}: CEOActionCenterProps) {
return (
<ExecutivePanel variant="boardroom" padding="lg" tone="gold">
<div>
<p className="text-[10px] font-black uppercase tracking-[0.25em] text-nexus-gold">
CEO Action Center
</p>

<h2 className="mt-3 text-3xl font-black text-nexus-white">
Chief Executive Action Dashboard
</h2>

<p className="mt-4 max-w-4xl text-sm font-semibold leading-7 text-nexus-muted">
Executive operating layer translating procurement intelligence,
risk posture, confidence signals, and opportunity rankings into
actionable CEO priorities.
</p>
</div>

<div className="mt-8 grid gap-6 md:grid-cols-3">
<ExecutiveMetricCard
label="Operating Status"
value={ceoOperatingStatus}
tone="blue"
/>
<ExecutiveMetricCard
label="Decision Posture"
value={ceoDecisionPosture}
tone="gold"
/>
<ExecutiveMetricCard
label="Benchmark Status"
value={executiveBenchmarkStatus}
tone="success"
/>
</div>

<div className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
{ceoActionCenter.map((action) => (
<ExecutiveActionCard
key={action.phase}
title={action.title}
description={action.summary}
actionLabel={action.phase}
priority="high"
impact="Executive priority is ready for review."
/>
))}
</div>

<div className="mt-8">
<ExecutiveInsightCard
title={ceoDecisionPosture}
insight={executiveCommandRecommendation}
recommendation="Review top procurement priorities and approve the next executive action sequence."
impact="CEO decision layer is active."
tone="gold"
/>
</div>
</ExecutivePanel>
);
}