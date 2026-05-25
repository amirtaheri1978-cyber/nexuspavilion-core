import Link from "next/link";

const navItems = [
{ label: "Dashboard", href: "/dashboard" },
{ label: "Analytics", href: "/analytics" },
{ label: "RFQ Marketplace", href: "/rfq" },
{ label: "Vendor Dashboard", href: "/vendor-dashboard" },
{ label: "Company Hub", href: "/company" },
{ label: "Directory", href: "/directory" },
];

export default function Sidebar() {
return (
<aside className="fixed left-0 top-0 z-40 hidden h-screen w-72 border-r border-slate-200 bg-white px-6 py-8 lg:block">
<Link href="/dashboard" className="block">
<p className="text-xs font-black uppercase tracking-[0.35em] text-orange-500">
Nexus
</p>

<h1 className="mt-2 text-2xl font-black text-slate-950">
Pavilion
</h1>
</Link>

<nav className="mt-10 space-y-2">
{navItems.map((item) => (
<Link
key={item.href}
href={item.href}
className="block rounded-2xl px-4 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-100 hover:text-slate-950"
>
{item.label}
</Link>
))}
</nav>

<div className="absolute bottom-8 left-6 right-6 rounded-3xl bg-slate-100 p-5">
<p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500">
Founder Mode
</p>

<p className="mt-2 text-sm font-semibold text-slate-700">
Building the digital construction ecosystem.
</p>
</div>
</aside>
);
}