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
cta: "Upgrade Soon",
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
<main className="min-h-screen bg-[#f6f6f3] px-8 py-10">
<div className="mx-auto max-w-7xl">
<section className="rounded-[36px] border border-black/5 bg-white p-10">
<p className="text-xs font-black uppercase tracking-[0.35em] text-orange-500">
Pricing
</p>

<h1 className="mt-3 text-5xl font-black text-slate-950">
Procurement intelligence plans for every team
</h1>

<p className="mt-5 max-w-3xl text-sm leading-7 text-slate-600">
Start with structured RFQs, vendor invitations, quote workflows,
and executive analytics. Upgrade as your procurement operations
grow.
</p>
</section>

<section className="mt-8 grid gap-6 lg:grid-cols-3">
{plans.map((plan) => (
<div
key={plan.name}
className={`rounded-[32px] border p-8 ${
plan.highlighted
? "border-orange-300 bg-slate-950 text-white"
: "border-black/5 bg-white text-slate-950"
}`}
>
<p
className={`text-xs font-black uppercase tracking-[0.25em] ${
plan.highlighted ? "text-orange-400" : "text-orange-500"
}`}
>
{plan.name}
</p>

<div className="mt-5 flex items-end gap-2">
<h2 className="text-5xl font-black">{plan.price}</h2>

{plan.price !== "Custom" ? (
<p
className={`pb-2 text-sm font-bold ${
plan.highlighted ? "text-slate-300" : "text-slate-500"
}`}
>
/ month
</p>
) : null}
</div>

<p
className={`mt-4 text-sm leading-7 ${
plan.highlighted ? "text-slate-300" : "text-slate-600"
}`}
>
{plan.description}
</p>

<div className="mt-8 space-y-3">
{plan.features.map((feature) => (
<div key={feature} className="flex items-center gap-3">
<span
className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-black ${
plan.highlighted
? "bg-white text-slate-950"
: "bg-orange-100 text-orange-600"
}`}
>
✓
</span>

<p
className={`text-sm font-semibold ${
plan.highlighted ? "text-white" : "text-slate-700"
}`}
>
{feature}
</p>
</div>
))}
</div>

<Link
href={plan.href}
className={`mt-8 block rounded-full px-6 py-3 text-center text-sm font-black transition ${
plan.highlighted
? "bg-white text-slate-950 hover:bg-slate-100"
: "bg-slate-950 text-white hover:bg-slate-800"
}`}
>
{plan.cta}
</Link>
</div>
))}
</section>

<section className="mt-8 rounded-[32px] border border-orange-200 bg-orange-50 p-8">
<p className="text-xs font-black uppercase tracking-[0.25em] text-orange-600">
Soft Launch Billing
</p>

<h2 className="mt-3 text-3xl font-black text-slate-950">
Stripe checkout coming next
</h2>

<p className="mt-3 max-w-4xl text-sm leading-7 text-slate-700">
Pricing is now ready for soft launch positioning. Subscription
checkout, customer portal, plan limits, and billing automation will
be connected in the next billing phase.
</p>
</section>
</div>
</main>
);
}