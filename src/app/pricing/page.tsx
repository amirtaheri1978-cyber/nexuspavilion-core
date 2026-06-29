import Link from "next/link";

const plans = [
{
name: "Starter",
price: "$49",
description: "For small teams starting structured procurement workflows.",
features: [
"Company workspace",
"RFQ creation",
"Vendor invitations",
"Quote submission",
"Basic analytics",
],
cta: "Start Free",
href: "/signup",
},
{
name: "Professional",
price: "$149",
description: "For growing procurement teams managing active supplier pipelines.",
features: [
"Everything in Starter",
"Quote comparison",
"Award workflow",
"Supplier intelligence",
"Executive analytics",
],
cta: "Start Professional",
href: "/signup",
highlighted: true,
},
{
name: "Enterprise",
price: "Custom",
description: "For organizations needing executive reporting and advanced controls.",
features: [
"Everything in Professional",
"Board reports",
"AI procurement copilot",
"Role-based workspace controls",
"Priority onboarding",
],
cta: "Contact Sales",
href: "/contact",
},
];

export default function PricingPage() {
return (
<main className="relative min-h-screen overflow-hidden bg-[#061426] px-4 py-6 text-white sm:px-6 lg:px-10">
<div className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(circle_at_top_left,rgba(44,196,232,0.18),transparent_34%),radial-gradient(circle_at_top_right,rgba(200,166,70,0.15),transparent_30%),linear-gradient(180deg,#061426_0%,#07111F_45%,#020617_100%)]" />

<div className="mx-auto w-full max-w-[1680px]">
<section className="rounded-[40px] border border-white/10 bg-white/[0.065] p-7 shadow-[0_36px_120px_rgba(0,0,0,0.52)] backdrop-blur-2xl sm:p-10">
<p className="text-xs font-black uppercase tracking-[0.35em] text-[#C8A646]">
Pricing
</p>

<h1 className="mt-4 max-w-5xl text-5xl font-black leading-tight tracking-[-0.05em] text-white sm:text-6xl">
Procurement intelligence plans for every team.
</h1>

<p className="mt-5 max-w-3xl text-sm font-semibold leading-7 text-slate-300">
Start with structured RFQs, vendor invitations, quote workflows,
and executive analytics. Upgrade as your procurement operations
grow.
</p>
</section>

<section className="mt-8 grid gap-6 lg:grid-cols-3">
{plans.map((plan) => (
<div
key={plan.name}
className={`rounded-[34px] border p-8 shadow-[0_24px_80px_rgba(0,0,0,0.26)] ${
plan.highlighted
? "border-[#C8A646]/35 bg-gradient-to-br from-[#0B3D91]/30 via-[#07111F] to-[#061426]"
: "border-white/10 bg-white/[0.055]"
}`}
>
<p className="text-xs font-black uppercase tracking-[0.25em] text-[#C8A646]">
{plan.name}
</p>

<div className="mt-5 flex items-end gap-2">
<h2 className="text-5xl font-black text-white">{plan.price}</h2>

{plan.price !== "Custom" ? (
<p className="pb-2 text-sm font-bold text-slate-400">
/ month
</p>
) : null}
</div>

<p className="mt-4 text-sm font-semibold leading-7 text-slate-300">
{plan.description}
</p>

<div className="mt-8 space-y-3">
{plan.features.map((feature) => (
<div key={feature} className="flex items-center gap-3">
<span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-[#C8A646]/30 bg-[#C8A646]/10 text-xs font-black text-[#F5D77B]">
✓
</span>

<p className="text-sm font-semibold text-slate-200">
{feature}
</p>
</div>
))}
</div>

<Link
href={plan.href}
className={`mt-8 flex h-[54px] items-center justify-center rounded-2xl px-6 text-center text-sm font-black transition ${
plan.highlighted
? "bg-gradient-to-r from-[#B9902F] via-[#C8A646] to-[#F5D77B] uppercase tracking-[0.12em] text-slate-950 hover:scale-[1.01]"
: "border border-white/10 bg-white/[0.045] text-white hover:bg-white/[0.08]"
}`}
>
{plan.cta}
</Link>
</div>
))}
</section>

<section className="mt-8 rounded-[34px] border border-[#C8A646]/25 bg-[#C8A646]/10 p-8">
<p className="text-xs font-black uppercase tracking-[0.25em] text-[#F5D77B]">
Soft Launch Billing
</p>

<h2 className="mt-3 text-3xl font-black text-white">
Stripe checkout coming next.
</h2>

<p className="mt-3 max-w-4xl text-sm font-semibold leading-7 text-slate-300">
Pricing is ready for soft launch positioning. Subscription checkout,
customer portal, plan limits, and billing automation will be
connected in the next billing phase.
</p>
</section>
</div>
</main>
);
}