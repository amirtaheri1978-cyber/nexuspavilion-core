import { ExecutivePanel } from "@/components/executive/executive-panel";

type BoardAutomationItem = {
title: string;
status: string;
};

type BoardPackageStage = {
stage: string;
status: string;
};

type BoardDistributionChannel = {
channel: string;
status: string;
};

type BoardApprovalStage = {
stage: string;
status: string;
};

type BoardAutomationCenterProps = {
boardAutomationItems: BoardAutomationItem[];
boardAutomationStatus: string;
boardPackageLifecycle: string;
boardPackageStages: BoardPackageStage[];
boardDistributionChannels: BoardDistributionChannel[];
boardDistributionReadiness: string;
boardApprovalStages: BoardApprovalStage[];
boardApprovalStatus: string;
};

export function BoardAutomationCenter({
boardAutomationItems,
boardAutomationStatus,
boardPackageLifecycle,
boardPackageStages,
boardDistributionChannels,
boardDistributionReadiness,
boardApprovalStages,
boardApprovalStatus,
}: BoardAutomationCenterProps) {
return (
<ExecutivePanel padding="lg">
<p className="text-xs font-black uppercase tracking-[0.25em] text-nexus-gold">
Board Automation Center
</p>

<h2 className="mt-3 text-3xl font-black text-nexus-white">
Automated Board Package Workflow
</h2>

<p className="mt-4 max-w-4xl text-sm font-semibold leading-7 text-nexus-muted">
Nexus Pavilion validates board package readiness, executive approval
requirements, distribution status, and board automation lifecycle before
report generation.
</p>

<div className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
{boardAutomationItems.map((item) => (
<AutomationTile
key={item.title}
label={item.title}
value={item.status}
/>
))}
</div>

<ExecutiveStatusBlock
title="Board Automation Status"
value={boardAutomationStatus}
description={boardPackageLifecycle}
/>

<AutomationGroup
title="Board Package Lifecycle"
items={boardPackageStages.map((stage) => ({
label: stage.stage,
value: stage.status,
}))}
/>

<AutomationGroup
title="Board Distribution Intelligence"
items={boardDistributionChannels.map((item) => ({
label: item.channel,
value: item.status,
}))}
/>

<ExecutiveStatusBlock
title="Distribution Readiness"
value={boardDistributionReadiness}
description="Executive board packages are distributed only after readiness, confidence, and governance validation thresholds are achieved."
/>

<AutomationGroup
title="Board Approval Workflow"
items={boardApprovalStages.map((item) => ({
label: item.stage,
value: item.status,
}))}
/>

<ExecutiveStatusBlock
title="Approval Status"
value={boardApprovalStatus}
description="Board package approval requires executive readiness, governance review, risk validation, and distribution authorization."
/>
</ExecutivePanel>
);
}

function AutomationTile({ label, value }: { label: string; value: string }) {
return (
<div className="rounded-3xl border border-white/10 bg-white/5 p-6">
<p className="text-xs font-black uppercase tracking-[0.2em] text-nexus-gold">
{label}
</p>

<h3 className="mt-4 text-xl font-black text-nexus-white">
{value}
</h3>
</div>
);
}

function AutomationGroup({
title,
items,
}: {
title: string;
items: { label: string; value: string }[];
}) {
return (
<div className="mt-8">
<p className="text-xs font-black uppercase tracking-[0.25em] text-nexus-gold">
{title}
</p>

<div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
{items.map((item) => (
<AutomationTile
key={`${title}-${item.label}`}
label={item.label}
value={item.value}
/>
))}
</div>
</div>
);
}

function ExecutiveStatusBlock({
title,
value,
description,
}: {
title: string;
value: string;
description: string;
}) {
return (
<div className="mt-8 rounded-3xl border border-white/10 bg-white/5 p-6">
<p className="text-xs font-black uppercase tracking-[0.25em] text-nexus-gold">
{title}
</p>

<h3 className="mt-4 text-3xl font-black text-nexus-white">
{value}
</h3>

<p className="mt-4 text-sm font-semibold leading-7 text-nexus-muted">
{description}
</p>
</div>
);
}
