import Link from "next/link";
import { redirect } from "next/navigation";

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

type ActivityEvent = {
id: string;
title: string;
description: string;
type: string;
severity: "success" | "info" | "warning" | "critical";
createdAt: string | null;
href: string;
};

function formatMoney(value: number | string | null | undefined) {
const amount = Number(value);

if (!Number.isFinite(amount)) {
return "$0";
}

return `$${amount.toLocaleString()}`;
}

function formatRelativeTime(value: string | null | undefined) {
if (!value) return "Recently";

const date = new Date(value);
const now = new Date();
const diff = now.getTime() - date.getTime();

if (Number.isNaN(diff)) return "Recently";

const minutes = Math.floor(diff / 60000);
const hours = Math.floor(minutes / 60);
const days = Math.floor(hours / 24);

if (minutes < 1) return "Just now";
if (minutes < 60) return `${minutes} min ago`;
if (hours < 24) return `${hours} hr ago`;
if (days < 7) return `${days} day${days === 1 ? "" : "s"} ago`;

return date.toLocaleDateString();
}

function getNotificationSeverity(type: string | null): ActivityEvent["severity"] {
const normalized = String(type || "").toLowerCase();

if (normalized.includes("award")) return "success";
if (normalized.includes("risk")) return "warning";
if (normalized.includes("error")) return "critical";

return "info";
}

function buildActivityFeed({
notifications,
rfqs,
awardedQuotes,
}: {
notifications: Notification[];
rfqs: RFQ[];
awardedQuotes: Quote[];
}) {
const notificationEvents: ActivityEvent[] = notifications.map((item) => ({
id: `notification-${item.id}`,
title: item.title || "Platform Activity",
description: item.message || "A procurement activity was recorded.",
type: item.type || "event",
severity: getNotificationSeverity(item.type),
createdAt: item.created_at,
href: "/dashboard",
}));

const rfqEvents: ActivityEvent[] = rfqs.slice(0, 5).map((rfq) => ({
id: `rfq-${rfq.id}`,
title: rfq.status === "awarded" ? "RFQ Awarded" : "RFQ Created",
description: `${rfq.title || "Untitled RFQ"} · ${
rfq.location || "Location N/A"
}`,
type: rfq.status || "rfq",
severity: rfq.status === "awarded" ? "success" : "info",
createdAt: rfq.created_at,
href: rfq.slug ? `/rfq/${rfq.slug}` : "/rfq",
}));

const awardEvents: ActivityEvent[] = awardedQuotes.slice(0, 5).map((quote) => {
const rfq = rfqs.find((item) => item.id === quote.rfq_id);

return {
id: `award-${quote.id}`,
title: "Contract Awarded",
description: `${rfq?.title || "Awarded RFQ"} · ${formatMoney(
quote.amount
)}`,
type: "award",
severity: "success",
createdAt: quote.created_at,
href: rfq?.slug ? `/rfq/${rfq.slug}` : "/rfq",
};
});

return [...notificationEvents, ...awardEvents, ...rfqEvents]
.sort((a, b) => {
const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;

return dateB - dateA;
})
.slice(0, 8);
}

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

if (!profile?.company_id) {
redirect("/create-company");
}

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
.eq("company_id", profile.company_id)
.order("created_at", { ascending: false })
.limit(8);

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

const procurementHealthScore = Math.min(
100,
Math.round(
awardRate * 0.35 +
Math.min(submittedQuotes * 8, 30) +
Math.min(awardedQuotes.length * 12, 25) +
(estimatedSavings > 0 ? 10 : 0)
)
);

const riskIndex = Math.max(0, 100 - procurementHealthScore);

const forecastAccuracy =
procurementHealthScore >= 80
? 92
: procurementHealthScore >= 65
? 84
: procurementHealthScore >= 50
? 76
: 65;

const supplierConcentration =
awardedQuotes.length <= 1
? "High"
: awardedQuotes.length <= 3
? "Medium"
: "Low";

const executiveStatus =
procurementHealthScore >= 85
? "Excellent"
: procurementHealthScore >= 70
? "Healthy"
: procurementHealthScore >= 55
? "Moderate"
: "Needs Attention";

