import Link from "next/link";
import ContactForm from "@/components/contact-form";

const trustCapabilities = [
"RFQ Governance",
"Supplier Intelligence",
"Board Reporting",
"Procurement Analytics",
];

const responseFramework = [
{
label: "01",
title: "Request Review",
description: "Your inquiry is reviewed by the Nexus Pavilion team.",
},
{
label: "02",
title: "Specialist Assignment",
description: "A relevant procurement or platform specialist is assigned.",
},
{
label: "03",
title: "Executive Response",
description: "You receive a response with the next recommended action.",
},
];

export default function ContactPage() {
return (
<main className="min-h-screen w-full overflow-hidden bg-[#07111F] text-white">
<div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_top_left,rgba(37,99,235,0.14),transparent_34%),radial-gradient(circle_at_top_right,rgba(231,184,74,0.1),transparent_32%)]" />

<div className="relative w-full px-3 py-6 sm:px-4 lg:px-4 lg:py-10">
<Link
href="/"
className="inline-flex items-center text-sm font-bold text-slate-500 transition hover:text-white"
>
← Back to Home
</Link>

<section className="mt-6 ml-0 overflow-hidden rounded-[32px] border border-[#1E293B] bg-[#0B1220] shadow-[0_32px_120px_rgba(0,0,0,0.42)]">
<div className="grid lg:grid-cols-[1.15fr_0.85fr]">
<div className="p-6 sm:p-9 lg:p-14">
<p className="text-xs font-black uppercase tracking-[0.34em] text-[#E7B84A]">
Contact Nexus Pavilion
</p>

<h1 className="mt-5 max-w-4xl text-5xl font-black tracking-[-0.055em] text-white sm:text-6xl lg:text-7xl">
Executive procurement consultation.
</h1>

<p className="mt-6 max-w-2xl text-base leading-8 text-slate-300 sm:text-lg">
Connect with Nexus Pavilion for enterprise procurement
intelligence, supplier governance, RFQ management, and
board-level reporting for construction organizations.
</p>

<div className="mt-8 grid gap-3 sm:grid-cols-2 lg:max-w-2xl">
{trustCapabilities.map((item) => (
<div
key={item}
className="rounded-2xl border border-[#1E293B] bg-[#0F172A] px-4 py-3 text-sm font-black text-slate-100"
>
<span className="text-[#E7B84A]">✓</span> {item}
</div>
))}
</div>
</div>

<aside className="border-t border-[#1E293B] bg-[#07111F] p-6 text-white sm:p-8 lg:border-l lg:border-t-0 lg:p-10">
<p className="text-xs font-black uppercase tracking-[0.34em] text-slate-500">
Executive Response Framework
</p>

<h2 className="mt-4 text-3xl font-black tracking-[-0.04em]">
Your request is routed for executive review.
</h2>

<div className="mt-7 space-y-4">
{responseFramework.map((step) => (
<div
key={step.label}
className="rounded-3xl border border-[#1E293B] bg-[#0F172A] p-5"
>
<div className="flex items-start gap-4">
<div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#E7B84A] text-xs font-black text-slate-950">
{step.label}
</div>

<div>
<p className="font-black text-white">{step.title}</p>
<p className="mt-2 text-sm leading-6 text-slate-300">
{step.description}
</p>
</div>
</div>
</div>
))}
</div>
</aside>
</div>
</section>

<section className="mt-6 grid gap-6 lg:grid-cols-[0.34fr_0.66fr]">
<aside className="rounded-[32px] border border-[#1E293B] bg-[#0B1220] p-6 shadow-[0_32px_120px_rgba(0,0,0,0.36)] sm:p-8">
<p className="text-xs font-black uppercase tracking-[0.32em] text-slate-500">
Direct Contact
</p>

<h2 className="mt-4 text-2xl font-black tracking-[-0.03em] text-white">
Enterprise inquiry channel.
</h2>

<div className="mt-6 space-y-3">
<InfoRow label="Email" value="a.mirtaheri1978@gmail.com" />
<InfoRow
label="Platform"
value="Nexus Pavilion Procurement Intelligence"
/>
<InfoRow label="Response" value="Reviewed by platform team" />
</div>

<div className="mt-7 grid gap-3">
<Link
href="/register"
className="inline-flex w-full items-center justify-center rounded-full bg-[#E7B84A] px-6 py-3 text-sm font-black text-slate-950 transition hover:bg-[#f0c85a]"
>
Join Network
</Link>

<Link
href="/directory"
className="inline-flex w-full items-center justify-center rounded-full border border-[#1E293B] bg-[#0F172A] px-6 py-3 text-sm font-black text-white transition hover:bg-[#162033]"
>
View Directory
</Link>
</div>
</aside>

<section className="rounded-[32px] border border-[#1E293B] bg-[#0B1220] p-5 shadow-[0_32px_120px_rgba(0,0,0,0.36)] sm:p-8 lg:p-10">
<div className="mb-6">
<p className="text-xs font-black uppercase tracking-[0.32em] text-[#E7B84A]">
Executive Request
</p>

<h2 className="mt-3 text-3xl font-black tracking-[-0.04em] text-white sm:text-4xl">
Request Nexus Pavilion consultation.
</h2>

<p className="mt-3 max-w-2xl text-sm leading-7 text-slate-300">
Use this channel for enterprise demos, supplier network access,
procurement intelligence, partnerships, or platform support.
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
<div className="rounded-2xl border border-[#1E293B] bg-[#0F172A] p-5">
<p className="text-xs font-black uppercase tracking-[0.24em] text-slate-500">
{label}
</p>
<p className="mt-2 text-sm font-bold leading-6 text-slate-200">{value}</p>
</div>
);
}