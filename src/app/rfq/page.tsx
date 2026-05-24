const rfqs = [
{
id: "RFQ-2041",
project: "Downtown Mixed-Use Tower",
trade: "Interior Acoustics",
status: "Open",
dueDate: "2026-06-18",
},
{
id: "RFQ-2042",
project: "Transit Hub Expansion",
trade: "Curtain Wall Systems",
status: "Reviewing",
dueDate: "2026-06-22",
},
{
id: "RFQ-2043",
project: "Healthcare Campus Phase 2",
trade: "Metal Ceilings",
status: "Awarded",
dueDate: "2026-05-30",
},
];

function getStatusColor(status: string) {
switch (status) {
case "Open":
return "#d97706";
case "Reviewing":
return "#2563eb";
case "Awarded":
return "#059669";
default:
return "#6b7280";
}
}

export default function RFQPage() {
return (
<main className="min-h-screen bg-[#f7f7f5] p-10">
<div className="max-w-6xl mx-auto">
<p className="text-sm text-neutral-500 mb-4">
Procurement / RFQ Manager
</p>

<div className="flex items-center justify-between mb-8">
<div>
<h1 className="text-4xl font-semibold text-neutral-900">
RFQ Manager
</h1>

<p className="text-neutral-500 mt-2">
Review active procurement requests across the enterprise network.
</p>
</div>

<div className="bg-amber-100 text-amber-700 px-4 py-2 rounded-full text-sm font-medium">
Sandbox Mode
</div>
</div>

<div className="bg-white border border-neutral-200 rounded-3xl overflow-hidden">
<div className="grid grid-cols-4 gap-4 px-6 py-4 border-b border-neutral-200 bg-neutral-50 text-sm font-semibold text-neutral-500">
<div>RFQ ID</div>
<div>Project</div>
<div>Trade Package</div>
<div>Status</div>
</div>

{rfqs.map((rfq) => (
<div
key={rfq.id}
className="grid grid-cols-4 gap-4 px-6 py-5 border-b border-neutral-100 hover:bg-neutral-50 transition"
>
<div>
<p className="font-semibold text-neutral-900">{rfq.id}</p>

<p className="text-sm text-neutral-500 mt-1">
Due {rfq.dueDate}
</p>
</div>

<div className="text-neutral-700">
{rfq.project}
</div>

<div className="text-neutral-700">
{rfq.trade}
</div>

<div>
<span
className="px-3 py-1 rounded-full text-sm font-medium"
style={{
backgroundColor: `${getStatusColor(rfq.status)}20`,
color: getStatusColor(rfq.status),
}}
>
{rfq.status}
</span>
</div>
</div>
))}
</div>

<div className="mt-8 bg-white border border-neutral-200 rounded-3xl p-6">
<h2 className="text-lg font-semibold text-neutral-900 mb-2">
Procurement Notice
</h2>

<p className="text-neutral-600 leading-7">
Transactional procurement workflows remain limited while enterprise
verification is pending approval. Submission actions are currently
simulated inside sandbox mode.
</p>
</div>
</div>
</main>
);
}