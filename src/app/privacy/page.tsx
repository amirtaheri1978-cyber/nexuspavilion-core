import type { Metadata } from "next";
import Link from "next/link";

const PRIVACY_TITLE = "Privacy | NexusPavilion";

export const metadata: Metadata = {
  title: {
    absolute: PRIVACY_TITLE,
  },
  description: "Privacy information for NexusPavilion services.",
  robots: {
    index: false,
    follow: true,
  },
};

const policySections = [
{
title: "Information We Collect",
content:
"We collect account information, company profiles, RFQs, supplier quotes, procurement records, analytics activity, invitation activity, and platform usage data required to operate Nexus Pavilion.",
},
{
title: "How Information Is Used",
content:
"Information is used to provide procurement workflows, supplier intelligence, analytics, notifications, reporting, workspace administration, and platform security.",
},
{
title: "Procurement Data Protection",
content:
"Procurement records, supplier submissions, quote details, company workspaces, and executive reporting data are protected through access controls, authenticated workflows, and role-based workspace permissions.",
},
{
title: "Data Sharing",
content:
"Nexus Pavilion does not sell customer data. Information is only shared when required for platform operations, legal obligations, authorized business activities, or user-directed collaboration workflows.",
},
{
title: "Account Security",
content:
"Organizations are responsible for managing authorized users, invitations, permissions, workspace access, password security, and internal procurement governance.",
},
{
title: "Analytics & Intelligence",
content:
"Platform analytics, supplier signals, procurement scores, forecasts, and executive insights are generated from available workspace activity and should be reviewed alongside professional judgment.",
},
{
title: "Policy Updates",
content:
"This policy may be updated periodically to reflect operational, legal, security, or platform improvements as Nexus Pavilion evolves.",
},
];

export default function PrivacyPage() {
return (
<main className="relative min-h-screen overflow-hidden bg-[#061426] px-4 py-6 text-white sm:px-6 lg:px-10">
<div className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(circle_at_top_left,rgba(44,196,232,0.18),transparent_34%),radial-gradient(circle_at_top_right,rgba(200,166,70,0.15),transparent_30%),linear-gradient(180deg,#061426_0%,#07111F_45%,#020617_100%)]" />

<div className="mx-auto w-full max-w-[1600px]">
<Link
href="/"
className="inline-flex rounded-full border border-white/10 bg-white/[0.05] px-5 py-3 text-sm font-black text-slate-300 transition hover:bg-white/[0.08] hover:text-white"
>
← Back to Home
</Link>

<section className="mt-6 rounded-[40px] border border-white/10 bg-white/[0.06] p-8 shadow-[0_36px_120px_rgba(0,0,0,0.45)] backdrop-blur-xl lg:p-10">
<p className="text-xs font-black uppercase tracking-[0.35em] text-[#C8A646]">
Privacy Policy
</p>

<h1 className="mt-4 text-5xl font-black tracking-[-0.05em] text-white sm:text-6xl">
Your Data & Privacy
</h1>

<p className="mt-6 max-w-4xl text-base font-semibold leading-8 text-slate-300">
Nexus Pavilion is committed to protecting company information,
procurement records, supplier data, executive reporting activity,
and user account information.
</p>

<div className="mt-8 flex flex-wrap gap-3">
<StatusPill>Workspace Protection</StatusPill>
<StatusPill>Role-Based Access</StatusPill>
<StatusPill>Procurement Records</StatusPill>
<StatusPill>Supplier Data</StatusPill>
</div>
</section>

<section className="mt-8 space-y-6">
{policySections.map((section) => (
<PolicySection
key={section.title}
title={section.title}
content={section.content}
/>
))}
</section>

<section className="mt-8 rounded-[34px] border border-[#2CC4E8]/20 bg-[#2CC4E8]/10 p-8">
<p className="text-xs font-black uppercase tracking-[0.25em] text-[#9BE8F8]">
Privacy Commitment
</p>

<h2 className="mt-3 text-3xl font-black text-white">
Built for secure enterprise procurement workflows.
</h2>

<p className="mt-4 max-w-4xl text-sm font-semibold leading-7 text-slate-300">
Nexus Pavilion is designed around secure workspace access,
controlled procurement visibility, supplier confidentiality, and
executive-level reporting governance.
</p>
</section>
</div>
</main>
);
}

function PolicySection({
title,
content,
}: {
title: string;
content: string;
}) {
return (
<section className="rounded-[34px] border border-white/10 bg-white/[0.055] p-8 shadow-[0_24px_80px_rgba(0,0,0,0.25)]">
<h2 className="text-2xl font-black text-white">{title}</h2>

<p className="mt-4 text-sm font-semibold leading-7 text-slate-400">
{content}
</p>
</section>
);
}

function StatusPill({ children }: { children: React.ReactNode }) {
return (
<span className="inline-flex rounded-full border border-[#2CC4E8]/25 bg-[#2CC4E8]/10 px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-[#9BE8F8]">
{children}
</span>
);
}