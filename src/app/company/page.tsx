import Link from "next/link";

import CompanyLogoUpload from "@/components/company-logo-upload";
import InviteUserForm from "@/components/invite-user-form";
import { createClient } from "@/lib/supabase/server";

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
};

export default async function CompanyWorkspacePage() {
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
.select("id, email, role, company_id")
.eq("company_id", typedCompany.id)
.order("created_at", { ascending: true })
: { data: [] };

const { data: invitations } = typedCompany?.id
? await supabase
.from("invitations")
.select("*")
.eq("company_id", typedCompany.id)
.order("created_at", { ascending: false })
.limit(8)
: { data: [] };

const teamList = (teamMembers ?? []) as Profile[];
const invitationList = invitations ?? [];

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
Your profile is not attached to a company workspace yet. Accept an
invitation or ask your workspace admin to invite your email.
</p>
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
Company Workspace
</p>

<div className="mt-3 flex flex-wrap items-center gap-3">
<h1 className="text-5xl font-black text-slate-950">
{typedCompany.name || "Company"}
</h1>

<span className="rounded-full bg-emerald-100 px-4 py-1 text-sm font-bold capitalize text-emerald-700">
{typedCompany.status || "sandbox"}
</span>
</div>

<p className="mt-3 text-lg font-semibold text-slate-600">
{typedCompany.category || "Enterprise"} ·{" "}
{typedCompany.location || "Location N/A"}
</p>

<p className="mt-2 text-sm font-bold uppercase tracking-[0.2em] text-slate-400">
Signed in as {typedProfile?.email || user.email} ·{" "}
{typedProfile?.role || "buyer"}
</p>
</div>
</div>

<div className="grid min-w-[280px] grid-cols-2 gap-4">
<MiniMetric title="Team Members" value={teamList.length} />
<MiniMetric title="Invitations" value={invitationList.length} />
<MiniMetric
title="Your Role"
value={typedProfile?.role || "buyer"}
/>
<MiniMetric title="Workspace" value="Active" />
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

<InviteUserForm />

<section className="grid gap-8 lg:grid-cols-2">
<div className="rounded-[32px] border border-black/5 bg-white p-8">
<p className="text-xs font-black uppercase tracking-[0.3em] text-orange-500">
Workspace Team
</p>

<h2 className="mt-3 text-3xl font-black text-slate-950">
Company Members
</h2>

<div className="mt-6 space-y-4">
{teamList.length > 0 ? (
teamList.map((member) => (
<div
key={member.id}
className="rounded-3xl border border-slate-100 bg-slate-50 p-5"
>
<p className="text-lg font-black text-slate-950">
{member.email || "User"}
</p>

<p className="mt-1 text-sm font-bold capitalize text-slate-500">
{member.role || "buyer"}
</p>
</div>
))
) : (
<EmptyState message="No team members found yet." />
)}
</div>
</div>

<div className="rounded-[32px] border border-black/5 bg-white p-8">
<p className="text-xs font-black uppercase tracking-[0.3em] text-orange-500">
Invitation Pipeline
</p>

<h2 className="mt-3 text-3xl font-black text-slate-950">
Recent Invitations
</h2>

<div className="mt-6 space-y-4">
{invitationList.length > 0 ? (
invitationList.map((invite: any) => (
<div
key={invite.id}
className="rounded-3xl border border-slate-100 bg-slate-50 p-5"
>
<div className="flex items-start justify-between gap-4">
<div>
<p className="text-lg font-black text-slate-950">
{invite.email}
</p>

<p className="mt-1 text-sm font-bold capitalize text-slate-500">
{invite.role || "vendor"}
</p>
</div>

<span className="rounded-full bg-orange-100 px-3 py-1 text-xs font-black capitalize text-orange-700">
{invite.status || "pending"}
</span>
</div>
</div>
))
) : (
<EmptyState message="No invitations have been created yet." />
)}
</div>
</div>
</section>

<CompanyLogoUpload
companyId={typedCompany.id}
currentLogoUrl={typedCompany.logo_url}
/>
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

function EmptyState({ message }: { message: string }) {
return (
<div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
<p className="text-sm font-bold text-slate-500">{message}</p>
</div>
);
}