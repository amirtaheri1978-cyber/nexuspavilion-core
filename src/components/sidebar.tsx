"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";

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
};

type Experience = "owner" | "vendor" | "consultant";

type NavItem = {
label: string;
href: string;
key: string;
description: string;
};

const OWNER_NAV: NavItem[] = [
{
label: "Executive Overview",
href: "/dashboard",
key: "dashboard",
description: "Business command view",
},
{
label: "Procurement",
href: "/rfq",
key: "rfq",
description: "RFQs and awards",
},
{
label: "Supplier Network",
href: "/directory",
key: "directory",
description: "Qualified companies",
},
{
label: "Intelligence",
href: "/analytics",
key: "analytics",
description: "Performance insights",
},
{
label: "Activity Center",
href: "/notifications",
key: "notifications",
description: "Updates and alerts",
},
{
label: "Company",
href: "/company/settings",
key: "company",
description: "Profile and team access",
},
];

const VENDOR_NAV: NavItem[] = [
{
label: "Executive Overview",
href: "/dashboard",
key: "dashboard",
description: "Supplier workspace",
},
{
label: "Opportunities",
href: "/rfq",
key: "rfq",
description: "Open procurement",
},
{
label: "My Quotes",
href: "/vendor-dashboard",
key: "vendor-dashboard",
description: "Submitted pricing",
},
{
label: "Activity Center",
href: "/notifications",
key: "notifications",
description: "Updates and alerts",
},
{
label: "Company",
href: "/company/settings",
key: "company",
description: "Profile and team access",
},
];

const CONSULTANT_NAV: NavItem[] = [
{
label: "Executive Overview",
href: "/dashboard",
key: "dashboard",
description: "Advisory workspace",
},
{
label: "Opportunities",
href: "/rfq",
key: "rfq",
description: "Project opportunities",
},
{
label: "Activity Center",
href: "/notifications",
key: "notifications",
description: "Updates and alerts",
},
{
label: "Company",
href: "/company/settings",
key: "company",
description: "Profile and team access",
},
];

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

if (role === "vendor") {
return "vendor";
}

return "owner";
}

function getNavigation(experience: Experience) {
if (experience === "vendor") return VENDOR_NAV;
if (experience === "consultant") return CONSULTANT_NAV;
return OWNER_NAV;
}

function getExperienceLabel(experience: Experience) {
if (experience === "vendor") return "Supplier Workspace";
if (experience === "consultant") return "Advisory Workspace";
return "Executive Workspace";
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
});

const experience = getExperience(context);
const navItems = getNavigation(experience);

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
});
return;
}

const { data: company } = await supabase
.from("companies")
.select("network_role")
.eq("id", profile.company_id)
.maybeSingle();

setContext({
role: profile.role || null,
networkRole: company?.network_role || null,
});
}

loadStats();
loadUserContext();
}, [supabase]);

function getBadge(key: string) {
if (key === "dashboard") return "Live";
if (key === "analytics") return "AI";
if (key === "rfq") return String(stats.activeRfqs);
if (key === "notifications") return String(stats.unreadNotifications);
if (key === "vendor-dashboard") return String(stats.supplierQuotes);

return null;
}

function isItemActive(href: string) {
if (href === "/company/settings") {
return pathname === href || pathname.startsWith("/company/settings");
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
? "bg-slate-950 text-white shadow-sm"
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

<div className="mt-6 rounded-3xl bg-gradient-to-br from-orange-500 to-orange-600 p-5 text-white shadow-sm">
<p className="text-xs font-bold uppercase tracking-[0.2em] text-white/70">
Procurement OS
</p>

<h2 className="mt-2 text-lg font-black">
{getExperienceLabel(experience)}
</h2>

<div className="mt-4 grid grid-cols-2 gap-3 text-xs">
<Metric label="Active RFQs" value={stats.activeRfqs} />
<Metric label="Awards" value={stats.awardedContracts} />
<Metric label="Quotes" value={stats.supplierQuotes} />
<Metric label="Unread" value={stats.unreadNotifications} />
</div>
</div>

<nav className="mt-8 space-y-6">
<div>
<p className="mb-2 px-4 text-[10px] font-black uppercase tracking-[0.25em] text-slate-400">
Platform
</p>

<div className="space-y-2">{navItems.map(renderNavItem)}</div>
</div>
</nav>

<div className="absolute bottom-8 left-6 right-6 rounded-3xl bg-slate-100 p-5">
<p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500">
Company
</p>

<p className="mt-2 text-sm font-semibold leading-6 text-slate-700">
Manage company profile, team access, invitations, ownership, and
activity.
</p>

<Link
href="/company/settings"
className="mt-4 inline-flex w-full items-center justify-center rounded-full bg-slate-950 px-4 py-3 text-xs font-black text-white transition hover:bg-slate-800"
>
Open Company Profile
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

function Metric({ label, value }: { label: string; value: number }) {
return (
<div>
<p className="text-white/60">{label}</p>
<p className="text-lg font-black">{value}</p>
</div>
);
}