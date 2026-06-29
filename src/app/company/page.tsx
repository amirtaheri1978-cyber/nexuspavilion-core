import Link from "next/link";

import CompanyLogoUpload from "@/components/company-logo-upload";
import CompanySettingsForm from "@/components/company-settings-form";
import DeleteCompanyButton from "@/components/connections/DeleteCompanyButton";
import InvitationActions from "@/components/invitation-actions";
import InviteUserForm from "@/components/invite-user-form";
import MemberActions from "@/components/member-actions";
import { createClient } from "@/lib/supabase/server";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "";

type Company = {
id: string;
name: string | null;
slug: string | null;
category: string | null;
location: string | null;
network_role: string | null;
status: string | null;
logo_url: string | null;
};

type Profile = {
id: string;
email: string | null;
role: string | null;
company_id: string | null;
created_at?: string | null;
};

type Invitation = {
id: string;
company_id: string;
email: string | null;
role: string | null;
status: string | null;
token: string | null;
created_at: string | null;
};

type AuditLog = {
id: string;
action: string | null;
entity_type: string | null;
metadata: Record<string, unknown> | null;
created_at: string | null;
};

function formatDate(value: string | null | undefined) {
if (!value) return "N/A";

return new Intl.DateTimeFormat("en", {
month: "short",
day: "numeric",
year: "numeric",
}).format(new Date(value));
}

function getInviteUrl(token: string | null) {
if (!token) return "";

return `${SITE_URL}/invite/${token}`;
}

function getRoleLabel(role: string | null) {
if (role === "admin") return "Admin";
if (role === "buyer") return "Buyer";
if (role === "vendor") return "Vendor";
if (role === "owner") return "Owner";

return role || "Member";
}

function getActivityLabel(action: string | null) {
if (action === "COMPANY_UPDATED") return "Company profile updated";
if (action === "COMPANY_DELETED") return "Workspace removed";
if (action === "INVITATION_CREATED") return "Invitation created";
if (action === "INVITATION_REVOKED") return "Invitation revoked";
if (action === "MEMBER_ROLE_UPDATED") return "Member role updated";
if (action === "MEMBER_REMOVED") return "Member removed";
if (action === "RFQ_CREATED") return "RFQ created";
if (action === "QUOTE_SUBMITTED") return "Quote submitted";
if (action === "CONTRACT_AWARDED") return "Contract awarded";

return action || "Workspace activity";
}

function canManageWorkspace(role: string | null) {
return role === "admin" || role === "buyer" || role === "owner";
}

function canDeleteWorkspace(role: string | null) {
return role === "admin" || role === "owner";
}

