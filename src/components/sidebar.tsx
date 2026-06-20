"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";

import { NexusPavilionMonogram } from "@/components/branding/nexus-pavilion-logo";
import { createClient } from "@/lib/supabase/client";

type Stats = {
activeRfqs: number;
unreadNotifications: number;
awardedContracts: number;
supplierQuotes: number;
};

type ProfileRole = "owner" | "admin" | "buyer" | "vendor" | string;

type UserContext = {
role: ProfileRole | null;
networkRole: string | null;
companyName: string | null;
companyStatus: string | null;
};

type Experience = "owner" | "vendor" | "consultant";

type NavItem = {
label: string;
href: string;
key: string;
description: string;
badge?: string;
};

type NavSection = {
title: string;
items: NavItem[];
};

function normalizeRole(value: string | null | undefined) {
return String(value || "").trim().toLowerCase();
}

function getExperience(context: UserContext): Experience {
const role = normalizeRole(context.role);
const networkRole = normalizeRole(context.networkRole);

if (
networkRole.includes("architect") ||
networkRole.includes("engineer") ||
networkRole.includes("consultant")
) {
return "consultant";
}

if (
role === "vendor" ||
networkRole.includes("supplier") ||
networkRole.includes("vendor") ||
networkRole.includes("manufacturer") ||
networkRole.includes("distributor") ||
networkRole.includes("trade")
) {
return "vendor";
}

return "owner";
}

function getExperienceLabel(experience: Experience) {
if (experience === "vendor") return "Supplier Workspace";
if (experience === "consultant") return "Consultant Workspace";
return "Executive Workspace";
}

function getWorkspaceHealth(stats: Stats) {
if (stats.unreadNotifications > 8) return "Needs Review";
if (stats.activeRfqs > 0 || stats.awardedContracts > 0) return "Healthy";
return "Ready";
}

function getHealthClass(status: string) {
if (status === "Needs Review") {
return "border-orange-200 bg-orange-50 text-orange-700";
}

if (status === "Healthy") {
return "border-green-200 bg-green-50 text-green-700";
}

return "border-blue-200 bg-blue-50 text-blue-700";
}

function getNavigation(experience: Experience, stats: Stats): NavSection[] {
if (experience === "vendor") {
return [
{
title: "Supplier Command",
items: [
{
label: "Workspace Overview",
href: "/dashboard",
key: "dashboard",
description: "Supplier command view",
badge: "Live",
},
{
label: "Opportunities",
href: "/rfq",
key: "rfq",
description: "Open RFQs and buyer requests",
badge: String(stats.activeRfqs),
},
{
label: "My Quotes",
href: "/vendor-dashboard",
key: "vendor-dashboard",
description: "Submitted pricing and activity",
badge: String(stats.supplierQuotes),
},
],
},
{
title: "Operations",
items: [
{
label: "Activity Center",
href: "/notifications",
key: "notifications",
description: "Updates, alerts, and workflow signals",
badge: String(stats.unreadNotifications),
},
{
label: "Company Command",
href: "/company/settings",
key: "company",
description: "Profile, team, access, and governance",
},
],
},
];
}

if (experience === "consultant") {
return [
{
title: "Consultant Command",
items: [
{
label: "Workspace Overview",
href: "/dashboard",
key: "dashboard",
description: "Consultant workspace view",
badge: "Live",
},
{
label: "Project Opportunities",
href: "/rfq",
key: "rfq",
description: "Open project and procurement activity",
badge: String(stats.activeRfqs),
},
],
},
{
title: "Operations",
items: [
{
label: "Activity Center",
href: "/notifications",
key: "notifications",
description: "Updates, alerts, and messages",
badge: String(stats.unreadNotifications),
},
{
label: "Company Command",
href: "/company/settings",
key: "company",
description: "Profile, team, access, and governance",
},
],
},
];
}

return [
{
title: "Executive",
items: [
{
label: "Command Center",
href: "/dashboard",
key: "dashboard",
description: "Executive procurement overview",
badge: "Live",
},
{
label: "Boardroom Intelligence",
href: "/analytics",
key: "analytics",
description: "Board reporting, executive insights, and procurement intelligence",
badge: "Live",
},
],
},
{
title: "Procurement",
items: [
{
label: "RFQs",
href: "/rfq",
key: "rfq",
description: "Create, manage, and review RFQs",
badge: String(stats.activeRfqs),
},
{
label: "Awards",
href: "/rfq",
key: "awards",
description: "Awarded contracts and outcomes",
badge: String(stats.awardedContracts),
},
],
},
{
title: "Supplier Network",
items: [
{
label: "Supplier Directory",
href: "/directory",
key: "directory",
description: "AVL, suppliers, and partners",
},
{
label: "Quote Activity",
href: "/vendor-dashboard",
key: "quotes",
description: "Supplier quote submissions",
badge: String(stats.supplierQuotes),
},
],
},
{
title: "Operations",
items: [
{
label: "Activity Center",
href: "/notifications",
key: "notifications",
description: "Alerts and workflow signals",
badge: String(stats.unreadNotifications),
},
{
label: "Company Governance",
href: "/company/settings",
key: "company",
description: "Profile, team, roles, and controls",
},
],
},
];
}

