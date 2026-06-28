type ExecutiveRecommendation = {
role: string
action: string
}

interface ExecutiveRecommendationsProps {
executiveRecommendations: ExecutiveRecommendation[]
}

export default function ExecutiveRecommendations({
executiveRecommendations,
}: ExecutiveRecommendationsProps) {
return (
<section className="mt-8 rounded-3xl border border-slate-200 bg-white p-8">
<p className="text-xs font-black uppercase tracking-[0.25em] text-orange-500">
AI Executive Recommendations
</p>

<h2 className="mt-3 text-3xl font-black text-slate-950">
Executive Action Plan
</h2>

<div className="mt-6 grid gap-4 md:grid-cols-2">
{executiveRecommendations.map((item) => (
<div
key={item.role}
className="rounded-2xl border border-slate-200 bg-slate-50 p-5"
>
<p className="text-xs font-black uppercase tracking-[0.2em] text-orange-500">
{item.role}
</p>

<p className="mt-3 text-sm font-semibold leading-7 text-slate-700">
{item.action}
</p>
</div>
))}
</div>
</section>
)
}
