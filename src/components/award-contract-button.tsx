"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type AwardContractButtonProps = {
quoteId: string;
};

export default function AwardContractButton({
quoteId,
}: AwardContractButtonProps) {
const router = useRouter();
const [loading, setLoading] = useState(false);

async function handleAward() {
setLoading(true);

const response = await fetch("/api/award-contract", {
method: "POST",
headers: {
"Content-Type": "application/json",
},
body: JSON.stringify({ quoteId }),
});

setLoading(false);

if (!response.ok) {
alert("Could not award contract.");
return;
}

router.push("/dashboard");
router.refresh();
}

return (
<button
type="button"
onClick={handleAward}
disabled={loading}
className="rounded-full bg-black px-5 py-3 text-sm font-semibold text-white disabled:opacity-50"
>
{loading ? "Awarding..." : "Award Contract"}
</button>
);
}