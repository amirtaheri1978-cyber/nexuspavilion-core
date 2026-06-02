import Link from "next/link";

import InvitationActions from "@/components/invitation-actions";
import MemberActions from "@/components/member-actions";
import { createClient } from "@/lib/supabase/server";

type Profile = {
id: string;
email: string | null;
role: string | null;
company_id: string | null;
};

type Company = {
id: string;
name: string | null;
slug: string | null;
category: string | null;
location: string | null;
network_role: string | null;
status: string | null;
};

type Invitation = {
id: string;
email: string | null;
role: string | null;
status: string | null;
created_at: string | null;
company_id: string | null;
token: string | null;
invite_url?: string | null;
};

function getRoleLabel(role: string | null) {
if (role === "admin") return "Admin";
if (role === "buyer") return "Buyer";
if (role === "vendor") return "Vendor";
return role || "Member";
}

function getRoleClass(role: string | null) {
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

function formatDate(value: string | null) {
if (!value) return "N/A";

return new Intl.DateTimeFormat("en", {
month: "short",
day: "numeric",
year: "numeric",
}).format(new Date(value));
}

function getInviteUrl(invitation: Invitation) {
if (invitation.invite_url) return invitation.invite_url;

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "";

if (!invitation.token) return siteUrl;

return `${siteUrl}/invite/${invitation.token}`;
}

export default async function CompanySettingsPage() {
const supabase = await createClient();

const {
data: { user },
} = await supabase.auth.getUser();

const { data: profile } = user
? await supabase
.from("profiles")
.select("id, email, role, company_id")
.eq("id", user.id)
.single()
: { data: null };

const currentProfile = profile as Profile | null;

if (!user || !currentProfile?.company_id) {
return (
<main className="flex min-h-screen items-center justify-center bg-[#f6f6f3] p-8">
<div className="max-w-xl rounded-[32px] border border-black/5 bg-white p-8 text-center">
<h1 className="text-2xl font-black text-slate-950">
Company settings unavailable
</h1>

<p className="mt-3 text-sm leading-6 text-slate-600">
You need to be signed in and connected to a company workspace to
manage team settings.
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

const { data: companyData } = await supabase
.from("companies")
.select("id, name, slug, category, location, network_role, status")
.eq("id", currentProfile.company_id)
.single();

const company = companyData as Company | null;

const { data: members } = await supabase
.from("profiles")
.select("id, email, role, company_id")
.eq("company_id", currentProfile.company_id)
.order("email", { ascending: true });

const memberList = (members ?? []) as Profile[];

const { data: invitations } = await supabase
.from("company_invitations")
.select("*")
.eq("company_id", currentProfile.company_id)
.order("created_at", { ascending: false });

const invitationList = (invitations ?? []) as Invitation[];

const admins = memberList.filter((member) => member.role === "admin");
const buyers = memberList.filter((member) => member.role === "buyer");
const vendors = memberList.filter((member) => member.role === "vendor");

const pendingInvitations = invitationList.filter(
(invitation) =>
!invitation.status ||
invitation.status === "pending" ||
invitation.status === "sent"
);

const canManageTeam =
currentProfile.role === "admin" || currentProfile.role === "buyer";

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

{company?.slug ? (
<Link
href={`/company/${company.slug}`}
className="rounded-full bg-white px-5 py-3 text-sm font-bold text-slate-950 shadow-sm transition hover:shadow-md"
>
View Company Profile
</Link>
) : null}
</div>

<section className="mt-8 rounded-[36px] border border-black/5 bg-white p-10">
<div className="flex flex-col gap-8 lg:flex-row lg:items-start lg:justify-between">
<div>
<p className="text-xs font-black uppercase tracking-[0.35em] text-orange-500">
Enterprise Administration
</p>

<h1 className="mt-3 text-5xl font-black text-slate-950">
Company Settings
</h1>

<p className="mt-4 max-w-3xl text-sm leading-6 text-slate-600">
Manage workspace members, roles, pending invitations, and
company access controls for your Nexus Pavilion organization.
</p>
</div>

<div className="rounded-3xl bg-slate-50 p-6">
<p className="text-xs font-black uppercase tracking-[0.25em] text-slate-400">
Workspace
</p>

<h2 className="mt-2 text-2xl font-black text-slate-950">
{company?.name || "Company Workspace"}
</h2>

<p className="mt-2 text-sm font-semibold text-slate-600">
{company?.network_role || "Enterprise"} ·{" "}
{company?.location || "Location N/A"}
</p>
</div>
</div>
</section>

<section className="mt-8 grid gap-6 md:grid-cols-4">
<MetricCard
title="Members"
value={String(memberList.length)}
detail="Active company users"
/>

<MetricCard
title="Admins"
value={String(admins.length)}
detail="Workspace administrators"
/>

<MetricCard
title="Buyers"
value={String(buyers.length)}
detail="Procurement users"
/>

<MetricCard
title="Pending Invites"
value={String(pendingInvitations.length)}
detail="Awaiting acceptance"
highlight={pendingInvitations.length > 0}
/>
</section>

<section className="mt-8 grid gap-8 lg:grid-cols-[1.4fr_0.8fr]">
<div className="rounded-[32px] border border-black/5 bg-white p-8">
<div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
<div>
<p className="text-xs font-black uppercase tracking-[0.3em] text-orange-500">
Team Management
</p>

<h2 className="mt-3 text-3xl font-black text-slate-950">
Members
</h2>
</div>

<span className="rounded-full bg-slate-950 px-5 py-3 text-sm font-bold text-white">
{canManageTeam ? "Access Enabled" : "Read Only"}
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
Role Distribution
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
</section>

<section className="rounded-[32px] border border-black/5 bg-white p-8">
<p className="text-xs font-black uppercase tracking-[0.3em] text-orange-500">
Invitations
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

<section className="mt-8 rounded-[32px] border border-black/5 bg-white p-8">
<p className="text-xs font-black uppercase tracking-[0.3em] text-orange-500">
Access Control
</p>

<h2 className="mt-3 text-3xl font-black text-slate-950">
Enterprise Role Governance
</h2>

<p className="mt-4 max-w-4xl text-sm leading-7 text-slate-600">
Company settings are connected to existing member-management and
invitation APIs. This dashboard provides the executive visibility
layer for workspace access, role distribution, pending invitations,
invitation actions, member role updates, and member removal.
</p>
</section>
</div>
</main>
);
}

function MetricCard({
title,
value,
detail,
highlight,
}: {
title: string;
value: string;
detail: string;
highlight?: boolean;
}) {
return (
<div
className={`rounded-3xl border p-7 ${
highlight ? "border-yellow-200 bg-yellow-50" : "border-black/5 bg-white"
}`}
>
<p className="text-xs font-black uppercase tracking-[0.2em] text-slate-500">
{title}
</p>

<p className="mt-3 text-3xl font-black text-slate-950">{value}</p>

<p className="mt-2 text-sm font-semibold text-slate-500">{detail}</p>
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