const boardRecommendation =
riskIndex >= 60
? "Reduce procurement risk by increasing supplier participation, improving RFQ conversion, and reviewing award concentration."
: estimatedSavings > 0
? "Prioritize savings capture, maintain competitive bidding activity, and scale high-performing supplier relationships."
: "Continue growing RFQ activity, supplier quote volume, and award decisions to strengthen executive procurement confidence.";

const executiveAlerts = [];

if (riskIndex >= 55) {
executiveAlerts.push({
level: "warning",
title: "Procurement Risk Requires Attention",
message: "Risk exposure is elevated. Review RFQ activity and award conversion.",
});
}

if (estimatedSavings > 0) {
executiveAlerts.push({
level: "opportunity",
title: "Savings Opportunity Available",
message: "Budget-to-award spread indicates potential procurement savings.",
});
}

if (submittedQuotes < 3) {
executiveAlerts.push({
level: "warning",
title: "Supplier Participation Is Limited",
message: "Invite more vendors to improve competition and pricing quality.",
});
}

if (forecastAccuracy >= 75) {
executiveAlerts.push({
level: "healthy",
title: "Forecast Confidence Is Active",
message: "Procurement data is sufficient for executive forecasting signals.",
});
}

const topRfqsByBudget = [...rfqList]
.sort((a, b) => Number(b.budget || 0) - Number(a.budget || 0))
.slice(0, 5);

const recentAwards = awardedQuotes.slice(0, 5);

const activityFeed = buildActivityFeed({
notifications: notificationList,
rfqs: rfqList,
awardedQuotes,
});

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
Role: {profile?.role ? profile.role.toUpperCase() : "SETUP REQUIRED"}
</p>
</div>

<SignOutButton />
</div>

<section className="mt-10 rounded-[36px] border border-slate-200 bg-slate-950 p-8 text-white">
<p className="text-xs font-black uppercase tracking-[0.3em] text-orange-400">
CEO Command Center
</p>

<div className="mt-5 grid gap-8 lg:grid-cols-[1fr_0.9fr]">
<div>
<h2 className="text-4xl font-black">
Executive Procurement Control Tower
</h2>

<p className="mt-4 max-w-3xl text-sm leading-7 text-slate-300">
{boardRecommendation}
</p>
</div>

<div className="grid gap-4 sm:grid-cols-2">
<DarkMetric title="Enterprise Score" value={`${procurementHealthScore}/100`} />
<DarkMetric title="Risk Index" value={`${riskIndex}/100`} />
<DarkMetric title="Forecast Accuracy" value={`${forecastAccuracy}%`} />
<DarkMetric title="Supplier Concentration" value={supplierConcentration} />
</div>
</div>
</section>

<section className="mt-8 rounded-[32px] border border-black/5 bg-white p-8">
<p className="text-xs font-black uppercase tracking-[0.3em] text-orange-500">
Executive Alerts
</p>

<h2 className="mt-3 text-3xl font-black text-slate-950">
Real-Time Procurement Signals
</h2>

<div className="mt-6 space-y-4">
{executiveAlerts.map((alert, index) => (
<div key={index} className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
<div className="flex items-center gap-3">
<div
className={`h-3 w-3 rounded-full ${
alert.level === "healthy"
? "bg-green-500"
: alert.level === "opportunity"
? "bg-yellow-500"
: "bg-red-500"
}`}
/>

<p className="font-black text-slate-950">{alert.title}</p>
</div>

<p className="mt-2 text-sm text-slate-600">{alert.message}</p>
</div>
))}
</div>
</section>

<section className="mt-8 rounded-[32px] border border-black/5 bg-white p-8">
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
<EmptyState message="No company connected." />
)}
</section>

<section className="mt-8 grid gap-6 md:grid-cols-4">
<WorkspaceCard title="Company Hub" description="Manage enterprise profiles and branding." href="/company" />
<WorkspaceCard title="RFQ Marketplace" description="Browse, create, and award procurement opportunities." href="/rfq" />
<WorkspaceCard title="Vendor Dashboard" description="Track submitted quotes, awards, and supplier activity." href="/vendor-dashboard" />
<WorkspaceCard title="Public Directory" description="Explore connected enterprise companies." href="/directory" />
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

<Link href="/rfq" className="rounded-full bg-slate-950 px-5 py-3 text-sm font-bold text-white">
Open Marketplace
</Link>
</div>

