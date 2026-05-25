import Link from "next/link";

export default function DashboardPage() {
return (
<main className="min-h-screen bg-slate-100 px-6 py-12">
<div className="mx-auto max-w-7xl">
<p className="text-sm font-semibold uppercase tracking-[0.3em] text-orange-500">
Workspace Home
</p>

<h1 className="mt-3 text-5xl font-black text-slate-950">
Nexus Pavilion Dashboard
</h1>

<p className="mt-4 max-w-3xl text-lg text-slate-600">
Manage your enterprise profile, procurement RFQs, supplier quotes, and
network activity from one workspace.
</p>

<section className="mt-10 grid gap-6 md:grid-cols-2 xl:grid-cols-4">
<DashboardCard
title="Company Hub"
description="Manage enterprise profiles and branding."
href="/company"
/>

<DashboardCard
title="RFQ Marketplace"
description="Browse and create procurement opportunities."
href="/rfq"
/>

<DashboardCard
title="Vendor Dashboard"
description="Track submitted quotes and decisions."
href="/vendor-dashboard"
/>

<DashboardCard
title="Public Directory"
description="Explore connected enterprise companies."
href="/directory"
/>
</section>

<section className="mt-10 rounded-3xl bg-white p-8 shadow-sm">
<p className="text-sm font-semibold uppercase tracking-[0.2em] text-orange-500">
Quick Actions
</p>

<div className="mt-6 flex flex-wrap gap-4">
<Link
href="/rfq/new"
className="rounded-full bg-slate-950 px-6 py-3 text-sm font-bold text-white"
>
Create RFQ
</Link>

<Link
href="/rfq"
className="rounded-full border border-slate-300 bg-white px-6 py-3 text-sm font-bold text-slate-950"
>
Browse RFQs
</Link>

<Link
href="/company/m-n1"
className="rounded-full border border-slate-300 bg-white px-6 py-3 text-sm font-bold text-slate-950"
>
View My Company
</Link>
</div>
</section>
</div>
</main>
);
}

function DashboardCard({
title,
description,
href,
}: {
title: string;
description: string;
href: string;
}) {
return (
<Link
href={href}
className="rounded-3xl bg-white p-7 shadow-sm transition hover:-translate-y-1 hover:shadow-xl"
>
<h2 className="text-2xl font-black text-slate-950">{title}</h2>

<p className="mt-3 min-h-16 text-slate-600">{description}</p>

<span className="mt-6 inline-flex font-bold text-slate-950">
Open →
</span>
</Link>
);
}