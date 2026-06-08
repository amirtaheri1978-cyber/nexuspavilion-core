import Link from "next/link";

import CompanyLogoUpload from "@/components/company-logo-upload";
import CompanySettingsForm from "@/components/company-settings-form";
import DeleteCompanyButton from "@/components/connections/DeleteCompanyButton";
import InvitationActions from "@/components/invitation-actions";
import InviteUserForm from "@/components/invite-user-form";
import MemberActions from "@/components/member-actions";
import RecoverOwnershipButton from "@/components/recover-ownership-button";
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

function getRoleClass(role: string | null) {
if (role === "owner") return "bg-purple-100 text-purple-700";
if (role === "admin") return "bg-green-100 text-green-700";
if (role === "buyer") return "bg-blue-100 text-blue-700";
if (role === "vendor") return "bg-orange-100 text-orange-700";
return "bg-slate-100 text-slate-600";
}

function getStatusClass(status: string | null) {
if (status === "accepted" || status === "approved") {
return "bg-green-100 text-green-700";
}

if (status === "revoked" || status === "rejected") {
return "bg-red-100 text-red-700";
}

return "bg-yellow-100 text-yellow-700";
}

function formatDate(value: string | null | undefined) {
if (!value) return "N/A";

return new Intl.DateTimeFormat("en", {
month: "short",
day: "numeric",
year: "numeric",
}).format(new Date(value));
}

function getInviteUrl(invitation: Invitation) {
if (!invitation.token) return SITE_URL;
return `${SITE_URL}/invite/${invitation.token}`;
}

function getActivityLabel(action: string | null) {
if (action === "OWNER_RECOVERED") return "Ownership Recovered";
if (action === "ADMIN_RECOVERY_EXECUTED") return "Admin Recovery Executed";
if (action === "COMPANY_UPDATED") return "Company Profile Updated";
if (action === "COMPANY_DELETED") return "Workspace Removed";
if (action === "INVITATION_CREATED") return "Invitation Created";
if (action === "INVITATION_RESENT") return "Invitation Resent";
if (action === "INVITATION_REVOKED") return "Invitation Revoked";
if (action === "MEMBER_ROLE_UPDATED") return "Member Role Updated";
if (action === "MEMBER_REMOVED") return "Member Removed";
if (action === "RFQ_CREATED") return "RFQ Created";
if (action === "QUOTE_SUBMITTED") return "Quote Submitted";
if (action === "CONTRACT_AWARDED") return "Contract Awarded";

return action || "Workspace Activity";
}

function canManageWorkspace(role: string | null) {
return role === "owner" || role === "admin" || role === "buyer";
}

function canDeleteWorkspace(role: string | null) {
return role === "owner" || role === "admin";
}

function getRiskLevel(adminCount: number, pendingInvites: number) {
if (adminCount === 0) return "Critical";
if (adminCount === 1) return "Medium";
if (pendingInvites > 10) return "Medium";
return "Low";
}

function getRiskMessage(adminCount: number, pendingInvites: number) {
if (adminCount === 0) {
return "No workspace admin detected. Assign an admin immediately to secure company governance.";
}

if (adminCount === 1) {
return "Only one admin is active. Add a backup admin to prevent governance lockout.";
}

if (pendingInvites > 10) {
return "High number of pending invitations. Review and revoke stale invites.";
}

return "Workspace governance controls are healthy.";
}

