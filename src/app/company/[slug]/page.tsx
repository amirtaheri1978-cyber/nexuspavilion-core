import Image from "next/image";
import Link from "next/link";

import StatusBadge from "@/components/ui/StatusBadge";
import { CompanyCapabilitiesDisplay } from "@/components/company-capabilities-display";
import { CompanyQualificationsDisplay } from "@/components/company-qualifications-display";
import {
  createEmptyGroupedCapabilities,
  hasAnyGroupedCapabilities,
  loadCompanyCapabilities,
} from "@/lib/company/capabilities";
import {
  createEmptyGroupedQualifications,
  hasAnyPublicGroupedQualifications,
  loadPublicCompanyQualifications,
} from "@/lib/company/qualifications";
import { createClient } from "@/lib/supabase/server";


type StatusBadgeValue = "SANDBOX" | "PENDING" | "APPROVED" | "REJECTED";

type Company = {
id: string;
name: string;
slug: string;
category: string | null;
location: string | null;
network_role: string | null;
status: string | null;
logo_url: string | null;
};

type RFQ = {
id: string;
slug: string | null;
title: string | null;
description: string | null;
category: string | null;
location: string | null;
budget: number | string | null;
status: string | null;
created_at: string | null;
};

type ActivityLog = {
id: string;
action: string | null;
entity_type: string | null;
metadata: Record<string, unknown> | null;
created_at: string | null;
};

type PageProps = {
params: Promise<{
slug: string;
}>;
};

function normalizeStatus(status: string | null): StatusBadgeValue {
const value = String(status || "").toLowerCase();

if (value === "verified" || value === "approved") return "APPROVED";
if (value === "pending") return "PENDING";
if (value === "rejected") return "REJECTED";

return "SANDBOX";
}

function getRFQStatusTone(status: string | null) {
if (status === "awarded") return "success";
if (status === "closed") return "neutral";

return "warning";
}

function getRFQStatusLabel(status: string | null) {
if (status === "awarded") return "Awarded";
if (status === "closed") return "Closed";

return "Open";
}

function formatDate(value: string | null) {
if (!value) return "N/A";

return new Intl.DateTimeFormat("en", {
month: "short",
day: "numeric",
year: "numeric",
}).format(new Date(value));
}

function formatMoney(value: number | string | null | undefined) {
const amount = Number(value);

if (!Number.isFinite(amount)) {
return "$0";
}

return `$${amount.toLocaleString()}`;
}

function getActivityLabel(action: string | null) {
if (action === "CONTRACT_AWARDED") return "Contract Awarded";
if (action === "QUOTE_SUBMITTED") return "Quote Submitted";
if (action === "RFQ_CREATED") return "RFQ Created";
if (action === "INVITATION_CREATED") return "Invitation Created";
if (action === "INVITATION_REVOKED") return "Invitation Revoked";
if (action === "MEMBER_ROLE_UPDATED") return "Member Role Updated";
if (action === "MEMBER_REMOVED") return "Member Removed";

return action || "Activity";
}

function getActivityIcon(action: string | null) {
if (action === "CONTRACT_AWARDED") return "🏆";
if (action === "QUOTE_SUBMITTED") return "💰";
if (action === "RFQ_CREATED") return "📋";
if (action === "INVITATION_CREATED") return "📨";
if (action === "INVITATION_REVOKED") return "⛔";
if (action === "MEMBER_ROLE_UPDATED") return "👥";
if (action === "MEMBER_REMOVED") return "🗑️";

return "⚡";
}

