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
<main className="flex min-h-screen items-center justify-center bg-[#f6f6f3] px-6 py-10">
<div className="w-full max-w-lg rounded-[32px] border border-black/5 bg-white p-8 text-center">
<h1 className="text-3xl font-black text-slate-950">
Sign in required
</h1>

<p className="mt-3 text-sm leading-6 text-slate-600">
Please sign in to access your company workspace.
</p>

<Link
href="/login"
className="mt-6 inline-flex rounded-full bg-slate-950 px-6 py-3 text-sm font-bold text-white"
>
Sign in
</Link>
</div>
</main>
);
}

if (!typedCompany) {
return (
<main className="min-h-screen bg-[#f6f6f3] px-6 py-12">
<div className="mx-auto max-w-4xl">
<Link
href="/dashboard"
className="text-sm font-bold text-slate-500 hover:text-slate-950"
>
← Back to dashboard
</Link>

<section className="mt-8 rounded-[36px] border border-black/5 bg-white p-10">
<p className="text-xs font-black uppercase tracking-[0.35em] text-orange-500">
Company Workspace
</p>

<h1 className="mt-3 text-5xl font-black text-slate-950">
No company connected
</h1>

<p className="mt-4 max-w-2xl text-sm leading-6 text-slate-600">
Your profile is not attached to a company workspace yet. Create a
company workspace or accept an invitation from a company admin.
</p>

<div className="mt-6 flex flex-wrap gap-3">
<Link
href="/create-company"
className="inline-flex rounded-full bg-slate-950 px-6 py-3 text-sm font-bold text-white transition hover:bg-slate-800"
>
Create Company Workspace
</Link>

<Link
href="/dashboard"
className="inline-flex rounded-full bg-white px-6 py-3 text-sm font-bold text-slate-950 shadow-sm transition hover:shadow-md"
>
Back to Dashboard
</Link>
</div>
</section>
</div>
</main>
);
}

