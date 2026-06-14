type CompanyGovernanceCenterProps = {
workspaceStage: string;
governanceMessage: string;
hasOwner: boolean;
adminCount: number;
pendingInviteCount: number;
activityCount: number;
rfqCount: number;
companyStatus: string;
category: string;
location: string;
networkRole: string;
};

export default function CompanyGovernanceCenter({
workspaceStage,
governanceMessage,
hasOwner,
adminCount,
pendingInviteCount,
activityCount,
rfqCount,
companyStatus,
category,
location,
networkRole,
}: CompanyGovernanceCenterProps) {
return (
<>
<section className="mt-8 rounded-[36px] border border-black/5 bg-white p-8">
<div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
<div>
<p className="text-xs font-black uppercase tracking-[0.3em] text-orange-500">
Governance & Access Center
</p>

<h2 className="mt-3 text-3xl font-black text-slate-950">
Workspace Governance Overview
</h2>

<p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
Nexus Pavilion monitors ownership, admin coverage, invitations,
audit activity, and procurement readiness without alarming new
users with unnecessary critical warnings.
</p>
</div>

<div className="rounded-3xl bg-slate-950 px-6 py-5 text-white">
<p className="text-xs font-black uppercase tracking-[0.25em] text-slate-400">
Workspace Stage
</p>

<p className="mt-2 text-3xl font-black">{workspaceStage}</p>
</div>
</div>

<div className="mt-6 grid gap-4 md:grid-cols-5">
<SecurityCheck label="Owner" status={hasOwner ? "Active" : "Missing"} />

<SecurityCheck
label="Admin Coverage"
status={
adminCount >= 2 ? "Strong" : adminCount === 1 ? "Healthy" : "Owner Only"
}
/>

<SecurityCheck
label="Audit Logging"
status={activityCount > 0 ? "Active" : "Ready"}
/>

<SecurityCheck
label="Invitations"
status={
pendingInviteCount > 0 ? `${pendingInviteCount} Pending` : "Clear"
}
/>

<SecurityCheck
label="Procurement"
status={rfqCount > 0 ? "Active" : "Ready"}
/>
</div>

<div className="mt-6 rounded-3xl bg-slate-50 p-5">
<p className="text-sm font-bold leading-6 text-slate-700">
{governanceMessage}
</p>
</div>
</section>

<section className="mt-8 grid gap-6 md:grid-cols-4">
<InfoCard title="Category" value={category || "N/A"} />
<InfoCard title="Regional Hub" value={location || "N/A"} />
<InfoCard title="Network Role" value={networkRole || "Enterprise Workspace"} />
<InfoCard title="Company Status" value={companyStatus || "Verified"} />
</section>
</>
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