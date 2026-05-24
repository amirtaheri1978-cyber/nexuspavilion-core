import Link from "next/link";

export default function AppSidebar() {
return (
<aside className="min-h-screen w-64 bg-slate-950 px-6 py-8 text-white">
<div>
<h2 className="text-xl font-bold tracking-tight">
Nexus Pavilion
</h2>

<p className="mt-1 text-xs text-slate-400">
Sandbox Workspace
</p>
</div>

<nav className="mt-10 space-y-2">
<Link
href="/dashboard"
className="block rounded-lg px-3 py-2 text-sm font-medium text-slate-200 transition hover:bg-slate-900 hover:text-white"
>
Dashboard
</Link>

<Link
href="/connections"
className="block rounded-lg px-3 py-2 text-sm font-medium text-slate-200 transition hover:bg-slate-900 hover:text-white"
>
Connections Directory
</Link>

<Link
href="/dashboard"
className="block rounded-lg px-3 py-2 text-sm font-medium text-slate-400 transition hover:bg-slate-900 hover:text-white"
>
Market Insights
</Link>

<div className="pt-4">
<p className="px-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
Locked Systems
</p>

<div className="mt-2 space-y-2">
<div className="rounded-lg px-3 py-2 text-sm text-slate-500">
🔒 Project Matrix Locked
</div>

<Link
href="/rfq"
className="block rounded-lg px-3 py-2 text-sm text-slate-400 transition hover:bg-slate-900 hover:text-white"
>
🔒 RFQ Manager Locked
</Link>

<div className="rounded-lg px-3 py-2 text-sm text-slate-500">
🔒 Blueprint Center Locked
</div>
</div>
</div>

<Link
href="/verify"
className="block rounded-lg px-3 py-2 text-sm font-medium text-slate-200 transition hover:bg-slate-900 hover:text-white"
>
Support & Contact
</Link>
</nav>
</aside>
);
}