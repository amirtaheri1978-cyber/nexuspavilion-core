import type { Metadata } from "next";
import Link from "next/link";

const ABOUT_TITLE = "About | NexusPavilion Inc.";
const ABOUT_DESCRIPTION =
  "Learn about NexusPavilion Inc., the parent company of NexusPavilion Intelligent Procurement.";

export const metadata: Metadata = {
  title: {
    absolute: ABOUT_TITLE,
  },
  description: ABOUT_DESCRIPTION,
  alternates: {
    canonical: "/about",
  },
  robots: {
    index: true,
    follow: true,
  },
  openGraph: {
    title: ABOUT_TITLE,
    description: ABOUT_DESCRIPTION,
    url: "/about",
    siteName: "NexusPavilion Inc.",
    type: "website",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: ABOUT_TITLE,
    description: ABOUT_DESCRIPTION,
  },
};

const intelligenceCards = [
{
title: "RFQ Intelligence",
description:
"Create, publish, compare, and award RFQs with structured supplier quote intelligence.",
},
{
title: "Supplier Performance",
description:
"Track vendor activity, award history, win rates, procurement scores, and supplier risk signals.",
},
{
title: "Executive Analytics",
description:
"View procurement health, savings opportunities, competition levels, forecasts, and strategic recommendations.",
},
];

const buyerItems = [
"Manage company RFQs and supplier quotes",
"Compare bids using price, timeline, risk, and award probability",
"Track procurement volume, savings, and award decisions",
"Manage team members, roles, invitations, and access",
];

const supplierItems = [
"Participate in procurement opportunities",
"Track submitted quotes and awarded contracts",
"Monitor supplier performance and ranking signals",
"Build verified company visibility across the network",
];

export default function AboutPage() {
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

<section className="mt-6 rounded-[40px] border border-white/10 bg-white/[0.065] p-7 shadow-[0_36px_120px_rgba(0,0,0,0.52)] backdrop-blur-2xl sm:p-10">
<p className="text-xs font-black uppercase tracking-[0.35em] text-[#C8A646]">
About Nexus Pavilion
</p>

<h1 className="mt-4 max-w-5xl text-5xl font-black leading-tight tracking-[-0.05em] text-white sm:text-6xl">
Enterprise procurement intelligence for construction and supplier
networks.
</h1>

<p className="mt-6 max-w-4xl text-base font-semibold leading-8 text-slate-300">
Nexus Pavilion is a procurement intelligence platform designed to
help buyers, vendors, and enterprise teams manage RFQs, supplier
quotes, award decisions, company workspaces, and procurement
performance from one secure platform.
</p>

<div className="mt-8 flex flex-wrap gap-3">
<StatusPill>RFQ Governance</StatusPill>
<StatusPill>Supplier Intelligence</StatusPill>
<StatusPill>Executive Analytics</StatusPill>
<StatusPill>Board Reporting</StatusPill>
</div>
</section>

<section className="mt-8 grid gap-6 md:grid-cols-3">
{intelligenceCards.map((card) => (
<InfoCard
key={card.title}
title={card.title}
description={card.description}
/>
))}
</section>

<section className="mt-8 rounded-[34px] border border-white/10 bg-white/[0.055] p-8 shadow-[0_30px_80px_rgba(0,0,0,0.35)]">
<p className="text-xs font-black uppercase tracking-[0.3em] text-[#C8A646]">
Platform Mission
</p>

<h2 className="mt-3 text-3xl font-black text-white">
Turning procurement data into confident decisions.
</h2>

<p className="mt-4 max-w-4xl text-sm font-semibold leading-7 text-slate-400">
Traditional procurement workflows often rely on spreadsheets,
emails, disconnected vendor lists, and manual bid comparison. Nexus
Pavilion centralizes the procurement lifecycle and adds intelligence
on top of RFQs, quotes, awards, supplier performance, and executive
reporting.
</p>
</section>

<section className="mt-8 grid gap-6 md:grid-cols-2">
<FeatureBlock title="For Buyers" items={buyerItems} />

<FeatureBlock title="For Suppliers" items={supplierItems} />
</section>

<section className="mt-8 rounded-[34px] border border-[#2CC4E8]/15 bg-gradient-to-br from-[#0B3D91]/35 via-[#07111F]/92 to-[#061426] p-8 shadow-[0_0_70px_rgba(44,196,232,0.10)]">
<p className="text-xs font-black uppercase tracking-[0.3em] text-[#C8A646]">
Soft Launch
</p>

<h2 className="mt-3 text-3xl font-black text-white">
Built for modern procurement teams.
</h2>

<p className="mt-4 max-w-4xl text-sm font-semibold leading-7 text-slate-300">
Nexus Pavilion is being developed as an enterprise-ready SaaS
platform for procurement visibility, supplier intelligence, and
smarter award decisions.
</p>

<div className="mt-7 flex flex-col gap-3 sm:flex-row">
<Link
href="/signup"
className="inline-flex h-[54px] items-center justify-center rounded-2xl bg-gradient-to-r from-[#B9902F] via-[#C8A646] to-[#F5D77B] px-6 text-sm font-black uppercase tracking-[0.12em] text-slate-950 transition hover:scale-[1.01]"
>
Join Network
</Link>

<Link
href="/contact"
className="inline-flex h-[54px] items-center justify-center rounded-2xl border border-white/10 bg-white/[0.045] px-6 text-sm font-black text-white transition hover:bg-white/[0.08]"
>
Contact Team
</Link>
</div>
</section>
</div>
</main>
);
}

function InfoCard({
title,
description,
}: {
title: string;
description: string;
}) {
return (
<div className="rounded-3xl border border-white/10 bg-white/[0.055] p-7 shadow-[0_24px_80px_rgba(0,0,0,0.26)]">
<h2 className="text-2xl font-black text-white">{title}</h2>

<p className="mt-3 text-sm font-semibold leading-7 text-slate-400">
{description}
</p>
</div>
);
}

function FeatureBlock({
title,
items,
}: {
title: string;
items: string[];
}) {
return (
<div className="rounded-[34px] border border-white/10 bg-white/[0.055] p-8 shadow-[0_24px_80px_rgba(0,0,0,0.26)]">
<h2 className="text-3xl font-black text-white">{title}</h2>

<div className="mt-5 space-y-3">
{items.map((item) => (
<div
key={item}
className="flex items-center gap-3 rounded-2xl border border-white/10 bg-[#07111F]/75 px-4 py-3 text-sm font-bold text-slate-300"
>
<span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-[#C8A646]/30 bg-[#C8A646]/10 text-xs text-[#F5D77B]">
✓
</span>

<span>{item}</span>
</div>
))}
</div>
</div>
);
}

function StatusPill({ children }: { children: React.ReactNode }) {
return (
<span className="inline-flex rounded-full border border-[#2CC4E8]/25 bg-[#2CC4E8]/10 px-4 py-2 text-xs font-black uppercase tracking-[0.16em] text-[#9BE8F8]">
{children}
</span>
);
}