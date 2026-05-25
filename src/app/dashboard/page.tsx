import Link from "next/link";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

export default async function DashboardPage() {
const supabase = await createClient();

const {
data: { user },
} = await supabase.auth.getUser();

if (!user) {
redirect("/login");
}

const { data: company } = await supabase
.from("companies")
.select("id, name, slug, logo_url, category, location, network_role, status")
.eq("user_id", user.id)
.maybeSingle();

async function signOut() {
"use server";

const supabase = await createClient();
await supabase.auth.signOut();

redirect("/login");
}

return (
<main className="min-h-screen bg-slate-100 px-6 py-12">
<div className="mx-auto max-w-7xl">
<div className="flex items-start justify-between gap-6">
<div>
<p className="text-sm font-semibold uppercase tracking-[0.3em] text-orange-500">
Workspace Home
</p>

<h1 className="mt-3 text-5xl font-black text-slate-950">
Nexus Pavilion Dashboard
</h1>

<p className="mt-4 max-w-3xl text-lg text-slate-600">
Signed in as {user.email}
</p>
</div>

<form action={signOut}>
<button
type="submit"
className="rounded-full border border-slate-300 bg-white px-5 py-3 text-sm font-bold text-slate-950 transition hover:bg-slate-50"
>
Sign out
</button>
</form>
</div>

{company ? (
<section className="mt-10 rounded-3xl bg-white p-8 shadow-sm">
<p className="text-sm font-semibold uppercase tracking-[0.2em] text-orange-500">
My Enterprise Company
</p>

<div className="mt-6 flex items-start justify-between gap-6">
<div className="flex items-center gap-5">
{company.logo_url ? (
<img
src={company.logo_url}
alt={company.name}
className="h-20 w-20 rounded-2xl border border-slate-200 object-contain p-2"
/>
) : (
<div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-slate-100 text-3xl font-black text-slate-400">
{company.name?.charAt(0) || "C"}
</div>
)}

<div>
<h2 className="text-3xl font-black text-slate-950">
{company.name}
</h2>

<p className="mt-2 text-slate-600">
{company.category} · {company.location}
</p>

<p className="mt-1 text-sm font-semibold text-slate-500">
{company.network_role}
</p>
</div>
</div>

<Link
href={`/company/${company.slug}`}
className="rounded-full bg-slate-950 px-5 py-3 text-sm font-bold text-white"
>
Open Company
</Link>
</div>
</section>
) : (
<section className="mt-10 rounded-3xl bg-white p-8 shadow-sm">
<h2 className="text-2xl font-black text-slate-950">
No company connected yet
</h2>

<p className="mt-3 text-slate-600">
Connect or create an enterprise company profile to unlock
procurement workflows.
</p>
</section>
)}

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

{company && (
<Link
href={`/company/${company.slug}`}
className="rounded-full border border-slate-300 bg-white px-6 py-3 text-sm font-bold text-slate-950"
>
View My Company
</Link>
)}
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