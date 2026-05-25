import Link from "next/link";

import SubmitQuoteForm from "@/components/submit-quote-form";
import { createClient } from "@/lib/supabase/server";

export default async function InvitePage({
params,
}: {
params: Promise<{ token: string }>;
}) {
const { token } = await params;
const cleanToken = token.trim();

const supabase = await createClient();

const { data: invite, error: inviteError } = await supabase
.from("rfq_invites")
.select("*")
.eq("token", cleanToken)
.maybeSingle();

if (inviteError || !invite) {
return (
<main className="flex min-h-screen items-center justify-center bg-slate-100 p-8">
<div className="rounded-3xl bg-white p-8 shadow-sm">
<h1 className="text-2xl font-black text-slate-950">Invalid Invite</h1>
<p className="mt-4 text-slate-600">Token checked:</p>
<p className="mt-2 break-all rounded-xl bg-slate-100 p-3 text-sm">
{cleanToken}
</p>
</div>
</main>
);
}

const { data: rfq } = await supabase
.from("rfqs")
.select("*")
.eq("id", invite.rfq_id)
.maybeSingle();

if (!rfq) {
return (
<main className="flex min-h-screen items-center justify-center bg-slate-100 p-8">
<div className="rounded-3xl bg-white p-8 shadow-sm">
<h1 className="text-2xl font-black text-slate-950">RFQ Not Found</h1>
<p className="mt-4 text-slate-600">Invite exists, but RFQ was not found.</p>
<p className="mt-2 break-all rounded-xl bg-slate-100 p-3 text-sm">
rfq_id: {invite.rfq_id}
</p>
</div>
</main>
);
}

return (
<main className="min-h-screen bg-slate-100 px-6 py-12">
<div className="mx-auto max-w-4xl space-y-8">
<section className="rounded-3xl border border-slate-200 bg-white p-10 shadow-sm">
<p className="text-sm font-semibold uppercase tracking-[0.25em] text-orange-500">
Supplier Invitation
</p>

<h1 className="mt-3 text-5xl font-black text-slate-950">
You’ve been invited to quote
</h1>

<p className="mt-4 text-lg text-slate-600">
Invitation sent to{" "}
<span className="font-bold text-slate-950">{invite.email}</span>
</p>

<div className="mt-10 rounded-3xl bg-slate-50 p-8">
<h2 className="text-4xl font-black text-slate-950">{rfq.title}</h2>

<p className="mt-4 leading-8 text-slate-600">{rfq.description}</p>

<div className="mt-8 grid gap-5 md:grid-cols-2">
<Info title="Category" value={rfq.category} />
<Info title="Location" value={rfq.location} />
<Info title="Budget" value={rfq.budget} />
<Info title="Deadline" value={rfq.deadline} />
</div>
</div>

<div className="mt-8">
<Link
href={`/rfq/${rfq.slug}`}
className="rounded-full bg-slate-950 px-6 py-3 text-sm font-bold text-white"
>
Open RFQ Page
</Link>
</div>
</section>

<SubmitQuoteForm rfqId={rfq.id} />
</div>
</main>
);
}

function Info({ title, value }: { title: string; value: string | null }) {
return (
<div className="rounded-2xl bg-white p-5">
<p className="text-sm font-semibold uppercase text-slate-500">{title}</p>
<p className="mt-2 text-lg font-bold text-slate-950">
{value || "Not specified"}
</p>
</div>
);
}