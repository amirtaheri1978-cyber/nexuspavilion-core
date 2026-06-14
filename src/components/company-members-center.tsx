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
<div className="rounded-[32px] border border-black/5 bg-white p-8">
<p className="text-xs font-black uppercase tracking-[0.3em] text-orange-500">
Company Profile
</p>

<h2 className="mt-3 text-3xl font-black text-slate-950">
Company Information
</h2>

<p className="mt-4 max-w-3xl text-sm leading-6 text-slate-600">
Keep company details accurate across procurement workflows, supplier
profiles, RFQs, and marketplace visibility.
</p>

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
</div>

<div className="space-y-8">
<CompanyLogoUpload
companyId={company.id}
currentLogoUrl={company.logo_url}
/>

<div className="rounded-[32px] border border-black/5 bg-white p-8">
<p className="text-xs font-black uppercase tracking-[0.3em] text-orange-500">
Access Summary
</p>

<h2 className="mt-3 text-3xl font-black text-slate-950">
Team Readiness
</h2>

<div className="mt-6 space-y-4">
<RoleRow
label="Owners/Admins"
value={adminsCount + (hasOwner ? 1 : 0)}
/>
<RoleRow label="Buyers" value={buyersCount} />
<RoleRow label="Vendors" value={vendorsCount} />
<RoleRow label="Total Members" value={members.length} />
</div>
</div>
</div>
</section>

<section
id="invite-users"
className="mt-8 rounded-[32px] border border-black/5 bg-white p-8"
>
<p className="text-xs font-black uppercase tracking-[0.3em] text-orange-500">
Team Activation
</p>

<h2 className="mt-3 text-3xl font-black text-slate-950">
Invite Workspace Members
</h2>

<p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
Bring buyers, admins, vendors, and project stakeholders into this
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
{members.length > 0 ? (
members.map((member) => (
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
inviteUrl={getInviteUrl(invitation, siteUrl)}
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
Manage ownership, recovery, and permanent workspace controls. These
actions are restricted to authorized company leaders.
</p>

<div className="mt-6 rounded-3xl bg-slate-50 p-5">
<p className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">
Security posture
</p>

<p className="mt-2 text-3xl font-black text-slate-950">
{workspaceStage}
</p>

<p className="mt-2 text-sm font-semibold leading-6 text-slate-600">
{governanceMessage}
</p>
</div>

{!company.user_id ? (
<div className="mt-6 rounded-3xl border border-orange-200 bg-orange-50 p-5">
<p className="text-sm font-black text-orange-700">
Emergency Ownership Recovery
</p>

<p className="mt-2 text-sm leading-6 text-orange-700">
If this workspace has no assigned owner, recover ownership for
the current authenticated workspace member.
</p>

<RecoverOwnershipButton />
</div>
) : (
<div className="mt-6 rounded-3xl border border-green-200 bg-green-50 p-5">
<p className="text-sm font-black text-green-700">
Ownership Active
</p>

<p className="mt-2 text-sm leading-6 text-green-700">
This workspace has an assigned owner and recovery mode is
disabled.
</p>
</div>
)}

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
id={company.id}
companyName={company.name || "Company Workspace"}
/>
</div>
</div>
) : (
<EmptyState message="Only authorized company leaders can manage workspace governance controls." />
)}
</div>
</section>
</>
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