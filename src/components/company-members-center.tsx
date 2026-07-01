import CompanyLogoUpload from "@/components/company-logo-upload";
import CompanySettingsForm from "@/components/company-settings-form";
import DeleteCompanyButton from "@/components/connections/DeleteCompanyButton";
import InvitationActions from "@/components/invitation-actions";
import InviteUserForm from "@/components/invite-user-form";
import MemberActions from "@/components/member-actions";
import RecoverOwnershipButton from "@/components/recover-ownership-button";

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

type CompanyMembersCenterProps = {
company: Company;
currentProfile: Profile;
members: Profile[];
pendingInvitations: Invitation[];
activityList: AuditLog[];
adminsCount: number;
buyersCount: number;
vendorsCount: number;
hasOwner: boolean;
canManage: boolean;
canDelete: boolean;
workspaceStage: string;
governanceMessage: string;
siteUrl: string;
};

function getRoleLabel(role: string | null) {
if (role === "owner") return "Owner";
if (role === "admin") return "Admin";
if (role === "buyer") return "Buyer";
if (role === "vendor") return "Vendor";
return role || "Member";
}

function getRoleClass(role: string | null) {
if (role === "owner") return "border-purple-300/20 bg-purple-400/10 text-purple-200";
if (role === "admin") return "border-emerald-300/20 bg-emerald-400/10 text-emerald-200";
if (role === "buyer") return "border-[#2CC4E8]/25 bg-[#2CC4E8]/10 text-[#9BE8F8]";
if (role === "vendor") return "border-[#C8A646]/25 bg-[#C8A646]/10 text-[#F5D77B]";
return "border-white/10 bg-white/[0.055] text-slate-300";
}

function getStatusClass(status: string | null) {
if (status === "accepted" || status === "approved") {
return "border-emerald-300/20 bg-emerald-400/10 text-emerald-200";
}

if (status === "revoked" || status === "rejected") {
return "border-red-300/20 bg-red-400/10 text-red-200";
}

return "border-orange-300/20 bg-orange-400/10 text-orange-200";
}

function formatDate(value: string | null | undefined) {
if (!value) return "N/A";

return new Intl.DateTimeFormat("en", {
month: "short",
day: "numeric",
year: "numeric",
}).format(new Date(value));
}

