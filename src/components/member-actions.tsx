"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type MemberActionsProps = {
memberId: string;
memberEmail: string | null;
memberRole: string | null;
currentUserId: string;
currentUserRole: string | null;
};

type ApiResponse = {
success?: boolean;
role?: string;
error?: string;
};

function normalizeRole(role: string | null) {
if (role === "admin") return "admin";
if (role === "buyer") return "buyer";
return "vendor";
}

export default function MemberActions({
memberId,
memberEmail,
memberRole,
currentUserId,
currentUserRole,
}: MemberActionsProps) {
const router = useRouter();

const [selectedRole, setSelectedRole] = useState(normalizeRole(memberRole));
const [loadingAction, setLoadingAction] = useState("");
const [message, setMessage] = useState("");
const [error, setError] = useState("");

const isCurrentUser = memberId === currentUserId;
const canManage = currentUserRole === "admin" && !isCurrentUser;

async function handleUpdateRole() {
setLoadingAction("role");
setMessage("");
setError("");

try {
const response = await fetch("/api/company-members/update-role", {
method: "POST",
headers: {
"Content-Type": "application/json",
},
body: JSON.stringify({
memberId,
role: selectedRole,
}),
});

const data = (await response.json()) as ApiResponse;

if (!response.ok) {
setError(data.error || "Failed to update role.");
return;
}

setMessage("Role updated.");
router.refresh();
} catch {
setError("Request failed. Please try again.");
} finally {
setLoadingAction("");
}
}

async function handleRemoveMember() {
const confirmed = window.confirm(
`Remove ${memberEmail || "this member"} from this company?`
);

if (!confirmed) return;

setLoadingAction("remove");
setMessage("");
setError("");

try {
const response = await fetch("/api/company-members/remove", {
method: "POST",
headers: {
"Content-Type": "application/json",
},
body: JSON.stringify({
memberId,
}),
});

const data = (await response.json()) as ApiResponse;

if (!response.ok) {
setError(data.error || "Failed to remove member.");
return;
}

setMessage("Member removed.");
router.refresh();
} catch {
setError("Request failed. Please try again.");
} finally {
setLoadingAction("");
}
}

if (!canManage) {
return (
<div className="mt-4 rounded-2xl bg-white px-4 py-3">
<p className="text-xs font-bold text-slate-500">
{isCurrentUser
? "You cannot manage your own membership from here."
: "Only workspace admins can manage members."}
</p>
</div>
);
}

return (
<div className="mt-4 rounded-2xl bg-white p-4">
<div className="grid gap-3 sm:grid-cols-[1fr_auto_auto]">
<select
value={selectedRole}
onChange={(event) => setSelectedRole(event.target.value)}
className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-black uppercase tracking-[0.15em] text-slate-700 outline-none focus:border-slate-950 focus:bg-white"
>
<option value="vendor">Vendor</option>
<option value="buyer">Buyer</option>
<option value="admin">Admin</option>
</select>

<button
type="button"
onClick={handleUpdateRole}
disabled={loadingAction === "role"}
className="rounded-full bg-slate-950 px-4 py-2 text-xs font-black text-white transition hover:bg-slate-800 disabled:opacity-50"
>
{loadingAction === "role" ? "Saving..." : "Save Role"}
</button>

<button
type="button"
onClick={handleRemoveMember}
disabled={loadingAction === "remove"}
className="rounded-full bg-red-700 px-4 py-2 text-xs font-black text-white transition hover:bg-red-800 disabled:opacity-50"
>
{loadingAction === "remove" ? "Removing..." : "Remove"}
</button>
</div>

{message && (
<p className="mt-3 text-xs font-bold leading-5 text-green-700">
{message}
</p>
)}

{error && (
<p className="mt-3 text-xs font-bold leading-5 text-red-600">
{error}
</p>
)}
</div>
);
}