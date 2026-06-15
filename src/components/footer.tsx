import Link from "next/link";

export default function Footer() {
const year = new Date().getFullYear();

return (
<footer className="mt-20 border-t border-slate-200 bg-slate-950 text-white">
<div className="mx-auto max-w-7xl px-8 py-16">
<div className="grid gap-12 lg:grid-cols-[1.2fr_0.8fr_0.8fr_0.8fr_0.8fr]">
<div>
<p className="text-xs font-black uppercase tracking-[0.35em] text-orange-400">
Enterprise Procurement Intelligence
</p>

<h3 className="mt-4 text-3xl font-black">
Nexus Pavilion
</h3>

<p className="mt-4 max-w-md text-sm font-semibold leading-7 text-slate-300">
Construction and professional services procurement platform for
RFQs, supplier networks, approved vendor lists, blind bidding,
award intelligence, and executive decision governance.
</p>

<div className="mt-6 flex flex-wrap gap-2">
<FooterBadge>RFQ Governance</FooterBadge>
<FooterBadge>AVL</FooterBadge>
<FooterBadge>Blind Bidding</FooterBadge>
<FooterBadge>Supplier Intelligence</FooterBadge>
</div>
</div>

<FooterColumn title="Platform">
<FooterLink href="/dashboard">Executive Dashboard</FooterLink>
<FooterLink href="/rfq">RFQ Marketplace</FooterLink>
<FooterLink href="/directory">Supplier Network</FooterLink>
<FooterLink href="/notifications">Activity Center</FooterLink>
</FooterColumn>

<FooterColumn title="Procurement">
<FooterLink href="/rfq/new">Create RFQ</FooterLink>
<FooterLink href="/analytics">Procurement Analytics</FooterLink>
<FooterLink href="/vendor-dashboard">Supplier Workspace</FooterLink>
<FooterLink href="/analytics/vendors">Vendor Intelligence</FooterLink>
</FooterColumn>

<FooterColumn title="Governance">
<FooterLink href="/company/settings">Company Settings</FooterLink>
<FooterLink href="/company/settings">Team Access</FooterLink>
<FooterLink href="/company/settings">Invitations</FooterLink>
<FooterLink href="/analytics">Risk Intelligence</FooterLink>
</FooterColumn>

<FooterColumn title="Company">
<FooterLink href="/about">About</FooterLink>
<FooterLink href="/contact">Contact</FooterLink>
<FooterLink href="/privacy">Privacy</FooterLink>
<FooterLink href="/terms">Terms</FooterLink>
</FooterColumn>
</div>

<div className="mt-12 rounded-[32px] border border-white/10 bg-white/5 p-6">
<div className="grid gap-6 md:grid-cols-3">
<TrustItem
title="Confidential Procurement"
description="Supplier submissions are protected with buyer-side visibility controls and anti-collusion workflow design."
/>

<TrustItem
title="Enterprise Governance"
description="RFQ classification, approved vendor routing, audit activity, and deadline controls support disciplined procurement execution."
/>

<TrustItem
title="Executive Intelligence"
description="Procurement signals are transformed into decision-ready views for risk, savings, supplier performance, and award strategy."
/>
</div>
</div>

<div className="mt-12 flex flex-col gap-4 border-t border-white/10 pt-8 md:flex-row md:items-center md:justify-between">
<p className="text-sm font-semibold text-slate-400">
© {year} Nexus Pavilion. All rights reserved.
</p>

<p className="text-sm font-semibold text-slate-500">
Built for construction procurement, supplier governance, and
enterprise decision intelligence.
</p>
</div>
</div>
</footer>
);
}

function FooterColumn({
title,
children,
}: {
title: string;
children: React.ReactNode;
}) {
return (
<div>
<h4 className="text-xs font-black uppercase tracking-[0.25em] text-slate-500">
{title}
</h4>

<div className="mt-5 flex flex-col gap-3">
{children}
</div>
</div>
);
}

function FooterLink({
href,
children,
}: {
href: string;
children: React.ReactNode;
}) {
return (
<Link
href={href}
className="text-sm font-bold text-slate-300 transition hover:text-white"
>
{children}
</Link>
);
}

function FooterBadge({ children }: { children: React.ReactNode }) {
return (
<span className="rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs font-black uppercase tracking-[0.15em] text-slate-300">
{children}
</span>
);
}

function TrustItem({
title,
description,
}: {
title: string;
description: string;
}) {
return (
<div>
<p className="text-sm font-black text-white">{title}</p>

<p className="mt-2 text-sm font-semibold leading-6 text-slate-400">
{description}
</p>
</div>
);
}