type DailyExecutiveBriefingProps = {
dailyExecutiveBriefing: {
title: string;
message: string;
}[];
};

export default function DailyExecutiveBriefing({
dailyExecutiveBriefing,
}: DailyExecutiveBriefingProps) {
return (
<section className="mt-8 rounded-3xl border border-slate-200 bg-white p-8">
<p className="text-xs font-black uppercase tracking-[0.25em] text-orange-500">
Daily Executive Briefing
</p>

<h2 className="mt-3 text-3xl font-black text-slate-950">
Executive Morning Brief
</h2>

<div className="mt-8 grid gap-4 md:grid-cols-5">
{dailyExecutiveBriefing.map((item) => (
<div
key={item.title}
className="rounded-2xl border border-slate-200 bg-slate-50 p-5"
>
<p className="text-xs font-black uppercase tracking-[0.2em] text-orange-500">
{item.title}
</p>

<p className="mt-3 text-sm font-semibold leading-7 text-slate-700">
{item.message}
</p>
</div>
))}
</div>
</section>
);
}