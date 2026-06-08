"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type InvitationActionsProps = {
invitationId: string;
inviteUrl: string;
status: string | null;
};

type ApiResponse = {
success?: boolean;
error?: string;
email?: {
sent?: boolean;
skipped?: boolean;
id?: string | null;
error?: string | null;
};
};

export default function InvitationActions({
invitationId,
inviteUrl,
status,
}: InvitationActionsProps) {
const router = useRouter();

const [loadingAction, setLoadingAction] = useState("");
const [copied, setCopied] = useState(false);
const [message, setMessage] = useState("");
const [error, setError] = useState("");

const isPending = status === "pending";
const hasInviteUrl = inviteUrl.trim().length > 0;

async function handleCopy() {
setMessage("");
setError("");

if (!hasInviteUrl) {
setError("Invitation link is not available.");
return;
}

try {
await navigator.clipboard.writeText(inviteUrl);
setCopied(true);
setMessage("Invite link copied.");

setTimeout(() => {
setCopied(false);
}, 2500);
} catch {
setError("Could not copy invite link.");
}
}

async function handleResend() {
if (!isPending) {
setError("Only pending invitations can be resent.");
return;
}

setLoadingAction("resend");
setMessage("");
setError("");

try {
const response = await fetch("/api/company-invitations/resend", {
method: "POST",
headers: {
"Content-Type": "application/json",
},
body: JSON.stringify({ invitationId }),
});

const data = (await response.json()) as ApiResponse;

if (!response.ok) {
setError(data.error || "Failed to resend invitation.");
return;
}

if (data.email?.sent) {
setMessage("Invitation email resent.");
} else if (data.email?.error) {
setError(`Invitation resend failed: ${data.email.error}`);
} else {
setMessage("Invitation resend completed.");
}

router.refresh();
} catch {
setError("Request failed. Please try again.");
} finally {
setLoadingAction("");
}
}

async function handleRevoke() {
if (!isPending) {
setError("Only pending invitations can be revoked.");
return;
}

const confirmed = window.confirm(
"Revoke this invitation? The invited user will no longer be able to join with this link."
);

if (!confirmed) return;

setLoadingAction("revoke");
setMessage("");
setError("");

try {
const response = await fetch("/api/company-invitations/revoke", {
method: "POST",
headers: {
"Content-Type": "application/json",
},
body: JSON.stringify({ invitationId }),
});

const data = (await response.json()) as ApiResponse;

if (!response.ok) {
setError(data.error || "Failed to revoke invitation.");
return;
}

setMessage("Invitation revoked.");
router.refresh();
} catch {
setError("Request failed. Please try again.");
} finally {
setLoadingAction("");
}
}

return (
<div className="mt-4 space-y-3">
<div className="flex flex-wrap gap-2">
<button
type="button"
onClick={handleCopy}
disabled={!hasInviteUrl || loadingAction !== ""}
className="rounded-full bg-white px-4 py-2 text-xs font-black text-slate-950 shadow-sm transition hover:shadow-md disabled:cursor-not-allowed disabled:opacity-50"
>
{copied ? "Copied" : "Copy Link"}
</button>

{isPending ? (
<>
<button
type="button"
onClick={handleResend}
disabled={loadingAction === "resend"}
className="rounded-full bg-slate-950 px-4 py-2 text-xs font-black text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
>
{loadingAction === "resend" ? "Resending..." : "Resend"}
</button>

<button
type="button"
onClick={handleRevoke}
disabled={loadingAction === "revoke"}
className="rounded-full bg-red-700 px-4 py-2 text-xs font-black text-white transition hover:bg-red-800 disabled:cursor-not-allowed disabled:opacity-50"
>
{loadingAction === "revoke" ? "Revoking..." : "Revoke"}
</button>
</>
) : null}
</div>

{message ? (
<p className="text-xs font-bold leading-5 text-green-700">{message}</p>
) : null}

{error ? (
<p className="text-xs font-bold leading-5 text-red-600">{error}</p>
) : null}
</div>
);
}