import { ExecutivePanel } from "@/components/executive/executive-panel";

type ExecutiveAlert = {
title: string;
message: string;
level: "healthy" | "opportunity" | "warning";
};

type ExecutiveAlertsCenterProps = {
executiveAlerts: ExecutiveAlert[];
};

export function ExecutiveAlertsCenter({
executiveAlerts,
}: ExecutiveAlertsCenterProps) {
return (
<ExecutivePanel padding="lg">
<p className="text-xs font-black uppercase tracking-[0.25em] text-nexus-gold">
Executive Alerts Center
</p>

<h2 className="mt-3 text-3xl font-black text-nexus-white">
Real-Time Executive Signals
</h2>

<p className="mt-4 max-w-4xl text-sm font-semibold leading-7 text-nexus-muted">
Critical procurement events, supplier activity, opportunity signals,
and operational risks are surfaced in real time for executive review.
</p>

<div className="mt-8 space-y-4">
{executiveAlerts.map((alert, index) => (
<div
key={index}
className="rounded-2xl border border-white/10 bg-white/5 p-5 transition hover:border-[#2CC4E8]/20"
>
<div className="flex items-center gap-3">
<div
className={`h-3 w-3 rounded-full ${
alert.level === "healthy"
? "bg-emerald-400"
: alert.level === "opportunity"
? "bg-[#C8A646]"
: "bg-red-500"
}`}
/>

<p className="font-black text-nexus-white">{alert.title}</p>
</div>

<p className="mt-3 text-sm font-semibold leading-7 text-nexus-muted">
{alert.message}
</p>
</div>
))}
</div>
</ExecutivePanel>
);
}
