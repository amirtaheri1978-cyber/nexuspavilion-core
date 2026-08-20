"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { EXECUTIVE_CTA_PRIMARY } from "@/lib/design-system/executive-contract";

type ApiResponse = {
success?: boolean;
error?: string;
owner?: string;
company?: string;
};

export default function RecoverOwnershipButton() {
const router = useRouter();
const [loading, setLoading] = useState(false);
const [result, setResult] = useState("");

async function handleRecover() {
setLoading(true);
setResult("Calling recovery API...");

try {
const response = await fetch("/api/company/recover-admin", {
method: "POST",
cache: "no-store",
});

const data = (await response.json()) as ApiResponse;

if (!response.ok) {
setResult(data.error || `Failed with status ${response.status}`);
return;
}

setResult("Ownership recovered successfully. Refreshing...");
router.refresh();

setTimeout(() => {
window.location.reload();
}, 800);
} catch (error) {
setResult(
error instanceof Error
? `Request failed: ${error.message}`
: "Request failed."
);
} finally {
setLoading(false);
}
}

return (
<div className="mt-5">
<button
type="button"
onClick={handleRecover}
disabled={loading}
className={`${EXECUTIVE_CTA_PRIMARY} min-h-12 px-5 disabled:cursor-not-allowed disabled:opacity-50`}
>
{loading ? "Recovering..." : "Recover Ownership"}
</button>

{result ? (
<p className="mt-3 rounded-2xl border border-white/10 bg-white/[0.045] px-4 py-3 text-sm font-bold leading-6 text-slate-200" role="status">
{result}
</p>
) : null}
</div>
);
}