return (
<main className="min-h-screen bg-[#f6f6f3] px-6 py-12">
<div className="mx-auto max-w-7xl space-y-8">
<div className="flex items-center justify-between gap-6">
<Link
href="/dashboard"
className="text-sm font-bold text-slate-500 hover:text-slate-950"
>
← Back to dashboard
</Link>

<div className="flex items-center gap-3">
{typedCompany.slug ? (
<Link
href={`/company/${typedCompany.slug}`}
className="rounded-full bg-white px-5 py-3 text-sm font-bold text-slate-950 shadow-sm transition hover:shadow-md"
>
Public Profile
</Link>
) : null}

<Link
href="/rfq"
className="rounded-full bg-slate-950 px-5 py-3 text-sm font-bold text-white transition hover:bg-slate-800"
>
Open Marketplace
</Link>
</div>
</div>

<section className="rounded-[36px] border border-black/5 bg-white p-10">
<div className="flex flex-col gap-8 lg:flex-row lg:items-start lg:justify-between">
<div className="flex items-start gap-6">
{typedCompany.logo_url ? (
<img
src={typedCompany.logo_url}
alt={typedCompany.name || "Company"}
className="h-24 w-24 rounded-3xl border border-slate-200 bg-white object-contain p-2"
/>
) : (
<div className="flex h-24 w-24 items-center justify-center rounded-3xl bg-slate-100 text-4xl font-black text-slate-400">
{typedCompany.name?.charAt(0) || "C"}
</div>
)}

<div>
<p className="text-xs font-black uppercase tracking-[0.35em] text-orange-500">
Workspace Center
</p>

<div className="mt-3 flex flex-wrap items-center gap-3">
<h1 className="text-5xl font-black text-slate-950">
{typedCompany.name || "Company"}
</h1>

<span className="rounded-full bg-emerald-100 px-4 py-1 text-sm font-bold capitalize text-emerald-700">
{typedCompany.status || "verified"}
</span>
</div>

<p className="mt-3 text-lg font-semibold text-slate-600">
{typedCompany.category || "Enterprise"} ·{" "}
{typedCompany.location || "Location N/A"}
</p>

<p className="mt-2 text-sm font-bold uppercase tracking-[0.2em] text-slate-400">
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
<div className="rounded-[32px] border border-black/5 bg-white p-8">
<p className="text-xs font-black uppercase tracking-[0.3em] text-orange-500">
Company Profile
</p>

<h2 className="mt-3 text-3xl font-black text-slate-950">
Company Information
</h2>

<p className="mt-3 text-sm leading-6 text-slate-600">
Keep your company identity, market role, and location accurate
across Nexus Pavilion.
</p>

{canManage ? (
<CompanySettingsForm
companyId={typedCompany.id}
initialName={typedCompany.name || ""}
initialCategory={typedCompany.category || ""}
initialLocation={typedCompany.location || ""}
initialNetworkRole={
typedCompany.network_role || "Vendor / Supplier"
}
currentUserRole={userRole}
/>
) : (
<EmptyState message="You have read-only access to this company profile." />
)}
</div>

<div className="space-y-8">
<CompanyLogoUpload
companyId={typedCompany.id}
currentLogoUrl={typedCompany.logo_url}
/>

<div className="rounded-[32px] border border-black/5 bg-white p-8">
<p className="text-xs font-black uppercase tracking-[0.3em] text-orange-500">
Workspace Health
</p>

<h2 className="mt-3 text-3xl font-black text-slate-950">
Access Summary
</h2>

<div className="mt-6 space-y-4">
<RoleRow label="Admins" value={adminCount} />
<RoleRow label="Buyers" value={buyerCount} />
<RoleRow label="Vendors" value={vendorCount} />
<RoleRow label="Total Members" value={teamList.length} />
</div>
</div>
</div>
</section>

<InviteUserForm />

<section className="grid gap-8 lg:grid-cols-2">
<div className="rounded-[32px] border border-black/5 bg-white p-8">
<p className="text-xs font-black uppercase tracking-[0.3em] text-orange-500">
People & Access
</p>

<h2 className="mt-3 text-3xl font-black text-slate-950">
Company Members
</h2>

<p className="mt-3 text-sm leading-6 text-slate-600">
Active users currently connected to this company workspace.
</p>

<div className="mt-6 space-y-4">
{teamList.length > 0 ? (
teamList.map((member) => (
<div
key={member.id}
className="rounded-3xl border border-slate-100 bg-slate-50 p-5"
>
<div className="flex items-start justify-between gap-4">
<div>
<p className="text-lg font-black text-slate-950">
{member.email || "User"}
</p>

<p className="mt-1 text-sm font-bold text-slate-500">
{getRoleLabel(member.role)}
</p>

<p className="mt-2 text-xs font-bold text-slate-400">
Joined {formatDate(member.created_at)}
</p>
</div>

<span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-black text-emerald-700">
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
</div>

<div className="rounded-[32px] border border-black/5 bg-white p-8">
<p className="text-xs font-black uppercase tracking-[0.3em] text-orange-500">
Invitations
</p>

<h2 className="mt-3 text-3xl font-black text-slate-950">
Recent Invitations
</h2>

<p className="mt-3 text-sm leading-6 text-slate-600">
Manage pending and historical invitations for this workspace.
</p>

<div className="mt-6 space-y-4">
{invitationList.length > 0 ? (
invitationList.map((invite) => {
const inviteUrl = getInviteUrl(invite.token);

return (
<div
key={invite.id}
className="rounded-3xl border border-slate-100 bg-slate-50 p-5"
>
<div className="flex items-start justify-between gap-4">
<div>
<p className="text-lg font-black text-slate-950">
{invite.email || "No email"}
</p>

<p className="mt-1 text-sm font-bold text-slate-500">
{getRoleLabel(invite.role)}
</p>

<p className="mt-2 text-xs font-bold text-slate-400">
Created {formatDate(invite.created_at)}
</p>
</div>

<span className="rounded-full bg-orange-100 px-3 py-1 text-xs font-black capitalize text-orange-700">
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
</div>
</section>

<section className="grid gap-8 lg:grid-cols-[1fr_0.8fr]">
<div className="rounded-[32px] border border-black/5 bg-white p-8">
<p className="text-xs font-black uppercase tracking-[0.3em] text-orange-500">
Activity History
</p>

<h2 className="mt-3 text-3xl font-black text-slate-950">
Recent Workspace Activity
</h2>

<p className="mt-3 text-sm leading-6 text-slate-600">
A record of important company, invitation, member, and procurement
updates.
</p>

<div className="mt-6 space-y-4">
{activityList.length > 0 ? (
activityList.map((log) => (
<div
key={log.id}
className="rounded-3xl border border-slate-100 bg-slate-50 p-5"
>
<p className="text-sm font-black text-slate-950">
{getActivityLabel(log.action)}
</p>

<p className="mt-2 text-xs font-bold text-slate-400">
{formatDate(log.created_at)} ·{" "}
{log.entity_type || "workspace"}
</p>
</div>
))
) : (
<EmptyState message="No workspace activity has been recorded yet." />
)}
</div>
</div>

<div className="rounded-[32px] border border-slate-200 bg-white p-8">
<p className="text-xs font-black uppercase tracking-[0.3em] text-orange-500">
Workspace Governance
</p>

<h2 className="mt-3 text-3xl font-black text-slate-950">
Company Ownership & Controls
</h2>

<p className="mt-4 text-sm leading-7 text-slate-600">
Manage high-impact workspace actions such as ownership, archival,
and permanent removal. These controls are restricted to authorized
company leaders.
</p>

{canDelete ? (
<div className="mt-6 rounded-3xl border border-red-200 bg-red-50 p-5">
<p className="text-sm font-black text-red-700">
Permanent Workspace Removal
</p>

<p className="mt-2 text-sm leading-6 text-red-700">
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
</div>
</section>
</div>
</main>
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
<div className="rounded-3xl bg-slate-50 p-5">
<p className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">
{title}
</p>

<p className="mt-2 truncate text-2xl font-black text-slate-950">
{value}
</p>
</div>
);
}

function InfoCard({ title, value }: { title: string; value: string }) {
return (
<div className="rounded-3xl bg-slate-50 p-6">
<p className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">
{title}
</p>

<p className="mt-2 text-xl font-black text-slate-950">{value}</p>
</div>
);
}

function RoleRow({ label, value }: { label: string; value: number }) {
return (
<div className="flex items-center justify-between rounded-3xl bg-slate-50 p-5">
<p className="text-sm font-black text-slate-700">{label}</p>
<p className="text-2xl font-black text-slate-950">{value}</p>
</div>
);
}

function EmptyState({ message }: { message: string }) {
return (
<div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
<p className="text-sm font-bold text-slate-500">{message}</p>
</div>
);
}