function getWorkspaceScore({
adminCount,
memberCount,
pendingInviteCount,
activityCount,
hasOwner,
}: {
adminCount: number;
memberCount: number;
pendingInviteCount: number;
activityCount: number;
hasOwner: boolean;
}) {
let score = 65;

if (hasOwner) score += 10;
if (adminCount >= 1) score += 10;
if (adminCount >= 2) score += 8;
if (memberCount >= 2) score += 4;
if (pendingInviteCount <= 5) score += 2;
if (activityCount > 0) score += 1;

return Math.min(100, score);
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

<Link
href="/dashboard"
className="mt-6 inline-flex rounded-full bg-slate-950 px-6 py-3 text-sm font-bold text-white"
>
Back to Dashboard
</Link>
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

const hasOwner = Boolean(company?.user_id);
const canManage = canManageWorkspace(currentProfile.role);
const canDelete = canDeleteWorkspace(currentProfile.role);

const workspaceScore = getWorkspaceScore({
adminCount: admins.length,
memberCount: memberList.length,
pendingInviteCount: pendingInvitations.length,
activityCount: activityList.length,
hasOwner,
});

const governanceStatus =
workspaceScore >= 90
? "Strong"
: workspaceScore >= 75
? "Healthy"
: "Needs Review";

const riskLevel = getRiskLevel(admins.length, pendingInvitations.length);
const riskMessage = getRiskMessage(admins.length, pendingInvitations.length);

return (
<main className="min-h-screen bg-[#f6f6f3] px-8 py-10">
<div className="mx-auto max-w-7xl">
<div className="flex items-center justify-between gap-6">
<Link
href="/dashboard"
className="text-sm font-bold text-slate-500 hover:text-slate-950"
>
← Back to Dashboard
</Link>

<div className="flex flex-wrap items-center gap-3">
<Link
href="/rfq"
className="rounded-full bg-slate-950 px-5 py-3 text-sm font-bold text-white transition hover:bg-slate-800"
>
Open Marketplace
</Link>

{company?.slug ? (
<Link
href={`/company/${company.slug}`}
className="rounded-full bg-white px-5 py-3 text-sm font-bold text-slate-950 shadow-sm transition hover:shadow-md"
>
View Public Profile
</Link>
) : null}
</div>
</div>

<section className="mt-8 overflow-hidden rounded-[40px] border border-black/5 bg-slate-950 text-white">
<div className="p-10">
<div className="flex flex-col gap-8 lg:flex-row lg:items-start lg:justify-between">
<div className="flex items-start gap-6">
{company?.logo_url ? (
<img
src={company.logo_url}
alt={company.name || "Company"}
className="h-24 w-24 rounded-3xl border border-white/10 bg-white object-contain p-2"
/>
) : (
<div className="flex h-24 w-24 items-center justify-center rounded-3xl bg-white/10 text-4xl font-black text-white/50">
{company?.name?.charAt(0) || "C"}
</div>
)}

<div>
<p className="text-xs font-black uppercase tracking-[0.35em] text-orange-400">
Company Command Center
</p>

<div className="mt-3 flex flex-wrap items-center gap-3">
<h1 className="text-5xl font-black">
{company?.name || "Company Workspace"}
</h1>

<span className="rounded-full bg-green-400/10 px-4 py-2 text-xs font-black uppercase tracking-[0.15em] text-green-300">
{company?.status || "verified"}
</span>
</div>

<p className="mt-4 max-w-3xl text-sm leading-6 text-slate-300">
Centralized administration for company profile, team access,
procurement activity, invitations, audit history, and
workspace governance.
</p>

<p className="mt-3 text-sm font-bold uppercase tracking-[0.2em] text-slate-500">
Signed in as {currentProfile.email || user.email} ·{" "}
{getRoleLabel(currentProfile.role)}
</p>
</div>
</div>

<div className="rounded-3xl bg-white/10 p-6">
<p className="text-xs font-black uppercase tracking-[0.25em] text-slate-400">
Governance Score
</p>

<p className="mt-2 text-5xl font-black">{workspaceScore}</p>

<p className="mt-2 text-sm font-bold text-slate-300">
{governanceStatus}
</p>
</div>
</div>

<div className="mt-10 grid gap-4 md:grid-cols-4">
<CommandMetric title="Members" value={memberList.length} />
<CommandMetric title="Admins" value={admins.length} />
<CommandMetric
title="Pending Invites"
value={pendingInvitations.length}
/>
<CommandMetric title="Active RFQs" value={activeRfqCount || 0} />
<CommandMetric title="RFQs Created" value={rfqCount || 0} />
<CommandMetric title="Quotes" value={quoteCount || 0} />
<CommandMetric title="Awards" value={awardedCount || 0} />
<CommandMetric title="Audit Events" value={activityList.length} />
</div>

<div className="mt-8 flex flex-wrap gap-3">
<a
href="#invite-users"
className="rounded-full bg-orange-500 px-5 py-3 text-sm font-black text-white transition hover:bg-orange-600"
>
Invite User
</a>

<a
href="#company-profile"
className="rounded-full bg-white px-5 py-3 text-sm font-black text-slate-950 transition hover:bg-slate-100"
>
Edit Company
</a>

<a
href="#activity-history"
className="rounded-full bg-white/10 px-5 py-3 text-sm font-black text-white transition hover:bg-white/15"
>
View Activity
</a>

<a
href="#governance"
className="rounded-full bg-white/10 px-5 py-3 text-sm font-black text-white transition hover:bg-white/15"
>
Governance
</a>
</div>
</div>
</section>

<section className="mt-8 rounded-[32px] border border-black/5 bg-white p-8">
<div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
<div>
<p className="text-xs font-black uppercase tracking-[0.3em] text-orange-500">
Security & Risk Center
</p>

<h2 className="mt-3 text-3xl font-black text-slate-950">
Workspace Security Overview
</h2>

<p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
Nexus Pavilion continuously checks admin coverage, invitation
exposure, audit activity, ownership status, and governance
readiness for this company workspace.
</p>
</div>

<div className="rounded-3xl bg-slate-950 px-6 py-5 text-white">
<p className="text-xs font-black uppercase tracking-[0.25em] text-slate-400">
Overall Risk
</p>

<p className="mt-2 text-3xl font-black">{riskLevel}</p>
</div>
</div>

<div className="mt-6 grid gap-4 md:grid-cols-5">
<SecurityCheck
label="Owner"
status={hasOwner ? "Active" : "Missing"}
/>

<SecurityCheck
label="Admin Coverage"
status={
admins.length >= 2
? "Healthy"
: admins.length === 1
? "Medium"
: "Critical"
}
/>

<SecurityCheck
label="Audit Logging"
status={activityList.length > 0 ? "Active" : "No Events"}
/>

<SecurityCheck
label="Invitation Control"
status={pendingInvitations.length > 10 ? "Review" : "Healthy"}
/>

<SecurityCheck
label="Company Status"
status={company?.status || "verified"}
/>
</div>

<div className="mt-6 rounded-3xl bg-slate-50 p-5">
<p className="text-sm font-bold leading-6 text-slate-700">
{riskMessage}
</p>
</div>
</section>

<section className="mt-8 grid gap-6 md:grid-cols-3">
<InfoCard title="Category" value={company?.category || "N/A"} />
<InfoCard title="Location" value={company?.location || "N/A"} />
<InfoCard
title="Network Role"
value={company?.network_role || "Enterprise Workspace"}
/>
</section>

{company ? (
<section
id="company-profile"
className="mt-8 grid gap-8 lg:grid-cols-[1.15fr_0.85fr]"
>
<div className="rounded-[32px] border border-black/5 bg-white p-8">
<p className="text-xs font-black uppercase tracking-[0.3em] text-orange-500">
Company Profile
</p>

<h2 className="mt-3 text-3xl font-black text-slate-950">
Company Information
</h2>

<p className="mt-4 max-w-3xl text-sm leading-6 text-slate-600">
Keep company details accurate across Nexus Pavilion procurement
workflows, supplier profiles, RFQs, and marketplace visibility.
</p>

{canManage ? (
<CompanySettingsForm
companyId={company.id}
initialName={company.name || ""}
initialCategory={company.category || ""}
initialLocation={company.location || ""}
initialNetworkRole={
company.network_role || "Owner / Developer"
}
currentUserRole={currentProfile.role || ""}
/>
) : (
<EmptyState message="You have read-only access to company profile settings." />
)}
</div>

<div className="space-y-8">
<CompanyLogoUpload
companyId={company.id}
currentLogoUrl={company.logo_url}
/>

<div className="rounded-[32px] border border-black/5 bg-white p-8">
<p className="text-xs font-black uppercase tracking-[0.3em] text-orange-500">
Workspace Health
</p>

<h2 className="mt-3 text-3xl font-black text-slate-950">
Access Summary
</h2>

<div className="mt-6 space-y-4">
<RoleRow label="Admins" value={admins.length} />
<RoleRow label="Buyers" value={buyers.length} />
<RoleRow label="Vendors" value={vendors.length} />
<RoleRow label="Total Members" value={memberList.length} />
</div>
</div>
</div>
</section>
) : null}

<section
id="invite-users"
className="mt-8 rounded-[32px] border border-black/5 bg-white p-8"
>
<p className="text-xs font-black uppercase tracking-[0.3em] text-orange-500">
Invitations
</p>

<h2 className="mt-3 text-3xl font-black text-slate-950">
Invite Company Users
</h2>

<p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
Invite buyers, admins, vendors, and project stakeholders into this
company workspace.
</p>

{canManage ? (
<div className="mt-6">
<InviteUserForm />
</div>
) : (
<EmptyState message="You have read-only access to workspace invitations." />
)}
</section>

<section className="mt-8 grid gap-8 lg:grid-cols-[1.4fr_0.8fr]">
<div className="rounded-[32px] border border-black/5 bg-white p-8">
<div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
<div>
<p className="text-xs font-black uppercase tracking-[0.3em] text-orange-500">
People & Access
</p>

<h2 className="mt-3 text-3xl font-black text-slate-950">
Company Members
</h2>
</div>

<span className="rounded-full bg-slate-950 px-5 py-3 text-sm font-bold text-white">
{canManage ? "Access Enabled" : "Read Only"}
</span>
</div>

<div className="mt-6 overflow-hidden rounded-2xl border border-slate-200">
<table className="w-full text-left">
<thead className="bg-slate-950 text-white">
<tr>
<th className="px-5 py-4 text-sm">Email</th>
<th className="px-5 py-4 text-sm">Role</th>
<th className="px-5 py-4 text-sm">Access</th>
<th className="px-5 py-4 text-sm">Actions</th>
</tr>
</thead>

<tbody>
{memberList.length > 0 ? (
memberList.map((member) => (
<tr key={member.id} className="border-t border-slate-100">
<td className="px-5 py-4 align-top">
<p className="font-bold text-slate-950">
{member.email || "No email"}
</p>

{member.id === currentProfile.id ? (
<p className="mt-1 text-xs font-bold text-orange-500">
Current user
</p>
) : null}
</td>

<td className="px-5 py-4 align-top">
<span
className={`rounded-full px-3 py-1 text-xs font-black ${getRoleClass(
member.role
)}`}
>
{getRoleLabel(member.role)}
</span>
</td>

<td className="px-5 py-4 align-top">
<span className="rounded-full bg-green-100 px-3 py-1 text-xs font-black text-green-700">
Active
</span>
</td>

<td className="px-5 py-4 align-top">
<MemberActions
memberId={member.id}
memberEmail={member.email}
memberRole={member.role}
currentUserId={currentProfile.id}
currentUserRole={currentProfile.role}
/>
</td>
</tr>
))
) : (
<tr>
<td
colSpan={4}
className="px-5 py-10 text-center text-sm font-bold text-slate-500"
>
No members found.
</td>
</tr>
)}
</tbody>
</table>
</div>
</div>

<aside className="space-y-8">
<section className="rounded-[32px] border border-black/5 bg-white p-8">
<p className="text-xs font-black uppercase tracking-[0.3em] text-orange-500">
Invitation Pipeline
</p>

<h2 className="mt-3 text-3xl font-black text-slate-950">
Pending Invites
</h2>

<div className="mt-6 space-y-4">
{pendingInvitations.length > 0 ? (
pendingInvitations.slice(0, 6).map((invitation) => (
<div
key={invitation.id}
className="rounded-3xl border border-slate-100 bg-slate-50 p-5"
>
<p className="font-black text-slate-950">
{invitation.email || "No email"}
</p>

<div className="mt-3 flex flex-wrap items-center gap-2">
<span
className={`rounded-full px-3 py-1 text-xs font-black ${getStatusClass(
invitation.status
)}`}
>
{invitation.status || "pending"}
</span>

<span className="rounded-full bg-white px-3 py-1 text-xs font-black text-slate-600 shadow-sm">
{getRoleLabel(invitation.role)}
</span>
</div>

<p className="mt-3 text-xs font-bold text-slate-400">
Sent {formatDate(invitation.created_at)}
</p>

<InvitationActions
invitationId={invitation.id}
inviteUrl={getInviteUrl(invitation)}
status={invitation.status}
/>
</div>
))
) : (
<EmptyState message="No pending invitations." />
)}
</div>
</section>
</aside>
</section>

<section
id="activity-history"
className="mt-8 grid gap-8 lg:grid-cols-[1fr_0.85fr]"
>
<div className="rounded-[32px] border border-black/5 bg-white p-8">
<p className="text-xs font-black uppercase tracking-[0.3em] text-orange-500">
Activity History
</p>

<h2 className="mt-3 text-3xl font-black text-slate-950">
Recent Workspace Activity
</h2>

<p className="mt-3 text-sm leading-6 text-slate-600">
Important company updates, member changes, invitation events, and
procurement activity are tracked here.
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

{company ? (
<div
id="governance"
className="rounded-[32px] border border-slate-200 bg-white p-8"
>
<p className="text-xs font-black uppercase tracking-[0.3em] text-orange-500">
Workspace Governance
</p>

<h2 className="mt-3 text-3xl font-black text-slate-950">
Company Ownership & Controls
</h2>

<p className="mt-4 text-sm leading-7 text-slate-600">
Manage high-impact company workspace actions such as ownership,
archival, and permanent removal. These controls are restricted
to authorized company leaders.
</p>

<div className="mt-6 rounded-3xl bg-slate-50 p-5">
<p className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">
Security posture
</p>

<p className="mt-2 text-3xl font-black text-slate-950">
{governanceStatus}
</p>

<p className="mt-2 text-sm font-semibold leading-6 text-slate-600">
{hasOwner
? "Ownership is assigned and recovery mode is disabled."
: "No owner is assigned. Use recovery mode to restore governance."}
</p>
</div>

{!company.user_id ? (
<div className="mt-6 rounded-3xl border border-orange-200 bg-orange-50 p-5">
<p className="text-sm font-black text-orange-700">
Emergency Ownership Recovery
</p>

<p className="mt-2 text-sm leading-6 text-orange-700">
If this workspace has no assigned owner, recover ownership
for the current authenticated workspace member.
</p>

<RecoverOwnershipButton />
</div>
) : (
<div className="mt-6 rounded-3xl border border-green-200 bg-green-50 p-5">
<p className="text-sm font-black text-green-700">
Ownership Active
</p>

<p className="mt-2 text-sm leading-6 text-green-700">
This workspace has an assigned owner and emergency recovery
mode is disabled.
</p>
</div>
)}

{canDelete ? (
<div className="mt-6 rounded-3xl border border-red-200 bg-red-50 p-5">
<p className="text-sm font-black text-red-700">
Permanent Workspace Removal
</p>

<p className="mt-2 text-sm leading-6 text-red-700">
Removing this workspace permanently deletes the company
record. Use this only when the company workspace must be
retired from Nexus Pavilion.
</p>

<div className="mt-5">
<DeleteCompanyButton
id={company.id}
companyName={company.name || "Company Workspace"}
/>
</div>
</div>
) : (
<EmptyState message="Only authorized company leaders can manage workspace governance controls." />
)}
</div>
) : null}
</section>
</div>
</main>
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

<p className="mt-2 truncate text-3xl font-black text-white">{value}</p>
</div>
);
}

function SecurityCheck({ label, status }: { label: string; status: string }) {
return (
<div className="rounded-3xl bg-slate-50 p-5">
<p className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">
{label}
</p>

<p className="mt-2 text-lg font-black text-slate-950">{status}</p>
</div>
);
}

function InfoCard({ title, value }: { title: string; value: string }) {
return (
<div className="rounded-3xl bg-white p-6 shadow-sm">
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