export default function AppSidebar() {
return (
<aside className="w-[260px] min-h-screen bg-[#111827] text-white p-6">
<h2 className="text-xl font-bold tracking-tight">Nexus Pavilion</h2>

<p className="mt-2 text-xs text-slate-400">
Sandbox Workspace
</p>

<nav className="mt-8 flex flex-col gap-4 text-sm">
<a className="opacity-100 font-medium">Dashboard</a>
<a className="opacity-70">Connections Directory</a>
<a className="opacity-70">Market Insights</a>
<a className="opacity-40 cursor-not-allowed">Project Matrix Locked</a>
<a className="opacity-40 cursor-not-allowed">RFQ Manager Locked</a>
<a className="opacity-40 cursor-not-allowed">Blueprint Center Locked</a>
<a className="opacity-70">Support & Contact</a>
</nav>
</aside>
);
}