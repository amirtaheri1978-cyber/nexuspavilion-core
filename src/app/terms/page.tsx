import Link from "next/link";

export default function TermsPage() {
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
Terms of Service
</p>

<h1 className="mt-4 text-5xl font-black text-slate-950">
Nexus Pavilion Terms
</h1>

<p className="mt-5 text-sm leading-7 text-slate-600">
By accessing or using Nexus Pavilion, you agree to these Terms of
Service. These terms govern platform usage, company accounts,
procurement activities, supplier participation, and related
services.
</p>
</section>

<div className="mt-8 space-y-6">
<Section
title="Platform Usage"
content="Users are responsible for maintaining accurate company information and ensuring authorized access to their workspace."
/>

<Section
title="Procurement Activities"
content="RFQs, supplier quotes, procurement decisions, and contract awards remain the responsibility of participating organizations."
/>

<Section
title="Company Accounts"
content="Organizations are responsible for managing user permissions, invitations, and account security."
/>

<Section
title="Data Accuracy"
content="Nexus Pavilion provides analytics and intelligence tools but does not guarantee procurement outcomes or supplier performance."
/>

<Section
title="Service Availability"
content="The platform may be updated, modified, or temporarily unavailable due to maintenance or operational requirements."
/>

<Section
title="Limitation of Liability"
content="To the maximum extent permitted by law, Nexus Pavilion shall not be liable for indirect, incidental, or consequential damages arising from platform usage."
/>
</div>
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
<section className="rounded-[32px] border border-black/5 bg-white p-8">
<h2 className="text-2xl font-black text-slate-950">{title}</h2>

<p className="mt-4 text-sm leading-7 text-slate-600">
{content}
</p>
</section>
);
}