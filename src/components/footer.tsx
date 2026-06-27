import Link from "next/link";
import { NexusPavilionLogo } from "@/components/branding/nexus-pavilion-logo";

export default function Footer() {
const year = new Date().getFullYear();

return (
<footer className="mt-20 border-t border-nexus-border bg-nexus-dark text-nexus-white">
<div className="mx-auto max-w-7xl px-6 py-14 sm:px-8 lg:py-16">
<div className="grid gap-12 lg:grid-cols-[1.25fr_0.75fr_0.75fr_0.75fr_0.75fr]">
<div>
<NexusPavilionLogo variant="footer" size={90} />

<p className="mt-8 max-w-md text-sm font-semibold leading-7 text-nexus-muted">
Executive-grade construction procurement intelligence for RFQs,
supplier governance, board reporting, award confidence, and
enterprise decision control.
</p>

<div className="mt-6 flex flex-wrap gap-2">
<FooterBadge>RFQ Governance</FooterBadge>
<FooterBadge>Board Intelligence</FooterBadge>
<FooterBadge>Supplier Network</FooterBadge>
<FooterBadge>Decision Control</FooterBadge>
</div>
</div>

<FooterColumn title="Platform">
<FooterLink href="/dashboard">Executive Dashboard</FooterLink>
<FooterLink href="/analytics">Executive Analytics</FooterLink>
<FooterLink href="/rfq">RFQ Marketplace</FooterLink>
<FooterLink href="/directory">Supplier Network</FooterLink>
</FooterColumn>

<FooterColumn title="Intelligence">
<FooterLink href="/analytics">Board Intelligence</FooterLink>
<FooterLink href="/analytics">Forecast Engine</FooterLink>
<FooterLink href="/analytics">Command Center</FooterLink>
<FooterLink href="/analytics/vendors">Vendor Intelligence</FooterLink>
</FooterColumn>

<FooterColumn title="Governance">
<FooterLink href="/company/settings">Company Settings</FooterLink>
<FooterLink href="/company/settings">Team Access</FooterLink>
<FooterLink href="/notifications">Activity Center</FooterLink>
<FooterLink href="/analytics">Risk Intelligence</FooterLink>
</FooterColumn>

<FooterColumn title="Company">
<FooterLink href="/about">About</FooterLink>
<FooterLink href="/contact">Contact</FooterLink>
<FooterLink href="/privacy">Privacy</FooterLink>
<FooterLink href="/terms">Terms</FooterLink>
</FooterColumn>
</div>

<div className="mt-12 rounded-executive border border-white/10 bg-white/[0.03] p-6 shadow-inner-executive">
<div className="grid gap-6 md:grid-cols-3">
<TrustItem
title="Confidential Procurement"
description="Supplier submissions, buyer workflows, and award decisions are supported by governance-first procurement controls."
/>

<TrustItem
title="Executive Governance"
description="Board readiness, risk exposure, opportunity ranking, and decision confidence are surfaced through executive intelligence layers."
/>

<TrustItem
title="Enterprise Control"
description="Procurement signals are consolidated into board reporting, command centers, forecast intelligence, and approval workflows."
/>
</div>
</div>

<div className="mt-12 flex flex-col gap-6 border-t border-white/10 pt-8 lg:flex-row lg:items-center lg:justify-between">
<div className="flex items-center gap-4">
<NexusPavilionLogo variant="icon" size={56} />

<div>
<p className="text-sm font-black text-nexus-white">
Nexus Pavilion
</p>
<p className="mt-1 text-xs font-semibold uppercase tracking-np-body text-nexus-muted">
Intelligence Connected. Infrastructure Delivered.
</p>
</div>
</div>

<div className="text-left lg:text-right">
<p className="text-sm font-semibold text-nexus-muted">
© {year} Nexus Pavilion. All rights reserved.
</p>

<p className="mt-1 text-xs font-semibold text-slate-500">
Enterprise construction procurement intelligence platform.
</p>
</div>
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

<div className="mt-5 flex flex-col gap-3">{children}</div>
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
className="text-sm font-bold text-nexus-muted transition hover:text-nexus-white"
>
{children}
</Link>
);
}

function FooterBadge({ children }: { children: React.ReactNode }) {
return (
<span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs font-black uppercase tracking-[0.15em] text-slate-300">
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
<p className="text-sm font-black text-nexus-white">{title}</p>

<p className="mt-2 text-sm font-semibold leading-6 text-nexus-muted">
{description}
</p>
</div>
);
}