export default async function CompanyWorkspacePage() {
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

const typedProfile = profile as Profile | null;

const { data: company } = typedProfile?.company_id
? await supabase
.from("companies")
.select(
`
id,
name,
slug,
category,
location,
network_role,
status,
logo_url
`
)
.eq("id", typedProfile.company_id)
.single()
: { data: null };

const typedCompany = company as Company | null;

const { data: teamMembers } = typedCompany?.id
? await supabase
.from("profiles")
.select("id, email, role, company_id, created_at")
.eq("company_id", typedCompany.id)
.order("created_at", { ascending: true })
: { data: [] };

const { data: invitations } = typedCompany?.id
? await supabase
.from("invitations")
.select("id, company_id, email, role, status, token, created_at")
.eq("company_id", typedCompany.id)
.order("created_at", { ascending: false })
.limit(12)
: { data: [] };

const { data: auditLogs } = typedCompany?.id
? await supabase
.from("audit_logs")
.select("id, action, entity_type, metadata, created_at")
.eq("company_id", typedCompany.id)
.order("created_at", { ascending: false })
.limit(8)
: { data: [] };

const teamList = (teamMembers ?? []) as Profile[];
const invitationList = (invitations ?? []) as Invitation[];
const activityList = (auditLogs ?? []) as AuditLog[];

const pendingInvitationCount = invitationList.filter(
(invite) => invite.status === "pending"
).length;

const adminCount = teamList.filter((member) => member.role === "admin").length;
const buyerCount = teamList.filter((member) => member.role === "buyer").length;
const vendorCount = teamList.filter((member) => member.role === "vendor").length;

const userRole = typedProfile?.role || "buyer";
const canManage = canManageWorkspace(userRole);
const canDelete = canDeleteWorkspace(userRole);

if (!user) {
return (
<SystemState
eyebrow="Secure Access Required"
title="Sign in required."
description="Please sign in to access your company workspace and manage enterprise account settings."
primaryHref="/login"
primaryLabel="Sign In"
secondaryHref="/"
secondaryLabel="Back Home"
/>
);
}

if (!typedCompany) {
return (
<SystemState
eyebrow="Company Workspace"
title="No company connected."
description="Your profile is not attached to a company workspace yet. Create a workspace or accept an invitation from a company administrator."
primaryHref="/create-company"
primaryLabel="Create Workspace"
secondaryHref="/dashboard"
secondaryLabel="Back to Dashboard"
/>
);
}

return (
<main className="relative min-h-screen overflow-hidden bg-[#061426] px-4 py-6 text-white sm:px-6 lg:px-10">
<div className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(circle_at_top_left,rgba(44,196,232,0.18),transparent_34%),radial-gradient(circle_at_top_right,rgba(200,166,70,0.15),transparent_30%),linear-gradient(180deg,#061426_0%,#07111F_45%,#020617_100%)]" />

<div className="mx-auto w-full max-w-[1680px] space-y-8">
<div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
<Link
href="/dashboard"
className="inline-flex w-fit rounded-full border border-white/10 bg-white/[0.045] px-5 py-3 text-sm font-black text-slate-300 transition hover:bg-white/[0.08] hover:text-white"
>
← Back to Dashboard
</Link>

<div className="flex flex-wrap gap-3">
{typedCompany.slug ? (
<Link
href={`/company/${typedCompany.slug}`}
className="rounded-full border border-white/10 bg-white/[0.045] px-5 py-3 text-sm font-black text-white transition hover:bg-white/[0.08]"
>
Public Profile
</Link>
) : null}

<Link
href="/rfq"
className="rounded-full bg-gradient-to-r from-[#B9902F] via-[#C8A646] to-[#F5D77B] px-5 py-3 text-sm font-black text-slate-950 transition hover:scale-[1.01]"
>
Open Marketplace
</Link>
</div>
</div>

<section className="rounded-[40px] border border-white/10 bg-white/[0.065] p-7 shadow-[0_36px_120px_rgba(0,0,0,0.52)] backdrop-blur-2xl sm:p-10">
<div className="flex flex-col gap-8 lg:flex-row lg:items-start lg:justify-between">
<div className="flex items-start gap-6">
{typedCompany.logo_url ? (
<img
src={typedCompany.logo_url}
alt={typedCompany.name || "Company"}
className="h-24 w-24 rounded-3xl border border-white/10 bg-white object-contain p-2"
/>
) : (
<div className="flex h-24 w-24 items-center justify-center rounded-3xl border border-white/10 bg-white/[0.055] text-4xl font-black text-slate-400">
{typedCompany.name?.charAt(0) || "C"}
</div>
)}

<div>
<p className="text-xs font-black uppercase tracking-[0.35em] text-[#C8A646]">
Company Command Center
</p>

<div className="mt-3 flex flex-wrap items-center gap-3">
<h1 className="text-5xl font-black tracking-[-0.05em] text-white">
{typedCompany.name || "Company"}
</h1>

<span className="rounded-full border border-emerald-300/20 bg-emerald-400/10 px-4 py-1 text-sm font-black capitalize text-emerald-300">
{typedCompany.status || "verified"}
</span>
</div>

<p className="mt-3 text-lg font-semibold text-slate-300">
{typedCompany.category || "Enterprise"} ·{" "}
{typedCompany.location || "Location N/A"}
</p>

<p className="mt-2 text-sm font-bold uppercase tracking-[0.2em] text-slate-500">
Signed in as {typedProfile?.email || user.email} ·{" "}
{getRoleLabel(userRole)}
</p>
</div>
</div>

<div className="grid min-w-[280px] grid-cols-2 gap-4">
<MiniMetric title="Team Members" value={teamList.length} />
<MiniMetric title="Pending Invites" value={pendingInvitationCount} />
<MiniMetric title="Admins" value={adminCount} />
<MiniMetric title="Your Role" value={getRoleLabel(userRole)} />
</div>
</div>

<div className="mt-10 grid gap-6 md:grid-cols-3">
<InfoCard title="Category" value={typedCompany.category || "N/A"} />
<InfoCard title="Location" value={typedCompany.location || "N/A"} />
<InfoCard
title="Network Role"
value={typedCompany.network_role || "Enterprise Workspace"}
/>
</div>
</section>

<section className="grid gap-8 lg:grid-cols-[1.15fr_0.85fr]">
<Panel eyebrow="Company Profile" title="Company Information">
<p className="mt-3 text-sm font-semibold leading-6 text-slate-400">
Keep your company identity, market role, and location accurate
across Nexus Pavilion.
</p>

{canManage ? (
<CompanySettingsForm
companyId={typedCompany.id}
initialName={typedCompany.name || ""}
initialCategory={typedCompany.category || ""}
initialLocation={typedCompany.location || ""}
initialNetworkRole={typedCompany.network_role || "Vendor / Supplier"}
currentUserRole={userRole}
/>
) : (
<EmptyState message="You have read-only access to this company profile." />
)}
</Panel>

<div className="space-y-8">
<CompanyLogoUpload
companyId={typedCompany.id}
currentLogoUrl={typedCompany.logo_url}
/>

<Panel eyebrow="Workspace Health" title="Access Summary">
<div className="mt-6 space-y-4">
<RoleRow label="Admins" value={adminCount} />
<RoleRow label="Buyers" value={buyerCount} />
<RoleRow label="Vendors" value={vendorCount} />
<RoleRow label="Total Members" value={teamList.length} />
</div>
</Panel>
</div>
</section>

<InviteUserForm />

<section className="grid gap-8 lg:grid-cols-2">
<Panel eyebrow="People & Access" title="Company Members">
<p className="mt-3 text-sm font-semibold leading-6 text-slate-400">
Active users currently connected to this company workspace.
</p>

<div className="mt-6 space-y-4">
{teamList.length > 0 ? (
teamList.map((member) => (
<div
key={member.id}
className="rounded-3xl border border-white/10 bg-[#07111F]/75 p-5"
>
<div className="flex items-start justify-between gap-4">
<div>
<p className="text-lg font-black text-white">
{member.email || "User"}
</p>

<p className="mt-1 text-sm font-bold text-slate-400">
{getRoleLabel(member.role)}
</p>

<p className="mt-2 text-xs font-bold text-slate-500">
Joined {formatDate(member.created_at)}
</p>
</div>

<span className="rounded-full border border-emerald-300/20 bg-emerald-400/10 px-3 py-1 text-xs font-black text-emerald-300">
Active
</span>
</div>

<MemberActions
memberId={member.id}
memberEmail={member.email}
memberRole={member.role}
currentUserId={typedProfile?.id || user.id}
currentUserRole={userRole}
/>
</div>
))
) : (
<EmptyState message="No team members found yet." />
)}
</div>
</Panel>

<Panel eyebrow="Invitations" title="Recent Invitations">
<p className="mt-3 text-sm font-semibold leading-6 text-slate-400">
Manage pending and historical invitations for this workspace.
</p>

<div className="mt-6 space-y-4">
{invitationList.length > 0 ? (
invitationList.map((invite) => {
const inviteUrl = getInviteUrl(invite.token);

return (
<div
key={invite.id}
className="rounded-3xl border border-white/10 bg-[#07111F]/75 p-5"
>
<div className="flex items-start justify-between gap-4">
<div>
<p className="text-lg font-black text-white">
{invite.email || "No email"}
</p>

<p className="mt-1 text-sm font-bold text-slate-400">
{getRoleLabel(invite.role)}
</p>

<p className="mt-2 text-xs font-bold text-slate-500">
Created {formatDate(invite.created_at)}
</p>
</div>

<span className="rounded-full border border-orange-300/20 bg-orange-400/10 px-3 py-1 text-xs font-black capitalize text-orange-300">
{invite.status || "pending"}
</span>
</div>

<InvitationActions
invitationId={invite.id}
inviteUrl={inviteUrl}
status={invite.status}
/>
</div>
);
})
) : (
<EmptyState message="No invitations have been created yet." />
)}
</div>
</Panel>
</section>

<section className="grid gap-8 lg:grid-cols-[1fr_0.8fr]">
<Panel eyebrow="Activity History" title="Recent Workspace Activity">
<p className="mt-3 text-sm font-semibold leading-6 text-slate-400">
A record of important company, invitation, member, and procurement
updates.
</p>

<div className="mt-6 space-y-4">
{activityList.length > 0 ? (
activityList.map((log) => (
<div
key={log.id}
className="rounded-3xl border border-white/10 bg-[#07111F]/75 p-5"
>
<p className="text-sm font-black text-white">
{getActivityLabel(log.action)}
</p>

<p className="mt-2 text-xs font-bold text-slate-500">
{formatDate(log.created_at)} ·{" "}
{log.entity_type || "workspace"}
</p>
</div>
))
) : (
<EmptyState message="No workspace activity has been recorded yet." />
)}
</div>
</Panel>

<Panel
eyebrow="Workspace Governance"
title="Company Ownership & Controls"
>
<p className="mt-4 text-sm font-semibold leading-7 text-slate-400">
Manage high-impact workspace actions such as ownership, archival,
and permanent removal. These controls are restricted to authorized
company leaders.
</p>

{canDelete ? (
<div className="mt-6 rounded-3xl border border-red-300/20 bg-red-400/10 p-5">
<p className="text-sm font-black text-red-200">
Permanent Workspace Removal
</p>

<p className="mt-2 text-sm font-semibold leading-6 text-red-200">
Removing this workspace permanently deletes the company record.
Use this only when the company workspace must be retired from
Nexus Pavilion.
</p>

<div className="mt-5">
<DeleteCompanyButton
id={typedCompany.id}
companyName={typedCompany.name || "Company Workspace"}
/>
</div>
</div>
) : (
<EmptyState message="Only authorized company leaders can manage workspace governance controls." />
)}
</Panel>
</section>
</div>
</main>
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

function Panel({
eyebrow,
title,
children,
}: {
eyebrow: string;
title: string;
children: React.ReactNode;
}) {
return (
<section className="rounded-[32px] border border-white/10 bg-white/[0.045] p-8 shadow-[0_24px_80px_rgba(0,0,0,0.26)]">
<p className="text-xs font-black uppercase tracking-[0.3em] text-[#C8A646]">
{eyebrow}
</p>

<h2 className="mt-3 text-3xl font-black text-white">{title}</h2>

{children}
</section>
);
}

function MiniMetric({
title,
value,
}: {
title: string;
value: number | string;
}) {
return (
<div className="rounded-3xl border border-white/10 bg-white/[0.045] p-5">
<p className="text-xs font-black uppercase tracking-[0.2em] text-slate-500">
{title}
</p>

<p className="mt-2 truncate text-2xl font-black text-white">{value}</p>
</div>
);
}

function InfoCard({ title, value }: { title: string; value: string }) {
return (
<div className="rounded-3xl border border-white/10 bg-[#07111F]/75 p-6">
<p className="text-xs font-black uppercase tracking-[0.2em] text-slate-500">
{title}
</p>

<p className="mt-2 text-xl font-black text-white">{value}</p>
</div>
);
}

function RoleRow({ label, value }: { label: string; value: number }) {
return (
<div className="flex items-center justify-between rounded-3xl border border-white/10 bg-[#07111F]/75 p-5">
<p className="text-sm font-black text-slate-300">{label}</p>
<p className="text-2xl font-black text-white">{value}</p>
</div>
);
}

function EmptyState({ message }: { message: string }) {
return (
<div className="rounded-3xl border border-dashed border-white/15 bg-white/[0.035] p-8 text-center">
<p className="text-sm font-bold text-slate-500">{message}</p>
</div>
);
}