import Link from "next/link";

export default function Footer() {
return (
<footer className="mt-20 border-t border-slate-200 bg-white">
<div className="mx-auto max-w-7xl px-8 py-16">
<div className="grid gap-12 md:grid-cols-4">
<div>
<h3 className="text-xl font-black text-slate-950">
Nexus Pavilion
</h3>

<p className="mt-4 text-sm leading-7 text-slate-600">
AI-powered procurement intelligence platform connecting buyers,
suppliers, and enterprise procurement teams.
</p>
</div>

<div>
<h4 className="text-sm font-black uppercase tracking-[0.2em] text-slate-500">
Platform
</h4>

<div className="mt-4 flex flex-col gap-3">
<Link href="/dashboard" className="text-slate-700 hover:text-black">
Dashboard
</Link>

<Link href="/rfq" className="text-slate-700 hover:text-black">
RFQs
</Link>

<Link href="/analytics" className="text-slate-700 hover:text-black">
Analytics
</Link>

<Link href="/directory" className="text-slate-700 hover:text-black">
Directory
</Link>
</div>
</div>

<div>
<h4 className="text-sm font-black uppercase tracking-[0.2em] text-slate-500">
Company
</h4>

<div className="mt-4 flex flex-col gap-3">
<Link href="/about" className="text-slate-700 hover:text-black">
About
</Link>

<Link href="/contact" className="text-slate-700 hover:text-black">
Contact
</Link>

<Link href="/privacy" className="text-slate-700 hover:text-black">
Privacy Policy
</Link>

<Link href="/terms" className="text-slate-700 hover:text-black">
Terms of Service
</Link>
</div>
</div>

<div>
<h4 className="text-sm font-black uppercase tracking-[0.2em] text-slate-500">
Intelligence
</h4>

<div className="mt-4 flex flex-col gap-3">
<Link
href="/vendor-dashboard"
className="text-slate-700 hover:text-black"
>
Vendor Intelligence
</Link>

<Link
href="/analytics"
className="text-slate-700 hover:text-black"
>
Procurement Intelligence
</Link>

<Link
href="/connections"
className="text-slate-700 hover:text-black"
>
Supplier Network
</Link>
</div>
</div>
</div>

<div className="mt-12 border-t border-slate-200 pt-8">
<p className="text-sm text-slate-500">
© {new Date().getFullYear()} Nexus Pavilion. All rights reserved.
</p>
</div>
</div>
</footer>
);
}