"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { createClient } from "@/lib/supabase/client";

type Props = {
quoteId: string;
currentDecision: string | null;
};

export default function QuoteDecisionButtons({
quoteId,
currentDecision,
}: Props) {
const router = useRouter();
const supabase = createClient();

const [decision, setDecision] = useState(currentDecision || "pending");
const [loading, setLoading] = useState(false);

async function updateDecision(nextDecision: "approved" | "rejected") {
setLoading(true);

const { error } = await supabase.rpc("update_quote_decision", {
quote_id: quoteId,
next_decision: nextDecision,
});

if (error) {
console.error(error);
alert(error.message);
setLoading(false);
return;
}

setDecision(nextDecision);
setLoading(false);
router.refresh();
}

if (decision === "approved") {
return (
<span className="rounded-full bg-green-100 px-4 py-2 text-sm font-bold text-green-700">
Approved
</span>
);
}

if (decision === "rejected") {
return (
<span className="rounded-full bg-red-100 px-4 py-2 text-sm font-bold text-red-700">
Rejected
</span>
);
}

return (
<div className="flex gap-3">
<button
type="button"
disabled={loading}
onClick={() => updateDecision("approved")}
className="rounded-xl bg-green-600 px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
>
Approve
</button>

<button
type="button"
disabled={loading}
onClick={() => updateDecision("rejected")}
className="rounded-xl bg-red-600 px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
>
Reject
</button>
</div>
);
}