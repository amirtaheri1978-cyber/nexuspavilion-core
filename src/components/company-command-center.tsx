import Image from "next/image";
import Link from "next/link";

import { AccountIdentityLine } from "@/components/account-identity-line";
import {
  EXECUTIVE_FOCUS_CYAN,
  EXECUTIVE_FOCUS_GOLD,
} from "@/lib/design-system/executive-contract";

type CompanyCommandCenterProps = {
companyName: string;
companyStatus: string;
companyLogoUrl: string | null;
companySlug: string | null;
userIdentityFirstName?: string | null;
userIdentityLastName?: string | null;
userIdentityJobTitle?: string | null;
userIdentityEmail?: string | null;
workspaceRoleLabel: string;
readinessScore: number;
workspaceStage: string;
workspaceMessage: string;
memberCount: number;
activeRfqCount: number;
rfqCount: number;
hasOwner: boolean;
hasCompanyProfile: boolean;
};

export default function CompanyCommandCenter({
companyName,
companyStatus,
companyLogoUrl,
companySlug,
userIdentityFirstName,
userIdentityLastName,
userIdentityJobTitle,
userIdentityEmail,
workspaceRoleLabel,
readinessScore,
workspaceStage,
workspaceMessage,
memberCount,
activeRfqCount,
rfqCount,
hasOwner,
hasCompanyProfile,
}: CompanyCommandCenterProps) {
const companyInitial = companyName.trim().charAt(0) || "C";
const companyStatusLabel = companyStatus.trim() || "Status not set";
const companyStatusIsVerified = ["verified", "approved"].includes(
  companyStatusLabel.toLowerCase(),
);

return (
<>
<div className="flex items-center justify-between gap-6">
<Link
href="/dashboard"
className={`text-sm font-bold text-slate-400 hover:text-white ${EXECUTIVE_FOCUS_CYAN}`}
>
← Back to Dashboard
</Link>

<div className="flex flex-wrap items-center gap-3">
<Link
href="/rfq/new"
className={`rounded-full bg-gradient-to-r from-[#B9902F] via-[#C8A646] to-[#F5D77B] px-5 py-3 text-sm font-black text-slate-950 shadow-[0_18px_55px_rgba(200,166,70,0.24)] transition-[box-shadow] duration-200 hover:shadow-[0_22px_65px_rgba(200,166,70,0.34)] ${EXECUTIVE_FOCUS_GOLD}`}
>
Create First RFQ
</Link>

<Link
href="/directory"
className={`rounded-full border border-white/10 bg-white/[0.045] px-5 py-3 text-sm font-black text-white transition hover:bg-white/[0.08] ${EXECUTIVE_FOCUS_CYAN}`}
>
Supplier Network
</Link>

{companySlug ? (
<Link
href={`/company/${companySlug}`}
className={`rounded-full border border-[#2CC4E8]/25 bg-[#2CC4E8]/10 px-5 py-3 text-sm font-black text-[#9BE8F8] transition hover:bg-[#2CC4E8]/15 ${EXECUTIVE_FOCUS_CYAN}`}
>
Public Profile
</Link>
) : null}
</div>
</div>

<section className="mt-8 overflow-hidden rounded-[32px] border border-white/10 bg-slate-950 text-white shadow-2xl">
<div className="grid gap-0 lg:grid-cols-[1.15fr_0.85fr]">
<div className="p-10">
<p className="text-xs font-black uppercase tracking-[0.35em] text-[#C8A646]">
Executive Workspace Command Center
</p>

<div className="mt-6 flex flex-col gap-6 md:flex-row md:items-start">
{companyLogoUrl ? (
<Image
src={companyLogoUrl}
alt={companyName}
width={96}
height={96}
className="h-24 w-24 rounded-3xl border border-white/10 bg-white object-contain p-2"
/>
) : (
<div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-3xl bg-white/10 text-4xl font-black text-white/50">
{companyInitial}
</div>
)}

<div>
<div className="flex flex-wrap items-center gap-3">
<h2 className="max-w-4xl break-words text-3xl font-black leading-tight sm:text-4xl lg:text-5xl">
{companyName}
</h2>

<span
className={`rounded-full px-4 py-2 text-xs font-black uppercase tracking-[0.15em] ${
  companyStatusIsVerified
    ? "bg-green-400/10 text-green-300"
    : "border border-white/10 bg-white/[0.055] text-slate-300"
}`}
>
{companyStatusLabel}
</span>
</div>

<p className="mt-4 max-w-3xl text-sm leading-7 text-slate-300">
Your procurement workspace is live. Complete setup, invite your
team, create your first RFQ, and activate executive procurement
intelligence.
</p>

<AccountIdentityLine
  firstName={userIdentityFirstName}
  lastName={userIdentityLastName}
  jobTitle={userIdentityJobTitle}
  email={userIdentityEmail}
  roleLabel={workspaceRoleLabel}
/>
</div>
</div>

<div className="mt-10 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
<CommandMetric title="Readiness" value={`${readinessScore}%`} />
<CommandMetric title="Stage" value={workspaceStage} />
<CommandMetric title="Team" value={memberCount} />
<CommandMetric title="Active RFQs" value={activeRfqCount} />
</div>

<div className="mt-8 flex flex-wrap gap-3">
<a
href="#invite-users"
className={`inline-flex min-h-11 items-center rounded-full bg-gradient-to-r from-[#B9902F] via-[#C8A646] to-[#F5D77B] px-5 py-3 text-sm font-black text-slate-950 shadow-[0_18px_55px_rgba(200,166,70,0.24)] ${EXECUTIVE_FOCUS_GOLD}`}
>
Invite Team
</a>

<Link
href="/rfq/new"
className={`inline-flex min-h-11 items-center rounded-full border border-white/10 bg-white/[0.045] px-5 py-3 text-sm font-black text-white transition hover:bg-white/[0.08] ${EXECUTIVE_FOCUS_CYAN}`}
>
Create RFQ
</Link>

<a
href="#company-profile"
className={`inline-flex min-h-11 items-center rounded-full border border-white/10 bg-white/10 px-5 py-3 text-sm font-black text-white transition hover:bg-white/15 ${EXECUTIVE_FOCUS_CYAN}`}
>
Complete Profile
</a>

<Link
href="/analytics"
className={`inline-flex min-h-11 items-center rounded-full border border-white/10 bg-white/10 px-5 py-3 text-sm font-black text-white transition hover:bg-white/15 ${EXECUTIVE_FOCUS_CYAN}`}
>
Launch Intelligence
</Link>
</div>
</div>

<aside className="border-t border-white/10 bg-white/5 p-10 lg:border-l lg:border-t-0">
<p className="text-xs font-black uppercase tracking-[0.3em] text-[#C8A646]">
Launch Readiness
</p>

<p className="mt-5 text-7xl font-black">{readinessScore}%</p>

<p className="mt-4 text-xl font-black text-white">{workspaceStage}</p>

<p className="mt-4 text-sm leading-7 text-slate-300">
{workspaceMessage}
</p>

<div className="mt-8 space-y-4">
<ReadinessItem label="Company profile" ready={hasCompanyProfile} />
<ReadinessItem label="Owner assigned" ready={hasOwner} />
<ReadinessItem label="Team member active" ready={memberCount >= 1} />
<ReadinessItem label="First RFQ created" ready={rfqCount > 0} />
</div>
</aside>
</div>
</section>

<section className="mt-8 grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
<ActionCard
title="Invite Team"
value="Add procurement, finance, operations, or executive stakeholders."
href="#invite-users"
/>

<ActionCard
title="Create First RFQ"
value="Start the first procurement workflow and activate RFQ intelligence."
href="/rfq/new"
/>

<ActionCard
title="Supplier Network"
value="Review supplier visibility and company directory readiness."
href="/directory"
/>

<ActionCard
title="Executive Analytics"
value="Open procurement intelligence, risk, confidence, and board reporting."
href="/analytics"
/>
</section>
</>
);
}

