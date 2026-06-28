import { ExecutivePanel } from "@/components/executive/executive-panel";

type ExecutiveScenarioCenterProps = {
bestCaseScenario: string;
expectedCaseScenario: string;
riskCaseScenario: string;
forecastConfidenceLevel: string;
executiveScenarioStatus: string;
};

export function ExecutiveScenarioCenter({
bestCaseScenario,
expectedCaseScenario,
riskCaseScenario,
forecastConfidenceLevel,
executiveScenarioStatus,
}: ExecutiveScenarioCenterProps) {
return (
<ExecutivePanel padding="lg">
<p className="text-xs font-black uppercase tracking-[0.25em] text-nexus-gold">
Executive Scenario Center
</p>

<h2 className="mt-3 text-3xl font-black text-nexus-white">
Strategic Scenario Modeling
</h2>

<p className="mt-4 max-w-4xl text-sm font-semibold leading-7 text-nexus-muted">
Nexus Pavilion models best-case, expected-case, and risk-case
procurement scenarios to support executive planning and board-level
decision review.
</p>

<div className="mt-8 grid gap-6 md:grid-cols-3">
<ScenarioCard
title="Best Case"
value={bestCaseScenario}
tone="success"
/>

<ScenarioCard
title="Expected Case"
value={expectedCaseScenario}
tone="info"
/>

<ScenarioCard
title="Risk Case"
value={riskCaseScenario}
tone="risk"
/>
</div>

<div className="mt-8 rounded-3xl border border-white/10 bg-white/5 p-6">
<p className="text-xs font-black uppercase tracking-[0.25em] text-nexus-gold">
Forecast Confidence Matrix
</p>

<div className="mt-6 grid gap-4 md:grid-cols-2">
<div className="rounded-2xl border border-white/10 bg-black/20 p-5">
<p className="text-xs font-black uppercase tracking-[0.2em] text-nexus-muted">
Forecast Confidence
</p>

<h3 className="mt-3 text-2xl font-black text-nexus-white">
{forecastConfidenceLevel}
</h3>
</div>

<div className="rounded-2xl border border-white/10 bg-black/20 p-5">
<p className="text-xs font-black uppercase tracking-[0.2em] text-nexus-muted">
Scenario Status
</p>

<h3 className="mt-3 text-2xl font-black text-nexus-white">
{executiveScenarioStatus}
</h3>
</div>
</div>

<p className="mt-6 text-sm font-semibold leading-7 text-nexus-muted">
Scenario intelligence compares upside opportunity, expected operating
performance, and downside risk before executive and board-level
decisions are made.
</p>
</div>
</ExecutivePanel>
);
}

type ScenarioTone = "success" | "info" | "risk";

function ScenarioCard({
title,
value,
tone,
}: {
title: string;
value: string;
tone: ScenarioTone;
}) {
const styles = {
success: {
border: "border-emerald-500/30",
bg: "bg-emerald-500/10",
text: "text-emerald-300",
},
info: {
border: "border-blue-500/30",
bg: "bg-blue-500/10",
text: "text-blue-300",
},
risk: {
border: "border-red-500/30",
bg: "bg-red-500/10",
text: "text-red-300",
},
};

const style = styles[tone];

return (
<div className={`rounded-3xl border p-6 ${style.border} ${style.bg}`}>
<p
className={`text-xs font-black uppercase tracking-[0.2em] ${style.text}`}
>
{title}
</p>

<p className="mt-5 text-sm font-semibold leading-7 text-nexus-muted">
{value}
</p>
</div>
);
}
