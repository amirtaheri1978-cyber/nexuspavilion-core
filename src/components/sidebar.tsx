"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

type Stats = {
activeRfqs: number;
unreadNotifications: number;
awardedContracts: number;
supplierQuotes: number;
};

type NavItem = {
label: string;
href: string;
key: string;
description: string;
};

const primaryNavItems: NavItem[] = [
{
label: "Dashboard",
href: "/dashboard",
key: "dashboard",
description: "Command center",
},
{
label: "Analytics",
href: "/analytics",
key: "analytics",
description: "Executive intelligence",
},
{
label: "RFQ Marketplace",
href: "/rfq",
key: "rfq",
description: "Procurement opportunities",
},
{
label: "Notifications",
href: "/notifications",
key: "notifications",
description: "Activity center",
},
];

const workspaceNavItems: NavItem[] = [
{
label: "Company Account",
href: "/company/settings",
key: "company-account",
description: "Profile, team, security",
},
{
label: "Vendor Dashboard",
href: "/vendor-dashboard",
key: "vendor",
description: "Supplier performance",
},
{
label: "Directory",
href: "/directory",
key: "directory",
description: "Company network",
},
];

export default function Sidebar() {
const pathname = usePathname();

const [stats, setStats] = useState<Stats>({
activeRfqs: 0,
unreadNotifications: 0,
awardedContracts: 0,
supplierQuotes: 0,
});

useEffect(() => {
async function loadStats() {
const response = await fetch("/api/sidebar-stats", {
cache: "no-store",
});

if (!response.ok) return;

const data = (await response.json()) as Stats;
setStats(data);
}

loadStats();
}, []);

function getBadge(key: string) {
if (key === "dashboard") return "Live";
if (key === "analytics") return "AI";
if (key === "rfq") return String(stats.activeRfqs);
if (key === "notifications") return String(stats.unreadNotifications);
if (key === "company-account") return "Account";

return null;
}

function isItemActive(href: string) {
if (href === "/company/settings") {
return pathname === href || pathname.startsWith("/company/settings");
}

if (href === "/company") {
return pathname === href || pathname.startsWith("/company/");
}

return pathname === href || pathname.startsWith(`${href}/`);
}

function renderNavItem(item: NavItem) {
const isActive = isItemActive(item.href);
const badge = getBadge(item.key);

return (
<Link
key={item.href}
href={item.href}
className={`group flex items-center justify-between rounded-2xl px-4 py-3 transition ${
isActive
? "bg-slate-950 text-white"
: "text-slate-700 hover:bg-slate-100 hover:text-slate-950"
}`}
>
<span>
<span className="block text-sm font-black">{item.label}</span>
<span
className={`mt-0.5 block text-[11px] font-bold ${
isActive ? "text-white/60" : "text-slate-400"
}`}
>
{item.description}
</span>
</span>

{badge ? (
<span
className={`rounded-full px-2 py-1 text-[10px] font-black uppercase tracking-wide ${
isActive ? "bg-white/20 text-white" : "bg-orange-100 text-orange-700"
}`}
>
{badge}
</span>
) : null}
</Link>
);
}

return (
<aside className="fixed left-0 top-0 z-40 hidden h-screen w-72 border-r border-slate-200 bg-white px-6 py-8 lg:block">
<Link href="/dashboard" className="block">
<p className="text-xs font-black uppercase tracking-[0.35em] text-orange-500">
Nexus
</p>

<h1 className="mt-2 text-2xl font-black text-slate-950">Pavilion</h1>
</Link>

<div className="mt-6 rounded-2xl bg-gradient-to-br from-orange-500 to-orange-600 p-5 text-white">
<p className="text-xs font-bold uppercase tracking-[0.2em] text-white/70">
Procurement OS
</p>

<h2 className="mt-2 text-lg font-black">Executive Workspace</h2>

<div className="mt-4 grid grid-cols-2 gap-3 text-xs">
<div>
<p className="text-white/60">Active RFQs</p>
<p className="text-lg font-black">{stats.activeRfqs}</p>
</div>

<div>
<p className="text-white/60">Awards</p>
<p className="text-lg font-black">{stats.awardedContracts}</p>
</div>

<div>
<p className="text-white/60">Quotes</p>
<p className="text-lg font-black">{stats.supplierQuotes}</p>
</div>

<div>
<p className="text-white/60">Unread</p>
<p className="text-lg font-black">{stats.unreadNotifications}</p>
</div>
</div>
</div>

<nav className="mt-8 space-y-6">
<div>
<p className="mb-2 px-4 text-[10px] font-black uppercase tracking-[0.25em] text-slate-400">
Operations
</p>

<div className="space-y-2">{primaryNavItems.map(renderNavItem)}</div>
</div>

<div>
<p className="mb-2 px-4 text-[10px] font-black uppercase tracking-[0.25em] text-slate-400">
Workspace
</p>

<div className="space-y-2">{workspaceNavItems.map(renderNavItem)}</div>
</div>
</nav>

<div className="absolute bottom-8 left-6 right-6 rounded-3xl bg-slate-100 p-5">
<p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500">
Workspace Access
</p>

<p className="mt-2 text-sm font-semibold text-slate-700">
Manage your company account, team access, invitations, and governance.
</p>

<Link
href="/company/settings"
className="mt-4 inline-flex w-full items-center justify-center rounded-full bg-slate-950 px-4 py-3 text-xs font-black text-white transition hover:bg-slate-800"
>
Open Company Account
</Link>

<div className="mt-4 flex items-center gap-2">
<div className="h-2 w-2 rounded-full bg-green-500" />

<span className="text-xs font-bold text-slate-600">
System Operational
</span>
</div>
</div>
</aside>
);
}