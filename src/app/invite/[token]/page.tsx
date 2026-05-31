import Link from "next/link";

import { createClient } from "@/lib/supabase/server";

const SITE_URL =
"https://scaling-invention-5g7q4p5rwrwj3vwq7-3000.app.github.dev";

type PageProps = {
params: Promise<{
token: string;
}>;
};

type Invitation = {
id: string;
company_id: string;
email: string;
role: string;
status: string;
token: string;
invited_by: string | null;
accepted_by: string | null;
accepted_at: string | null;
expires_at: string | null;
created_at: string | null;
companies?: {
id: string;
name: string | null;
slug: string | null;
category: string | null;
location: string | null;
logo_url: string | null;
} | null;
};

function formatRole(role: string | null | undefined) {
if (role === "admin") return "Admin";
if (role === "buyer") return "Buyer";
return "Vendor";
}

function isExpired(expiresAt: string | null) {
if (!expiresAt) return false;

return new Date(expiresAt).getTime() < Date.now();
}

function getAbsolutePath(path: string) {
return `${SITE_URL}${path}`;
}

export default async function InviteAcceptPage({ params }: PageProps) {
const { token } = await params;
const supabase = await createClient();

const {
data: { user },
} = await supabase.auth.getUser();

const { data: invitationData } = await supabase
.from("invitations")
.select(
`
*,
companies (
id,
name,
slug,
category,
location,
logo_url
)
`
)
.eq("token", token)
.single();

const invitation = invitationData as Invitation | null;

if (!invitation) {
return (
<main className="flex min-h-screen items-center justify-center bg-[#f6f6f3] px-6 py-10">
<InviteStateCard
title="Invitation not found"
message="This invitation link is invalid or no longer exists."
actionHref={getAbsolutePath("/login")}
actionLabel="Back to sign in"
/>
</main>
);
}

const expired = isExpired(invitation.expires_at);
const alreadyAccepted = invitation.status === "accepted";
const notPending = invitation.status !== "pending";
const userEmail = String(user?.email || "").toLowerCase();
const inviteEmail = String(invitation.email || "").toLowerCase();
const emailMismatch = Boolean(user && userEmail !== inviteEmail);

return (
<main className="min-h-screen bg-[#f6f6f3] px-6 py-10">
<div className="mx-auto max-w-4xl">
<Link
href={getAbsolutePath("/login")}
className="text-sm font-bold text-slate-500 hover:text-slate-950"
>
← Back to sign in
</Link>

<section className="mt-8 rounded-[36px] border border-black/5 bg-white p-10">
<div className="flex flex-col gap-8 md:flex-row md:items-start md:justify-between">
<div>
<p className="text-xs font-black uppercase tracking-[0.35em] text-orange-500">
Nexus Pavilion Invitation
</p>

<h1 className="mt-3 text-5xl font-black text-slate-950">
Join Company Workspace
</h1>

<p className="mt-4 max-w-2xl text-sm leading-6 text-slate-600">
You have been invited to join a secure procurement workspace.
Accepting this invitation will attach your account to the
company and assign your role.
</p>
</div>

<span className="rounded-full bg-orange-100 px-4 py-2 text-sm font-black text-orange-700">
{formatRole(invitation.role)}
</span>
</div>

<div className="mt-10 rounded-3xl bg-slate-50 p-6">
<div className="flex items-start gap-5">
{invitation.companies?.logo_url ? (
<img
src={invitation.companies.logo_url}
alt={invitation.companies.name || "Company"}
className="h-20 w-20 rounded-3xl border border-slate-200 bg-white object-contain p-2"
/>
) : (
<div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-white text-3xl font-black text-slate-500">
{invitation.companies?.name?.charAt(0) || "N"}
</div>
)}

<div>
<p className="text-xs font-black uppercase tracking-[0.25em] text-slate-400">
Company
</p>

<h2 className="mt-2 text-3xl font-black text-slate-950">
{invitation.companies?.name || "Company Workspace"}
</h2>

<p className="mt-2 text-sm font-semibold text-slate-600">
{invitation.companies?.category || "Enterprise"} ·{" "}
{invitation.companies?.location || "Location N/A"}
</p>
</div>
</div>
</div>

<div className="mt-6 grid gap-4 md:grid-cols-3">
<InfoBox title="Invited Email" value={invitation.email} />
<InfoBox title="Role" value={formatRole(invitation.role)} />
<InfoBox
title="Status"
value={expired ? "Expired" : invitation.status}
/>
</div>

<div className="mt-8">
{!user ? (
<div className="rounded-3xl bg-yellow-50 p-6">
<h3 className="text-xl font-black text-slate-950">
Sign in required
</h3>

<p className="mt-2 text-sm leading-6 text-slate-600">
Please sign in with the same email address this invitation was
sent to:
</p>

<p className="mt-3 text-sm font-black text-yellow-800">
{invitation.email}
</p>

<Link
href={getAbsolutePath("/login")}
className="mt-6 inline-flex rounded-full bg-slate-950 px-6 py-3 text-sm font-bold text-white"
>
Sign in to accept
</Link>
</div>
) : emailMismatch ? (
<div className="rounded-3xl bg-red-50 p-6">
<h3 className="text-xl font-black text-red-700">
Wrong account
</h3>

<p className="mt-2 text-sm leading-6 text-red-600">
This invitation was sent to {invitation.email}, but you are
signed in as {user.email}. Please sign out and use the invited
email address.
</p>

<Link
href={getAbsolutePath("/login")}
className="mt-6 inline-flex rounded-full bg-red-700 px-6 py-3 text-sm font-bold text-white"
>
Sign in with invited email
</Link>
</div>
) : expired ? (
<InviteStateCard
title="Invitation expired"
message="This invitation is no longer active. Please request a new invitation from your company admin."
actionHref={getAbsolutePath("/dashboard")}
actionLabel="Go to dashboard"
/>
) : alreadyAccepted ? (
<InviteStateCard
title="Invitation already accepted"
message="This invitation has already been accepted."
actionHref={getAbsolutePath("/dashboard")}
actionLabel="Go to dashboard"
/>
) : notPending ? (
<InviteStateCard
title="Invitation unavailable"
message="This invitation is no longer available."
actionHref={getAbsolutePath("/dashboard")}
actionLabel="Go to dashboard"
/>
) : (
<form action="/api/company-invitations/accept" method="POST">
<input type="hidden" name="token" value={invitation.token} />

<button
type="submit"
className="rounded-full bg-slate-950 px-7 py-4 text-sm font-bold text-white transition hover:bg-slate-800"
>
Accept Invitation
</button>
</form>
)}
</div>
</section>
</div>
</main>
);
}

function InfoBox({ title, value }: { title: string; value: string }) {
return (
<div className="rounded-3xl bg-white p-5 shadow-sm">
<p className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">
{title}
</p>

<p className="mt-2 break-all text-lg font-black text-slate-950">
{value}
</p>
</div>
);
}

function InviteStateCard({
title,
message,
actionHref,
actionLabel,
}: {
title: string;
message: string;
actionHref: string;
actionLabel: string;
}) {
return (
<div className="w-full max-w-lg rounded-[32px] border border-black/5 bg-white p-8 text-center">
<h1 className="text-3xl font-black text-slate-950">{title}</h1>

<p className="mt-3 text-sm leading-6 text-slate-600">{message}</p>

<Link
href={actionHref}
className="mt-6 inline-flex rounded-full bg-slate-950 px-6 py-3 text-sm font-bold text-white"
>
{actionLabel}
</Link>
</div>
);
}