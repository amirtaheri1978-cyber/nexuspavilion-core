export default function AppTopbar() {
return (
<header className="h-[64px] border-b border-slate-200 bg-white flex items-center justify-between px-8">
<div>
<p className="text-sm text-slate-500">Organization / Home</p>
</div>

<div className="flex items-center gap-4">
<input
className="border border-slate-300 rounded-lg px-3 py-2 text-sm"
placeholder="Search network..."
/>

<div className="h-9 w-9 rounded-full bg-slate-200" />
</div>
</header>
);
} 