function getActivityDetail(log: ActivityLog) {
const metadata = log.metadata || {};

if (log.action === "CONTRACT_AWARDED") {
const title = metadata.rfq_title || "Procurement contract";
const amount = Number(metadata.awarded_amount || 0);

return `${title} awarded at $${amount.toLocaleString()}.`;
}

if (log.action === "QUOTE_SUBMITTED") {
const title = metadata.rfq_title || "RFQ";
const amount = Number(metadata.amount || 0);

return `Quote submitted for ${title} at $${amount.toLocaleString()}.`;
}

if (log.action === "RFQ_CREATED") {
const title = metadata.title || metadata.rfq_title || "New RFQ";

return `${title} was created.`;
}

if (log.action === "INVITATION_CREATED") {
const email = metadata.email || "A user";
const role = metadata.role || "member";

return `${email} was invited as ${role}.`;
}

if (log.action === "INVITATION_REVOKED") {
const email = metadata.email || "An invitation";

return `${email} was revoked.`;
}

if (log.action === "MEMBER_ROLE_UPDATED") {
const email = metadata.email || "A member";
const role = metadata.role || metadata.new_role || "updated role";

return `${email} role updated to ${role}.`;
}

if (log.action === "MEMBER_REMOVED") {
const email = metadata.email || "A member";

return `${email} was removed from the workspace.`;
}

return log.entity_type
? `${log.entity_type} activity was recorded.`
: "Workspace activity was recorded.";
}

