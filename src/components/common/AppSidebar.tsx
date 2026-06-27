import Link from "next/link";

import { NexusPavilionLogo } from "@/components/branding/nexus-pavilion-logo";

export default function AppSidebar() {
return (
<aside className="min-h-screen w-64 border-r border-white/10 bg-[#061426] px-5 py-7 text-white">
<Link
href="/dashboard"
className="block rounded-2xl border border-white/10 bg-white/[0.035] px-4 py-4 transition hover:bg-white/[0.055]"
>
<NexusPavilionLogo variant="horizontal" size={58} priority />

<p className="mt-4 text-[9px] font-black uppercase tracking-[0.24em] text-[#C8A646]">
Intelligence Converges
</p>

<p className="mt-1 text-xs font-semibold text-slate-400">
Decisions Deliver.
</p>
</Link>

<nav className="mt-8 space-y-2">
<AppSidebarLink href="/dashboard" label="Executive Dashboard" active />
<AppSidebarLink href="/analytics" label="Boardroom Intelligence" />
<AppSidebarLink href="/rfq" label="RFQ & Sourcing" />
<AppSidebarLink href="/directory" label="Supplier Intelligence" />
<AppSidebarLink href="/notifications" label="Activity Center" />

<div className="pt-5">
<p className="px-3 text-[10px] font-black uppercase tracking-[0.24em] text-[#C8A646]">
Governance
</p>

<div className="mt-3 space-y-2">
<AppSidebarLink
href="/company/settings"
label="Company Command"
/>
<AppSidebarLink href="/contact" label="Support & Contact" />
</div>
</div>

<div className="pt-5">
<p className="px-3 text-[10px] font-black uppercase tracking-[0.24em] text-slate-500">
Platform Status
</p>

<div className="mt-3 rounded-2xl border border-emerald-300/15 bg-emerald-400/10 px-4 py-3">
<p className="text-xs font-black text-emerald-300">Available</p>
<p className="mt-1 text-xs font-semibold leading-5 text-slate-400">
Core procurement workspace is active. Advanced intelligence
modules display confidence states when data is insufficient.
</p>
</div>
</div>
</nav>
</aside>
);
}

function AppSidebarLink({
href,
label,
active = false,
}: {
href: string;
label: string;
active?: boolean;
}) {
return (
<Link
href={href}
className={[
"block rounded-xl px-3 py-2.5 text-sm font-bold transition",
active
? "bg-[#0B3D91]/45 text-white ring-1 ring-[#2CC4E8]/25"
: "text-slate-300 hover:bg-white/[0.055] hover:text-white",
].join(" ")}
>
{label}
</Link>
);
}