import Link from "next/link";

type ReadinessItem = {
title: string;
description: string;
completed: boolean;
href: string;
};

type ExecutiveHeroProps = {
welcomeTitle: string;
welcomeDescription: string;
briefLabel: string;
companyName: string;
readinessScore: number;
readinessTone: "success" | "warning" | "blue" | "neutral";
readinessItems: ReadinessItem[];
incompleteTasksCount: number;
continueHref: string;
continueLabel: string;
};

export function ExecutiveHero({
welcomeTitle,
welcomeDescription,
briefLabel,
companyName,
readinessScore,
readinessTone,
readinessItems,
incompleteTasksCount,
continueHref,
continueLabel,
}: ExecutiveHeroProps) {
return (
<section className="rounded-[34px] border border-[#C8A646]/20 bg-gradient-to-br from-[#07111F] via-[#061426] to-[#020617] p-6 shadow-[0_32px_110px_rgba(0,0,0,0.42)] sm:p-8">
<div className="grid gap-8 xl:grid-cols-[1.05fr_0.95fr]">
<div>
<p className="text-[11px] font-black uppercase tracking-[0.34em] text-[#C8A646]">
Workspace Activated
</p>

<h1 className="mt-4 max-w-5xl text-4xl font-black leading-tight text-white sm:text-5xl xl:text-6xl">
{welcomeTitle}
</h1>

<p className="mt-4 max-w-4xl text-base font-semibold leading-8 text-slate-400 sm:text-lg">
{welcomeDescription}
</p>

<div className="mt-6 flex flex-wrap gap-3">
<HeroStatusBadge tone={readinessTone}>
{readinessScore}% Workspace Ready
</HeroStatusBadge>

<HeroStatusBadge tone="blue">{briefLabel}</HeroStatusBadge>

<HeroStatusBadge tone="neutral">{companyName}</HeroStatusBadge>
</div>

<div className="mt-8 flex flex-col gap-3 sm:flex-row">
<Link
href={continueHref}
className="inline-flex h-[56px] items-center justify-center rounded-2xl bg-gradient-to-r from-[#B9902F] via-[#C8A646] to-[#F5D77B] px-6 text-sm font-black uppercase tracking-[0.12em] text-slate-950 shadow-[0_18px_55px_rgba(200,166,70,0.3)] transition hover:scale-[1.01]"
>
{continueLabel}
</Link>

<Link
href="/rfq/new"
className="inline-flex h-[56px] items-center justify-center rounded-2xl border border-white/10 bg-white/[0.045] px-6 text-sm font-black text-white transition hover:bg-white/[0.08]"
>
Create First RFQ
</Link>
</div>
</div>

<div className="rounded-[32px] border border-white/10 bg-white/[0.045] p-6">
<div className="flex items-start justify-between gap-4">
<div>
<p className="text-[10px] font-black uppercase tracking-[0.28em] text-[#C8A646]">
Workspace Readiness
</p>

<h2 className="mt-3 text-3xl font-black text-white">
{readinessScore}%
</h2>
</div>

<HeroStatusBadge tone={readinessTone}>
{incompleteTasksCount === 0
? "Complete"
: `${incompleteTasksCount} Tasks Left`}
</HeroStatusBadge>
</div>

<div className="mt-5 h-3 overflow-hidden rounded-full bg-white/10">
<div
className="h-full rounded-full bg-gradient-to-r from-[#B9902F] via-[#C8A646] to-[#F5D77B]"
style={{ width: `${readinessScore}%` }}
/>
</div>

<div className="mt-6 space-y-3">
{readinessItems.map((item) => (
<HeroReadinessRow key={item.title} item={item} />
))}
</div>
</div>
</div>
</section>
);
}

function HeroStatusBadge({
children,
tone = "neutral",
}: {
children: React.ReactNode;
tone?: "success" | "warning" | "blue" | "neutral";
}) {
const toneClass =
tone === "success"
? "border-emerald-300/20 bg-emerald-400/10 text-emerald-300"
: tone === "warning"
? "border-orange-300/20 bg-orange-400/10 text-orange-300"
: tone === "blue"
? "border-[#2CC4E8]/25 bg-[#2CC4E8]/10 text-[#9BE8F8]"
: "border-white/10 bg-white/[0.055] text-slate-300";

return (
<span
className={`inline-flex rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] ${toneClass}`}
>
{children}
</span>
);
}

function HeroReadinessRow({ item }: { item: ReadinessItem }) {
return (
<Link
href={item.href}
className="flex items-start gap-3 rounded-2xl border border-white/10 bg-[#07111F]/75 px-4 py-3 transition hover:bg-white/[0.06]"
>
<span
className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-xs font-black ${
item.completed
? "border-emerald-300/20 bg-emerald-400/10 text-emerald-300"
: "border-[#C8A646]/30 bg-[#C8A646]/10 text-[#F5D77B]"
}`}
>
{item.completed ? "✓" : "→"}
</span>

<span className="min-w-0">
<span className="block text-sm font-black text-white">
{item.title}
</span>

<span className="mt-1 block text-xs font-semibold leading-5 text-slate-500">
{item.description}
</span>
</span>
</Link>
);
}