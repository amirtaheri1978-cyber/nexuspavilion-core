"use client";

import { useRouter } from "next/navigation";
import { clearOrganization } from "@/lib/storage";

export default function LogoutButton() {
const router = useRouter();

function handleLogout() {
clearOrganization();
router.push("/register");
}

return (
<button
type="button"
onClick={handleLogout}
className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
>
Logout
</button>
);
}