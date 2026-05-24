"use client";

import { useRouter } from "next/navigation";

import { createClient } from "@/lib/supabase/client";

export default function LogoutButton() {
const router = useRouter();
const supabase = createClient();

async function handleLogout() {
await supabase.auth.signOut();

router.push("/login");
router.refresh();
}

return (
<button
type="button"
onClick={handleLogout}
className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
>
Logout
</button>
);
}