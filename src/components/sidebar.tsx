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

type UserContext = {
role: string | null;
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

function getNavigation(experience: Experience, stats: Stats): NavSection[] {
if (experience === "vendor") {
return [
{
title: "Supplier Command",
items: [
{
label: "Workspace",
href: "/dashboard",
key: "dashboard",
description: "Supplier operating view",
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
description: "Submitted quote activity",
badge: String(stats.supplierQuotes),
},
],
},
{
title: "Governance",
items: [
{
label: "Activity Center",
href: "/notifications",
key: "notifications",
description: "Updates and workflow signals",
badge: String(stats.unreadNotifications),
},
{
label: "Company Command",
href: "/company/settings",
key: "company",
description: "Profile, team, access, governance",
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
label: "Workspace",
href: "/dashboard",
key: "dashboard",
description: "Consultant operating view",
badge: "Live",
},
{
label: "Project Opportunities",
href: "/rfq",
key: "rfq",
description: "Open procurement activity",
badge: String(stats.activeRfqs),
},
],
},
{
title: "Governance",
items: [
{
label: "Activity Center",
href: "/notifications",
key: "notifications",
description: "Updates, alerts, messages",
badge: String(stats.unreadNotifications),
},
{
label: "Company Command",
href: "/company/settings",
key: "company",
description: "Profile, team, access, governance",
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
description: "CEO actions, risk, board reporting",
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
description: "Create, manage, review RFQs",
badge: String(stats.activeRfqs),
},
{
label: "Awards",
href: "/rfq",
key: "awards",
description: "Awarded contracts and outcomes",
badge: String(stats.awardedContracts),
},
{
label: "Supplier Network",
href: "/directory",
key: "directory",
description: "AVL, suppliers, partners",
},
],
},
{
title: "Governance",
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
description: "Profile, team, roles, controls",
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

useEffect(() => {
async function loadStats() {
const response = await fetch("/api/sidebar-stats", { cache: "no-store" });
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
if (href === "/dashboard") return pathname === "/dashboard";
return pathname === href || pathname.startsWith(`${href}/`);
}

function renderNavItem(item: NavItem) {
const isActive = isItemActive(item.href);
const hasBadge = Boolean(item.badge && item.badge !== "0");

return (
<Link
key={`${item.key}-${item.href}`}
href={item.href}
className={[
"group flex items-center justify-between gap-4 rounded-[22px] border px-4 py-3.5 transition",
isActive
? "border-nexus-gold/35 bg-nexus-gold/10 text-nexus-white shadow-inner-executive"
: "border-white/10 bg-white/[0.025] text-slate-300 hover:border-white/20 hover:bg-white/[0.07] hover:text-white",
].join(" ")}
>
<span className="min-w-0">
<span className="block text-[15px] font-black leading-5">
{item.label}
</span>

<span className="mt-1 block text-[11px] font-semibold leading-4 text-slate-500">
{item.description}
</span>
</span>

{hasBadge ? (
<span
className={[
"shrink-0 rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-wide",
item.badge === "Live"
? "border-emerald-300/20 bg-emerald-400/10 text-emerald-300"
: "border-white/10 bg-white/10 text-white",
].join(" ")}
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
<NexusPavilionMonogram className="h-10 w-10 shrink-0" variant="flat" />

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
className={[
"shrink-0 rounded-full px-4 py-2 text-xs font-black",
isActive
? "bg-nexus-dark text-white"
: "bg-slate-100 text-slate-700",
].join(" ")}
>
{item.label}
</Link>
);
})}
</div>
</header>

<aside className="fixed left-0 top-0 z-40 hidden h-screen w-[360px] border-r border-nexus-border bg-nexus-dark text-nexus-white shadow-executive lg:flex lg:flex-col">
<div className="relative overflow-hidden border-b border-white/10 px-7 py-8">
<div className="pointer-events-none absolute -right-16 -top-20 h-48 w-48 rounded-full bg-nexus-cobalt/10 blur-3xl" />
<div className="pointer-events-none absolute -left-16 bottom-0 h-40 w-40 rounded-full bg-nexus-gold/10 blur-3xl" />

<Link href="/dashboard" className="relative z-10 block">
<div className="mx-auto flex h-12 w-12 items-center justify-center rounded-[36px] border border-white/10 bg-white/[0.075] shadow-nexus">
<NexusPavilionMonogram className="h-24 w-24" variant="full" />
</div>

<div className="mt-5 text-center">
<p className="text-base font-black uppercase tracking-[0.48em] text-nexus-gold">
Nexus
</p>

<h1 className="mt-2 text-4xl font-black uppercase leading-none tracking-[0.16em] text-white">
Pavilion
</h1>

<p className="mx-auto mt-4 max-w-[260px] text-[10px] font-black uppercase leading-5 tracking-[0.18em] text-slate-400">
Enterprise Procurement Intelligence
</p>
</div>
</Link>
</div>

<div className="border-b border-white/10 px-6 py-4">
<p className="text-[10px] font-black uppercase tracking-[0.26em] text-nexus-gold">
Workspace
</p>

<div className="mt-2 flex items-center justify-between gap-3">
<div className="min-w-0">
<p className="truncate text-sm font-black text-white">
{context.companyName || "Company Workspace"}
</p>

<p className="mt-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
{getExperienceLabel(experience)}
</p>
</div>

<StatusPill tone="success">
{context.companyStatus || "Verified"}
</StatusPill>
</div>
</div>

<nav className="flex-1 overflow-y-auto px-5 py-5">
<div className="space-y-6">
{navSections.map((section) => (
<div key={section.title}>
<p className="mb-3 px-2 text-[10px] font-black uppercase tracking-[0.28em] text-nexus-gold">
{section.title}
</p>

<div className="space-y-2.5">{section.items.map(renderNavItem)}</div>
</div>
))}
</div>
</nav>

<div className="border-t border-white/10 bg-black/20 px-5 py-4">
<div className="rounded-[24px] border border-white/10 bg-white/[0.05] p-4">
<div className="flex items-center justify-between gap-4">
<div>
<p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-500">
System
</p>

<p className="mt-1 text-sm font-black text-white">
Operational
</p>
</div>

<StatusPill tone="success">Live</StatusPill>
</div>

<div className="mt-4 grid grid-cols-2 gap-2">
<FooterLink href="/company/settings">Company</FooterLink>
<FooterLink href="/notifications">Activity</FooterLink>
</div>
</div>
</div>
</aside>
</>
);
}

function StatusPill({
children,
tone = "neutral",
}: {
children: React.ReactNode;
tone?: "neutral" | "success" | "warning";
}) {
const toneClass =
tone === "success"
? "border-emerald-300/20 bg-emerald-400/10 text-emerald-300"
: tone === "warning"
? "border-orange-300/20 bg-orange-400/10 text-orange-300"
: "border-white/10 bg-white/10 text-white";

return (
<span
className={`rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-wide ${toneClass}`}
>
{children}
</span>
);
}

function FooterLink({
href,
children,
}: {
href: string;
children: React.ReactNode;
}) {
return (
<Link
href={href}
className="inline-flex items-center justify-center rounded-full border border-white/10 bg-white/[0.06] px-3 py-2 text-[10px] font-black uppercase tracking-wide text-slate-300 transition hover:bg-white/10 hover:text-white"
>
{children}
</Link>
);
}