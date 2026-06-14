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
return (
<main className="flex min-h-screen items-center justify-center bg-[#f6f6f3] p-8">
<div className="max-w-xl rounded-[32px] border border-black/5 bg-white p-8 text-center">
<h1 className="text-2xl font-black text-slate-950">
Company workspace unavailable
</h1>

<p className="mt-3 text-sm leading-6 text-slate-600">
You need to be signed in and connected to a company workspace to
manage company account settings.
</p>

<a
href="/dashboard"
className="mt-6 inline-flex rounded-full bg-slate-950 px-6 py-3 text-sm font-bold text-white"
>
Back to Dashboard
</a>
</div>
</main>
);
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
return (
<main className="flex min-h-screen items-center justify-center bg-[#f6f6f3] p-8">
<div className="max-w-xl rounded-[32px] border border-black/5 bg-white p-8 text-center">
<h1 className="text-2xl font-black text-slate-950">
Company not found
</h1>

<p className="mt-3 text-sm leading-6 text-slate-600">
We could not locate your company workspace.
</p>

<a
href="/dashboard"
className="mt-6 inline-flex rounded-full bg-slate-950 px-6 py-3 text-sm font-bold text-white"
>
Back to Dashboard
</a>
</div>
</main>
);
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
<main className="min-h-screen bg-[#f6f6f3] px-8 py-10">
<div className="mx-auto max-w-7xl">
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

<section className="mt-8 grid gap-6 md:grid-cols-4">
<FooterMetric title="Total RFQs" value={rfqCount || 0} />
<FooterMetric title="Active RFQs" value={activeRfqCount || 0} />
<FooterMetric title="Quotes" value={quoteCount || 0} />
<FooterMetric title="Awards" value={awardedCount || 0} />
</section>
</div>
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
<div className="rounded-3xl border border-black/5 bg-white p-6 shadow-sm">
<p className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">
{title}
</p>

<p className="mt-2 text-3xl font-black text-slate-950">{value}</p>
</div>
);
}