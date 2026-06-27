import Link from "next/link";

import { NexusPavilionLogo } from "@/components/branding/nexus-pavilion-logo";

export default function AppTopbar() {
return (
<header className="flex h-[76px] items-center justify-between border-b border-white/10 bg-[#07111F]/95 px-8 text-white backdrop-blur">
<div className="flex min-w-0 items-center gap-4">
<NexusPavilionLogo
className="hidden shrink-0 xl:flex"
variant="icon"
size={38}
/>

<div className="min-w-0">
<p className="text-[10px] font-black uppercase tracking-[0.28em] text-[#C8A646]">
Executive Command
</p>

<h1 className="mt-1 truncate text-lg font-black text-white">
Boardroom Intelligence
</h1>
</div>
</div>

<div className="flex items-center gap-3">
<div className="hidden w-[360px] items-center rounded-full border border-white/10 bg-white/[0.05] px-4 py-2 lg:flex">
<input
className="w-full bg-transparent text-sm font-semibold text-slate-200 outline-none placeholder:text-slate-500"
placeholder="Search RFQs, suppliers, companies..."
/>
</div>

<Link
href="/notifications"
className="rounded-full border border-[#C8A646]/25 bg-[#C8A646]/10 px-4 py-2 text-xs font-black uppercase tracking-wide text-[#F5D77B] transition hover:bg-[#C8A646]/15"
>
Alerts
</Link>

<Link
href="/analytics"
className="rounded-full border border-[#2CC4E8]/25 bg-[#2CC4E8]/10 px-4 py-2 text-xs font-black uppercase tracking-wide text-[#9BE8F8] transition hover:bg-[#2CC4E8]/15"
>
Boardroom
</Link>

<div className="hidden items-center gap-2 rounded-full border border-emerald-300/20 bg-emerald-400/10 px-3 py-2 lg:flex">
<span className="h-2 w-2 rounded-full bg-emerald-400" />
<span className="text-[10px] font-black uppercase tracking-wide text-emerald-300">
Live
</span>
</div>

<div className="flex items-center gap-3 rounded-full border border-white/10 bg-white/[0.05] px-3 py-2">
<NexusPavilionLogo variant="icon" size={32} />

<div className="hidden xl:block">
<p className="text-xs font-black text-white">
Executive Workspace
</p>
<p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">
Verified Access
</p>
</div>
</div>
</div>
</header>
);
}