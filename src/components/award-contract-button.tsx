"use client";

import { useState } from "react";

type Props = {
quoteId: string;
};

export default function AwardContractButton({ quoteId }: Props) {
const [loading, setLoading] = useState(false);

async function handleAward() {
try {
setLoading(true);

const response = await fetch("/api/award-contract", {
method: "POST",
headers: {
"Content-Type": "application/json",
},
body: JSON.stringify({
quoteId,
}),
});

if (!response.ok) {
throw new Error("Failed to award contract");
}

window.location.reload();
} catch (error) {
console.error(error);
alert("Failed to award contract");
} finally {
setLoading(false);
}
}

return (
<button
onClick={handleAward}
disabled={loading}
className="rounded-full bg-black px-5 py-2 text-sm font-semibold text-white transition hover:opacity-80 disabled:opacity-50"
>
{loading ? "Awarding..." : "Award Contract"}
</button>
);
}