function CommandMetric({
title,
value,
}: {
title: string;
value: number | string;
}) {
return (
<div className="rounded-3xl bg-white/10 p-5">
<p className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">
{title}
</p>

<p className="mt-2 break-words text-2xl font-black text-white">{value}</p>
</div>
);
}

function ReadinessItem({ label, ready }: { label: string; ready: boolean }) {
return (
<div className="flex items-center justify-between rounded-2xl bg-white/10 px-4 py-3">
<p className="text-sm font-bold text-slate-200">{label}</p>

<span
className={`rounded-full px-3 py-1 text-xs font-black ${
ready
? "bg-green-400/10 text-green-300"
: "bg-amber-400/10 text-amber-200"
}`}
>
{ready ? "Ready" : "Next"}
</span>
</div>
);
}

function ActionCard({
title,
value,
href,
}: {
title: string;
value: string;
href: string;
}) {
return (
<Link
href={href}
className={`rounded-3xl border border-white/10 bg-white/[0.045] p-6 transition hover:border-[#2CC4E8]/25 hover:bg-white/[0.07] ${EXECUTIVE_FOCUS_CYAN}`}
>
<p className="text-lg font-black text-white">{title}</p>
<p className="mt-3 text-sm leading-6 text-slate-400">{value}</p>
</Link>
);
}