import Link from "next/link";

const sections = [
{
title: "Platform Usage",
content:
"Users are responsible for maintaining accurate company information, protecting account credentials, and ensuring that only authorized personnel access company workspaces.",
},
{
title: "Procurement Activities",
content:
"RFQs, supplier quotes, evaluations, negotiations, procurement decisions, and contract awards remain the sole responsibility of participating organizations. Nexus Pavilion provides collaboration and intelligence tools but does not participate in commercial decisions.",
},
{
title: "Company Accounts",
content:
"Organizations are responsible for user management, invitations, role assignments, approval workflows, and maintaining the security of their procurement workspace.",
},
{
title: "Supplier Intelligence",
content:
"Supplier rankings, executive insights, procurement scores, analytics, forecasts, and AI-generated recommendations are intended to support decision making and should not replace professional judgment.",
},
{
title: "Data Accuracy",
content:
"Users are responsible for the accuracy of submitted RFQs, supplier information, quotations, budgets, and procurement records. Platform analytics depend on the quality of available data.",
},
{
title: "Service Availability",
content:
"Platform features may evolve, be updated, or become temporarily unavailable during maintenance, security improvements, or infrastructure upgrades.",
},
{
title: "Limitation of Liability",
content:
"To the maximum extent permitted by applicable law, Nexus Pavilion shall not be liable for indirect, incidental, special, consequential, or business losses arising from use of the platform or procurement decisions made by users.",
},
];

export default function TermsPage() {
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
Terms of Service
</p>

<h1 className="mt-4 text-5xl font-black tracking-[-0.05em] text-white sm:text-6xl">
Nexus Pavilion Terms
</h1>

<p className="mt-6 max-w-4xl text-base font-semibold leading-8 text-slate-300">
By accessing or using Nexus Pavilion, you agree to these Terms of
Service. These terms govern platform usage, company accounts,
procurement activities, supplier participation, executive
intelligence, and related services.
</p>

<div className="mt-8 flex flex-wrap gap-3">
<StatusPill>Enterprise SaaS</StatusPill>
<StatusPill>Procurement Governance</StatusPill>
<StatusPill>Supplier Network</StatusPill>
<StatusPill>Executive Intelligence</StatusPill>
</div>
</section>

<section className="mt-8 space-y-6">
{sections.map((section) => (
<Section
key={section.title}
title={section.title}
content={section.content}
/>
))}
</section>

<section className="mt-8 rounded-[34px] border border-[#C8A646]/25 bg-[#C8A646]/10 p-8">
<p className="text-xs font-black uppercase tracking-[0.25em] text-[#F5D77B]">
Notice
</p>

<h2 className="mt-3 text-3xl font-black text-white">
Continuous platform improvement.
</h2>

<p className="mt-4 max-w-4xl text-sm font-semibold leading-7 text-slate-300">
Nexus Pavilion continues to evolve through regular feature releases,
security enhancements, executive reporting improvements, and
procurement intelligence capabilities. Updated Terms may be
published as the platform expands.
</p>
</section>
</div>
</main>
);
}

function Section({
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