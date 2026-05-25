import Link from "next/link";

export default function CompanyPage() {
return (
<main className="min-h-screen bg-slate-100 px-6 py-12">
<div className="mx-auto max-w-5xl rounded-3xl bg-white p-10 shadow-sm">
<p className="text-sm font-semibold uppercase tracking-[0.25em] text-orange-500">
Enterprise Profile
</p>

<h1 className="mt-3 text-5xl font-black text-slate-950">
Company Hub
</h1>

<p className="mt-4 text-lg text-slate-600">
Manage company profiles, public directory visibility, procurement RFQs,
and supplier network activity.
</p>

<div className="mt-10 grid gap-5 md:grid-cols-2">
<Link href="/directory" className="rounded-2xl bg-slate-50 p-6 font-bold">
Public Directory →
</Link>

<Link href="/connections" className="rounded-2xl bg-slate-50 p-6 font-bold">
My Enterprise Network →
</Link>

<Link href="/rfq" className="rounded-2xl bg-slate-50 p-6 font-bold">
RFQ Marketplace →
</Link>

<Link href="/vendor-dashboard" className="rounded-2xl bg-slate-50 p-6 font-bold">
Vendor Dashboard →
</Link>
</div>
</div>
</main>
);
}