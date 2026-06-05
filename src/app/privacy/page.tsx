import Link from "next/link";

export default function PrivacyPage() {
return (
<main className="min-h-screen bg-[#f6f6f3] px-8 py-12">
<div className="mx-auto max-w-5xl">
<Link
href="/"
className="text-sm font-bold text-slate-500 hover:text-slate-950"
>
← Back to Home
</Link>

<section className="mt-8 rounded-[36px] border border-black/5 bg-white p-10">
<p className="text-xs font-black uppercase tracking-[0.35em] text-orange-500">
Privacy Policy
</p>

<h1 className="mt-4 text-5xl font-black text-slate-950">
Your Data & Privacy
</h1>

<p className="mt-5 text-sm leading-7 text-slate-600">
Nexus Pavilion is committed to protecting company information,
procurement records, supplier data, and user account information.
</p>
</section>

<div className="mt-8 space-y-6">
<PolicySection
title="Information We Collect"
content="We collect account information, company profiles, RFQs, supplier quotes, procurement records, analytics activity, and platform usage data."
/>

<PolicySection
title="How Information Is Used"
content="Information is used to provide procurement workflows, supplier intelligence, analytics, notifications, reporting, and platform security."
/>

<PolicySection
title="Data Protection"
content="We implement security controls designed to protect company workspaces, procurement records, and platform data."
/>

<PolicySection
title="Data Sharing"
content="Nexus Pavilion does not sell customer data. Information is only shared when required for platform operations, legal obligations, or authorized business activities."
/>

<PolicySection
title="Account Security"
content="Organizations are responsible for managing authorized users, invitations, permissions, and workspace access."
/>

<PolicySection
title="Policy Updates"
content="This policy may be updated periodically to reflect operational, legal, or platform improvements."
/>
</div>
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
<section className="rounded-[32px] border border-black/5 bg-white p-8">
<h2 className="text-2xl font-black text-slate-950">
{title}
</h2>

<p className="mt-4 text-sm leading-7 text-slate-600">
{content}
</p>
</section>
);
}