export default async function PublicCompanyPage({ params }: PageProps) {
const { slug } = await params;
const supabase = await createClient();

const { data } = await supabase
.from("company_directory")
.select("id, name, slug, category, location, network_role, status, logo_url")
.eq("slug", slug)
.in("status", ["approved", "verified"])
.limit(1);

const company = data?.[0] as Company | undefined;

if (!company) {
return (
<SystemState
eyebrow="Public Company Profile"
title="Company profile unavailable."
description="This company profile does not exist, is not approved for public visibility, or is no longer available in the NexusPavilion directory."
primaryHref="/directory"
primaryLabel="Back to Directory"
secondaryHref="/"
secondaryLabel="Home"
/>
);
}

let companyCapabilities = createEmptyGroupedCapabilities();
let companyQualifications = createEmptyGroupedQualifications();

try {
  companyCapabilities = await loadCompanyCapabilities(supabase, company.id);
} catch (error) {
  console.error("Public company capabilities lookup failed.", {
    companyId: company.id,
    slug,
    error,
  });
}

try {
  companyQualifications = await loadPublicCompanyQualifications(
    supabase,
    company.id,
  );
} catch (error) {
  console.error("Public company qualifications lookup failed.", {
    companyId: company.id,
    slug,
    error,
  });
}

const { data: rfqs } = await supabase
.from("rfqs")
.select("*")
.eq("company_id", company.id)
.order("created_at", { ascending: false });

const { data: activityLogs } = await supabase
.from("audit_logs")
.select("id, action, entity_type, metadata, created_at")
.eq("company_id", company.id)
.order("created_at", { ascending: false })
.limit(10);

const rfqList = (rfqs ?? []) as RFQ[];
const activityList = (activityLogs ?? []) as ActivityLog[];

const totalRfqs = rfqList.length;
const openRfqs = rfqList.filter(
(rfq) => !rfq.status || rfq.status === "open"
).length;
const awardedRfqs = rfqList.filter((rfq) => rfq.status === "awarded").length;
const totalBudget = rfqList.reduce((total, rfq) => {
const budget = Number(rfq.budget);
return total + (Number.isNaN(budget) ? 0 : budget);
}, 0);

const awardRate =
totalRfqs > 0 ? Math.round((awardedRfqs / totalRfqs) * 100) : 0;

const recentRfqs = rfqList.slice(0, 6);

const isVendorProfile =
String(company.network_role || "").toLowerCase().includes("vendor") ||
String(company.network_role || "").toLowerCase().includes("supplier");

return (
<main className="relative min-h-screen overflow-hidden bg-[#061426] px-4 py-6 text-white sm:px-6 lg:px-10">
<div className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(circle_at_top_left,rgba(44,196,232,0.18),transparent_34%),radial-gradient(circle_at_top_right,rgba(200,166,70,0.15),transparent_30%),linear-gradient(180deg,#061426_0%,#07111F_45%,#020617_100%)]" />

<div className="mx-auto w-full max-w-[1680px]">
<div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
<Link
href="/directory"
className="inline-flex w-fit rounded-full border border-white/10 bg-white/[0.045] px-5 py-3 text-sm font-black text-slate-300 transition hover:bg-white/[0.08] hover:text-white"
>
← Back to Public Directory
</Link>

<div className="flex flex-wrap gap-3">
<Link
href="/rfq/new"
className="rounded-full border border-white/10 bg-white/[0.045] px-5 py-3 text-sm font-black text-white transition hover:bg-white/[0.08]"
>
Create RFQ
</Link>

<Link
href="/rfq"
className="rounded-full bg-gradient-to-r from-[#B9902F] via-[#C8A646] to-[#F5D77B] px-5 py-3 text-sm font-black text-slate-950 transition"
>
Open Procurement Center
</Link>
</div>
</div>

<section className="mt-8 rounded-[40px] border border-white/10 bg-white/[0.065] p-7 shadow-[0_36px_120px_rgba(0,0,0,0.52)] backdrop-blur-2xl sm:p-10">
<div className="flex flex-col gap-8 lg:flex-row lg:items-start lg:justify-between">
<div className="flex items-start gap-6">
{company.logo_url ? (
<Image
src={company.logo_url}
alt={company.name}
width={96}
height={96}
className="h-24 w-24 rounded-3xl border border-white/10 bg-white object-contain p-2"
/>
) : (
<div className="flex h-24 w-24 items-center justify-center rounded-3xl border border-white/10 bg-white/[0.055] text-4xl font-black text-slate-400">
{company.name.charAt(0)}
</div>
)}

<div>
<p className="text-xs font-black uppercase tracking-[0.35em] text-[#C8A646]">
Public Company Profile
</p>

<div className="mt-3 flex flex-wrap items-center gap-3">
<h1 className="max-w-4xl break-words text-3xl font-black tracking-[-0.05em] text-white sm:text-4xl lg:text-5xl">
{company.name}
</h1>

<StatusBadge status={normalizeStatus(company.status)} />
</div>

<p className="mt-4 text-lg font-semibold text-slate-300">
{company.category?.trim() || "Not specified"} ·{" "}
{company.location?.trim() || "Location N/A"}
</p>

<p className="mt-2 text-sm font-bold uppercase tracking-[0.2em] text-slate-400">
{company.network_role?.trim() || "Not specified"}
</p>
</div>
</div>

<div className="grid min-w-[280px] grid-cols-2 gap-4">
<MiniMetric title="Active RFQs" value={openRfqs} />
<MiniMetric title="Awarded RFQs" value={awardedRfqs} />
<MiniMetric title="Total RFQs" value={totalRfqs} />
<MiniMetric title="Award Rate" value={`${awardRate}%`} />
</div>
</div>
</section>

{hasAnyGroupedCapabilities(companyCapabilities) ? (
<section className="mt-8 rounded-[34px] border border-white/10 bg-white/[0.055] p-8 shadow-[0_30px_80px_rgba(0,0,0,0.35)]">
  <CompanyCapabilitiesDisplay
    capabilities={companyCapabilities}
    variant="public"
  />
</section>
) : null}

{hasAnyPublicGroupedQualifications(companyQualifications) ? (
<section className="mt-8 rounded-[34px] border border-white/10 bg-white/[0.055] p-8 shadow-[0_30px_80px_rgba(0,0,0,0.35)]">
  <CompanyQualificationsDisplay
    qualifications={companyQualifications}
    variant="public"
  />
</section>
) : null}

<section className="mt-8 grid gap-6 md:grid-cols-4">
<MetricCard
title="Total RFQs"
value={String(totalRfqs)}
detail="Public RFQ portfolio count"
/>

<MetricCard
title="Open RFQs"
value={String(openRfqs)}
detail="Currently open public procurement opportunities"
/>

<MetricCard
title="Procurement Volume"
value={formatMoney(totalBudget)}
detail="Published RFQ budget portfolio"
/>

<MetricCard
title="Award Rate"
value={`${awardRate}%`}
detail={`${awardedRfqs} of ${totalRfqs} RFQs marked awarded`}
/>
</section>
<section className="mt-8 grid gap-8 xl:grid-cols-[1.2fr_0.8fr]">
<div className="rounded-[34px] border border-white/10 bg-white/[0.055] p-8 shadow-[0_30px_80px_rgba(0,0,0,0.35)]">
<div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
<div>
<p className="text-xs font-black uppercase tracking-[0.30em] text-[#C8A646]">
Procurement Portfolio
</p>

<h2 className="mt-3 text-3xl font-black text-white">
Company RFQs
</h2>
</div>

<Link
href="/rfq"
className="inline-flex rounded-full bg-gradient-to-r from-[#B9902F] via-[#C8A646] to-[#F5D77B] px-5 py-3 text-sm font-black text-slate-950 transition"
>
Open Marketplace
</Link>
</div>

<div className="mt-7 space-y-5">
{recentRfqs.length > 0 ? (
recentRfqs.map((rfq) => {
return (
<Link
key={rfq.id}
href={rfq.slug ? `/rfq/${rfq.slug}` : "/rfq"}
className="group block rounded-[28px] border border-white/10 bg-[#07111F]/80 p-6 transition hover:-translate-y-1 hover:border-[#2CC4E8]/25 hover:bg-[#081827]"
>
<div className="flex flex-col items-start gap-6 sm:flex-row sm:justify-between">
<div className="min-w-0 flex-1">
<p className="text-xs font-black uppercase tracking-[0.22em] text-[#C8A646]">
{rfq.category || "Procurement"}
</p>

<h3 className="mt-3 break-words text-2xl font-black text-white">
{rfq.title || "Untitled RFQ"}
</h3>

<p className="mt-3 line-clamp-2 text-sm leading-7 text-slate-400">
{rfq.description ||
"No description has been provided for this procurement opportunity."}
</p>
</div>

<StatusPill tone={getRFQStatusTone(rfq.status)}>
{getRFQStatusLabel(rfq.status)}
</StatusPill>
</div>

<div className="mt-6 flex flex-wrap gap-3">
<InfoPill>
{rfq.location || "Location N/A"}
</InfoPill>

<InfoPill>
Budget {formatMoney(rfq.budget)}
</InfoPill>

<InfoPill>
Created {formatDate(rfq.created_at)}
</InfoPill>
</div>
</Link>
);
})
) : (
<EmptyState message="No RFQs have been created for this company yet." />
)}
</div>
</div>

<aside className="rounded-[34px] border border-white/10 bg-white/[0.055] p-8 shadow-[0_30px_80px_rgba(0,0,0,0.35)]">
<p className="text-xs font-black uppercase tracking-[0.30em] text-[#C8A646]">
Commercial Award Details
</p>

<h2 className="mt-3 text-3xl font-black text-white">
Access Restricted
</h2>

<p className="mt-5 text-sm font-semibold leading-7 text-slate-400">
Supplier pricing, award values, quote identity, and other commercial
submission evidence are not published on public company profiles.
Authorized procurement users can review commercial evidence only
through governed issuer workspaces after commercial opening.
</p>
</aside>
</section>

{isVendorProfile ? (
<section className="mt-8 rounded-[36px] border border-[#2CC4E8]/15 bg-gradient-to-br from-[#0B3D91]/30 via-[#07111F] to-[#061426] p-8 shadow-[0_0_80px_rgba(44,196,232,0.12)]">
<p className="text-xs font-black uppercase tracking-[0.30em] text-[#C8A646]">
Supplier Commercial Evidence
</p>

<h2 className="mt-4 text-4xl font-black text-white">
Access Restricted
</h2>

<p className="mt-5 max-w-4xl text-sm font-semibold leading-8 text-slate-300">
Commercial performance data is not published on public company
profiles. Submitted quote counts, pricing, win rate, awarded revenue,
average quote value, supplier ranking, and recommendation signals remain
inside authorized procurement workspaces and are subject to the
commercial-opening policy.
</p>
</section>
) : null}
<section className="mt-8 rounded-[34px] border border-white/10 bg-white/[0.055] p-8 shadow-[0_30px_80px_rgba(0,0,0,0.35)]">
<div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
<div>
<p className="text-xs font-black uppercase tracking-[0.30em] text-[#C8A646]">
Procurement Activity
</p>

<h2 className="mt-3 text-3xl font-black text-white">
Recent Procurement Activity
</h2>

<p className="mt-3 max-w-3xl text-sm font-semibold leading-7 text-slate-400">
Live company activity from RFQ creation, supplier submissions,
contract awards, invitations, and workspace management.
</p>
</div>

<Link
href="/analytics"
className="inline-flex rounded-full bg-gradient-to-r from-[#B9902F] via-[#C8A646] to-[#F5D77B] px-5 py-3 text-sm font-black text-slate-950 transition"
>
Open Analytics
</Link>
</div>

<div className="mt-7 space-y-5">
{activityList.length > 0 ? (
activityList.map((log) => (
<div
key={log.id}
className="rounded-[28px] border border-white/10 bg-[#07111F]/80 p-6"
>
<div className="flex items-start gap-5">
<div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.06] text-2xl">
{getActivityIcon(log.action)}
</div>

<div className="min-w-0 flex-1">
<div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
<div>
<p className="text-lg font-black text-white">
{getActivityLabel(log.action)}
</p>

<p className="mt-2 text-sm font-semibold leading-7 text-slate-400">
{getActivityDetail(log)}
</p>
</div>

<span className="rounded-full border border-white/10 bg-white/[0.055] px-3 py-1 text-xs font-black text-slate-400">
{formatDate(log.created_at)}
</span>
</div>

<p className="mt-4 text-xs font-black uppercase tracking-[0.2em] text-slate-400">
{log.entity_type || "activity"}
</p>
</div>
</div>
</div>
))
) : (
<EmptyState message="No procurement activity has been recorded yet." />
)}
</div>
</section>


<section className="mt-8 rounded-[34px] border border-white/10 bg-white/[0.055] p-8 shadow-[0_30px_80px_rgba(0,0,0,0.35)]">
<p className="text-xs font-black uppercase tracking-[0.30em] text-[#C8A646]">
Public Procurement Profile
</p>

<h2 className="mt-3 text-3xl font-black text-white">
Network Visibility
</h2>

<p className="mt-4 max-w-4xl text-sm font-semibold leading-7 text-slate-400">
This verified enterprise profile is publicly visible in the Nexus
Pavilion supply network. Public RFQ context, company capabilities,
qualifications, and non-commercial network information are available
here. Supplier submissions, pricing, commercial evaluations, award
values, and workspace administration require governed authenticated
access.
</p>
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
<div className="rounded-3xl border border-white/10 bg-white/[0.045] p-5">
<p className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">
{title}
</p>

<p className="mt-2 text-3xl font-black text-white">{value}</p>
</div>
);
}

