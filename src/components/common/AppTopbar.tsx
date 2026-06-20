import Link from "next/link";

export default function AppTopbar() {
return (
<header className="flex h-[76px] items-center justify-between border-b border-slate-200 bg-white/95 px-8 backdrop-blur">
<div>
<p className="text-[10px] font-black uppercase tracking-[0.28em] text-orange-500">
Executive Command
</p>

<h1 className="mt-1 text-lg font-black text-slate-950">
Boardroom Intelligence
</h1>
</div>

<div className="flex items-center gap-4">
<div className="hidden w-80 items-center rounded-full border border-slate-200 bg-slate-50 px-4 py-2 lg:flex">
<input
className="w-full bg-transparent text-sm font-semibold text-slate-700 outline-none placeholder:text-slate-400"
placeholder="Search RFQs, suppliers, reports..."
/>
</div>

<Link
href="/notifications"
className="rounded-full border border-orange-200 bg-orange-50 px-4 py-2 text-xs font-black uppercase tracking-wide text-orange-700"
>
Alerts
</Link>

<Link
href="/analytics"
className="rounded-full bg-slate-950 px-4 py-2 text-xs font-black uppercase tracking-wide text-white"
>
Boardroom
</Link>

<div className="flex items-center gap-3 rounded-full border border-slate-200 bg-slate-50 px-3 py-2">
<div className="h-8 w-8 rounded-full bg-slate-950" />

<div className="hidden xl:block">
<p className="text-xs font-black text-slate-950">
Executive Workspace
</p>
<p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
System Live
</p>
</div>
</div>
</div>
</header>
);
}