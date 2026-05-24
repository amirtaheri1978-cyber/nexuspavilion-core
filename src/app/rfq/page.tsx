import Link from "next/link";

import { rfqs } from "@/data/rfqs";

function getStatusStyle(status: string) {
switch (status) {
case "OPEN":
return "bg-amber-100 text-amber-700";
case "REVIEWING":
return "bg-blue-100 text-blue-700";
case "AWARDED":
return "bg-emerald-100 text-emerald-700";
default:
return "bg-slate-100 text-slate-700";
}
}

function formatStatus(status: string) {
const statusMap: Record<string, string> = {
OPEN: "Open",
REVIEWING: "Reviewing",
AWARDED: "Awarded",
};

return statusMap[status] ?? status;
}

export default function RFQPage() {
return (
<main className="min-h-screen bg-[#f7f7f5] p-10">
<div className="mx-auto max-w-6xl">
<Link
href="/dashboard"
className="mb-6 inline-block text-sm font-medium text-neutral-500 hover:text-neutral-900"
>
← Back to Dashboard
</Link>

<p className="mb-4 text-sm text-neutral-500">
Procurement / RFQ Manager
</p>

<div className="mb-8 flex items-center justify-between">
<div>
<h1 className="text-4xl font-semibold text-neutral-900">
RFQ Manager
</h1>

<p className="mt-2 text-neutral-500">
Review active procurement requests across the enterprise network.
</p>
</div>

<div className="rounded-full bg-amber-100 px-4 py-2 text-sm font-medium text-amber-700">
Sandbox Mode
</div>
</div>

<div className="overflow-hidden rounded-3xl border border-neutral-200 bg-white">
<div className="grid grid-cols-4 gap-4 border-b border-neutral-200 bg-neutral-50 px-6 py-4 text-sm font-semibold text-neutral-500">
<div>RFQ ID</div>
<div>Project</div>
<div>Trade Package</div>
<div>Status</div>
</div>

{rfqs.map((rfq) => (
<Link
key={rfq.id}
href={`/rfq/${rfq.slug}`}
className="grid grid-cols-4 gap-4 border-b border-neutral-100 px-6 py-5 transition hover:bg-neutral-50"
>
<div>
<p className="font-semibold text-neutral-900">
{rfq.id}
</p>

<p className="mt-1 text-sm text-neutral-500">
Due {rfq.dueDate}
</p>
</div>

<div className="text-neutral-700">
{rfq.project}
</div>

<div className="text-neutral-700">
{rfq.tradePackage}
</div>

<div>
<span
className={`rounded-full px-3 py-1 text-sm font-medium ${getStatusStyle(
rfq.status
)}`}
>
{formatStatus(rfq.status)}
</span>
</div>
</Link>
))}
</div>

<div className="mt-8 rounded-3xl border border-neutral-200 bg-white p-6">
<h2 className="mb-2 text-lg font-semibold text-neutral-900">
Procurement Notice
</h2>

<p className="leading-7 text-neutral-600">
Transactional procurement workflows remain limited while enterprise
verification is pending approval. Submission actions are currently
simulated inside sandbox mode.
</p>
</div>
</div>
</main>
);
}