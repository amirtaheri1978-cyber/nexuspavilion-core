import { createClient } from "@supabase/supabase-js"

const supabase = createClient(
process.env.NEXT_PUBLIC_SUPABASE_URL!,
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export default async function InvitePage({
params,
}: {
params: { token: string }
}) {
const { data: invite } = await supabase
.from("rfq_invites")
.select("*")
.eq("token", params.token)
.single()

if (!invite) {
return (
<main className="min-h-screen flex items-center justify-center">
<h1 className="text-2xl font-bold">Invalid Invite</h1>
</main>
)
}

const { data: rfq } = await supabase
.from("rfqs")
.select("*")
.eq("id", invite.rfq_id)
.single()

return (
<main className="min-h-screen bg-[#f5f5f2] px-6 py-16">
<div className="max-w-3xl mx-auto space-y-6">
<div className="bg-white rounded-3xl border border-black/5 p-10">
<p className="text-xs tracking-[0.3em] uppercase text-[#c26d3a] mb-4">
Supplier Invitation
</p>

<h1 className="text-5xl font-black tracking-tight mb-4">
{rfq?.title}
</h1>

<p className="text-black/60 mb-8">
You have been invited to submit a quote.
</p>

<div className="grid md:grid-cols-2 gap-6">
<div className="rounded-2xl border border-black/5 p-6">
<p className="text-xs uppercase text-black/40 mb-2">
Budget
</p>

<p className="text-3xl font-bold">
${rfq?.budget?.toLocaleString()}
</p>
</div>

<div className="rounded-2xl border border-black/5 p-6">
<p className="text-xs uppercase text-black/40 mb-2">
Deadline
</p>

<p className="text-2xl font-bold">
{rfq?.deadline}
</p>
</div>
</div>
</div>

<div className="bg-white rounded-3xl border border-black/5 p-10">
<p className="text-xs tracking-[0.3em] uppercase text-[#c26d3a] mb-4">
Submit Proposal
</p>

<form className="space-y-4">
<input
placeholder="Quote amount"
className="w-full rounded-2xl border border-black/10 px-4 py-4"
/>

<input
placeholder="Timeline"
className="w-full rounded-2xl border border-black/10 px-4 py-4"
/>

<textarea
placeholder="Proposal notes"
className="w-full rounded-2xl border border-black/10 px-4 py-4 h-40"
/>

<button
className="bg-black text-white rounded-full px-6 py-3 font-medium"
>
Submit Quote
</button>
</form>
</div>
</div>
</main>
)
}