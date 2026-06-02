import Link from "next/link";

import { createClient } from "@/lib/supabase/server";

type RFQ = {
id: string;
slug: string;
title: string | null;
description: string | null;
category: string | null;
location: string | null;
budget: number | string | null;
status: string | null;
company_id: string | null;
created_at?: string | null;
};

type Profile = {
company_id: string | null;
role: string | null;
};

type Company = {
id: string;
network_role: string | null;
};

function getStatusLabel(status: string | null) {
if (status === "awarded") return "Awarded";
if (status === "closed") return "Closed";
return "Open";
}

function getStatusClass(status: string | null) {
if (status === "awarded") return "bg-green-100 text-green-700";
if (status === "closed") return "bg-slate-200 text-slate-600";
return "bg-orange-100 text-orange-700";
}

function getActionLabel(status: string | null) {
if (status === "awarded") return "View Award →";
if (status === "closed") return "View Closed →";
return "Open →";
}

function isSupplierCompany(networkRole: string | null | undefined) {
const value = String(networkRole || "").toLowerCase();

return value.includes("vendor") || value.includes("supplier");
}

function canCreateRFQ(networkRole: string | null | undefined) {
return !isSupplierCompany(networkRole);
}

function getPageDescription(networkRole: string | null | undefined) {
if (isSupplierCompany(networkRole)) {
return "Browse open procurement opportunities from enterprise buyers and submit supplier quotes.";
}

return "Browse, monitor, and manage procurement opportunities connected to your enterprise workspace.";
}

function getMarketplaceMode(networkRole: string | null | undefined) {
if (isSupplierCompany(networkRole)) {
return "Supplier View";
}

return "Buyer Workspace";
}

function isOpenRFQ(status: string | null) {
return !status || status === "open";
}

export default async function RFQMarketplacePage() {
const supabase = await createClient();

const {
data: { user },
} = await supabase.auth.getUser();

const { data: profileData } = user
? await supabase
.from("profiles")
.select("company_id, role")
.eq("id", user.id)
.single()
: { data: null };

const profile = profileData as Profile | null;

const { data: companyData } = profile?.company_id
? await supabase
.from("companies")
.select("id, network_role")
.eq("id", profile.company_id)
.single()
: { data: null };

const company = companyData as Company | null;
const supplierMode = isSupplierCompany(company?.network_role);

const { data: rfqs } = supplierMode
? await supabase
.from("rfqs")
.select("*")
.or("status.eq.open,status.is.null")
.neq("company_id", profile?.company_id || "")
.order("created_at", { ascending: false })
: profile?.company_id
? await supabase
.from("rfqs")
.select("*")
.eq("company_id", profile.company_id)
.order("created_at", { ascending: false })
: { data: [] };

const rfqList = (rfqs ?? []) as RFQ[];

const openCount = rfqList.filter((rfq) => isOpenRFQ(rfq.status)).length;

const awardedCount = rfqList.filter(
(rfq) => rfq.status === "awarded"
).length;

const closedCount = rfqList.filter((rfq) => rfq.status === "closed").length;

return (
<main className="min-h-screen bg-[#f6f6f3] px-8 py-10">
<div className="mx-auto max-w-7xl">
<div className="flex items-start justify-between gap-6">
<div>
<p className="text-xs font-black uppercase tracking-[0.35em] text-orange-500">
Procurement Marketplace
</p>

<h1 className="mt-3 text-5xl font-black text-slate-950">
RFQ Marketplace
</h1>

<p className="mt-4 max-w-2xl text-sm leading-6 text-slate-600">
{getPageDescription(company?.network_role)}
</p>

<p className="mt-3 text-xs font-black uppercase tracking-[0.2em] text-slate-400">
Marketplace Mode: {getMarketplaceMode(company?.network_role)}
</p>
</div>

{canCreateRFQ(company?.network_role) ? (
<Link
href="/rfq/new"
className="rounded-full bg-slate-950 px-6 py-3 text-sm font-bold text-white transition hover:bg-slate-800"
>
Create RFQ
</Link>
) : null}
</div>

<section className="mt-8 grid gap-4 md:grid-cols-4">
<StatusCard title="Total RFQs" value={rfqList.length} />
<StatusCard title="Open" value={openCount} />
<StatusCard title="Awarded" value={awardedCount} />
<StatusCard title="Closed" value={closedCount} />
</section>

<section className="mt-10 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
{rfqList.length > 0 ? (
rfqList.map((rfq) => (
<Link
key={rfq.id}
href={`/rfq/${rfq.slug}`}
className="group rounded-[28px] border border-black/5 bg-white p-7 transition hover:-translate-y-1 hover:shadow-xl"
>
<div className="flex items-start justify-between gap-4">
<p className="text-xs font-black uppercase tracking-[0.25em] text-orange-500">
{rfq.category || "Procurement"}
</p>

<span
className={`rounded-full px-3 py-1 text-xs font-black ${getStatusClass(
rfq.status
)}`}
>
{getStatusLabel(rfq.status)}
</span>
</div>

<h2 className="mt-3 text-2xl font-black text-slate-950">
{rfq.title || "Untitled RFQ"}
</h2>

<p className="mt-3 line-clamp-3 text-sm leading-relaxed text-slate-600">
{rfq.description || "No description provided."}
</p>

<div className="mt-6 grid grid-cols-2 gap-4 text-sm">
<div>
<p className="font-bold text-slate-400">Location</p>
<p className="mt-1 font-semibold text-slate-700">
{rfq.location || "N/A"}
</p>
</div>

<div>
<p className="font-bold text-slate-400">Budget</p>
<p className="mt-1 font-semibold text-slate-700">
${Number(rfq.budget || 0).toLocaleString()}
</p>
</div>
</div>

<div className="mt-6 flex items-center justify-between gap-4">
{supplierMode ? (
<span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-600">
Supplier Opportunity
</span>
) : (
<span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-600">
Your Company RFQ
</span>
)}

<span className="text-sm font-black text-slate-950 transition group-hover:translate-x-1">
{getActionLabel(rfq.status)}
</span>
</div>
</Link>
))
) : (
<div className="col-span-full rounded-[28px] border border-dashed border-slate-300 bg-white p-12 text-center">
<h2 className="text-2xl font-black text-slate-950">
No RFQs found
</h2>

<p className="mt-2 text-sm leading-6 text-slate-600">
{supplierMode
? "No open buyer RFQs are currently available for supplier quotes."
: "Create your first company-scoped procurement opportunity."}
</p>

{canCreateRFQ(company?.network_role) ? (
<Link
href="/rfq/new"
className="mt-6 inline-flex rounded-full bg-slate-950 px-6 py-3 text-sm font-bold text-white"
>
Create RFQ
</Link>
) : null}
</div>
)}
</section>
</div>
</main>
);
}

function StatusCard({ title, value }: { title: string; value: number }) {
return (
<div className="rounded-3xl border border-black/5 bg-white p-6">
<p className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">
{title}
</p>

<p className="mt-3 text-3xl font-black text-slate-950">{value}</p>
</div>
);
}