export default function Sidebar() {
const pathname = usePathname();
const supabase = useMemo(() => createClient(), []);

const [stats, setStats] = useState<Stats>({
activeRfqs: 0,
unreadNotifications: 0,
awardedContracts: 0,
supplierQuotes: 0,
});

const [context, setContext] = useState<UserContext>({
role: null,
networkRole: null,
companyName: null,
companyStatus: null,
});

const experience = getExperience(context);
const navSections = getNavigation(experience, stats);
const workspaceHealth = getWorkspaceHealth(stats);

useEffect(() => {
async function loadStats() {
const response = await fetch("/api/sidebar-stats", {
cache: "no-store",
});

if (!response.ok) return;

const data = (await response.json()) as Stats;
setStats(data);
}

async function loadUserContext() {
const {
data: { user },
} = await supabase.auth.getUser();

if (!user) return;

const { data: profile } = await supabase
.from("profiles")
.select("role, company_id")
.eq("id", user.id)
.maybeSingle();

if (!profile?.company_id) {
setContext({
role: profile?.role || null,
networkRole: null,
companyName: null,
companyStatus: null,
});
return;
}

const { data: company } = await supabase
.from("companies")
.select("name, network_role, status")
.eq("id", profile.company_id)
.maybeSingle();

setContext({
role: profile.role || null,
networkRole: company?.network_role || null,
companyName: company?.name || null,
companyStatus: company?.status || null,
});
}

loadStats();
loadUserContext();
}, [supabase]);

function isItemActive(href: string) {
if (href === "/company/settings") {
return pathname === href || pathname.startsWith("/company/settings");
}

if (href === "/dashboard") {
return pathname === "/dashboard";
}

return pathname === href || pathname.startsWith(`${href}/`);
}

function renderNavItem(item: NavItem) {
const isActive = isItemActive(item.href);
const hasBadge = Boolean(item.badge && item.badge !== "0");

return (
<Link
key={`${item.key}-${item.href}`}
href={item.href}
className={`group flex items-center justify-between gap-4 rounded-2xl px-4 py-3 transition ${
isActive
? "border border-nexus-border bg-nexus-dark text-nexus-white shadow-nexus"
: "border border-transparent text-slate-700 hover:border-slate-200 hover:bg-slate-50 hover:text-slate-950"
}`}
>
<span className="min-w-0">
<span className="block text-sm font-black">{item.label}</span>

<span
className={`mt-0.5 block text-[11px] font-bold leading-4 ${
isActive ? "text-nexus-muted" : "text-slate-400"
}`}
>
{item.description}
</span>
</span>

{hasBadge ? (
<span
className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-wide ${
isActive
? "bg-white/10 text-nexus-white"
: item.badge === "Ready" || item.badge === "Live"
? "bg-orange-100 text-orange-700"
: "bg-slate-100 text-slate-600"
}`}
>
{item.badge}
</span>
) : null}
</Link>
);
}

return (
<>
<header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 px-5 py-4 backdrop-blur lg:hidden">
<div className="flex items-center justify-between gap-4">
<Link href="/dashboard" className="flex min-w-0 items-center gap-3">
<NexusPavilionMonogram className="h-10 w-10 shrink-0" />

<div className="min-w-0">
<p className="text-[10px] font-black uppercase tracking-[0.3em] text-orange-500">
Nexus Pavilion
</p>

<p className="mt-1 truncate text-sm font-black text-slate-950">
{context.companyName || "Procurement Workspace"}
</p>
</div>
</Link>

<Link
href="/notifications"
className="rounded-full bg-nexus-dark px-4 py-2 text-xs font-black text-white"
>
{stats.unreadNotifications > 0
? `${stats.unreadNotifications} Alerts`
: "Alerts"}
</Link>
</div>

<div className="mt-4 flex gap-2 overflow-x-auto pb-1">
{navSections
.flatMap((section) => section.items)
.slice(0, 6)
.map((item) => {
const isActive = isItemActive(item.href);

return (
<Link
key={`mobile-${item.key}-${item.href}`}
href={item.href}
className={`shrink-0 rounded-full px-4 py-2 text-xs font-black ${
isActive
? "bg-nexus-dark text-white"
: "bg-slate-100 text-slate-700"
}`}
>
{item.label}
</Link>
);
})}
</div>
</header>

<aside className="fixed left-0 top-0 z-40 hidden h-screen w-96 border-r border-slate-200 bg-white px-6 py-7 lg:block">
<Link href="/dashboard" className="flex items-center gap-4">
<NexusPavilionMonogram className="h-14 w-14 shrink-0" />

<div>
<p className="text-xs font-black uppercase tracking-[0.35em] text-orange-500">
Nexus
</p>

<h1 className="mt-1 text-2xl font-black leading-none text-slate-950">
Pavilion
</h1>
</div>
</Link>

<div className="mt-7 overflow-hidden rounded-executive border border-nexus-border bg-nexus-dark bg-nexus-radial p-5 text-white shadow-executive">
<p className="text-xs font-black uppercase tracking-[0.22em] text-orange-400">
Procurement Intelligence
</p>

<h2 className="mt-3 text-2xl font-black leading-tight">
{context.companyName || "Company Workspace"}
</h2>

<div className="mt-4 flex flex-wrap gap-2">
<span className="rounded-full border border-white/10 bg-white/10 px-3 py-1 text-[10px] font-black uppercase tracking-wide text-slate-200">
{getExperienceLabel(experience)}
</span>

<span className="rounded-full border border-green-300/20 bg-green-400/10 px-3 py-1 text-[10px] font-black uppercase tracking-wide text-green-300">
{context.companyStatus || "Verified"}
</span>
</div>

<p className="mt-4 text-xs font-semibold leading-5 text-nexus-muted">
Executive navigation for RFQs, suppliers, quotes, governance,
board intelligence, and procurement command workflows.
</p>

<div className="mt-5 grid grid-cols-2 gap-3">
<Metric label="Active RFQs" value={stats.activeRfqs} />
<Metric label="Awards" value={stats.awardedContracts} />
<Metric label="Quotes" value={stats.supplierQuotes} />
<Metric label="Unread" value={stats.unreadNotifications} />
</div>
</div>

<div className="mt-5 rounded-executive border border-slate-200 bg-slate-50 p-4">
<p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">
Today
</p>

<div className="mt-4 grid grid-cols-3 gap-2">
<TodaySignal label="RFQs" value={stats.activeRfqs} />
<TodaySignal label="Alerts" value={stats.unreadNotifications} />
<TodaySignal label="Awards" value={stats.awardedContracts} />
</div>
</div>

<nav className="mt-6 max-h-[calc(100vh-505px)] space-y-5 overflow-y-auto pr-1">
{navSections.map((section) => (
<div key={section.title}>
<p className="mb-2 px-4 text-[10px] font-black uppercase tracking-[0.25em] text-slate-400">
{section.title}
</p>

<div className="space-y-2">{section.items.map(renderNavItem)}</div>
</div>
))}
</nav>

<div className="absolute bottom-7 left-6 right-6 rounded-executive border border-slate-200 bg-slate-50 p-5">
<div className="flex items-center justify-between gap-4">
<div>
<p className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">
Workspace Health
</p>

<p className="mt-2 text-lg font-black text-slate-950">
{workspaceHealth}
</p>
</div>

<span
className={`rounded-full border px-3 py-1 text-xs font-black ${getHealthClass(
workspaceHealth
)}`}
>
{workspaceHealth}
</span>
</div>

<Link
href="/company/settings"
className="mt-4 inline-flex w-full items-center justify-center rounded-full bg-nexus-dark px-4 py-3 text-xs font-black text-white transition hover:bg-slate-800"
>
Open Company Command Center
</Link>

<div className="mt-4 flex items-center gap-2">
<div className="h-2 w-2 rounded-full bg-green-500" />

<span className="text-xs font-bold text-slate-600">
System Operational
</span>
</div>
</div>
</aside>
</>
);
}

function Metric({ label, value }: { label: string; value: number }) {
return (
<div className="rounded-2xl border border-white/10 bg-white/10 p-3">
<p className="text-[10px] font-bold uppercase text-white/50">{label}</p>
<p className="mt-1 text-lg font-black text-white">{value}</p>
</div>
);
}

function TodaySignal({ label, value }: { label: string; value: number }) {
return (
<div className="rounded-2xl border border-slate-200 bg-white p-3 text-center shadow-sm">
<p className="text-[10px] font-black uppercase tracking-wide text-slate-400">
{label}
</p>

<p className="mt-1 text-lg font-black text-slate-950">{value}</p>
</div>
);
}