function getInviteUrl(invitation: Invitation, siteUrl: string) {
if (!invitation.token) return siteUrl;
return `${siteUrl}/invite/${invitation.token}`;
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

export default function CompanyMembersCenter({
company,
currentProfile,
members,
pendingInvitations,
activityList,
adminsCount,
buyersCount,
vendorsCount,
hasOwner,
canManage,
canDelete,
workspaceStage,
governanceMessage,
siteUrl,
}: CompanyMembersCenterProps) {
return (
<>
<section
id="company-profile"
className="mt-8 grid gap-8 lg:grid-cols-[1.15fr_0.85fr]"
>
<ExecutivePanel
eyebrow="Company Profile"
title="Company Information"
description="Keep company details accurate across procurement workflows, supplier profiles, RFQs, and marketplace visibility."
>
{canManage ? (
<CompanySettingsForm
companyId={company.id}
initialName={company.name || ""}
initialCategory={company.category || ""}
initialLocation={company.location || ""}
initialNetworkRole={company.network_role || "Owner / Developer"}
currentUserRole={currentProfile.role || ""}
/>
) : (
<EmptyState message="You have read-only access to company profile settings." />
)}
</ExecutivePanel>

<div className="space-y-8">
<CompanyLogoUpload companyId={company.id} currentLogoUrl={company.logo_url} />

<ExecutivePanel
eyebrow="Access Summary"
title="Team Readiness"
description="Review workspace access distribution before scaling procurement activity."
>
<div className="mt-6 space-y-4">
<RoleRow label="Owners/Admins" value={adminsCount + (hasOwner ? 1 : 0)} />
<RoleRow label="Buyers" value={buyersCount} />
<RoleRow label="Vendors" value={vendorsCount} />
<RoleRow label="Total Members" value={members.length} />
</div>
</ExecutivePanel>
</div>
</section>

<ExecutivePanel
id="invite-users"
eyebrow="Team Activation"
title="Invite Workspace Members"
description="Bring buyers, admins, vendors, and project stakeholders into this company workspace."
>
{canManage ? (
<div className="mt-6">
<InviteUserForm />
</div>
) : (
<EmptyState message="You have read-only access to workspace invitations." />
)}
</ExecutivePanel>

<section className="mt-8 grid gap-8 lg:grid-cols-[1.4fr_0.8fr]">
<ExecutivePanel
eyebrow="People & Access"
title="Company Members"
description="Manage team roles, access levels, and active workspace participants."
action={
<span className="rounded-full border border-white/10 bg-white/[0.055] px-5 py-3 text-sm font-black text-white">
{canManage ? "Access Enabled" : "Read Only"}
</span>
}
>
<div className="mt-6 overflow-hidden rounded-[26px] border border-white/10 bg-[#061426]/70">
<div className="overflow-x-auto">
<table className="w-full min-w-[780px] text-left">
<thead className="border-b border-white/10 bg-white/[0.055] text-white">
<tr>
<th className="px-5 py-4 text-xs font-black uppercase tracking-[0.2em] text-slate-400">
Email
</th>
<th className="px-5 py-4 text-xs font-black uppercase tracking-[0.2em] text-slate-400">
Role
</th>
<th className="px-5 py-4 text-xs font-black uppercase tracking-[0.2em] text-slate-400">
Access
</th>
<th className="px-5 py-4 text-xs font-black uppercase tracking-[0.2em] text-slate-400">
Actions
</th>
</tr>
</thead>

<tbody>
{members.length > 0 ? (
members.map((member) => (
<tr key={member.id} className="border-t border-white/10">
<td className="px-5 py-4 align-top">
<p className="font-black text-white">
{member.email || "No email"}
</p>

{member.id === currentProfile.id ? (
<p className="mt-1 text-xs font-black text-[#F5D77B]">
Current user
</p>
) : null}
</td>

<td className="px-5 py-4 align-top">
<StatusPill className={getRoleClass(member.role)}>
{getRoleLabel(member.role)}
</StatusPill>
</td>

<td className="px-5 py-4 align-top">
<StatusPill className="border-emerald-300/20 bg-emerald-400/10 text-emerald-200">
Active
</StatusPill>
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
<td colSpan={4} className="px-5 py-10">
<EmptyState message="No members found." />
</td>
</tr>
)}
</tbody>
</table>
</div>
</div>
</ExecutivePanel>

<ExecutivePanel
eyebrow="Invitation Pipeline"
title="Pending Invites"
description="Track open invitations and secure workspace activation links."
>
<div className="mt-6 space-y-4">
{pendingInvitations.length > 0 ? (
pendingInvitations.slice(0, 6).map((invitation) => (
<div
key={invitation.id}
className="rounded-[26px] border border-white/10 bg-[#061426]/70 p-5"
>
<p className="font-black text-white">
{invitation.email || "No email"}
</p>

<div className="mt-3 flex flex-wrap items-center gap-2">
<StatusPill className={getStatusClass(invitation.status)}>
{invitation.status || "pending"}
</StatusPill>

<StatusPill className="border-white/10 bg-white/[0.055] text-slate-300">
{getRoleLabel(invitation.role)}
</StatusPill>
</div>

<p className="mt-3 text-xs font-bold text-slate-500">
Sent {formatDate(invitation.created_at)}
</p>

<InvitationActions
invitationId={invitation.id}
inviteUrl={getInviteUrl(invitation, siteUrl)}
status={invitation.status}
/>
</div>
))
) : (
<EmptyState message="No pending invitations." />
)}
</div>
</ExecutivePanel>
</section>

<section
id="activity-history"
className="mt-8 grid gap-8 lg:grid-cols-[1fr_0.85fr]"
>
<ExecutivePanel
eyebrow="Activity History"
title="Recent Workspace Activity"
description="Review governance, invitation, RFQ, quote, and award activity."
>
<div className="mt-6 space-y-4">
{activityList.length > 0 ? (
activityList.map((log) => (
<div
key={log.id}
className="rounded-[26px] border border-white/10 bg-[#061426]/70 p-5"
>
<p className="text-sm font-black text-white">
{getActivityLabel(log.action)}
</p>

<p className="mt-2 text-xs font-bold text-slate-500">
{formatDate(log.created_at)} · {log.entity_type || "workspace"}
</p>
</div>
))
) : (
<EmptyState message="No workspace activity has been recorded yet." />
)}
</div>
</ExecutivePanel>

<ExecutivePanel
id="governance"
eyebrow="Workspace Governance"
title="Company Ownership & Controls"
description="Manage ownership, recovery, and permanent workspace controls. These actions are restricted to authorized company leaders."
>
<div className="mt-6 rounded-[26px] border border-white/10 bg-[#061426]/70 p-5">
<p className="text-xs font-black uppercase tracking-[0.2em] text-slate-500">
Security posture
</p>

<p className="mt-2 text-3xl font-black text-white">{workspaceStage}</p>

<p className="mt-2 text-sm font-semibold leading-6 text-slate-400">
{governanceMessage}
</p>
</div>

{!company.user_id ? (
<div className="mt-6 rounded-[26px] border border-orange-300/20 bg-orange-400/10 p-5">
<p className="text-sm font-black text-orange-200">
Emergency Ownership Recovery
</p>

<p className="mt-2 text-sm leading-6 text-orange-200/80">
If this workspace has no assigned owner, recover ownership for
the current authenticated workspace member.
</p>

<RecoverOwnershipButton />
</div>
) : (
<div className="mt-6 rounded-[26px] border border-emerald-300/20 bg-emerald-400/10 p-5">
<p className="text-sm font-black text-emerald-200">
Ownership Active
</p>

<p className="mt-2 text-sm leading-6 text-emerald-200/80">
This workspace has an assigned owner and recovery mode is disabled.
</p>
</div>
)}

{canDelete ? (
<div className="mt-6 rounded-[26px] border border-red-300/20 bg-red-400/10 p-5">
<p className="text-sm font-black text-red-200">
Permanent Workspace Removal
</p>

<p className="mt-2 text-sm leading-6 text-red-200/80">
Removing this workspace permanently deletes the company record.
Use this only when the company workspace must be retired from
Nexus Pavilion.
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
</ExecutivePanel>
</section>
</>
);
}

function ExecutivePanel({
id,
eyebrow,
title,
description,
action,
children,
}: {
id?: string;
eyebrow: string;
title: string;
description?: string;
action?: React.ReactNode;
children: React.ReactNode;
}) {
return (
<section
id={id}
className="mt-8 rounded-[32px] border border-white/10 bg-white/[0.045] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.28)] backdrop-blur-xl sm:p-8"
>
<div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
<div>
<p className="text-xs font-black uppercase tracking-[0.3em] text-[#C8A646]">
{eyebrow}
</p>

<h2 className="mt-3 text-3xl font-black text-white">{title}</h2>

{description ? (
<p className="mt-3 max-w-3xl text-sm font-semibold leading-7 text-slate-400">
{description}
</p>
) : null}
</div>

{action}
</div>

{children}
</section>
);
}

function RoleRow({ label, value }: { label: string; value: number }) {
return (
<div className="flex items-center justify-between rounded-[24px] border border-white/10 bg-[#061426]/70 p-5">
<p className="text-sm font-black text-slate-300">{label}</p>
<p className="text-2xl font-black text-white">{value}</p>
</div>
);
}

function StatusPill({
children,
className,
}: {
children: React.ReactNode;
className: string;
}) {
return (
<span
className={`inline-flex rounded-full border px-3 py-1 text-xs font-black uppercase tracking-[0.12em] ${className}`}
>
{children}
</span>
);
}

function EmptyState({ message }: { message: string }) {
return (
<div className="rounded-[26px] border border-dashed border-white/15 bg-white/[0.035] p-8 text-center">
<p className="text-sm font-bold text-slate-500">{message}</p>
</div>
);
}