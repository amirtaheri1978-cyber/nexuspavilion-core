import Link from "next/link";

import CompanyCommandCenter from "@/components/company-command-center";
import CompanyGovernanceCenter from "@/components/company-governance-center";
import CompanyMembersCenter from "@/components/company-members-center";
import { createClient } from "@/lib/supabase/server";


const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "";

type Profile = {
id: string;
email: string | null;
role: string | null;
company_id: string | null;
created_at?: string | null;
};

type Company = {
id: string;
name: string | null;
slug: string | null;
category: string | null;
location: string | null;
network_role: string | null;
status: string | null;
logo_url: string | null;
user_id: string | null;
};

type Invitation = {
id: string;
email: string | null;
role: string | null;
status: string | null;
created_at: string | null;
company_id: string | null;
token: string | null;
};

type AuditLog = {
id: string;
action: string | null;
entity_type: string | null;
created_at: string | null;
};

function getRoleLabel(role: string | null) {
if (role === "owner") return "Owner";
if (role === "admin") return "Admin";
if (role === "buyer") return "Buyer";
if (role === "vendor") return "Vendor";

return role || "Member";
}

function canManageWorkspace(role: string | null) {
return role === "owner" || role === "admin" || role === "buyer";
}

function canDeleteWorkspace(role: string | null) {
return role === "owner" || role === "admin";
}

function getWorkspaceReadiness({
memberCount,
hasOwner,
hasCompanyProfile,
rfqCount,
activityCount,
pendingInviteCount,
}: {
memberCount: number;
hasOwner: boolean;
hasCompanyProfile: boolean;
rfqCount: number;
activityCount: number;
pendingInviteCount: number;
}) {
let score = 45;

if (hasOwner) score += 15;
if (hasCompanyProfile) score += 15;
if (memberCount >= 1) score += 10;
if (memberCount >= 2) score += 8;
if (rfqCount > 0) score += 5;
if (activityCount > 0) score += 1;
if (pendingInviteCount <= 5) score += 1;

return Math.min(100, score);
}

function getWorkspaceStage(score: number, rfqCount: number) {
if (score >= 90) return "Launch Ready";
if (score >= 75) return "Healthy";
if (rfqCount === 0) return "Onboarding";

return "Needs Setup";
}

function getWorkspaceMessage(stage: string) {
if (stage === "Launch Ready") {
return "Workspace foundation is strong and ready for procurement execution.";
}

if (stage === "Healthy") {
return "Workspace is active. Complete the remaining setup steps to improve procurement readiness.";
}

if (stage === "Onboarding") {
return "Workspace is live. Invite your team, complete the profile, and create the first RFQ to activate procurement intelligence.";
}

return "Workspace requires setup attention before procurement operations begin.";
}

function getGovernanceMessage({
hasOwner,
adminCount,
pendingInviteCount,
}: {
hasOwner: boolean;
adminCount: number;
pendingInviteCount: number;
}) {
if (!hasOwner) {
return "Ownership is not assigned. Recover ownership before inviting additional stakeholders.";
}

if (adminCount === 0) {
return "Owner access is active. Add a backup admin before wider team rollout.";
}

if (adminCount === 1) {
return "Workspace governance is active. Add one backup admin for stronger access continuity.";
}

if (pendingInviteCount > 10) {
return "Several invitations are pending. Review stale invites before launch.";
}

return "Workspace governance controls are healthy and ready for procurement activity.";
}

