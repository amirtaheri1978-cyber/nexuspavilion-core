import Link from "next/link";

import { EXECUTIVE_FOCUS_CYAN } from "@/lib/design-system/executive-contract";

type CompanyGovernanceCenterProps = {
workspaceStage: string;
governanceMessage: string;
hasOwner: boolean;
adminCount: number;
pendingInviteCount: number;
activityCount: number;
rfqCount: number;
companyStatus: string;
category: string;
location: string;
networkRole: string;
};

export default function CompanyGovernanceCenter({
workspaceStage,
governanceMessage,
hasOwner,
adminCount,
pendingInviteCount,
activityCount,
rfqCount,
companyStatus,
category,
location,
networkRole,
}: CompanyGovernanceCenterProps) {
return (
<>
<section className="mt-8 rounded-[32px] border border-white/10 bg-white/[0.045] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.28)] backdrop-blur-xl sm:p-8">
<div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
<div>
<p className="text-xs font-black uppercase tracking-[0.3em] text-[#C8A646]">
Governance & Access Center
</p>

<h2 className="mt-3 text-3xl font-black text-white">
Workspace Governance Overview
</h2>

<p className="mt-3 max-w-3xl text-sm font-semibold leading-7 text-slate-400">
Nexus Pavilion monitors ownership, admin coverage, invitations,
audit activity, and procurement readiness without alarming new
users with unnecessary critical warnings.
</p>
</div>

<div className="rounded-[28px] border border-[#C8A646]/20 bg-[#C8A646]/10 px-6 py-5 text-white">
<p className="text-xs font-black uppercase tracking-[0.25em] text-[#F5D77B]">
Workspace Stage
</p>

<p className="mt-2 text-3xl font-black">{workspaceStage}</p>
</div>
</div>

<div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
<SecurityCheck label="Owner" status={hasOwner ? "Active" : "Missing"} />

<SecurityCheck
label="Admin Coverage"
status={
adminCount >= 2 ? "Strong" : adminCount === 1 ? "Healthy" : "Owner Only"
}
/>

<SecurityCheck
label="Audit Logging"
status={activityCount > 0 ? "Active" : "Ready"}
/>

<SecurityCheck
label="Invitations"
status={pendingInviteCount > 0 ? `${pendingInviteCount} Pending` : "Clear"}
/>

<SecurityCheck
label="Procurement"
status={rfqCount > 0 ? "Active" : "Ready"}
/>
</div>

<div className="mt-6 rounded-[28px] border border-white/10 bg-[#061426]/70 p-5">
<p className="text-sm font-bold leading-7 text-slate-300">
{governanceMessage}
</p>
</div>
</section>

<section
aria-labelledby="policies-approval-controls-heading"
className="mt-8 rounded-[32px] border border-white/10 bg-white/[0.045] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.28)] backdrop-blur-xl sm:p-8"
>
<p className="text-xs font-black uppercase tracking-[0.3em] text-[#C8A646]">
Policies & Approval Controls
</p>

<h2
id="policies-approval-controls-heading"
className="mt-3 text-3xl font-black text-white"
>
Policies & Approval Controls
</h2>

<p className="mt-3 max-w-3xl text-sm font-semibold leading-7 text-slate-400">
Authority is enforced within each business workflow. This overview
explains where governance decisions occur without creating a second
approval layer.
</p>

<div className="mt-6 grid gap-4 sm:grid-cols-2">
<PolicyControlCard
title="Workspace Access & Invitations"
authority="Owner / Admin"
purpose="Workspace membership, Access Levels, and company workspace invitations. These are company workspace invitations. They do not grant RFQ access."
href="#invite-users"
linkLabel="Open workspace invitations"
/>

<PolicyControlCard
title="Ownership Governance"
authority="Current owner requests transfer; the designated recipient accepts or rejects"
purpose="Membership-based ownership transfer is managed from Company Ownership & Controls. Emergency recovery is not operational."
href="#governance"
linkLabel="Open ownership controls"
/>

<PolicyControlCard
title="RFQ Access & Supplier Invitations"
authority="Existing procurement authorization"
purpose="RFQ creation, sourcing access, supplier invitations, and respondent access. RFQ invitations are separate from company workspace invitations."
href="/rfq"
linkLabel="Open RFQ access"
/>

<PolicyControlCard
title="Commercial Visibility"
authority="RFQ access and blind-bid unlock rules"
purpose="Quote access and commercial visibility are governed by RFQ access and blind-bid unlock rules. Quotation is not contract award."
href="/rfq"
linkLabel="Open commercial visibility"
/>

<PolicyControlCard
title="Contract Award Authorization"
authority="Issuer Owner / Admin under existing award integrity rules"
purpose="Contract award occurs from the RFQ commercial evaluation workflow. Award is not performed from company settings."
href="/rfq"
linkLabel="Open contract award workflow"
/>

<PolicyControlCard
title="Organization Verification"
authority="Informational only"
purpose={`Current organization verification state: ${companyStatus || "Status not set"}. This is a governance dependency, not a company self-approval control.`}
/>

<PolicyControlCard
title="Audit Trail"
authority="Company-scoped history"
purpose="Governance and procurement activity already recorded for this workspace. This overview does not create a second approval-history store."
href="#activity-history"
linkLabel="Open activity history"
/>
</div>

<p className="mt-6 text-sm font-semibold leading-6 text-slate-400">
Platform-governed verification controls are managed outside company
workspace settings.
</p>
</section>

<section className="mt-8 grid gap-6 md:grid-cols-4">
<InfoCard title="Category" value={category || "Not specified"} />
<InfoCard title="Regional Hub" value={location || "Location N/A"} />
<InfoCard title="Network Role" value={networkRole || "Not specified"} />
<InfoCard title="Company Status" value={companyStatus || "Status not set"} />
</section>
</>
);
}

function SecurityCheck({ label, status }: { label: string; status: string }) {
return (
<div className="rounded-[26px] border border-white/10 bg-[#061426]/70 p-5">
<p className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">
{label}
</p>

<p className="mt-2 text-lg font-black text-white">{status}</p>
</div>
);
}

function PolicyControlCard({
title,
authority,
purpose,
href,
linkLabel,
}: {
title: string;
authority: string;
purpose: string;
href?: string;
linkLabel?: string;
}) {
return (
<article className="rounded-[26px] border border-white/10 bg-[#061426]/70 p-5">
<h3 className="text-lg font-black text-white">{title}</h3>

<p className="mt-2 text-xs font-black uppercase tracking-[0.18em] text-slate-400">
{authority}
</p>

<p className="mt-3 text-sm font-semibold leading-6 text-slate-400">
{purpose}
</p>

{href && linkLabel ? (
<Link
href={href}
className={`mt-4 inline-flex min-h-11 items-center text-sm font-black text-[#9BE8F8] hover:text-white ${EXECUTIVE_FOCUS_CYAN}`}
>
{linkLabel}
</Link>
) : null}
</article>
);
}

function InfoCard({ title, value }: { title: string; value: string }) {
return (
<div className="rounded-[28px] border border-white/10 bg-white/[0.045] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.26)] backdrop-blur-xl">
<p className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">
{title}
</p>

<p className="mt-3 text-xl font-black text-white">{value}</p>
</div>
);
}