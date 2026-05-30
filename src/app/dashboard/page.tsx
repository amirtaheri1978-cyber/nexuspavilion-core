import Link from "next/link";

import SignOutButton from "@/components/sign-out-button";
import { createClient } from "@/lib/supabase/server";

type RFQ = {
id: string;
slug: string | null;
title: string | null;
category: string | null;
location: string | null;
budget: number | string | null;
status: string | null;
created_at: string | null;
};

type Quote = {
id: string;
rfq_id: string;
amount: number | string | null;
decision: string | null;
created_at: string | null;
};

type Notification = {
id: string;
title: string | null;
message: string | null;
type: string | null;
created_at: string | null;
};

export default async function DashboardPage() {
const supabase = await createClient();

const {
data: { user },
} = await supabase.auth.getUser();

const { data: profile } = user
? await supabase
.from("profiles")
.select("id, email, role, company_id")
.eq("id", user.id)
.single()
: { data: null };

const { data: company } = profile?.company_id
? await supabase
.from("companies")
.select("*")
.eq("id", profile.company_id)
.single()
: { data: null };

const { data: rfqs } = profile?.company_id
? await supabase
.from("rfqs")
.select("*")
.eq("company_id", profile.company_id)
.order("created_at", { ascending: false })
: { data: [] };

const rfqList = (rfqs ?? []) as RFQ[];
const rfqIds = rfqList.map((rfq) => rfq.id);

const { data: quotes } =
rfqIds.length > 0
? await supabase
.from("quotes")
.select("*")
.in("rfq_id", rfqIds)
.order("created_at", { ascending: false })
: { data: [] };

const quoteList = (quotes ?? []) as Quote[];

const { data: notifications } = await supabase
.from("notifications")
.select("*")
.order("created_at", { ascending: false })
.limit(5);

const notificationList = (notifications ?? []) as Notification[];

const totalRfqs = rfqList.length;
const openRfqs = rfqList.filter(
(rfq) => !rfq.status || rfq.status === "open"
).length;
const awardedRfqs = rfqList.filter((rfq) => rfq.status === "awarded").length;
const closedRfqs = rfqList.filter((rfq) => rfq.status === "closed").length;

const submittedQuotes = quoteList.length;
const awardedQuotes = quoteList.filter(
(quote) => quote.decision === "awarded"
);

const totalAwardedSpend = awardedQuotes.reduce((total, quote) => {
const amount = Number(quote.amount);
return total + (Number.isNaN(amount) ? 0 : amount);
}, 0);

const averageAward =
awardedQuotes.length > 0
? Math.round(totalAwardedSpend / awardedQuotes.length)
: 0;

const awardRate =
totalRfqs > 0 ? Math.round((awardedRfqs / totalRfqs) * 100) : 0;

const totalBudget = rfqList.reduce((total, rfq) => {
const budget = Number(rfq.budget);
return total + (Number.isNaN(budget) ? 0 : budget);
}, 0);

const estimatedSavings = Math.max(totalBudget - totalAwardedSpend, 0);

const topRfqsByBudget = [...rfqList]
.sort((a, b) => Number(b.budget || 0) - Number(a.budget || 0))
.slice(0, 5);

const recentAwards = awardedQuotes.slice(0, 5);

return (
<main className="min-h-screen bg-[#f6f6f3]">
<div className="mx-auto max-w-7xl px-6 py-10">
<div className="flex items-start justify-between gap-6">
<div>
<p className="text-xs font-black uppercase tracking-[0.35em] text-orange-500">
Executive Workspace
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
<div className="mt-6 flex items-center justify-between gap-6">
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
className="rounded-full bg-slate-950 px-6 py-3 text-sm font-bold text-white transition hover:bg-slate-800"
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
description="Browse, create, and award procurement opportunities."
href="/rfq"
/>

<WorkspaceCard
title="Vendor Dashboard"
description="Track submitted quotes, awards, and supplier activity."
href="/vendor-dashboard"
/>

<WorkspaceCard
title="Public Directory"
description="Explore connected enterprise companies."
href="/directory"
/>
</section>

<section className="mt-8 rounded-[32px] border border-black/5 bg-white p-8">
<div className="flex items-end justify-between gap-6">
<div>
<p className="text-xs font-black uppercase tracking-[0.3em] text-orange-500">
Procurement Intelligence
</p>

<h2 className="mt-3 text-3xl font-black text-slate-950">
Executive Analytics
</h2>
</div>

<Link
href="/rfq"
className="rounded-full bg-slate-950 px-5 py-3 text-sm font-bold text-white"
>
Open Marketplace
</Link>
</div>

<div className="mt-6 grid gap-6 md:grid-cols-4">
<InsightCard
title="Total RFQs"
value={String(totalRfqs)}
detail={`${openRfqs} open · ${awardedRfqs} awarded`}
/>

<InsightCard
title="Supplier Quotes"
value={String(submittedQuotes)}
detail="Submitted enterprise bids"
/>

<InsightCard
title="Awarded Spend"
value={`$${totalAwardedSpend.toLocaleString()}`}
detail="Total awarded contract value"
/>

<InsightCard
title="Award Rate"
value={`${awardRate}%`}
detail="RFQs converted to awards"
/>

<InsightCard
title="Open RFQs"
value={String(openRfqs)}
detail="Active procurement opportunities"
/>

<InsightCard
title="Closed RFQs"
value={String(closedRfqs)}
detail="Archived or completed events"
/>

<InsightCard
title="Est. Savings"
value={`$${estimatedSavings.toLocaleString()}`}
detail="Budget less awarded value"
/>

<InsightCard
title="Average Award"
value={`$${averageAward.toLocaleString()}`}
detail="Average awarded contract"
/>
</div>
</section>

<section className="mt-8 grid gap-8 lg:grid-cols-2">
<div className="rounded-[32px] border border-black/5 bg-white p-8">
<p className="text-xs font-black uppercase tracking-[0.3em] text-orange-500">
Award Activity
</p>

<h2 className="mt-3 text-3xl font-black text-slate-950">
Recent Award Decisions
</h2>

<div className="mt-6 space-y-4">
{recentAwards.length > 0 ? (
recentAwards.map((quote) => {
const relatedRfq = rfqList.find(
(rfq) => rfq.id === quote.rfq_id
);

return (
<div
key={quote.id}
className="rounded-3xl border border-slate-100 bg-slate-50 p-5"
>
<div className="flex items-start justify-between gap-4">
<div>
<p className="text-lg font-black text-slate-950">
{relatedRfq?.title || "Awarded RFQ"}
</p>

<p className="mt-1 text-sm font-semibold text-slate-500">
{relatedRfq?.location || "Location N/A"}
</p>
</div>

<span className="rounded-full bg-green-100 px-3 py-1 text-xs font-black text-green-700">
Awarded
</span>
</div>

<p className="mt-4 text-2xl font-black text-slate-950">
${Number(quote.amount || 0).toLocaleString()}
</p>
</div>
);
})
) : (
<EmptyState message="No awards have been recorded yet." />
)}
</div>
</div>

<div className="rounded-[32px] border border-black/5 bg-white p-8">
<p className="text-xs font-black uppercase tracking-[0.3em] text-orange-500">
Portfolio View
</p>

<h2 className="mt-3 text-3xl font-black text-slate-950">
Top RFQs by Budget
</h2>

<div className="mt-6 space-y-4">
{topRfqsByBudget.length > 0 ? (
topRfqsByBudget.map((rfq) => (
<Link
key={rfq.id}
href={rfq.slug ? `/rfq/${rfq.slug}` : "/rfq"}
className="block rounded-3xl border border-slate-100 bg-slate-50 p-5 transition hover:-translate-y-1 hover:shadow-lg"
>
<div className="flex items-start justify-between gap-4">
<div>
<p className="text-lg font-black text-slate-950">
{rfq.title || "Untitled RFQ"}
</p>

<p className="mt-1 text-sm font-semibold text-slate-500">
{rfq.category || "Procurement"} ·{" "}
{rfq.location || "Location N/A"}
</p>
</div>

<span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-700">
{rfq.status || "open"}
</span>
</div>

<p className="mt-4 text-2xl font-black text-slate-950">
${Number(rfq.budget || 0).toLocaleString()}
</p>
</Link>
))
) : (
<EmptyState message="No RFQs have been created yet." />
)}
</div>
</div>
</section>

<section className="mt-8 rounded-[32px] border border-black/5 bg-white p-8">
<p className="text-xs font-black uppercase tracking-[0.3em] text-orange-500">
Activity Center
</p>

<h2 className="mt-3 text-3xl font-black text-slate-950">
Recent Notifications
</h2>

<div className="mt-6 space-y-4">
{notificationList.length > 0 ? (
notificationList.map((notification) => (
<div
key={notification.id}
className="rounded-3xl border border-slate-100 bg-slate-50 p-5"
>
<div className="flex items-start justify-between gap-4">
<div>
<p className="text-lg font-black text-slate-950">
{notification.title || "Notification"}
</p>

<p className="mt-2 text-sm leading-relaxed text-slate-600">
{notification.message || "No message provided."}
</p>
</div>

<span className="rounded-full bg-orange-100 px-3 py-1 text-xs font-black uppercase text-orange-700">
{notification.type || "event"}
</span>
</div>
</div>
))
) : (
<EmptyState message="No recent notifications." />
)}
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

function EmptyState({ message }: { message: string }) {
return (
<div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
<p className="text-sm font-bold text-slate-500">{message}</p>
</div>
);
}