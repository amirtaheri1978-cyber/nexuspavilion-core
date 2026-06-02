"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type AwardContractButtonProps = {
quoteId: string;
disabled?: boolean;
};

type AwardContractResponse = {
success?: boolean;
error?: string;
redirectTo?: string;
rfq?: {
slug?: string | null;
};
warnings?: {
notification?: string | null;
audit?: string | null;
};
};

export default function AwardContractButton({
quoteId,
disabled = false,
}: AwardContractButtonProps) {
const router = useRouter();

const [loading, setLoading] = useState(false);
const [error, setError] = useState("");

async function handleAward() {
if (loading || disabled) return;

const confirmed = window.confirm(
"Award this contract? This will reject all other quotes for this RFQ and mark the RFQ as awarded."
);

if (!confirmed) return;

setLoading(true);
setError("");

try {
const response = await fetch("/api/award-contract", {
method: "POST",
headers: {
"Content-Type": "application/json",
},
body: JSON.stringify({
quoteId,
}),
});

const data = (await response.json()) as AwardContractResponse;

if (!response.ok) {
setError(data.error || "Failed to award contract.");
return;
}

if (data.warnings?.notification) {
console.warn("Award notification warning:", data.warnings.notification);
}

if (data.warnings?.audit) {
console.warn("Award audit warning:", data.warnings.audit);
}

if (data.redirectTo) {
router.push(data.redirectTo);
router.refresh();
return;
}

if (data.rfq?.slug) {
router.push(`/rfq/${data.rfq.slug}`);
router.refresh();
return;
}

router.refresh();
} catch (awardError) {
console.error(awardError);
setError("Failed to award contract.");
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
className="rounded-full bg-green-700 px-5 py-2 text-sm font-bold text-white transition hover:bg-green-800 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-500"
>
{loading ? "Awarding..." : "Award Contract"}
</button>

{error ? (
<p className="max-w-[220px] text-xs font-bold leading-5 text-red-600">
{error}
</p>
) : null}
</div>
);
}