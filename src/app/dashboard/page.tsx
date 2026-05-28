import Link from "next/link";

import SignOutButton from "@/components/sign-out-button";
import { createClient } from "@/lib/supabase/server";

export default async function DashboardPage() {
const supabase = await createClient();

const {
data: { user },
} = await supabase.auth.getUser();

const { data: profile } = await supabase
.from("profiles")
.select("id, email, role, company_id")
.eq("id", user?.id)
.single();

const { data: company } = profile?.company_id
? await supabase
.from("companies")
.select("*")
.eq("id", profile.company_id)
.single()
: { data: null };

const { count: rfqCount } = await supabase
.from("rfqs")
.select("*", { count: "exact", head: true });

const { count: quoteCount } = await supabase
.from("quotes")
.select("*", { count: "exact", head: true });

const { count: notificationCount } = await supabase
.from("notifications")
.select("*", { count: "exact", head: true });

return (
<main className="min-h-screen bg-[#f6f6f3]">
<div className="mx-auto max-w-7xl px-6 py-10">
<div className="flex items-start justify-between">
<div>
<p className="text-xs font-black uppercase tracking-[0.35em] text-orange-500">
Workspace Home
</p>

<h1 className="mt-3 text-5xl font-black text-slate-950">
Nexus Pavilion Dashboard
</h1>

<p className="mt-3 text-lg text-slate-600">
Signed in as {profile?.email || user?.email}
</p>

<p className="mt-2 text-sm font-bold uppercase tracking-[0.2em] text-slate-400">
Role: {profile?.role || "buyer"}
</p>
</div>

<SignOutButton />
</div>

<section className="mt-10 rounded-[32px] border border-black/5 bg-white p-8">
<p className="text-xs font-black uppercase tracking-[0.3em] text-orange-500">
My Enterprise Company
</p>

{company ? (
<div className="mt-6 flex items-center justify-between">
<div className="flex items-center gap-5">
{company.logo_url ? (
<img
src={company.logo_url}
alt={company.name}
className="h-20 w-20 rounded-3xl border border-slate-200 object-contain p-2"
/>
) : (
<div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-slate-100 text-3xl">
🏗️
</div>
)}

<div>
<h2 className="text-3xl font-black text-slate-950">
{company.name}
</h2>

<p className="mt-1 text-sm font-semibold text-slate-500">
{company.category} · {company.location}
</p>

<p className="mt-2 text-sm text-slate-600">
{company.network_role || "Enterprise Workspace"}
</p>
</div>
</div>

<Link
href={`/company/${company.slug}`}
className="rounded-full bg-slate-950 px-6 py-3 text-sm font-bold text-white"
>
Open Company
</Link>
</div>
) : (
<div className="mt-6 rounded-3xl bg-slate-50 p-6">
<h2 className="text-2xl font-black text-slate-950">
No company connected
</h2>

<p className="mt-2 text-slate-600">
Your profile exists, but no company_id is attached yet.
</p>
</div>
)}
</section>

<section className="mt-8 grid gap-6 md:grid-cols-4">
<WorkspaceCard
title="Company Hub"
description="Manage enterprise profiles and branding."
href="/company"
/>

<WorkspaceCard
title="RFQ Marketplace"
description="Browse and create procurement opportunities."
href="/rfq"
/>

<WorkspaceCard
title="Vendor Dashboard"
description="Track submitted quotes and decisions."
href="/vendor-dashboard"
/>

<WorkspaceCard
title="Public Directory"
description="Explore connected enterprise companies."
href="/directory"
/>
</section>

<section className="mt-8 rounded-[32px] border border-black/5 bg-white p-8">
<p className="text-xs font-black uppercase tracking-[0.3em] text-orange-500">
Quick Intelligence
</p>

<div className="mt-6 grid gap-6 md:grid-cols-3">
<InsightCard
title="Active RFQs"
value={String(rfqCount || 0)}
detail="Live procurement opportunities"
/>

<InsightCard
title="Supplier Quotes"
value={String(quoteCount || 0)}
detail="Submitted enterprise bids"
/>

<InsightCard
title="Notifications"
value={String(notificationCount || 0)}
detail="Platform activity events"
/>
</div>
</section>
</div>
</main>
);
}

function WorkspaceCard({
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
className="rounded-[28px] border border-black/5 bg-white p-7 transition hover:-translate-y-1 hover:shadow-xl"
>
<h3 className="text-2xl font-black text-slate-950">{title}</h3>

<p className="mt-3 text-sm leading-relaxed text-slate-600">
{description}
</p>

<div className="mt-6 text-sm font-black text-slate-950">Open →</div>
</Link>
);
}

function InsightCard({
title,
value,
detail,
}: {
title: string;
value: string;
detail: string;
}) {
return (
<div className="rounded-3xl border border-black/5 bg-slate-50 p-6">
<p className="text-xs font-black uppercase tracking-[0.25em] text-slate-500">
{title}
</p>

<p className="mt-3 text-4xl font-black text-slate-950">{value}</p>

<p className="mt-2 text-sm text-slate-600">{detail}</p>
</div>
);
}