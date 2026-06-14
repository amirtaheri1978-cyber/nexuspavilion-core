import Link from "next/link";
import ContactForm from "@/components/contact-form";

const trustCapabilities = [
"RFQ Management",
"Supplier Intelligence",
"Executive Reporting",
"Procurement Analytics",
];

const nextSteps = [
"Request reviewed by the Nexus Pavilion team.",
"Relevant procurement or platform specialist assigned.",
"Response sent by email with the next recommended action.",
];

export default function ContactPage() {
return (
<main className="min-h-screen bg-[#f6f6f3] px-4 py-6 text-slate-950 sm:px-6 lg:px-8 lg:py-10">
<div className="mx-auto max-w-7xl">
<Link
href="/"
className="inline-flex items-center text-sm font-bold text-slate-500 transition hover:text-slate-950"
>
← Back to Home
</Link>

<section className="mt-6 overflow-hidden rounded-[36px] border border-black/5 bg-white shadow-sm">
<div className="grid lg:grid-cols-[1.2fr_0.8fr]">
<div className="p-6 sm:p-9 lg:p-14">
<p className="text-xs font-black uppercase tracking-[0.32em] text-orange-500">
Contact Nexus Pavilion
</p>

<h1 className="mt-5 max-w-4xl text-5xl font-black tracking-[-0.055em] text-slate-950 sm:text-6xl lg:text-7xl">
Make better procurement decisions.
</h1>

<p className="mt-6 max-w-2xl text-base leading-8 text-slate-600 sm:text-lg">
Enterprise procurement intelligence, supplier evaluation, RFQ
management, and executive reporting in a single decision-ready
platform.
</p>

<div className="mt-8 grid gap-3 sm:grid-cols-2 lg:max-w-2xl">
{trustCapabilities.map((item) => (
<div
key={item}
className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3 text-sm font-black text-slate-900"
>
✓ {item}
</div>
))}
</div>
</div>

<aside className="bg-slate-950 p-6 text-white sm:p-8 lg:p-10">
<p className="text-xs font-black uppercase tracking-[0.32em] text-slate-400">
What happens next
</p>

<h2 className="mt-4 text-2xl font-black tracking-[-0.03em]">
Your request is routed for review.
</h2>

<div className="mt-6 space-y-3">
{nextSteps.map((step, index) => (
<div
key={step}
className="flex gap-3 rounded-2xl border border-white/10 bg-white/[0.04] p-4"
>
<div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white text-xs font-black text-slate-950">
{index + 1}
</div>
<p className="text-sm leading-6 text-slate-200">{step}</p>
</div>
))}
</div>
</aside>
</div>
</section>

<section className="mt-6 grid gap-6 lg:grid-cols-[0.32fr_0.68fr]">
<aside className="rounded-[32px] border border-black/5 bg-white p-6 shadow-sm sm:p-8">
<p className="text-xs font-black uppercase tracking-[0.32em] text-slate-400">
Direct contact
</p>

<h2 className="mt-4 text-2xl font-black tracking-[-0.03em] text-slate-950">
Enterprise inquiry channel.
</h2>

<div className="mt-6 space-y-3">
<InfoRow label="Email" value="a.mirtaheri1978@gmail.com" />
<InfoRow
label="Platform"
value="Nexus Pavilion Procurement Intelligence"
/>
</div>

<div className="mt-7 grid gap-3">
<Link
href="/register"
className="inline-flex w-full items-center justify-center rounded-full bg-slate-950 px-6 py-3 text-sm font-black text-white transition hover:bg-slate-800"
>
Join Network
</Link>

<Link
href="/directory"
className="inline-flex w-full items-center justify-center rounded-full bg-slate-100 px-6 py-3 text-sm font-black text-slate-950 transition hover:bg-slate-200"
>
View Directory
</Link>
</div>
</aside>

<section className="rounded-[32px] border border-black/5 bg-white p-5 shadow-sm sm:p-8 lg:p-10">
<div className="mb-6">
<p className="text-xs font-black uppercase tracking-[0.32em] text-orange-500">
Executive request
</p>

<h2 className="mt-3 text-3xl font-black tracking-[-0.04em] text-slate-950 sm:text-4xl">
Contact Nexus Pavilion.
</h2>

<p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600">
Use this channel for enterprise demos, procurement intelligence,
supplier network access, partnerships, or platform support.
</p>
</div>

<ContactForm />
</section>
</section>
</div>
</main>
);
}

function InfoRow({ label, value }: { label: string; value: string }) {
return (
<div className="rounded-2xl border border-slate-100 bg-slate-50 p-5">
<p className="text-xs font-black uppercase tracking-[0.24em] text-slate-400">
{label}
</p>
<p className="mt-2 text-sm font-bold leading-6 text-slate-800">{value}</p>
</div>
);
}