"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import {
canChangeRoles,
canManageMembers,
type UserRole,
} from "@/lib/permissions";

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

type EditableRole = "admin" | "buyer" | "vendor";

const ROLE_OPTIONS: { value: EditableRole; label: string }[] = [
{ value: "vendor", label: "Vendor" },
{ value: "buyer", label: "Buyer" },
{ value: "admin", label: "Admin" },
];

function normalizeRole(role: string | null): EditableRole {
if (role === "admin") return "admin";
if (role === "buyer") return "buyer";
return "vendor";
}

function getPermissionMessage({
isCurrentUser,
canManageMemberAccess,
canChangeMemberRoles,
}: {
isCurrentUser: boolean;
canManageMemberAccess: boolean;
canChangeMemberRoles: boolean;
}) {
if (isCurrentUser) {
return "You cannot manage your own membership from this panel.";
}

if (!canManageMemberAccess && !canChangeMemberRoles) {
return "Your current role has read-only access to member management.";
}

if (!canManageMemberAccess) {
return "You can review this member, but removal requires an admin-level role.";
}

return "Member management is restricted for your current role.";
}

export default function MemberActions({
memberId,
memberEmail,
memberRole,
currentUserId,
currentUserRole,
}: MemberActionsProps) {
const router = useRouter();

const [selectedRole, setSelectedRole] = useState<EditableRole>(
normalizeRole(memberRole)
);
const [loadingAction, setLoadingAction] = useState("");
const [message, setMessage] = useState("");
const [error, setError] = useState("");

const role = currentUserRole as UserRole;
const isCurrentUser = memberId === currentUserId;

const canManageMemberAccess = canManageMembers(role) && !isCurrentUser;
const canChangeMemberRoles = canChangeRoles(role) && !isCurrentUser;

async function handleUpdateRole() {
if (!canChangeMemberRoles) {
setError("You do not have permission to update member roles.");
return;
}

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

setMessage("Member role updated successfully.");
router.refresh();
} catch {
setError("Request failed. Please try again.");
} finally {
setLoadingAction("");
}
}

async function handleRemoveMember() {
if (!canManageMemberAccess) {
setError("You do not have permission to remove members.");
return;
}

const confirmed = window.confirm(
`Remove ${memberEmail || "this member"} from this company workspace?`
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

setMessage("Member removed from workspace.");
router.refresh();
} catch {
setError("Request failed. Please try again.");
} finally {
setLoadingAction("");
}
}

if (!canManageMemberAccess && !canChangeMemberRoles) {
return (
<div className="mt-4 rounded-[22px] border border-white/10 bg-white/[0.035] px-4 py-3">
<p className="text-xs font-bold leading-5 text-slate-500">
{getPermissionMessage({
isCurrentUser,
canManageMemberAccess,
canChangeMemberRoles,
})}
</p>
</div>
);
}

return (
<div className="mt-4 rounded-[22px] border border-white/10 bg-[#061426]/80 p-4">
<div className="grid gap-3 sm:grid-cols-[1fr_auto_auto]">
<select
value={selectedRole}
onChange={(event) => setSelectedRole(event.target.value as EditableRole)}
disabled={!canChangeMemberRoles || loadingAction !== ""}
className="rounded-2xl border border-white/10 bg-[#07111F] px-3 py-2 text-xs font-black uppercase tracking-[0.15em] text-white outline-none transition focus:border-[#2CC4E8]/40 disabled:cursor-not-allowed disabled:opacity-50"
>
{ROLE_OPTIONS.map((option) => (
<option key={option.value} value={option.value} className="bg-[#061426]">
{option.label}
</option>
))}
</select>

<button
type="button"
onClick={handleUpdateRole}
disabled={!canChangeMemberRoles || loadingAction === "role"}
className="rounded-full border border-[#C8A646]/25 bg-[#C8A646]/10 px-4 py-2 text-xs font-black text-[#F5D77B] transition hover:bg-[#C8A646]/15 disabled:cursor-not-allowed disabled:opacity-50"
>
{loadingAction === "role" ? "Saving..." : "Save Role"}
</button>

<button
type="button"
onClick={handleRemoveMember}
disabled={!canManageMemberAccess || loadingAction === "remove"}
className="rounded-full border border-red-300/20 bg-red-400/10 px-4 py-2 text-xs font-black text-red-200 transition hover:bg-red-400/15 disabled:cursor-not-allowed disabled:opacity-50"
>
{loadingAction === "remove" ? "Removing..." : "Remove"}
</button>
</div>

{message ? (
<p className="mt-3 text-xs font-bold leading-5 text-emerald-300">
{message}
</p>
) : null}

{error ? (
<p className="mt-3 text-xs font-bold leading-5 text-red-300">{error}</p>
) : null}
</div>
);
}