import type { Metadata } from "next";
import Link from "next/link";

import ContactForm from "@/components/contact-form";

const CONTACT_TITLE = "Contact | NexusPavilion Inc.";
const CONTACT_DESCRIPTION =
  "Contact NexusPavilion Inc. for corporate and product inquiries.";

export const metadata: Metadata = {
  title: {
    absolute: CONTACT_TITLE,
  },
  description: CONTACT_DESCRIPTION,
  alternates: {
    canonical: "/contact",
  },
  robots: {
    index: true,
    follow: true,
  },
  openGraph: {
    title: CONTACT_TITLE,
    description: CONTACT_DESCRIPTION,
    url: "/contact",
    siteName: "NexusPavilion Inc.",
    type: "website",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: CONTACT_TITLE,
    description: CONTACT_DESCRIPTION,
  },
};

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
<main className="relative min-h-screen overflow-hidden bg-[#061426] px-4 py-6 text-white sm:px-6 lg:px-10">
<div className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(circle_at_top_left,rgba(44,196,232,0.18),transparent_34%),radial-gradient(circle_at_top_right,rgba(200,166,70,0.15),transparent_30%),linear-gradient(180deg,#061426_0%,#07111F_45%,#020617_100%)]" />

<div className="mx-auto w-full max-w-[1680px]">
<Link
href="/"
className="inline-flex w-fit rounded-full border border-white/10 bg-white/[0.045] px-5 py-3 text-sm font-black text-slate-300 transition hover:bg-white/[0.08] hover:text-white"
>
← Back to Home
</Link>

<section className="mt-6 overflow-hidden rounded-[40px] border border-white/10 bg-white/[0.065] shadow-[0_36px_120px_rgba(0,0,0,0.52)] backdrop-blur-2xl">
<div className="grid lg:grid-cols-[1.15fr_0.85fr]">
<div className="p-7 sm:p-10 lg:p-14">
<p className="text-xs font-black uppercase tracking-[0.34em] text-[#C8A646]">
Contact Nexus Pavilion
</p>

<h1 className="mt-5 max-w-4xl text-5xl font-black tracking-[-0.055em] text-white sm:text-6xl lg:text-7xl">
Executive procurement consultation.
</h1>

<p className="mt-6 max-w-2xl text-base font-semibold leading-8 text-slate-300 sm:text-lg">
Connect with Nexus Pavilion for enterprise procurement
intelligence, supplier governance, RFQ management, and
board-level reporting for construction organizations.
</p>

<div className="mt-8 grid gap-3 sm:grid-cols-2 lg:max-w-2xl">
{trustCapabilities.map((item) => (
<div
key={item}
className="flex items-center gap-3 rounded-2xl border border-white/10 bg-[#07111F]/75 px-4 py-3 text-sm font-black text-slate-100"
>
<span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-[#C8A646]/30 bg-[#C8A646]/10 text-xs text-[#F5D77B]">
✓
</span>
<span>{item}</span>
</div>
))}
</div>
</div>

<aside className="border-t border-white/10 bg-[#07111F]/80 p-7 text-white sm:p-9 lg:border-l lg:border-t-0 lg:p-10">
<p className="text-xs font-black uppercase tracking-[0.34em] text-slate-500">
Executive Response Framework
</p>

<h2 className="mt-4 text-3xl font-black tracking-[-0.04em] text-white">
Your request is routed for executive review.
</h2>

<div className="mt-7 space-y-4">
{responseFramework.map((step) => (
<div
key={step.label}
className="rounded-3xl border border-white/10 bg-white/[0.045] p-5"
>
<div className="flex items-start gap-4">
<div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-r from-[#B9902F] via-[#C8A646] to-[#F5D77B] text-xs font-black text-slate-950">
{step.label}
</div>

<div>
<p className="font-black text-white">{step.title}</p>
<p className="mt-2 text-sm font-semibold leading-6 text-slate-400">
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
<aside className="rounded-[34px] border border-white/10 bg-white/[0.055] p-7 shadow-[0_30px_80px_rgba(0,0,0,0.35)] sm:p-8">
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
className="inline-flex h-[54px] w-full items-center justify-center rounded-2xl bg-gradient-to-r from-[#B9902F] via-[#C8A646] to-[#F5D77B] px-6 text-sm font-black uppercase tracking-[0.12em] text-slate-950 transition hover:scale-[1.01]"
>
Join Network
</Link>

<Link
href="/directory"
className="inline-flex h-[54px] w-full items-center justify-center rounded-2xl border border-white/10 bg-[#07111F]/75 px-6 text-sm font-black text-white transition hover:bg-white/[0.08]"
>
View Directory
</Link>
</div>
</aside>

<section className="rounded-[34px] border border-white/10 bg-white/[0.055] p-6 shadow-[0_30px_80px_rgba(0,0,0,0.35)] sm:p-8 lg:p-10">
<div className="mb-6">
<p className="text-xs font-black uppercase tracking-[0.32em] text-[#C8A646]">
Executive Request
</p>

<h2 className="mt-3 text-3xl font-black tracking-[-0.04em] text-white sm:text-4xl">
Request Nexus Pavilion consultation.
</h2>

<p className="mt-3 max-w-2xl text-sm font-semibold leading-7 text-slate-300">
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
<div className="rounded-2xl border border-white/10 bg-[#07111F]/75 p-5">
<p className="text-xs font-black uppercase tracking-[0.24em] text-slate-500">
{label}
</p>

<p className="mt-2 text-sm font-bold leading-6 text-slate-200">{value}</p>
</div>
);
}