export default function DashboardPage() {
return (
<main className="flex min-h-screen bg-[#f4f4f4] font-sans">

{/* ZONE A: AppSidebar - سایدبار تیره مطابق رنگ انتخابی شما */}
<aside className="w-[250px] bg-[#111827] p-[30px] text-white flex flex-col gap-4">
<h2 className="text-xl font-bold tracking-tight mb-2">Nexus Pavilion</h2>
<p className="text-sm font-medium opacity-90 cursor-pointer hover:opacity-100 transition-opacity">Dashboard</p>
<p className="text-sm font-medium opacity-70 cursor-pointer hover:opacity-100 transition-opacity">Projects</p>
<p className="text-sm font-medium opacity-70 cursor-pointer hover:opacity-100 transition-opacity">Governance</p>
<p className="text-sm font-medium opacity-70 cursor-pointer hover:opacity-100 transition-opacity">AI Engine</p>
</aside>

{/* ZONE C: Main Workspace Canvas */}
<section className="flex-1 p-[40px]">
<h1 className="text-3xl font-bold tracking-tight text-slate-900">Executive Dashboard</h1>
<p className="mt-2 text-slate-600">Sandbox operational environment is now active.</p>

{/* System Status Block */}
<div className="mt-[30px] rounded-[12px] bg-white p-[20px] shadow-sm border border-slate-100">
<h3 className="text-lg font-semibold text-slate-900">System Status</h3>
<p className="mt-1 text-sm font-medium text-emerald-600">AI Governance Core Online</p>
</div>
</section>

</main>
);
} 