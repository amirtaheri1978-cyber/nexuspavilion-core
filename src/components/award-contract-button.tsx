"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type Props = {
quoteId: string;
disabled?: boolean;
};

export default function AwardContractButton({ quoteId, disabled = false }: Props) {
const router = useRouter();

const [loading, setLoading] = useState(false);
const [error, setError] = useState("");

async function handleAward() {
if (loading || disabled) return;

const confirmed = window.confirm(
"Award this contract? This will reject all other quotes for this RFQ and mark the RFQ as awarded."
);

if (!confirmed) return;

try {
setLoading(true);
setError("");

const response = await fetch("/api/award-contract", {
method: "POST",
headers: {
"Content-Type": "application/json",
},
body: JSON.stringify({
quoteId,
}),
});

const data = await response.json();

if (!response.ok) {
setError(data.error || "Failed to award contract");
return;
}

router.refresh();

if (data.rfqSlug) {
window.location.href = `/rfq/${data.rfqSlug}/compare`;
return;
}

window.location.reload();
} catch (awardError) {
console.error(awardError);
setError("Failed to award contract");
} finally {
setLoading(false);
}
}

return (
<div className="flex flex-col items-start gap-2">
<button
type="button"
onClick={handleAward}
disabled={loading || disabled}
className="rounded-full bg-slate-950 px-5 py-2 text-sm font-bold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-500"
>
{loading ? "Awarding..." : "Award Contract"}
</button>

{error ? (
<p className="max-w-[180px] text-xs font-bold text-red-600">{error}</p>
) : null}
</div>
);
}