import Link from "next/link";

export default function AboutPage() {
return (
<main className="min-h-screen bg-[#f6f6f3] px-8 py-12">
<div className="mx-auto max-w-6xl">
<Link
href="/"
className="text-sm font-bold text-slate-500 hover:text-slate-950"
>
← Back to Home
</Link>

<section className="mt-8 rounded-[36px] border border-black/5 bg-white p-10">
<p className="text-xs font-black uppercase tracking-[0.35em] text-orange-500">
About Nexus Pavilion
</p>

<h1 className="mt-4 max-w-4xl text-5xl font-black leading-tight text-slate-950">
Enterprise procurement intelligence for construction and supplier
networks.
</h1>

<p className="mt-6 max-w-4xl text-base leading-8 text-slate-600">
Nexus Pavilion is a procurement intelligence platform designed to
help buyers, vendors, and enterprise teams manage RFQs, supplier
quotes, award decisions, company workspaces, and procurement
performance from one secure platform.
</p>
</section>

<section className="mt-8 grid gap-6 md:grid-cols-3">
<InfoCard
title="RFQ Intelligence"
description="Create, publish, compare, and award RFQs with structured supplier quote intelligence."
/>

<InfoCard
title="Supplier Performance"
description="Track vendor activity, award history, win rates, procurement scores, and supplier risk signals."
/>

<InfoCard
title="Executive Analytics"
description="View procurement health, savings opportunities, competition levels, forecasts, and strategic recommendations."
/>
</section>

<section className="mt-8 rounded-[32px] border border-black/5 bg-white p-8">
<p className="text-xs font-black uppercase tracking-[0.3em] text-orange-500">
Platform Mission
</p>

<h2 className="mt-3 text-3xl font-black text-slate-950">
Turning procurement data into confident decisions.
</h2>

<p className="mt-4 max-w-4xl text-sm leading-7 text-slate-600">
Traditional procurement workflows often rely on spreadsheets,
emails, disconnected vendor lists, and manual bid comparison.
Nexus Pavilion centralizes the procurement lifecycle and adds
intelligence on top of RFQs, quotes, awards, supplier performance,
and executive reporting.
</p>
</section>

<section className="mt-8 grid gap-6 md:grid-cols-2">
<FeatureBlock
title="For Buyers"
items={[
"Manage company RFQs and supplier quotes",
"Compare bids using price, timeline, risk, and award probability",
"Track procurement volume, savings, and award decisions",
"Manage team members, roles, invitations, and access",
]}
/>

<FeatureBlock
title="For Suppliers"
items={[
"Participate in procurement opportunities",
"Track submitted quotes and awarded contracts",
"Monitor supplier performance and ranking signals",
"Build verified company visibility across the network",
]}
/>
</section>

<section className="mt-8 rounded-[32px] border border-black/5 bg-slate-950 p-8 text-white">
<p className="text-xs font-black uppercase tracking-[0.3em] text-orange-400">
Soft Launch
</p>

<h2 className="mt-3 text-3xl font-black">
Built for modern procurement teams.
</h2>

<p className="mt-4 max-w-4xl text-sm leading-7 text-white/70">
Nexus Pavilion is being developed as an enterprise-ready SaaS
platform for procurement visibility, supplier intelligence, and
smarter award decisions.
</p>
</section>
</div>
</main>
);
}

function InfoCard({
title,
description,
}: {
title: string;
description: string;
}) {
return (
<div className="rounded-3xl border border-black/5 bg-white p-7">
<h2 className="text-2xl font-black text-slate-950">{title}</h2>

<p className="mt-3 text-sm leading-7 text-slate-600">{description}</p>
</div>
);
}

function FeatureBlock({
title,
items,
}: {
title: string;
items: string[];
}) {
return (
<div className="rounded-[32px] border border-black/5 bg-white p-8">
<h2 className="text-3xl font-black text-slate-950">{title}</h2>

<div className="mt-5 space-y-3">
{items.map((item) => (
<div
key={item}
className="rounded-2xl bg-slate-50 px-4 py-3 text-sm font-bold text-slate-700"
>
✓ {item}
</div>
))}
</div>
</div>
);
}