function MetricCard({
title,
value,
detail,
}: {
title: string;
value: string;
detail: string;
}) {
return (
<div className="rounded-3xl border border-white/10 bg-white/[0.045] p-7">
<p className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">
{title}
</p>

<p className="mt-3 text-3xl font-black text-white">{value}</p>

<p className="mt-2 text-sm font-semibold leading-6 text-slate-400">
{detail}
</p>
</div>
);
}

function StatusPill({
children,
tone = "neutral",
}: {
children: React.ReactNode;
tone?: "success" | "warning" | "neutral";
}) {
const toneClass =
tone === "success"
? "border-emerald-300/20 bg-emerald-400/10 text-emerald-300"
: tone === "warning"
? "border-orange-300/20 bg-orange-400/10 text-orange-300"
: "border-white/10 bg-white/[0.055] text-slate-300";

return (
<span
className={`shrink-0 rounded-full border px-3 py-1 text-xs font-black uppercase tracking-[0.14em] ${toneClass}`}
>
{children}
</span>
);
}

function InfoPill({ children }: { children: React.ReactNode }) {
return (
<span className="max-w-full break-words rounded-full border border-white/10 bg-white/[0.055] px-3 py-1 text-xs font-black text-slate-300">
{children}
</span>
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
className="flex h-[56px] items-center justify-center rounded-2xl bg-gradient-to-r from-[#B9902F] via-[#C8A646] to-[#F5D77B] px-6 text-sm font-black uppercase tracking-[0.12em] text-slate-950 shadow-[0_18px_55px_rgba(200,166,70,0.3)] transition"
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

function EmptyState({ message }: { message: string }) {
return (
<div className="rounded-3xl border border-dashed border-white/15 bg-white/[0.035] p-8 text-center">
<p className="text-sm font-bold text-slate-400">{message}</p>
</div>
);
}