export default async function CompanySettingsPage() {
const supabase = await createClient();

const {
data: { user },
} = await supabase.auth.getUser();

const { data: profile } = user
? await supabase
.from("profiles")
.select("id, email, role, company_id, created_at")
.eq("id", user.id)
.single()
: { data: null };

const currentProfile = profile as Profile | null;

if (!user || !currentProfile?.company_id) {
return <WorkspaceUnavailable />;
}

const companyId = currentProfile.company_id;

const { data: companyData } = await supabase
.from("companies")
.select(
"id, name, slug, category, location, network_role, status, logo_url, user_id"
)
.eq("id", companyId)
.single();

const company = companyData as Company | null;

if (!company) {
return <CompanyNotFound />;
}

const { data: members } = await supabase
.from("profiles")
.select("id, email, role, company_id, created_at")
.eq("company_id", companyId)
.order("email", { ascending: true });

const memberList = (members ?? []) as Profile[];

const { data: invitations } = await supabase
.from("invitations")
.select("id, company_id, email, role, status, token, created_at")
.eq("company_id", companyId)
.order("created_at", { ascending: false });

const invitationList = (invitations ?? []) as Invitation[];

const { data: auditLogs } = await supabase
.from("audit_logs")
.select("id, action, entity_type, created_at")
.eq("company_id", companyId)
.order("created_at", { ascending: false })
.limit(8);

const activityList = (auditLogs ?? []) as AuditLog[];

const { count: rfqCount } = await supabase
.from("rfqs")
.select("id", { count: "exact", head: true })
.eq("company_id", companyId);

const { count: activeRfqCount } = await supabase
.from("rfqs")
.select("id", { count: "exact", head: true })
.eq("company_id", companyId)
.eq("status", "open");

const { count: quoteCount } = await supabase
.from("quotes")
.select("id", { count: "exact", head: true })
.eq("company_id", companyId);

const { count: awardedCount } = await supabase
.from("quotes")
.select("id", { count: "exact", head: true })
.eq("company_id", companyId)
.eq("decision", "awarded");

const admins = memberList.filter((member) => member.role === "admin");
const buyers = memberList.filter((member) => member.role === "buyer");
const vendors = memberList.filter((member) => member.role === "vendor");

const pendingInvitations = invitationList.filter(
(invitation) =>
!invitation.status ||
invitation.status === "pending" ||
invitation.status === "sent"
);

const hasOwner = Boolean(company.user_id);
const hasCompanyProfile = Boolean(
company.name && company.category && company.location
);

const canManage = canManageWorkspace(currentProfile.role);
const canDelete = canDeleteWorkspace(currentProfile.role);

const readinessScore = getWorkspaceReadiness({
memberCount: memberList.length,
hasOwner,
hasCompanyProfile,
rfqCount: rfqCount || 0,
activityCount: activityList.length,
pendingInviteCount: pendingInvitations.length,
});

const workspaceStage = getWorkspaceStage(readinessScore, rfqCount || 0);
const workspaceMessage = getWorkspaceMessage(workspaceStage);

const governanceMessage = getGovernanceMessage({
hasOwner,
adminCount: admins.length,
pendingInviteCount: pendingInvitations.length,
});

return (
<main className="relative min-h-screen overflow-hidden bg-[#061426] px-4 py-6 text-white sm:px-6 lg:px-10">
<div className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(circle_at_top_left,rgba(44,196,232,0.18),transparent_34%),radial-gradient(circle_at_top_right,rgba(200,166,70,0.15),transparent_30%),linear-gradient(180deg,#061426_0%,#07111F_45%,#020617_100%)]" />
<div className="pointer-events-none fixed inset-0 -z-10 bg-[linear-gradient(120deg,rgba(255,255,255,0.055),transparent_32%,rgba(200,166,70,0.05)_66%,transparent)]" />

<div className="mx-auto w-full max-w-[1680px]">
<section className="mb-8 rounded-[34px] border border-white/10 bg-white/[0.045] p-6 shadow-[0_28px_90px_rgba(0,0,0,0.32)] backdrop-blur-2xl sm:p-8">
<div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
<div>
<p className="text-[11px] font-black uppercase tracking-[0.34em] text-[#C8A646]">
Enterprise Workspace Settings
</p>

<h1 className="mt-4 text-4xl font-black tracking-[-0.05em] text-white sm:text-5xl">
Company Command & Governance
</h1>

<p className="mt-4 max-w-4xl text-sm font-semibold leading-7 text-slate-300 sm:text-base">
Manage company identity, access governance, team structure,
invitations, procurement readiness, and workspace launch
controls from one executive-grade command layer.
</p>
</div>

<div className="flex flex-wrap gap-3">
<Link
href="/dashboard"
className="rounded-full border border-white/10 bg-white/[0.055] px-5 py-3 text-sm font-black text-white transition hover:bg-white/[0.08]"
>
Dashboard
</Link>

<Link
href="/rfq/new"
className="rounded-full bg-gradient-to-r from-[#B9902F] via-[#C8A646] to-[#F5D77B] px-5 py-3 text-sm font-black text-slate-950 shadow-[0_18px_55px_rgba(200,166,70,0.24)] transition hover:scale-[1.01]"
>
Create RFQ
</Link>

<Link
href="/analytics"
className="rounded-full border border-[#2CC4E8]/25 bg-[#2CC4E8]/10 px-5 py-3 text-sm font-black text-[#9BE8F8] transition hover:bg-[#2CC4E8]/15"
>
Executive Analytics
</Link>
</div>
</div>
</section>

<CompanyCommandCenter
companyName={company.name || "Company Workspace"}
companyStatus={company.status || "verified"}
companyLogoUrl={company.logo_url}
companySlug={company.slug}
userEmail={currentProfile.email || user.email || "User"}
userRole={getRoleLabel(currentProfile.role)}
readinessScore={readinessScore}
workspaceStage={workspaceStage}
workspaceMessage={workspaceMessage}
memberCount={memberList.length}
activeRfqCount={activeRfqCount || 0}
rfqCount={rfqCount || 0}
hasOwner={hasOwner}
hasCompanyProfile={hasCompanyProfile}
/>

<section className="mt-8 grid gap-6 md:grid-cols-2 xl:grid-cols-4">
<FooterMetric title="Total RFQs" value={rfqCount || 0} />
<FooterMetric title="Active RFQs" value={activeRfqCount || 0} />
<FooterMetric title="Quotes" value={quoteCount || 0} />
<FooterMetric title="Awards" value={awardedCount || 0} />
</section>

<CompanyGovernanceCenter
workspaceStage={workspaceStage}
governanceMessage={governanceMessage}
hasOwner={hasOwner}
adminCount={admins.length}
pendingInviteCount={pendingInvitations.length}
activityCount={activityList.length}
rfqCount={rfqCount || 0}
companyStatus={company.status || "verified"}
category={company.category || "N/A"}
location={company.location || "N/A"}
networkRole={company.network_role || "Enterprise Workspace"}
/>

<CompanyMembersCenter
company={company}
currentProfile={currentProfile}
members={memberList}
pendingInvitations={pendingInvitations}
activityList={activityList}
adminsCount={admins.length}
buyersCount={buyers.length}
vendorsCount={vendors.length}
hasOwner={hasOwner}
canManage={canManage}
canDelete={canDelete}
workspaceStage={workspaceStage}
governanceMessage={governanceMessage}
siteUrl={SITE_URL}
/>
</div>
</main>
);
}

function WorkspaceUnavailable() {
return (
<SystemState
eyebrow="Workspace Access Required"
title="Company workspace unavailable."
description="You need to be signed in and connected to a company workspace before managing company account settings."
primaryHref="/login"
primaryLabel="Sign In"
secondaryHref="/dashboard"
secondaryLabel="Back to Dashboard"
/>
);
}

function CompanyNotFound() {
return (
<SystemState
eyebrow="Workspace Not Found"
title="We could not locate your company workspace."
description="Your account is signed in, but the connected company workspace could not be loaded securely."
primaryHref="/create-company"
primaryLabel="Create Workspace"
secondaryHref="/dashboard"
secondaryLabel="Back to Dashboard"
/>
);
}

function SystemState({
eyebrow,
title,
description,
primaryHref,
primaryLabel,
secondaryHref,
secondaryLabel,
}: {
eyebrow: string;
title: string;
description: string;
primaryHref: string;
primaryLabel: string;
secondaryHref: string;
secondaryLabel: string;
}) {
return (
<main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#061426] px-4 py-10 text-white sm:px-6 lg:px-10">
<div className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(circle_at_top_left,rgba(44,196,232,0.18),transparent_34%),radial-gradient(circle_at_top_right,rgba(200,166,70,0.15),transparent_30%),linear-gradient(180deg,#061426_0%,#07111F_45%,#020617_100%)]" />

<section className="w-full max-w-2xl rounded-[40px] border border-white/10 bg-white/[0.065] p-8 text-center shadow-[0_36px_120px_rgba(0,0,0,0.52)] backdrop-blur-2xl sm:p-10">
<p className="text-xs font-black uppercase tracking-[0.34em] text-[#C8A646]">
{eyebrow}
</p>

<h1 className="mt-4 text-4xl font-black tracking-[-0.05em] text-white sm:text-5xl">
{title}
</h1>

<p className="mt-5 text-base font-semibold leading-8 text-slate-300">
{description}
</p>

<div className="mt-8 grid gap-3 sm:grid-cols-2">
<Link
href={primaryHref}
className="flex h-[56px] items-center justify-center rounded-2xl bg-gradient-to-r from-[#B9902F] via-[#C8A646] to-[#F5D77B] px-6 text-sm font-black uppercase tracking-[0.12em] text-slate-950 shadow-[0_18px_55px_rgba(200,166,70,0.3)] transition hover:scale-[1.01]"
>
{primaryLabel}
</Link>

<Link
href={secondaryHref}
className="flex h-[56px] items-center justify-center rounded-2xl border border-white/10 bg-white/[0.045] px-6 text-sm font-black text-white transition hover:bg-white/[0.08]"
>
{secondaryLabel}
</Link>
</div>
</section>
</main>
);
}

function FooterMetric({
title,
value,
}: {
title: string;
value: number | string;
}) {
return (
<div className="rounded-[28px] border border-white/10 bg-white/[0.045] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.26)] backdrop-blur-xl">
<p className="text-xs font-black uppercase tracking-[0.2em] text-slate-500">
{title}
</p>

<p className="mt-3 text-4xl font-black text-white">{value}</p>
</div>
);
}