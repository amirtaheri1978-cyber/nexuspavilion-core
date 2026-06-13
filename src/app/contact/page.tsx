import Link from "next/link";
import ContactForm from "@/components/contact-form";

export default function ContactPage() {
return (
<main className="min-h-screen bg-[#f6f6f3] px-8 py-12">
<div className="mx-auto max-w-5xl">
<Link
href="/"
className="text-sm font-bold text-slate-500 hover:text-slate-950"
>
← Back to Home
</Link>

<section className="mt-8 rounded-[36px] border border-black/5 bg-white p-10">
<p className="text-xs font-black uppercase tracking-[0.35em] text-orange-500">
Contact Nexus Pavilion
</p>

<h1 className="mt-4 text-5xl font-black text-slate-950">
Let’s build smarter procurement networks.
</h1>

<p className="mt-5 max-w-3xl text-sm leading-7 text-slate-600">
For platform access, partnership discussions, supplier network
onboarding, or enterprise procurement demos, contact the Nexus
Pavilion team.
</p>
</section>

<section className="mt-8 grid gap-6 md:grid-cols-3">
<ContactCard
title="Enterprise Demos"
value="Request a walkthrough of RFQs, supplier intelligence, analytics, and award workflows."
/>

<ContactCard
title="Supplier Network"
value="Join the procurement ecosystem and build a verified company profile."
/>

<ContactCard
title="Partnerships"
value="Discuss construction procurement, vendor marketplace, and enterprise integrations."
/>
</section>

<section className="mt-8 rounded-[32px] border border-black/5 bg-white p-8">
<h2 className="text-3xl font-black text-slate-950">
Contact Information
</h2>

<div className="mt-6 space-y-4">
<InfoRow label="Email" value="a.mirtaheri1978@gmail.com" />
<InfoRow label="Platform" value="Nexus Pavilion Procurement Intelligence" />
<InfoRow label="Focus" value="Construction procurement, RFQs, supplier intelligence, and enterprise analytics" />
</div>
<ContactForm />

<div className="mt-8 flex flex-wrap gap-3">
<Link
href="/register"
className="rounded-full bg-slate-950 px-6 py-3 text-sm font-bold text-white transition hover:bg-slate-800"
>
Join Network
</Link>

<Link
href="/directory"
className="rounded-full bg-slate-100 px-6 py-3 text-sm font-bold text-slate-950 transition hover:bg-slate-200"
>
View Directory
</Link>
</div>
</section>
</div>
</main>
);
}

function ContactCard({ title, value }: { title: string; value: string }) {
return (
<div className="rounded-3xl border border-black/5 bg-white p-7">
<h2 className="text-xl font-black text-slate-950">{title}</h2>
<p className="mt-3 text-sm leading-7 text-slate-600">{value}</p>
</div>
);
}

function InfoRow({ label, value }: { label: string; value: string }) {
return (
<div className="rounded-2xl bg-slate-50 p-5">
<p className="text-xs font-black uppercase tracking-[0.25em] text-slate-400">
{label}
</p>
<p className="mt-2 text-sm font-bold text-slate-800">{value}</p>
</div>
);
}