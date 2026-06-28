import { ExecutivePanel } from "@/components/executive/executive-panel";

type ExecutivePresentationExport = {
title: string;
status: string;
audience: string;
};

type ExecutivePresentationCenterProps = {
executivePresentationExports: ExecutivePresentationExport[];
exportReadinessStatus: string;
};

export function ExecutivePresentationCenter({
executivePresentationExports,
exportReadinessStatus,
}: ExecutivePresentationCenterProps) {
return (
<ExecutivePanel padding="lg">
<p className="text-xs font-black uppercase tracking-[0.25em] text-nexus-gold">
Executive Presentation Export Layer
</p>

<h2 className="mt-3 text-3xl font-black text-nexus-white">
Executive Presentation Center
</h2>

<p className="mt-4 max-w-4xl text-sm font-semibold leading-7 text-nexus-muted">
Executive-ready presentation packages for board members,
executive leadership, procurement leadership, and strategic
planning reviews.
</p>

<div className="mt-8 grid gap-6 md:grid-cols-2 xl:grid-cols-4">
{executivePresentationExports.map((item) => (
<div
key={item.title}
className="rounded-3xl border border-white/10 bg-white/5 p-6"
>
<p className="text-xs font-black uppercase tracking-[0.2em] text-nexus-gold">
{item.audience}
</p>

<h3 className="mt-4 text-xl font-black text-nexus-white">
{item.title}
</h3>

<p className="mt-4 text-sm font-semibold text-nexus-muted">
{item.status}
</p>
</div>
))}
</div>

<div className="mt-8 rounded-3xl border border-white/10 bg-white/5 p-6">
<p className="text-xs font-black uppercase tracking-[0.25em] text-nexus-gold">
Export Readiness
</p>

<h3 className="mt-4 text-3xl font-black text-nexus-white">
{exportReadinessStatus}
</h3>

<p className="mt-4 text-sm font-semibold leading-7 text-nexus-muted">
Executive presentation packages are generated only from validated
procurement intelligence, executive readiness signals,
benchmark analysis, and board-level decision data.
</p>
</div>
</ExecutivePanel>
);
}