<div className="mt-6 grid gap-6 md:grid-cols-4">
<InsightCard title="Total RFQs" value={String(totalRfqs)} detail={`${openRfqs} open · ${awardedRfqs} awarded`} />
<InsightCard title="Supplier Quotes" value={String(submittedQuotes)} detail="Submitted enterprise bids" />
<InsightCard title="Awarded Spend" value={formatMoney(totalAwardedSpend)} detail="Total awarded contract value" />
<InsightCard title="Award Rate" value={`${awardRate}%`} detail="RFQs converted to awards" />
<InsightCard title="Open RFQs" value={String(openRfqs)} detail="Active procurement opportunities" />
<InsightCard title="Closed RFQs" value={String(closedRfqs)} detail="Archived or completed events" />
<InsightCard title="Est. Savings" value={formatMoney(estimatedSavings)} detail="Budget less awarded value" />
<InsightCard title="Average Award" value={formatMoney(averageAward)} detail="Average awarded contract" />
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
const relatedRfq = rfqList.find((rfq) => rfq.id === quote.rfq_id);

return (
<div key={quote.id} className="rounded-3xl border border-slate-100 bg-slate-50 p-5">
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
{formatMoney(quote.amount)}
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
{rfq.category || "Procurement"} · {rfq.location || "Location N/A"}
</p>
</div>

<span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-700">
{rfq.status || "open"}
</span>
</div>

<p className="mt-4 text-2xl font-black text-slate-950">
{formatMoney(rfq.budget)}
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
<div className="flex items-end justify-between gap-6">
<div>
<p className="text-xs font-black uppercase tracking-[0.3em] text-orange-500">
Activity Command Center
</p>

<h2 className="mt-3 text-3xl font-black text-slate-950">
Live Procurement Timeline
</h2>
</div>

<span className="rounded-full bg-slate-950 px-4 py-2 text-xs font-black uppercase tracking-[0.2em] text-white">
{activityFeed.length} Signals
</span>
</div>

<div className="mt-6 space-y-4">
{activityFeed.length > 0 ? (
activityFeed.map((event) => (
<ActivityFeedItem key={event.id} event={event} />
))
) : (
<EmptyState message="No procurement activity has been recorded yet." />
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

<p className="mt-3 text-sm leading-relaxed text-slate-600">{description}</p>

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

function DarkMetric({ title, value }: { title: string; value: string }) {
return (
<div className="rounded-2xl bg-white/10 p-5">
<p className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">
{title}
</p>

<p className="mt-2 text-3xl font-black text-white">{value}</p>
</div>
);
}

function ActivityFeedItem({ event }: { event: ActivityEvent }) {
const severityClass =
event.severity === "success"
? "bg-green-100 text-green-700"
: event.severity === "warning"
? "bg-yellow-100 text-yellow-800"
: event.severity === "critical"
? "bg-red-100 text-red-700"
: "bg-blue-100 text-blue-700";

const dotClass =
event.severity === "success"
? "bg-green-500"
: event.severity === "warning"
? "bg-yellow-500"
: event.severity === "critical"
? "bg-red-500"
: "bg-blue-500";

return (
<Link
href={event.href}
className="group block rounded-3xl border border-slate-100 bg-slate-50 p-5 transition hover:-translate-y-1 hover:bg-white hover:shadow-lg"
>
<div className="flex items-start gap-4">
<div className={`mt-2 h-3 w-3 rounded-full ${dotClass}`} />

<div className="min-w-0 flex-1">
<div className="flex flex-wrap items-center justify-between gap-3">
<p className="text-lg font-black text-slate-950">{event.title}</p>

<div className="flex items-center gap-2">
<span className={`rounded-full px-3 py-1 text-xs font-black uppercase ${severityClass}`}>
{event.type}
</span>

<span className="text-xs font-bold text-slate-400">
{formatRelativeTime(event.createdAt)}
</span>
</div>
</div>

<p className="mt-2 text-sm leading-relaxed text-slate-600">
{event.description}
</p>

<p className="mt-3 text-xs font-black uppercase tracking-[0.2em] text-slate-400 transition group-hover:text-slate-950">
Open event →
</p>
</div>
</div>
</Link>
);
}

function EmptyState({ message }: { message: string }) {
return (
<div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
<p className="text-sm font-bold text-slate-500">{message}</p>
</div>
);
}